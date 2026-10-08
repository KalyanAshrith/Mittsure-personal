import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await prisma.settings.findUnique({ where: { id: 'default' } });
    const targetGoal = settings?.target_progress_goal || 300;
    const dailyTarget = settings?.default_daily_schools || 5;
    const weeklyTarget = settings?.target_schools_per_week || 30;

    const totalAssigned = await prisma.school.count();

    // Personally completed unique schools by Kalyan Ashrith
    const personallyCompletedCount = await prisma.school.count({
      where: {
        visited_by_current_user: true,
      },
    });

    const remaining = totalAssigned - personallyCompletedCount;
    const completionPercentage =
      totalAssigned > 0
        ? Number(((personallyCompletedCount / totalAssigned) * 100).toFixed(2))
        : 0;

    const remainingToTarget = Math.max(0, targetGoal - personallyCompletedCount);
    const targetProgressPercentage =
      targetGoal > 0
        ? Number(((personallyCompletedCount / targetGoal) * 100).toFixed(2))
        : 0;

    // Previous representative visited schools count
    const previousRepVisitedCount = await prisma.school.count({
      where: {
        visited_by_previous_rep: true,
        visited_by_current_user: false,
      },
    });

    // Total visit events by Kalyan (includes revisits)
    const totalVisitEvents = await prisma.schoolVisit.count({
      where: {
        is_current_representative: true,
      },
    });

    // Today's date range
    const now = new Date();
    const isSundayToday = now.getDay() === 0;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayVisitsCount = await prisma.schoolVisit.count({
      where: {
        is_current_representative: true,
        visit_date: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    });

    // Tomorrow's date
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowDateStr = tomorrow.toISOString().split('T')[0];
    const isTomorrowSunday = tomorrow.getDay() === 0;

    // This week's visits (Mon-Sat working days)
    const currentDayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday...
    const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() + mondayOffset);
    startOfWeek.setHours(0, 0, 0, 0);

    const thisWeekVisitsCount = await prisma.schoolVisit.count({
      where: {
        is_current_representative: true,
        visit_date: {
          gte: startOfWeek,
        },
      },
    });

    // Generate Mon-Sun week schedule
    const weekSchedule = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      const isSunday = d.getDay() === 0;
      const isToday = d.toDateString() === now.toDateString();

      // Check if route planned for this day
      const plan = await prisma.routePlan.findFirst({
        where: { date: dStr },
        include: { stops: true },
      });

      weekSchedule.push({
        date: dStr,
        dayName: dayNames[i],
        formattedDate: d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        isHoliday: isSunday,
        holidayLabel: isSunday ? 'SUNDAY HOLIDAY' : null,
        isToday,
        target: isSunday ? 0 : dailyTarget,
        plannedStops: isSunday ? 0 : (plan?.stops.length || 0),
        status: isSunday ? 'HOLIDAY' : (plan ? plan.status : 'UNPLANNED'),
      });
    }

    // Follow-ups
    const pendingFollowupsCount = await prisma.followUp.count({
      where: {
        status: { in: ['Pending', 'Today', 'Overdue'] },
      },
    });

    const overdueFollowupsCount = await prisma.followUp.count({
      where: {
        status: 'Overdue',
      },
    });

    const todayFollowupsCount = await prisma.followUp.count({
      where: {
        status: 'Today',
      },
    });

    // Today's route plan distance (Strictly null on Sunday)
    const todayDateStr = new Date().toISOString().split('T')[0];
    const todayRoute = isSundayToday
      ? null
      : await prisma.routePlan.findFirst({
          where: { date: todayDateStr },
          include: {
            stops: {
              include: { school: true },
              orderBy: { optimized_sequence: 'asc' },
            },
          },
        });

    if (todayRoute && Array.isArray(todayRoute.stops)) {
      todayRoute.stops = todayRoute.stops.filter((st: any) => {
        if (!st.school) return false;
        if (st.school.visited_by_current_user && st.status !== 'VISITED') return false;
        return true;
      });
    }

    // Board breakdown
    const boardStats = await prisma.school.groupBy({
      by: ['board'],
      _count: {
        id: true,
      },
    });

    // School type breakdown
    const typeStats = await prisma.school.groupBy({
      by: ['school_type'],
      _count: {
        id: true,
      },
    });

    // Visit status breakdown
    const statusStats = await prisma.school.groupBy({
      by: ['visit_status'],
      _count: {
        id: true,
      },
    });

    // Outcome stats
    const outcomeStats = await prisma.schoolVisit.groupBy({
      by: ['outcome'],
      _count: {
        id: true,
      },
    });

    // Recent visits
    const recentVisits = await prisma.schoolVisit.findMany({
      take: 6,
      orderBy: { visit_date: 'desc' },
      include: {
        school: true,
      },
    });

    // Pending follow-ups
    const upcomingFollowups = await prisma.followUp.findMany({
      take: 5,
      where: {
        status: { in: ['Pending', 'Today', 'Overdue'] },
      },
      orderBy: { due_date: 'asc' },
      include: {
        school: true,
      },
    });

    return NextResponse.json({
      kpis: {
        totalAssigned,
        completed: personallyCompletedCount,
        remaining,
        completionPercentage,
        targetGoal,
        remainingToTarget,
        targetProgressPercentage,
        dailyTarget,
        weeklyTarget,
        totalVisitEvents,
        previousRepVisitedCount,
        todayVisits: todayVisitsCount,
        thisWeekVisits: thisWeekVisitsCount,
        pendingFollowups: pendingFollowupsCount,
        todayFollowups: todayFollowupsCount,
        overdueFollowups: overdueFollowupsCount,
        todayDistanceKm: todayRoute?.total_distance_km || 0,
        todayStopsCount: todayRoute?.stops.length || 0,
        isSundayToday,
        isTomorrowSunday,
        tomorrowDateStr,
        exactSNosPendingReconciliation: false,
      },
      settings: {
        userName: settings?.user_name || 'Nichhenametla Kalyan Ashrith',
        userRole: settings?.user_role || 'Relationship Manager / School Outreach Representative',
        company: settings?.company || 'Mittsure Technologies LLP',
        baseAddress: settings?.base_address,
        weeklyHoliday: settings?.weekly_holiday || 'SUNDAY',
        defaultDailySchools: dailyTarget,
      },
      weekSchedule,
      todayRoute,
      boardBreakdown: boardStats.map((b) => ({
        name: b.board,
        count: b._count.id,
      })),
      typeBreakdown: typeStats.map((t) => ({
        name: t.school_type,
        count: t._count.id,
      })),
      statusBreakdown: statusStats.map((s) => ({
        name: s.visit_status,
        count: s._count.id,
      })),
      outcomeBreakdown: outcomeStats.map((o) => ({
        name: o.outcome,
        count: o._count.id,
      })),
      recentVisits,
      upcomingFollowups,
    });
  } catch (error: any) {
    console.error('Error fetching dashboard metrics:', error);
    return NextResponse.json(
      { error: 'Failed to calculate dashboard metrics', details: error.message },
      { status: 500 }
    );
  }
}
