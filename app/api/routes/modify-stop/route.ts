import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

const BASE_LAT = 12.3021;
const BASE_LNG = 76.6178;
const BASE_ADDR = '661, Sahukar Chennaiah Road, Janatha Nagar, Bogadi 2nd Stage, TK Layout, Mysuru 570009';

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function recalculatePlanLegs(planId: string) {
  const stops = await prisma.routeStop.findMany({
    where: { route_plan_id: planId },
    include: { school: true },
    orderBy: { optimized_sequence: 'asc' },
  });

  let prevLat = BASE_LAT;
  let prevLng = BASE_LNG;
  let totalDistKm = 0;
  let totalSec = 0;
  const orderedSNos: number[] = [];

  for (let i = 0; i < stops.length; i++) {
    const st = stops[i];
    const s = st.school;
    const legDist = haversineKm(prevLat, prevLng, s.latitude, s.longitude);
    const legSec = Math.round(legDist * 144);
    totalDistKm += legDist;
    totalSec += legSec;
    orderedSNos.push(s.s_no);

    await prisma.routeStop.update({
      where: { id: st.id },
      data: {
        stop_number: i + 1,
        optimized_sequence: i + 1,
        leg_distance_km: Math.round(legDist * 10) / 10,
        leg_distance_meters: Math.round(legDist * 1000),
        leg_duration_seconds: legSec,
        leg_duration_formatted: `${Math.max(1, Math.ceil(legSec / 60))} min`,
      },
    });

    prevLat = s.latitude;
    prevLng = s.longitude;
  }

  // Return to base leg
  if (stops.length > 0) {
    const returnDist = haversineKm(prevLat, prevLng, BASE_LAT, BASE_LNG);
    const returnSec = Math.round(returnDist * 144);
    totalDistKm += returnDist;
    totalSec += returnSec;
  }

  const totalMin = Math.round(totalSec / 60);

  const updatedPlan = await prisma.routePlan.update({
    where: { id: planId },
    data: {
      total_distance_km: Math.round(totalDistKm * 10) / 10,
      total_distance_meters: Math.round(totalDistKm * 1000),
      total_duration_seconds: totalSec,
      total_duration_formatted: `${totalMin} mins`,
      optimized_order: JSON.stringify(orderedSNos),
    },
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

  return updatedPlan;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, date, schoolId, oldSchoolId, newSchoolId, stopId } = body;

    if (!date) {
      return NextResponse.json({ error: 'Field "date" is required.' }, { status: 400 });
    }

    // Sunday check
    const [y, m, d] = date.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    if (dateObj.getDay() === 0) {
      return NextResponse.json({
        error: 'Sunday is a weekly non-working holiday. Modifying stops on Sunday is not permitted.',
      }, { status: 400 });
    }

    const isSaturday = dateObj.getDay() === 6;

    // Find route plan
    let plan = await prisma.routePlan.findFirst({
      where: { date },
      include: { stops: { include: { school: true } } },
    });

    if (!plan && action !== 'ADD') {
      return NextResponse.json({ error: `No route plan found for date ${date}.` }, { status: 404 });
    }

    // ACTION: REMOVE
    if (action === 'REMOVE') {
      if (!schoolId && !stopId) {
        return NextResponse.json({ error: 'schoolId or stopId required for REMOVE action.' }, { status: 400 });
      }

      const stopToDelete = plan!.stops.find(
        (st) => (stopId && st.id === stopId) || (schoolId && (st.school_id === schoolId || st.school.id === schoolId))
      );

      if (!stopToDelete) {
        return NextResponse.json({ error: 'Specified stop not found on this date route.' }, { status: 404 });
      }

      await prisma.routeStop.delete({
        where: { id: stopToDelete.id },
      });

      const updatedPlan = await recalculatePlanLegs(plan!.id);

      return NextResponse.json({
        success: true,
        message: `Removed ${stopToDelete.school.school_name} from ${date} route.`,
        routePlan: updatedPlan,
      });
    }

    // ACTION: REPLACE
    if (action === 'REPLACE') {
      const targetOldId = oldSchoolId || schoolId;
      const targetNewId = newSchoolId;

      if (!targetOldId || !targetNewId) {
        return NextResponse.json({ error: 'Both oldSchoolId and newSchoolId are required for REPLACE action.' }, { status: 400 });
      }

      const stopToReplace = plan!.stops.find(
        (st) => st.school_id === targetOldId || st.school.id === targetOldId
      );

      if (!stopToReplace) {
        return NextResponse.json({ error: 'Old school stop not found on this date route.' }, { status: 404 });
      }

      const newSchool = await prisma.school.findFirst({
        where: { OR: [{ id: targetNewId }, { school_id: targetNewId }] },
      });

      if (!newSchool) {
        return NextResponse.json({ error: 'New replacement school not found.' }, { status: 404 });
      }

      if (newSchool.visited_by_current_user || newSchool.visit_status === 'VISITED') {
        return NextResponse.json(
          { error: `${newSchool.school_name} has already been visited by representative and cannot be scheduled on an active route plan.` },
          { status: 400 }
        );
      }

      // Check if new school is already in this plan
      if (plan!.stops.some((st) => st.school_id === newSchool.id && st.id !== stopToReplace.id)) {
        return NextResponse.json({ error: `${newSchool.school_name} is already scheduled on ${date}.` }, { status: 400 });
      }

      await prisma.routeStop.update({
        where: { id: stopToReplace.id },
        data: {
          school_id: newSchool.id,
          notes: 'Replaced school stop',
        },
      });

      const updatedPlan = await recalculatePlanLegs(plan!.id);

      return NextResponse.json({
        success: true,
        message: `Replaced ${stopToReplace.school.school_name} with ${newSchool.school_name} on ${date}.`,
        routePlan: updatedPlan,
      });
    }

    // ACTION: ADD
    if (action === 'ADD') {
      const targetSchoolId = schoolId || newSchoolId;
      if (!targetSchoolId) {
        return NextResponse.json({ error: 'schoolId is required for ADD action.' }, { status: 400 });
      }

      const schoolToAdd = await prisma.school.findFirst({
        where: { OR: [{ id: targetSchoolId }, { school_id: targetSchoolId }] },
      });

      if (!schoolToAdd) {
        return NextResponse.json({ error: 'School to add not found in database.' }, { status: 404 });
      }

      if (schoolToAdd.visited_by_current_user || schoolToAdd.visit_status === 'VISITED') {
        return NextResponse.json(
          { error: `${schoolToAdd.school_name} has already been visited by representative and cannot be added to an active route plan.` },
          { status: 400 }
        );
      }

      // If plan doesn't exist, create it
      if (!plan) {
        const settings = await prisma.settings.findFirst({ where: { id: 'default' } });
        plan = await prisma.routePlan.create({
          data: {
            date,
            name: `${isSaturday ? 'Saturday Half-Day Circuit' : 'Field Route Circuit'} (${date})`,
            origin: settings?.base_address || BASE_ADDR,
            origin_lat: settings?.base_latitude || BASE_LAT,
            origin_lng: settings?.base_longitude || BASE_LNG,
            destination: settings?.base_address || BASE_ADDR,
            destination_lat: settings?.base_latitude || BASE_LAT,
            destination_lng: settings?.base_longitude || BASE_LNG,
            travel_mode: 'TWO_WHEELER',
            day_type: isSaturday ? 'HALF_DAY' : 'FULL_DAY',
            status: 'PLANNED',
            optimized_order: '[]',
          },
          include: { stops: { include: { school: true } } },
        });
      }

      const activePlan = plan!;

      // Check if already in plan
      if (activePlan.stops.some((st) => st.school_id === schoolToAdd.id)) {
        return NextResponse.json({ error: `${schoolToAdd.school_name} is already scheduled on ${date}.` }, { status: 400 });
      }

      // Saturday check: max 5
      if (isSaturday && activePlan.stops.length >= 5) {
        return NextResponse.json({
          error: `Saturday is a half-day with maximum 5 schools. This route already has ${activePlan.stops.length} schools.`,
        }, { status: 400 });
      }

      const nextSequence = activePlan.stops.length + 1;

      await prisma.routeStop.create({
        data: {
          route_plan_id: activePlan.id,
          school_id: schoolToAdd.id,
          stop_number: nextSequence,
          optimized_sequence: nextSequence,
          status: 'PENDING',
          notes: 'Added to day circuit',
        },
      });

      const updatedPlan = await recalculatePlanLegs(activePlan.id);

      return NextResponse.json({
        success: true,
        message: `Added ${schoolToAdd.school_name} to ${date} route.`,
        routePlan: updatedPlan,
      });
    }

    return NextResponse.json({ error: `Invalid action "${action}". Must be REMOVE, ADD, or REPLACE.` }, { status: 400 });
  } catch (error: any) {
    console.error('Error modifying route stop:', error);
    return NextResponse.json({ error: 'Failed to modify route stop', details: error.message }, { status: 500 });
  }
}
