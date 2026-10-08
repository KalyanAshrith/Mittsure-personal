import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

function getNextWorkingDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + 1);
  // Skip Sunday (0)
  if (dt.getDay() === 0) {
    dt.setDate(dt.getDate() + 1); // Advance to Monday
  }
  const yStr = dt.getFullYear();
  const mStr = String(dt.getMonth() + 1).padStart(2, '0');
  const dStr = String(dt.getDate()).padStart(2, '0');
  return `${yStr}-${mStr}-${dStr}`;
}

function formatDateFormatted(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, reason = 'Unscheduled Holiday / Bandh', cascadeDownstream = true } = body;

    if (!date) {
      return NextResponse.json({ error: 'Date is required.' }, { status: 400 });
    }

    const nextWorkingDay = getNextWorkingDay(date);

    // 1. Fetch current plan on the holiday date
    const currentPlan = await prisma.routePlan.findFirst({
      where: { date },
      include: {
        stops: {
          include: { school: true },
          orderBy: { optimized_sequence: 'asc' },
        },
      },
    });

    const shiftedPlans: Array<{ fromDate: string; toDate: string; planName: string }> = [];

    if (currentPlan && currentPlan.stops.length > 0) {
      if (cascadeDownstream) {
        // Find all plans from date onwards
        const futurePlans = await prisma.routePlan.findMany({
          where: {
            date: { gte: date },
          },
          include: {
            stops: {
              include: { school: true },
              orderBy: { optimized_sequence: 'asc' },
            },
          },
          orderBy: { date: 'desc' }, // Shift latest first to avoid collisions
        });

        // Perform cascading shifts
        for (const plan of futurePlans) {
          const planNextDay = getNextWorkingDay(plan.date);
          const isSaturday = new Date(planNextDay).getDay() === 6;

          // If shifting onto a Saturday, adapt plan name
          const updatedName = `${formatDateFormatted(planNextDay)}: Handed-off Circuit (${
            isSaturday ? 'Saturday Half-Day' : 'Full Day'
          })`;

          // If target is Saturday and stops > 5, trim to top 5 stops
          if (isSaturday && plan.stops.length > 5) {
            const stopsToKeep = plan.stops.slice(0, 5);
            const stopsToRemove = plan.stops.slice(5);

            for (const remStop of stopsToRemove) {
              await prisma.routeStop.delete({ where: { id: remStop.id } });
            }

            // Re-sequence remaining 5 stops
            for (let i = 0; i < stopsToKeep.length; i++) {
              await prisma.routeStop.update({
                where: { id: stopsToKeep[i].id },
                data: { stop_number: i + 1, optimized_sequence: i + 1 },
              });
            }
          }

          // Check if a plan already exists on planNextDay
          const existingOnTarget = await prisma.routePlan.findFirst({
            where: { date: planNextDay },
          });

          if (existingOnTarget && existingOnTarget.id !== plan.id) {
            // Delete old duplicate or replace
            await prisma.routeStop.deleteMany({ where: { route_plan_id: existingOnTarget.id } });
            await prisma.routePlan.delete({ where: { id: existingOnTarget.id } });
          }

          await prisma.routePlan.update({
            where: { id: plan.id },
            data: {
              date: planNextDay,
              name: updatedName,
              day_type: isSaturday ? 'HALF_DAY' : 'FULL_DAY',
              status: 'PLANNED',
            },
          });

          shiftedPlans.push({
            fromDate: plan.date,
            toDate: planNextDay,
            planName: updatedName,
          });
        }
      } else {
        // Simple direct move without cascading
        const isSaturday = new Date(nextWorkingDay).getDay() === 6;
        const updatedName = `${formatDateFormatted(nextWorkingDay)}: Handed-off Circuit (${
          isSaturday ? 'Saturday Half-Day' : 'Full Day'
        })`;

        // Clear existing target if present
        const existingOnTarget = await prisma.routePlan.findFirst({
          where: { date: nextWorkingDay },
        });

        if (existingOnTarget) {
          await prisma.routeStop.deleteMany({ where: { route_plan_id: existingOnTarget.id } });
          await prisma.routePlan.delete({ where: { id: existingOnTarget.id } });
        }

        await prisma.routePlan.update({
          where: { id: currentPlan.id },
          data: {
            date: nextWorkingDay,
            name: updatedName,
            day_type: isSaturday ? 'HALF_DAY' : 'FULL_DAY',
          },
        });

        shiftedPlans.push({
          fromDate: date,
          toDate: nextWorkingDay,
          planName: updatedName,
        });
      }
    }

    // 2. Mark the holiday date in DailySummary
    await prisma.dailySummary.upsert({
      where: { date },
      update: {
        schools_planned: 0,
        remarks: `Forced Holiday: ${reason}. Circuit handed off to ${nextWorkingDay}.`,
      },
      create: {
        date,
        schools_planned: 0,
        remarks: `Forced Holiday: ${reason}. Circuit handed off to ${nextWorkingDay}.`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Marked ${date} as Forced Holiday (${reason}). Handed off route to ${nextWorkingDay} (skipping Sundays).`,
      holidayDate: date,
      nextWorkingDay,
      shiftedPlans,
    });
  } catch (error: any) {
    console.error('Error handling forced holiday:', error);
    return NextResponse.json(
      { error: 'Failed to process forced holiday hand-off', details: error.message },
      { status: 500 }
    );
  }
}
