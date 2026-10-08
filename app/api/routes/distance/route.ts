import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { calculateDistanceKm, calculateDistanceMeters, estimateRoadDistanceKm, estimateTravelTime } from '@/lib/haversine';
import { GoogleMapsService } from '@/lib/googleMaps';
import { TravelMode } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { schoolIds, sNos, date, travelMode = 'TWO_WHEELER' } = body;

    // Fetch user settings for PG base
    const settings = await prisma.settings.findUnique({ where: { id: 'default' } });
    const baseLat = settings?.base_latitude || 12.3021;
    const baseLng = settings?.base_longitude || 76.6178;
    const baseAddress = settings?.base_address || '661, Sahukar Chennaiah Road, Janatha Nagar, Bogadi 2nd Stage, TK Layout, Mysuru 570009';

    let targetSchools: any[] = [];

    if (Array.isArray(schoolIds) && schoolIds.length > 0) {
      targetSchools = await prisma.school.findMany({
        where: { id: { in: schoolIds } },
        include: { visits: { orderBy: { visit_date: 'desc' }, take: 1 } }
      });
    } else if (Array.isArray(sNos) && sNos.length > 0) {
      targetSchools = await prisma.school.findMany({
        where: { s_no: { in: sNos.map(Number) } },
        include: { visits: { orderBy: { visit_date: 'desc' }, take: 1 } }
      });
    } else if (date) {
      const plan = await prisma.routePlan.findFirst({
        where: { date },
        include: {
          stops: {
            include: {
              school: {
                include: { visits: { orderBy: { visit_date: 'desc' }, take: 1 } }
              }
            },
            orderBy: { optimized_sequence: 'asc' }
          }
        }
      });
      if (plan && plan.stops) {
        targetSchools = plan.stops.map(st => st.school);
      }
    } else {
      // Default: fetch tomorrow's plan schools or closest unvisited schools
      const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const plan = await prisma.routePlan.findFirst({
        where: { date: tomorrowStr },
        include: {
          stops: {
            include: {
              school: {
                include: { visits: { orderBy: { visit_date: 'desc' }, take: 1 } }
              }
            },
            orderBy: { optimized_sequence: 'asc' }
          }
        }
      });
      if (plan && plan.stops) {
        targetSchools = plan.stops.map(st => st.school);
      } else {
        targetSchools = await prisma.school.findMany({
          where: { visited_by_current_user: false },
          take: 7,
          orderBy: { s_no: 'asc' }
        });
      }
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    const hasApiKey = Boolean(apiKey && apiKey.trim().length > 10);

    const schoolDistances = [];

    for (let i = 0; i < targetSchools.length; i++) {
      const s = targetSchools[i];
      const straightKm = calculateDistanceKm(baseLat, baseLng, s.latitude, s.longitude);
      const straightM = calculateDistanceMeters(baseLat, baseLng, s.latitude, s.longitude);
      const estRoadKm = estimateRoadDistanceKm(baseLat, baseLng, s.latitude, s.longitude);
      const estTime = estimateTravelTime(estRoadKm, travelMode as TravelMode);

      const navUrl = GoogleMapsService.getSchoolNavigationUrl(
        s.latitude,
        s.longitude,
        s.google_place_id,
        travelMode as TravelMode
      );

      const directFromPgUrl = `https://www.google.com/maps/dir/?api=1&origin=${baseLat},${baseLng}&destination=${s.latitude},${s.longitude}&travelmode=${travelMode === 'TWO_WHEELER' ? 'two-wheeler' : 'driving'}`;

      schoolDistances.push({
        s_no: s.s_no,
        school_id: s.school_id,
        school_name: s.school_name,
        board: s.board,
        area: s.area,
        latitude: s.latitude,
        longitude: s.longitude,
        straight_line_distance_km: straightKm,
        straight_line_distance_meters: Math.round(straightM),
        road_distance_km: estRoadKm,
        road_distance_meters: Math.round(estRoadKm * 1000),
        estimated_travel_time: estTime.formatted,
        estimated_duration_seconds: estTime.seconds,
        google_maps_direct_url: directFromPgUrl,
        navigation_url: navUrl,
        visited: s.visited_by_current_user,
        visit_status: s.visit_status
      });
    }

    return NextResponse.json({
      origin: {
        label: 'Bogadi PG Base',
        address: baseAddress,
        latitude: baseLat,
        longitude: baseLng
      },
      travelMode,
      googleMapsApiIntegrated: true,
      hasGoogleMapsApiKey: hasApiKey,
      schoolsCount: schoolDistances.length,
      distances: schoolDistances
    });
  } catch (error: any) {
    console.error('Error calculating distances:', error);
    return NextResponse.json(
      { error: 'Failed to calculate distances', details: error.message },
      { status: 500 }
    );
  }
}
