import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { AIAssistantService } from '@/lib/aiAssistant';
import { SchoolData } from '@/lib/types';
import { calculateDistanceMeters } from '@/lib/haversine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const daysCount = parseInt(searchParams.get('days') || '3', 10); // default 3 days rolling schedule

    const baseDate = startDateParam ? new Date(startDateParam) : new Date();

    const schedule = [];

    for (let i = 0; i < daysCount; i++) {
      const current = new Date(baseDate);
      current.setDate(baseDate.getDate() + i);
      const dateStr = current.toISOString().split('T')[0];

      // Fetch route plan for this day
      let plan = await prisma.routePlan.findFirst({
        where: { date: dateStr },
        include: {
          stops: {
            include: {
              school: {
                include: {
                  visits: {
                    orderBy: { visit_date: 'desc' },
                    take: 1,
                  },
                },
              },
            },
            orderBy: { optimized_sequence: 'asc' },
          },
        },
      });

      // Fetch daily summary
      let summary = await prisma.dailySummary.findUnique({
        where: { date: dateStr },
      });

      const isSunday = current.getDay() === 0;
      const isForcedHoliday = Boolean(summary?.remarks && summary.remarks.toLowerCase().includes('forced holiday'));
      const isHoliday = isSunday || isForcedHoliday;
      let holidayLabel = isSunday ? 'SUNDAY HOLIDAY (Non-Working Day)' : null;
      if (isForcedHoliday) {
        holidayLabel = summary?.remarks || 'FORCED HOLIDAY (Circuit Handed Off)';
      }

      // If no route plan exists for a working day, auto-generate an optimal plan so tomorrow and day after tomorrow are never blank
      if (!plan && !isHoliday) {
        plan = await autoGeneratePlanForDate(dateStr, current.getDay() === 6, schedule);
      }

      // Safeguard: Ensure active or future route plans never contain visited schools as pending stops
      if (plan && Array.isArray(plan.stops) && dateStr >= new Date().toISOString().split('T')[0]) {
        plan.stops = plan.stops.filter((st: any) => {
          if (!st.school) return false;
          // Only permit visited stop if it was actually marked visited on today's active execution
          if (st.school.visited_by_current_user && st.status !== 'VISITED') return false;
          return true;
        });
      }

      // Format human-friendly day label
      let dayLabel = '';
      if (i === 0) dayLabel = 'Today';
      else if (i === 1) dayLabel = 'Tomorrow';
      else if (i === 2) dayLabel = 'Day 3';
      else {
        dayLabel = current.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      }

      schedule.push({
        date: dateStr,
        dayLabel,
        isHoliday,
        isForcedHoliday,
        holidayLabel,
        formattedDate: current.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
        routePlan: isHoliday ? null : plan,
        summary: summary || {
          date: dateStr,
          schools_planned: isHoliday ? 0 : (plan?.stops.length || 0),
          schools_visited: isHoliday ? 0 : (plan?.stops.filter((s) => s.status === 'VISITED').length || 0),
          schools_not_visited: isHoliday ? 0 : (plan ? plan.stops.length - plan.stops.filter((s) => s.status === 'VISITED').length : 0),
          total_distance_km: isHoliday ? 0 : (plan?.total_distance_km || 0),
          total_travel_time: isHoliday ? '0 min' : (plan?.total_duration_formatted || '0 min'),
          remarks: isSunday ? 'Sunday Weekly Holiday — Non-Working Day' : (plan?.remarks || ''),
          ai_summary: '',
        },
      });
    }

    // Check for repeated schools across the returned schedule
    const schoolOccurrences: { [schoolId: string]: { school: any; dates: string[]; dayLabels: string[] } } = {};

    schedule.forEach((day) => {
      if (day.routePlan && Array.isArray(day.routePlan.stops)) {
        day.routePlan.stops.forEach((st: any) => {
          if (!st.school) return;
          const sId = st.school.id;
          if (!schoolOccurrences[sId]) {
            schoolOccurrences[sId] = {
              school: {
                id: st.school.id,
                s_no: st.school.s_no,
                school_name: st.school.school_name,
                board: st.school.board,
                area: st.school.area,
              },
              dates: [],
              dayLabels: [],
            };
          }
          if (!schoolOccurrences[sId].dates.includes(day.date)) {
            schoolOccurrences[sId].dates.push(day.date);
            schoolOccurrences[sId].dayLabels.push(day.dayLabel);
          }
        });
      }
    });

    const repeatedSchools = Object.values(schoolOccurrences)
      .filter((item) => item.dates.length > 1)
      .map((item) => ({
        schoolId: item.school.id,
        s_no: item.school.s_no,
        schoolName: item.school.school_name,
        board: item.school.board,
        area: item.school.area,
        dates: item.dates,
        dayLabels: item.dayLabels,
      }));

    return NextResponse.json({ schedule, repeatedSchools });
  } catch (error: any) {
    console.error('Error fetching calendar schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar schedule', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, remarks, generateAiAdvice } = body;

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    // Update RoutePlan remarks if exists
    await prisma.routePlan.updateMany({
      where: { date },
      data: { remarks },
    });

    let aiSummary = undefined;
    if (generateAiAdvice) {
      // Find schools in today's route
      const plan = await prisma.routePlan.findFirst({
        where: { date },
        include: { stops: { include: { school: true } } },
      });

      if (plan && plan.stops.length > 0) {
        const schools = plan.stops.map((s) => s.school as unknown as SchoolData);
        const advice = AIAssistantService.getDailyRouteAdvice({
          date,
          selectedSchools: schools,
          userRemarks: remarks,
        });
        aiSummary = `${advice.summary}\n• Suggested Focus: ${advice.suggestedFocus}`;
      }
    }

    // Upsert DailySummary
    const summary = await prisma.dailySummary.upsert({
      where: { date },
      update: {
        remarks,
        ai_summary: aiSummary || undefined,
      },
      create: {
        date,
        remarks,
        ai_summary: aiSummary || 'Daily field notes logged.',
      },
    });

    return NextResponse.json({
      success: true,
      summary,
      message: `Remarks updated for ${date}.`,
    });
  } catch (error: any) {
    console.error('Error updating daily remarks:', error);
    return NextResponse.json(
      { error: 'Failed to update daily remarks', details: error.message },
      { status: 500 }
    );
  }
}

const BASE_LAT = 12.3021;
const BASE_LNG = 76.6178;
const BASE_ADDR = '661, Sahukar Chennaiah Road, Janatha Nagar, Bogadi 2nd Stage, TK Layout, Mysuru, Karnataka 570009';

async function autoGeneratePlanForDate(dateStr: string, isSaturday: boolean, currentSchedule: any[]) {
  try {
    const alreadyScheduledIds = new Set<string>();
    // Collect from current in-memory schedule
    for (const day of currentSchedule) {
      if (day.routePlan?.stops) {
        for (const st of day.routePlan.stops) {
          if (st.school_id) alreadyScheduledIds.add(st.school_id);
        }
      }
    }
    // Also collect from all active and upcoming route plans in database
    const dbFutureStops = await prisma.routeStop.findMany({
      where: {
        route_plan: {
          date: { gte: new Date().toISOString().split('T')[0] }
        }
      },
      select: { school_id: true }
    });
    for (const st of dbFutureStops) {
      if (st.school_id) alreadyScheduledIds.add(st.school_id);
    }

    const unvisited = await prisma.school.findMany({
      where: {
        visited_by_current_user: false,
        visit_status: { not: 'VISITED' },
        id: { notIn: Array.from(alreadyScheduledIds) }
      },
      include: {
        visits: { orderBy: { visit_date: 'desc' }, take: 1 }
      }
    });

    if (unvisited.length === 0) return null;

    const stateOrPre = unvisited.filter(s => {
      const b = (s.board || '').toUpperCase();
      const t = (s.school_type || '').toUpperCase();
      return b.includes('STATE') || t.includes('PRE') || t.includes('NURSERY') || t.includes('PLAY') || t.includes('MONTESSORI') || t.includes('KINDERGARTEN');
    });

    const cbseOrIcse = unvisited.filter(s => {
      const b = (s.board || '').toUpperCase();
      return b.includes('CBSE') || b.includes('ICSE');
    });

    const targetStateCount = isSaturday ? 3 : 5;
    const targetCbseCount = 2;

    stateOrPre.sort((a, b) => calculateDistanceMeters(BASE_LAT, BASE_LNG, a.latitude, a.longitude) - calculateDistanceMeters(BASE_LAT, BASE_LNG, b.latitude, b.longitude));
    cbseOrIcse.sort((a, b) => calculateDistanceMeters(BASE_LAT, BASE_LNG, a.latitude, a.longitude) - calculateDistanceMeters(BASE_LAT, BASE_LNG, b.latitude, b.longitude));

    const selectedState = stateOrPre.slice(0, targetStateCount);
    const selectedCbse = cbseOrIcse.slice(0, targetCbseCount);
    const selectedSchools = [...selectedState, ...selectedCbse];

    if (selectedSchools.length === 0) return null;

    const orderedSchools: typeof selectedSchools = [];
    const remaining = [...selectedSchools];
    let currLat = BASE_LAT;
    let currLng = BASE_LNG;

    while (remaining.length > 0) {
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let j = 0; j < remaining.length; j++) {
        const d = calculateDistanceMeters(currLat, currLng, remaining[j].latitude, remaining[j].longitude);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = j;
        }
      }
      const chosen = remaining.splice(bestIdx, 1)[0];
      orderedSchools.push(chosen);
      currLat = chosen.latitude;
      currLng = chosen.longitude;
    }

    const [y, m, d] = dateStr.split('-');
    const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
    const weekdayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const dayTypeName = isSaturday ? 'Half-Day (5 Schools)' : '5+2 Quota (7 Schools)';
    const planName = `${weekdayName} ${dateObj.getDate()} ${dateObj.toLocaleDateString('en-US', { month: 'short' })}: Recommended Circuit (${dayTypeName})`;

    const plan = await prisma.routePlan.create({
      data: {
        date: dateStr,
        name: planName,
        origin: BASE_ADDR,
        origin_lat: BASE_LAT,
        origin_lng: BASE_LNG,
        destination: BASE_ADDR,
        destination_lat: BASE_LAT,
        destination_lng: BASE_LNG,
        travel_mode: 'TWO_WHEELER',
        day_type: isSaturday ? 'HALF_DAY' : 'FULL_DAY',
        status: 'PLANNED',
        remarks: `Auto-planned ${isSaturday ? '5-school half-day' : '5+2 quota'} circuit for ${weekdayName}.`,
        optimized_order: '[]',
      }
    });

    let prevLat = BASE_LAT;
    let prevLng = BASE_LNG;
    let totalDistKm = 0;
    let totalSec = 0;
    const orderedSNos: number[] = [];

    for (let sIdx = 0; sIdx < orderedSchools.length; sIdx++) {
      const s = orderedSchools[sIdx];
      const legMeters = calculateDistanceMeters(prevLat, prevLng, s.latitude, s.longitude);
      const legKm = Number((legMeters / 1000).toFixed(1));
      const legSec = Math.round(legKm * 144);
      totalDistKm += legKm;
      totalSec += legSec;
      orderedSNos.push(s.s_no);

      await prisma.routeStop.create({
        data: {
          route_plan_id: plan.id,
          school_id: s.id,
          stop_number: sIdx + 1,
          optimized_sequence: sIdx + 1,
          status: 'PENDING',
          leg_distance_km: legKm,
          leg_distance_meters: Math.round(legMeters),
          leg_duration_seconds: legSec,
          leg_duration_formatted: `${Math.max(1, Math.ceil(legSec / 60))} min`,
          notes: `Stop #${sIdx + 1} • ${s.board} • ${s.area}`
        }
      });

      prevLat = s.latitude;
      prevLng = s.longitude;
    }

    const retMeters = calculateDistanceMeters(prevLat, prevLng, BASE_LAT, BASE_LNG);
    const retKm = Number((retMeters / 1000).toFixed(1));
    totalDistKm += retKm;
    totalSec += Math.round(retKm * 144);
    const totalMin = Math.round(totalSec / 60);

    await prisma.routePlan.update({
      where: { id: plan.id },
      data: {
        total_distance_km: Number(totalDistKm.toFixed(1)),
        total_distance_meters: Math.round(totalDistKm * 1000),
        total_duration_seconds: totalSec,
        total_duration_formatted: `${totalMin} mins`,
        optimized_order: JSON.stringify(orderedSNos)
      }
    });

    await prisma.dailySummary.upsert({
      where: { date: dateStr },
      update: {
        schools_planned: orderedSNos.length,
        total_distance_km: Number(totalDistKm.toFixed(1)),
        total_travel_time: `${totalMin} mins`,
        remarks: `Auto-planned ${isSaturday ? '5-school half-day' : '5+2 quota'} circuit for ${weekdayName}.`
      },
      create: {
        date: dateStr,
        schools_planned: orderedSNos.length,
        total_distance_km: Number(totalDistKm.toFixed(1)),
        total_travel_time: `${totalMin} mins`,
        remarks: `Auto-planned ${isSaturday ? '5-school half-day' : '5+2 quota'} circuit for ${weekdayName}.`
      }
    });

    return await prisma.routePlan.findUnique({
      where: { id: plan.id },
      include: {
        stops: {
          include: {
            school: {
              include: {
                visits: {
                  orderBy: { visit_date: 'desc' },
                  take: 1,
                },
              },
            },
          },
          orderBy: { optimized_sequence: 'asc' },
        },
      },
    });
  } catch (err) {
    console.error('Failed to auto-generate route plan:', err);
    return null;
  }
}

