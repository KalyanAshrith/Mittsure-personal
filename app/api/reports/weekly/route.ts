import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const refDate = dateParam ? new Date(dateParam) : new Date();

    // Determine Monday of the reference week
    const currentDayOfWeek = refDate.getDay(); // 0 is Sunday, 1 is Monday...
    const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const startOfWeek = new Date(refDate);
    startOfWeek.setDate(refDate.getDate() + mondayOffset);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const settings = await prisma.settings.findUnique({ where: { id: 'default' } });
    const dailyTarget = settings?.default_daily_schools || 5;
    const workingDaysCount = 6; // Mon - Sat (Sunday is excluded)
    const weeklyTarget = dailyTarget * workingDaysCount; // 30 schools

    // Fetch all visits by Kalyan this week
    const visits = await prisma.schoolVisit.findMany({
      where: {
        is_current_representative: true,
        visit_date: {
          gte: startOfWeek,
          lte: endOfWeek,
        },
      },
      include: { school: true },
      orderBy: { visit_date: 'asc' },
    });

    // Breakdown per day
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const dayBreakdown = [];
    let workingDaysWithVisits = 0;
    let totalWorkingDayVisits = 0;

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(startOfWeek.getDate() + i);
      const dayStr = dayDate.toISOString().split('T')[0];
      const isSunday = dayDate.getDay() === 0;

      const dayVisits = visits.filter(v => {
        const vDate = new Date(v.visit_date).toISOString().split('T')[0];
        return vDate === dayStr;
      });

      const count = dayVisits.length;
      if (!isSunday) {
        totalWorkingDayVisits += count;
        if (count > 0) workingDaysWithVisits++;
      }

      dayBreakdown.push({
        date: dayStr,
        dayName: dayNames[i],
        formattedDate: dayDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        isHoliday: isSunday,
        holidayReason: isSunday ? 'Sunday Weekly Holiday - Non-Working Day' : null,
        target: isSunday ? 0 : dailyTarget,
        visitedCount: count,
        visits: dayVisits.map(v => ({
          id: v.id,
          school_name: v.school.school_name,
          s_no: v.school.s_no,
          area: v.school.area,
          outcome: v.outcome,
          visit_type: v.visit_type,
        })),
      });
    }

    // Working-day average strictly divides by 6 working days (Mon-Sat), EXCLUDING Sunday!
    const workingDayAverage = Number((totalWorkingDayVisits / workingDaysCount).toFixed(2));
    const weeklyProgressPercentage = Number(((totalWorkingDayVisits / weeklyTarget) * 100).toFixed(1));

    return NextResponse.json({
      weekStart: startOfWeek.toISOString().split('T')[0],
      weekEnd: endOfWeek.toISOString().split('T')[0],
      representative: settings?.user_name || 'Nichhenametla Kalyan Ashrith',
      workingDaysCount,
      weeklyHoliday: 'Sunday',
      dailyTarget,
      weeklyTarget,
      totalWorkingDayVisits,
      workingDayAverage,
      weeklyProgressPercentage,
      dayBreakdown,
    });
  } catch (error: any) {
    console.error('Error calculating weekly report:', error);
    return NextResponse.json(
      { error: 'Failed to generate weekly report', details: error.message },
      { status: 500 }
    );
  }
}
