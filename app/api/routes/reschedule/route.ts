import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_id, target_date, notes } = body;

    if (!school_id || !target_date) {
      return NextResponse.json({ error: 'school_id and target_date are required' }, { status: 400 });
    }

    // Check Sunday holiday rule
    const [y, m, d] = target_date.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    if (dateObj.getDay() === 0) {
      return NextResponse.json({
        error: 'Sunday is a weekly non-working holiday. Please choose a Monday–Saturday date.'
      }, { status: 400 });
    }

    const school = await prisma.school.findUnique({ where: { id: school_id } });
    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    // Find or create route plan for target_date
    let routePlan = await prisma.routePlan.findFirst({
      where: { date: target_date },
      include: { stops: true }
    });

    const isSaturday = dateObj.getDay() === 6;

    if (!routePlan) {
      const settings = await prisma.settings.findFirst({ where: { id: 'default' } });
      routePlan = await prisma.routePlan.create({
        data: {
          date: target_date,
          name: `${isSaturday ? 'Saturday Half-Day Circuit' : 'Field Route Circuit'} (${target_date})`,
          origin: settings?.base_address || 'Bogadi 2nd Stage, Mysuru',
          origin_lat: settings?.base_latitude || 12.3021,
          origin_lng: settings?.base_longitude || 76.6178,
          destination: settings?.base_address || 'Bogadi 2nd Stage, Mysuru',
          destination_lat: settings?.base_latitude || 12.3021,
          destination_lng: settings?.base_longitude || 76.6178,
          travel_mode: 'TWO_WHEELER',
          day_type: isSaturday ? 'HALF_DAY' : 'FULL_DAY',
          optimized_order: '[]',
          status: 'PLANNED'
        },
        include: { stops: true }
      });
    }

    // Check if already in stops
    const alreadyExists = routePlan.stops.some(st => st.school_id === school.id);
    if (alreadyExists) {
      return NextResponse.json({
        success: true,
        message: `${school.school_name} is already scheduled on ${target_date}.`,
        routePlan
      });
    }

    // Check Saturday max 5 rule
    if (isSaturday && routePlan.stops.length >= 5) {
      return NextResponse.json({
        error: `Saturday is a half-day with maximum 5 schools. Currently has ${routePlan.stops.length} schools. Please select a weekday.`
      }, { status: 400 });
    }

    const nextStopNumber = routePlan.stops.length + 1;

    const newStop = await prisma.routeStop.create({
      data: {
        route_plan_id: routePlan.id,
        school_id: school.id,
        stop_number: nextStopNumber,
        optimized_sequence: nextStopNumber,
        status: 'PENDING',
        notes: notes || `Rescheduled revisit by Kalyan Ashrith`
      }
    });

    // Update school visit status to FOLLOW-UP
    await prisma.school.update({
      where: { id: school.id },
      data: {
        visit_status: 'FOLLOW-UP',
        next_followup_date: dateObj
      }
    });

    const updatedPlan = await prisma.routePlan.findUnique({
      where: { id: routePlan.id },
      include: {
        stops: {
          include: { school: true },
          orderBy: { stop_number: 'asc' }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully scheduled revisit for ${school.school_name} on ${target_date}!`,
      stop: newStop,
      routePlan: updatedPlan
    });
  } catch (error: any) {
    console.error('Error rescheduling school:', error);
    return NextResponse.json({ error: 'Failed to reschedule school', details: error.message }, { status: 500 });
  }
}
