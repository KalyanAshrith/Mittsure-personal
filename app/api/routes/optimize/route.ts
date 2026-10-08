import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { GoogleMapsService } from '@/lib/googleMaps';
import { SchoolData, TravelMode } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      origin,
      destination,
      intermediateSchoolIds,
      travelMode = 'TWO_WHEELER',
      date = new Date().toISOString().split('T')[0],
      savePlan = false,
      remarks,
    } = body;

    if (!intermediateSchoolIds || !Array.isArray(intermediateSchoolIds) || intermediateSchoolIds.length === 0) {
      return NextResponse.json(
        { error: 'Please select at least 1 school for route planning.' },
        { status: 400 }
      );
    }

    // Sunday Holiday Check: Route planning is strictly disabled on Sundays
    const [year, month, day] = date ? date.split('-').map(Number) : [2026, 9, 7];
    const targetDate = new Date(year, month - 1, day);
    if (targetDate.getDay() === 0) {
      return NextResponse.json(
        {
          error: 'SUNDAY HOLIDAY: Route planning is disabled on Sundays (Weekly Non-Working Day).',
          isSundayHoliday: true,
        },
        { status: 400 }
      );
    }

    // Fetch school entities
    const schools = await prisma.school.findMany({
      where: {
        id: { in: intermediateSchoolIds },
      },
    });

    if (schools.length === 0) {
      return NextResponse.json(
        { error: 'Selected schools could not be found in database.' },
        { status: 404 }
      );
    }

    const schoolsMap = new Map<string, SchoolData>();
    for (const s of schools) {
      schoolsMap.set(s.id, s as unknown as SchoolData);
    }

    // Default origin/destination to Bogadi base if missing
    const userSettings = await prisma.settings.findUnique({ where: { id: 'default' } });
    const defaultBase = {
      address: userSettings?.base_address || '661, Sahukar Chennaiah Road, Janatha Nagar, Bogadi 2nd Stage, TK Layout, Mysuru 570009',
      lat: userSettings?.base_latitude || 12.3021,
      lng: userSettings?.base_longitude || 76.6178,
    };

    const finalOrigin = origin || defaultBase;
    const finalDestination = destination || defaultBase; // Round trip requirement!

    // Run route optimization
    const optimizationResult = await GoogleMapsService.optimizeRoute(
      {
        origin: finalOrigin,
        destination: finalDestination,
        intermediateSchoolIds,
        travelMode: travelMode as TravelMode,
        date,
      },
      schoolsMap
    );

    // Determine workday type
    let dayType = 'FULL_DAY';
    if (targetDate.getDay() === 6) dayType = 'HALF_DAY';
    else if (targetDate.getDay() === 0) dayType = 'HOLIDAY';

    // If requested, persist route plan in database
    let savedRoutePlan = null;
    if (savePlan) {
      // Check if a plan already exists for this date
      const existingPlan = await prisma.routePlan.findFirst({
        where: { date },
      });

      if (existingPlan && existingPlan.is_locked && !body.forceUnlock) {
        return NextResponse.json(
          {
            error: 'This route plan is locked. Please unlock or click "Edit Plan" before re-optimizing or saving.',
            isLocked: true,
            planId: existingPlan.id,
          },
          { status: 403 }
        );
      }

      const isLockedState = body.is_locked !== undefined
        ? Boolean(body.is_locked)
        : (existingPlan ? existingPlan.is_locked : false);

      if (existingPlan) {
        // Delete old stops
        await prisma.routeStop.deleteMany({
          where: { route_plan_id: existingPlan.id },
        });

        // Update plan
        savedRoutePlan = await prisma.routePlan.update({
          where: { id: existingPlan.id },
          data: {
            origin: finalOrigin.address,
            origin_lat: finalOrigin.lat,
            origin_lng: finalOrigin.lng,
            destination: finalDestination.address,
            destination_lat: finalDestination.lat,
            destination_lng: finalDestination.lng,
            travel_mode: optimizationResult.travelMode,
            total_distance_meters: optimizationResult.totalDistanceMeters,
            total_distance_km: optimizationResult.totalDistanceKm,
            total_duration_seconds: optimizationResult.totalDurationSeconds,
            total_duration_formatted: optimizationResult.totalDurationFormatted,
            optimized_order: JSON.stringify(optimizationResult.optimizedOrder),
            remarks: remarks || existingPlan.remarks,
            is_locked: isLockedState,
            day_type: dayType,
            status: 'PLANNED',
          },
        });
      } else {
        savedRoutePlan = await prisma.routePlan.create({
          data: {
            date,
            name: `${date} - ${optimizationResult.optimizedOrder.length} Schools Round Trip`,
            origin: finalOrigin.address,
            origin_lat: finalOrigin.lat,
            origin_lng: finalOrigin.lng,
            destination: finalDestination.address,
            destination_lat: finalDestination.lat,
            destination_lng: finalDestination.lng,
            travel_mode: optimizationResult.travelMode,
            total_distance_meters: optimizationResult.totalDistanceMeters,
            total_distance_km: optimizationResult.totalDistanceKm,
            total_duration_seconds: optimizationResult.totalDurationSeconds,
            total_duration_formatted: optimizationResult.totalDurationFormatted,
            optimized_order: JSON.stringify(optimizationResult.optimizedOrder),
            remarks: remarks || 'Planned field visits.',
            is_locked: isLockedState,
            day_type: dayType,
            status: 'PLANNED',
          },
        });
      }

      // Create stops
      for (let i = 0; i < optimizationResult.optimizedOrder.length; i++) {
        const schoolId = optimizationResult.optimizedOrder[i];
        const leg = optimizationResult.legs[i];

        await prisma.routeStop.create({
          data: {
            route_plan_id: savedRoutePlan.id,
            school_id: schoolId,
            stop_number: i + 1,
            optimized_sequence: i + 1,
            leg_distance_meters: leg?.distanceMeters,
            leg_distance_km: leg?.distanceKm,
            leg_duration_seconds: leg?.durationSeconds,
            leg_duration_formatted: leg?.durationFormatted,
            status: 'PENDING',
          },
        });
      }

      // Also upsert DailySummary for this date
      await prisma.dailySummary.upsert({
        where: { date },
        update: {
          schools_planned: optimizationResult.optimizedOrder.length,
          total_distance_km: optimizationResult.totalDistanceKm,
          total_travel_time: optimizationResult.totalDurationFormatted,
          remarks: remarks || undefined,
        },
        create: {
          date,
          schools_planned: optimizationResult.optimizedOrder.length,
          total_distance_km: optimizationResult.totalDistanceKm,
          total_travel_time: optimizationResult.totalDurationFormatted,
          remarks: remarks || 'Planned field visits.',
        },
      });
    }

    return NextResponse.json({
      success: true,
      optimization: optimizationResult,
      savedPlan: savedRoutePlan,
    });
  } catch (error: any) {
    console.error('Error in route optimization API:', error);
    return NextResponse.json(
      { error: 'Could not calculate route', details: error.message },
      { status: 500 }
    );
  }
}
