import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repName = searchParams.get('repName')?.trim();
    const repId = searchParams.get('repId')?.trim() || '';
    const district = searchParams.get('district')?.trim() || 'ALL';

    const isLeadKalyan = Boolean(
      repName && (repName.toLowerCase().includes('kalyan') || repName.toLowerCase().includes('ashrith'))
    );

    const settings = await prisma.settings.findUnique({ where: { id: 'default' } });
    const targetGoal = settings?.target_progress_goal || 300;
    const dailyTarget = settings?.default_daily_schools || 5;
    const weeklyTarget = settings?.target_schools_per_week || 30;

    // Scope totalAssigned by district if territory is specified
    const districtFilter = district !== 'ALL' ? { district } : {};
    const totalAssigned = await prisma.school.count({ where: districtFilter });

    let personallyCompletedCount = 0;
    let totalVisitEvents = 0;

    if (isLeadKalyan) {
      // Personally completed unique schools by Kalyan Ashrith
      personallyCompletedCount = await prisma.school.count({
        where: {
          ...districtFilter,
          visited_by_current_user: true,
        },
      });
      totalVisitEvents = await prisma.schoolVisit.count({
        where: {
          is_current_representative: true,
        },
      });
    } else if (repName) {
      // Isolated personal count for the active team member
      const memberVisits = await prisma.schoolVisit.findMany({
        where: {
          representative: repName,
          school: districtFilter,
        },
        select: { school_id: true },
      });
      const uniqueSchoolIds = new Set(memberVisits.map((v) => v.school_id));
      personallyCompletedCount = uniqueSchoolIds.size;
      totalVisitEvents = memberVisits.length;
    } else {
      // Unassigned guest session - zero personal completion
      personallyCompletedCount = 0;
      totalVisitEvents = 0;
    }

    const previousRepVisitedCount = await prisma.school.count({
      where: {
        ...districtFilter,
        visited_by_previous_rep: true,
        visited_by_current_user: false,
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

    // Today's date range
    const now = new Date();
    const isSundayToday = now.getDay() === 0;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayVisitsCount = await prisma.schoolVisit.count({
      where: {
        ...(isLeadKalyan
          ? { is_current_representative: true }
          : { representative: repName }),
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

    // Recent visits - strictly isolated to the active representative
    const recentVisits = repName
      ? await prisma.schoolVisit.findMany({
          where: isLeadKalyan
            ? { is_current_representative: true }
            : { representative: repName },
          take: 6,
          orderBy: { visit_date: 'desc' },
          include: {
            school: true,
          },
        })
      : [];

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

    // Territory and Zone Breakdown
    const districtStats = await prisma.school.groupBy({
      by: ['district'],
      _count: { id: true },
      orderBy: { district: 'asc' },
    });

    const zoneStats = await prisma.school.groupBy({
      by: ['zone_type'],
      _count: { id: true },
      orderBy: { zone_type: 'asc' },
    });

    // Olympiad Campaign Metrics
    const totalOlympiadRegisteredStudents = await prisma.olympiadSchoolRecord.aggregate({
      _sum: { registered_students: true, expected_students: true },
    });
    const olympiadCampaignsCount = await prisma.olympiadCampaign.count();
    const olympiadRegisteredSchoolsCount = await prisma.olympiadSchoolRecord.count({
      where: { status: 'REGISTERED' },
    });

    // Enriched Today Stops with Recommended Product Pitch
    const enrichedTodayStops = (todayRoute?.stops || []).map((stop: any) => {
      const s = stop.school;
      let pitch = 'MOM — Mittsure Olympiad Masters';
      if (s) {
        const isEarly =
          ['PRE-SCHOOL', 'PLAY SCHOOL', 'NURSERY', 'MONTESSORI', 'KINDERGARTEN'].includes(
            s.school_type?.toUpperCase()
          ) || s.nursery_available;
        const isPrimary = s.school_type?.toUpperCase() === 'PRIMARY';
        if (isEarly) pitch = 'Luma Learn & Junior Power Quest';
        else if (isPrimary) pitch = 'ThinkTrail Curriculum & MOM Olympiad';
        else pitch = 'B4 / B5 PINAKA Series & MOM Olympiad';
      }
      return {
        ...stop,
        recommendedPitch: pitch,
      };
    });

    const pendingTodayStops = enrichedTodayStops.filter((st: any) => st.status === 'PENDING');
    let nextActionText = 'Plan today route with 7 schools quota (5 State/Pre + 2 CBSE/ICSE)';
    if (isSundayToday) {
      nextActionText = 'Sunday Weekly Holiday — No outreach scheduled. Plan Monday circuit.';
    } else if (todayRoute && pendingTodayStops.length > 0) {
      const nextStop = pendingTodayStops[0];
      nextActionText = `Next Stop #${nextStop.optimized_sequence}: ${nextStop.school?.school_name} in ${nextStop.school?.area} (Pitch: ${nextStop.recommendedPitch})`;
    } else if (todayRoute && pendingTodayStops.length === 0 && todayRoute.stops.length > 0) {
      nextActionText = 'All today stops completed! Perform Evening Wrap-Up batch completion or review tomorrow.';
    }

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
        userName: repName || 'Personal Representative',
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
      territoryBreakdown: {
        districts: districtStats.map((d) => ({ name: d.district, count: d._count.id })),
        zones: zoneStats.map((z) => ({ name: z.zone_type, count: z._count.id })),
      },
      olympiadSummary: {
        campaignsCount: olympiadCampaignsCount,
        registeredSchoolsCount: olympiadRegisteredSchoolsCount,
        registeredStudents: totalOlympiadRegisteredStudents._sum.registered_students || 0,
        expectedStudents: totalOlympiadRegisteredStudents._sum.expected_students || 0,
      },
      todayActionGuide: {
        primaryTarget: isSundayToday
          ? 'Sunday Weekly Holiday — No school outreach scheduled'
          : todayRoute
          ? `Complete ${todayRoute.stops.length} scheduled outreach stops in ${todayRoute.name || 'today circuit'}`
          : 'Plan today route with 7 schools quota (5 State/Pre + 2 CBSE/ICSE)',
        startLocation: todayRoute?.origin || settings?.base_address,
        endLocation: todayRoute?.destination || settings?.base_address,
        isRoundTrip: true,
        stops: enrichedTodayStops,
        nextAction: nextActionText,
      },
    });
  } catch (error: any) {
    console.error('Error fetching dashboard metrics:', error);
    return NextResponse.json(
      { error: 'Failed to calculate dashboard metrics', details: error.message },
      { status: 500 }
    );
  }
}
