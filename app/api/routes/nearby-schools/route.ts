import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { calculateDistanceKm } from '@/lib/haversine';
import { getVerifiedProductRecommendation } from '@/lib/recommendationEngine';
import { SchoolData } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const lat = parseFloat(searchParams.get('lat') || '12.3021');
    const lng = parseFloat(searchParams.get('lng') || '76.6178');
    const radiusKm = parseFloat(searchParams.get('radiusKm') || '3.5');
    const filter = searchParams.get('filter') || 'ALL'; // ALL, UNVISITED, REVISIT, EARLY_YEARS
    const excludeIdsStr = searchParams.get('excludeIds') || '';
    const excludeIds = new Set(excludeIdsStr.split(',').filter(Boolean));

    // Fetch all active schools
    const allSchools = await prisma.school.findMany({
      where: { status: 'ACTIVE' },
      include: {
        visits: {
          orderBy: { visit_date: 'desc' },
          take: 1,
        },
      },
    });

    const results = [];

    for (const s of allSchools) {
      if (excludeIds.has(s.id)) continue;

      const dist = calculateDistanceKm(lat, lng, s.latitude, s.longitude);
      if (dist > radiusKm) continue;

      const isVisitedByCurrent = Boolean(
        s.visited_by_current_user || (s.visit_status === 'VISITED' && !s.visited_by_previous_rep)
      );

      const hasPreviousVisits = (s.visits && s.visits.length > 0) || isVisitedByCurrent;
      const isEarlyYears =
        ['PRE-SCHOOL', 'PLAY SCHOOL', 'NURSERY', 'MONTESSORI', 'KINDERGARTEN'].includes(
          s.school_type?.toUpperCase()
        ) ||
        ['D', 'E'].includes(s.opportunity_type) ||
        (s.student_strength !== null && s.student_strength !== undefined && s.student_strength <= 250);

      // Filter modes
      if (filter === 'UNVISITED' && isVisitedByCurrent) continue;
      if (filter === 'REVISIT' && !hasPreviousVisits) continue;
      if (filter === 'EARLY_YEARS' && !isEarlyYears) continue;

      const verifiedPitch = getVerifiedProductRecommendation(s as unknown as SchoolData);

      results.push({
        id: s.id,
        school_id: s.school_id,
        s_no: s.s_no,
        school_name: s.school_name,
        area: s.area,
        district: s.district,
        school_type: s.school_type,
        board: s.board,
        latitude: s.latitude,
        longitude: s.longitude,
        phone: s.phone,
        contact_number: s.contact_number,
        email: s.email,
        contact_person: s.contact_person,
        principal_name: s.principal_name,
        visit_status: s.visit_status,
        visited_by_current_user: isVisitedByCurrent,
        is_revisit_candidate: hasPreviousVisits,
        last_visit_date: s.last_visit_date,
        distanceKm: Number(dist.toFixed(2)),
        verifiedPitch,
        is_early_years: isEarlyYears,
      });
    }

    // Sort by distance ascending
    results.sort((a, b) => a.distanceKm - b.distanceKm);

    return NextResponse.json({
      success: true,
      count: results.length,
      reference: { lat, lng, radiusKm },
      schools: results,
    });
  } catch (error: any) {
    console.error('Error in nearby-schools API:', error);
    return NextResponse.json(
      { error: 'Failed to find nearby schools', details: error.message },
      { status: 500 }
    );
  }
}
