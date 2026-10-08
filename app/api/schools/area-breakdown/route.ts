import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { calculateDistanceKm, estimateRoadDistanceKm } from '@/lib/haversine';
import { SchoolData } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const statusFilter = searchParams.get('status') || 'ALL'; // ALL, VISITED, UNVISITED
    const boardFilter = searchParams.get('board') || 'ALL';
    const districtFilter = searchParams.get('district') || 'ALL'; // ALL, Mysuru, Chamarajanagar, Mandya
    const sortBy = searchParams.get('sortBy') || 'unvisited'; // unvisited, total, proximity, name

    // Fetch user settings for PG base
    const settings = await prisma.settings.findUnique({ where: { id: 'default' } });
    const baseLat = settings?.base_latitude || 12.3021;
    const baseLng = settings?.base_longitude || 76.6178;

    // Fetch all schools from the master allotment
    const rawSchools = await prisma.school.findMany({
      include: {
        visits: {
          where: { is_current_representative: true },
          orderBy: { visit_date: 'desc' },
          take: 1,
        },
      },
      orderBy: { s_no: 'asc' },
    });

    const schools = districtFilter !== 'ALL'
      ? rawSchools.filter((s) => s.district?.toLowerCase() === districtFilter.toLowerCase())
      : rawSchools;

    // Group schools by Area / Nagar
    const areaMap = new Map<string, {
      areaName: string;
      district: string;
      schools: any[];
      totalSchools: number;
      visitedCount: number;
      unvisitedCount: number;
      cbseCount: number;
      statePreCount: number;
      minDistFromPgKm: number;
      avgDistFromPgKm: number;
    }>();

    for (const s of schools) {
      const areaKey = (s.area || 'Mysuru Central').trim();
      const isVisited = Boolean(s.visited_by_current_user || s.visit_status === 'VISITED');
      const isCbse = s.board === 'CBSE' || s.board === 'ICSE';
      const straightDist = calculateDistanceKm(baseLat, baseLng, s.latitude, s.longitude);
      const roadDist = estimateRoadDistanceKm(baseLat, baseLng, s.latitude, s.longitude);

      const schoolWithMeta = {
        id: s.id,
        s_no: s.s_no,
        school_id: s.school_id,
        school_name: s.school_name,
        board: s.board,
        school_type: s.school_type,
        opportunity_type: s.opportunity_type,
        address: s.address,
        area: s.area,
        district: s.district,
        phone: s.phone || s.contact_number,
        principal_name: s.principal_name,
        contact_person: s.contact_person,
        latitude: s.latitude,
        longitude: s.longitude,
        google_maps_url: s.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${s.latitude},${s.longitude}`,
        visited: isVisited,
        visit_status: isVisited ? 'VISITED' : 'NOT VISITED',
        last_visit_date: s.last_visit_date,
        straight_dist_km: straightDist,
        road_dist_km: roadDist,
      };

      if (!areaMap.has(areaKey)) {
        areaMap.set(areaKey, {
          areaName: areaKey,
          district: s.district || 'Mysuru',
          schools: [],
          totalSchools: 0,
          visitedCount: 0,
          unvisitedCount: 0,
          cbseCount: 0,
          statePreCount: 0,
          minDistFromPgKm: roadDist,
          avgDistFromPgKm: roadDist,
        });
      }

      const entry = areaMap.get(areaKey)!;
      entry.schools.push(schoolWithMeta);
      entry.totalSchools++;
      if (isVisited) entry.visitedCount++;
      else entry.unvisitedCount++;

      if (isCbse) entry.cbseCount++;
      else entry.statePreCount++;

      if (roadDist < entry.minDistFromPgKm) {
        entry.minDistFromPgKm = roadDist;
      }
    }

    // Convert map to array and compute averages
    let areasList = Array.from(areaMap.values()).map((area) => {
      const sumDist = area.schools.reduce((acc, sc) => acc + sc.road_dist_km, 0);
      const avgDist = area.schools.length > 0 ? Math.round((sumDist / area.schools.length) * 10) / 10 : 0;
      const completionRate = area.totalSchools > 0 ? Math.round((area.visitedCount / area.totalSchools) * 100) : 0;

      // Filter schools within area if filters applied
      let filteredSchools = area.schools;
      if (statusFilter === 'VISITED') {
        filteredSchools = filteredSchools.filter((sc) => sc.visited);
      } else if (statusFilter === 'UNVISITED') {
        filteredSchools = filteredSchools.filter((sc) => !sc.visited);
      }

      if (boardFilter !== 'ALL') {
        if (boardFilter === 'CBSE') {
          filteredSchools = filteredSchools.filter((sc) => sc.board === 'CBSE');
        } else if (boardFilter === 'ICSE') {
          filteredSchools = filteredSchools.filter((sc) => sc.board === 'ICSE');
        } else if (boardFilter === 'STATE BOARD') {
          filteredSchools = filteredSchools.filter((sc) => sc.board === 'STATE BOARD');
        } else if (boardFilter === 'PRE-SCHOOL') {
          filteredSchools = filteredSchools.filter((sc) =>
            ['PRE-SCHOOL', 'PLAY SCHOOL', 'NURSERY', 'MONTESSORI', 'KINDERGARTEN'].includes(sc.school_type?.toUpperCase())
          );
        }
      }

      if (search) {
        filteredSchools = filteredSchools.filter((sc) =>
          sc.school_name.toLowerCase().includes(search) ||
          sc.address.toLowerCase().includes(search) ||
          sc.area.toLowerCase().includes(search) ||
          String(sc.s_no).includes(search) ||
          sc.school_id.toLowerCase().includes(search)
        );
      }

      return {
        ...area,
        avgDistFromPgKm: avgDist,
        completionRate,
        schools: filteredSchools,
        filteredCount: filteredSchools.length,
      };
    });

    // Filter out areas with 0 matching schools if a search/filter is active
    if (search || statusFilter !== 'ALL' || boardFilter !== 'ALL') {
      areasList = areasList.filter((a) => a.filteredCount > 0);
    }

    // Sort areas based on requested sort
    if (sortBy === 'unvisited') {
      areasList.sort((a, b) => b.unvisitedCount - a.unvisitedCount || b.totalSchools - a.totalSchools);
    } else if (sortBy === 'total') {
      areasList.sort((a, b) => b.totalSchools - a.totalSchools || b.unvisitedCount - a.unvisitedCount);
    } else if (sortBy === 'visited') {
      areasList.sort((a, b) => b.visitedCount - a.visitedCount || b.totalSchools - a.totalSchools);
    } else if (sortBy === 'proximity') {
      areasList.sort((a, b) => a.minDistFromPgKm - b.minDistFromPgKm);
    } else if (sortBy === 'name') {
      areasList.sort((a, b) => a.areaName.localeCompare(b.areaName));
    }

    // Overall CRM totals
    const totalSchools = schools.length;
    const totalVisited = schools.filter((s) => s.visited_by_current_user || s.visit_status === 'VISITED').length;
    const totalUnvisited = totalSchools - totalVisited;
    const overallCompletionRate = totalSchools > 0 ? Number(((totalVisited / totalSchools) * 100).toFixed(1)) : 0;

    // Districts summary across master database
    const districtsSummary = {
      mysuru: {
        total: rawSchools.filter((s) => s.district?.toLowerCase() === 'mysuru').length,
        visited: rawSchools.filter((s) => s.district?.toLowerCase() === 'mysuru' && (s.visited_by_current_user || s.visit_status === 'VISITED')).length,
      },
      chamarajanagar: {
        total: rawSchools.filter((s) => s.district?.toLowerCase() === 'chamarajanagar').length,
        visited: rawSchools.filter((s) => s.district?.toLowerCase() === 'chamarajanagar' && (s.visited_by_current_user || s.visit_status === 'VISITED')).length,
      },
      mandya: {
        total: rawSchools.filter((s) => s.district?.toLowerCase() === 'mandya').length,
        visited: rawSchools.filter((s) => s.district?.toLowerCase() === 'mandya' && (s.visited_by_current_user || s.visit_status === 'VISITED')).length,
      },
    };

    return NextResponse.json({
      success: true,
      pgBase: {
        latitude: baseLat,
        longitude: baseLng,
        address: settings?.base_address || '661, Sahukar Chennaiah Road, Janatha Nagar, Bogadi 2nd Stage, TK Layout, Mysuru',
      },
      summary: {
        totalAreas: areaMap.size,
        totalSchools,
        totalVisited,
        totalUnvisited,
        overallCompletionRate,
        districtsSummary,
      },
      areas: areasList,
    });
  } catch (error: any) {
    console.error('Error fetching area breakdown:', error);
    return NextResponse.json(
      { error: 'Failed to fetch area breakdown', details: error.message },
      { status: 500 }
    );
  }
}
