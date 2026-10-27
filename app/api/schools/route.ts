import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { calculateDistanceKm } from '@/lib/haversine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search')?.trim() || '';
    const board = searchParams.get('board') || 'ALL';
    const schoolType = searchParams.get('schoolType') || 'ALL';
    const area = searchParams.get('area') || 'ALL';
    const district = searchParams.get('district') || 'ALL';
    const zone = searchParams.get('zone') || 'ALL';
    const lifecycleStatus = searchParams.get('lifecycleStatus') || 'ALL';
    const visitStatus = searchParams.get('visitStatus') || 'ALL';
    const priority = searchParams.get('priority') || 'ALL';
    const programme = searchParams.get('programme') || 'ALL';
    const baseLat = parseFloat(searchParams.get('baseLat') || '12.3021');
    const baseLng = parseFloat(searchParams.get('baseLng') || '76.6178');
    const maxDistance = parseFloat(searchParams.get('maxDistance') || '0');

    const where: any = {};

    if (zone !== 'ALL') {
      where.zone_type = zone;
    }

    if (lifecycleStatus !== 'ALL') {
      where.lifecycle_status = lifecycleStatus;
    }

    // Search term matching school_name, s_no, school_id, area, phone, principal_name
    if (search) {
      const isNum = !isNaN(parseInt(search, 10));
      const tokens = search.split(/\s+/).filter((t) => t.length >= 3);
      where.OR = [
        { school_name: { contains: search } },
        { school_id: { contains: search } },
        { school_code: { contains: search } },
        { area: { contains: search } },
        { principal_name: { contains: search } },
        { phone: { contains: search } },
        ...(isNum ? [{ s_no: parseInt(search, 10) }] : []),
        ...(tokens.length > 1
          ? tokens.map((t) => ({ school_name: { contains: t } }))
          : []),
      ];
    }

    if (board !== 'ALL') {
      where.board = board;
    }

    if (schoolType !== 'ALL') {
      if (schoolType === 'PRE-SCHOOL') {
        where.school_type = {
          in: ['PRE-SCHOOL', 'PLAY SCHOOL', 'NURSERY', 'MONTESSORI', 'KINDERGARTEN'],
        };
      } else {
        where.school_type = schoolType;
      }
    }

    if (area !== 'ALL') {
      where.area = area;
    }

    if (district !== 'ALL') {
      where.district = district;
    }

    const personallyVisited = searchParams.get('personallyVisited');
    const previousRepVisited = searchParams.get('previousRepVisited');
    const repName = searchParams.get('repName')?.trim() || '';
    const isLeadKalyan =
      !repName || repName.toLowerCase().includes('kalyan') || repName.toLowerCase().includes('ashrith');

    if (isLeadKalyan) {
      if (personallyVisited === 'true') {
        where.visited_by_current_user = true;
      } else if (personallyVisited === 'false') {
        where.visited_by_current_user = false;
      }

      if (visitStatus !== 'ALL') {
        if (visitStatus === 'NOT_VISITED' || visitStatus === 'PERSONALLY_NOT_VISITED') {
          where.visited_by_current_user = false;
        } else if (visitStatus === 'PERSONALLY_COMPLETED' || visitStatus === 'VISITED_ONLY') {
          where.visited_by_current_user = true;
        } else if (visitStatus === 'PREVIOUS_REP_VISITED') {
          where.visited_by_previous_rep = true;
        } else {
          where.visit_status = visitStatus;
        }
      }
    } else {
      // For personal team members, isolate visited state to visits by their name
      if (personallyVisited === 'true' || visitStatus === 'VISITED_ONLY' || visitStatus === 'PERSONALLY_COMPLETED') {
        where.visits = {
          some: { representative: repName },
        };
      } else if (personallyVisited === 'false' || visitStatus === 'NOT_VISITED' || visitStatus === 'PERSONALLY_NOT_VISITED') {
        where.visits = {
          none: { representative: repName },
        };
      }
    }

    if (previousRepVisited === 'true') {
      where.visited_by_previous_rep = true;
    }

    if (priority !== 'ALL') {
      where.priority = priority;
    }

    if (programme !== 'ALL') {
      if (programme === 'MOM') {
        where.recommended_programme = { in: ['MOM', 'Both'] };
      } else if (programme === 'Junior Power Quest') {
        where.recommended_programme = { in: ['Junior Power Quest', 'Both'] };
      } else {
        where.recommended_programme = programme;
      }
    }

    let schools = await prisma.school.findMany({
      where,
      orderBy: { s_no: 'asc' },
      include: {
        visits: {
          orderBy: { visit_date: 'desc' },
        },
        product_discussions: {
          include: { product: true },
        },
        olympiad_records: {
          include: { campaign: true },
        },
      },
    });

    // Compute distance from base and personal visit isolation
    const schoolsWithDist = schools.map((s) => {
      const dist = calculateDistanceKm(baseLat, baseLng, s.latitude, s.longitude);
      const isPersonallyVisited = isLeadKalyan
        ? s.visited_by_current_user
        : s.visits.some((v: any) => v.representative?.toLowerCase() === repName.toLowerCase());

      return {
        ...s,
        distance_from_base_km: dist,
        visited_by_current_user: isPersonallyVisited,
        visit_status: isPersonallyVisited ? 'VISITED' : (isLeadKalyan ? s.visit_status : 'NOT VISITED'),
      };
    });

    // Filter by max distance if requested
    const filteredSchools =
      maxDistance > 0
        ? schoolsWithDist.filter((s) => s.distance_from_base_km <= maxDistance)
        : schoolsWithDist;

    // Get distinct areas for filter dropdown
    const distinctAreas = await prisma.school.findMany({
      select: { area: true },
      distinct: ['area'],
      orderBy: { area: 'asc' },
    });

    // Get distinct districts for filter dropdown
    const distinctDistricts = await prisma.school.findMany({
      select: { district: true },
      distinct: ['district'],
      orderBy: { district: 'asc' },
    });

    // Compute global summary counts across the entire master allotment
    const allMasterSchools = await prisma.school.findMany({
      select: {
        id: true,
        board: true,
        school_type: true,
        district: true,
        priority: true,
        area: true,
        visited_by_current_user: true,
        visit_status: true,
        recommended_programme: true,
      },
    });

    const globalCounts = {
      total: allMasterSchools.length,
      visited: allMasterSchools.filter((s) => s.visited_by_current_user || s.visit_status === 'VISITED').length,
      unvisited: allMasterSchools.filter((s) => !s.visited_by_current_user && s.visit_status !== 'VISITED').length,
      byBoard: {} as Record<string, number>,
      byDistrict: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
      byProgramme: {} as Record<string, number>,
      byArea: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
    };

    allMasterSchools.forEach((s) => {
      if (s.board) globalCounts.byBoard[s.board] = (globalCounts.byBoard[s.board] || 0) + 1;
      if (s.district) globalCounts.byDistrict[s.district] = (globalCounts.byDistrict[s.district] || 0) + 1;
      if (s.school_type) globalCounts.byType[s.school_type] = (globalCounts.byType[s.school_type] || 0) + 1;
      if (s.priority) globalCounts.byPriority[s.priority] = (globalCounts.byPriority[s.priority] || 0) + 1;
      if (s.recommended_programme) globalCounts.byProgramme[s.recommended_programme] = (globalCounts.byProgramme[s.recommended_programme] || 0) + 1;
      if (s.area) globalCounts.byArea[s.area] = (globalCounts.byArea[s.area] || 0) + 1;
      const statusKey = (s.visited_by_current_user || s.visit_status === 'VISITED') ? 'VISITED' : 'NOT_VISITED';
      globalCounts.byStatus[statusKey] = (globalCounts.byStatus[statusKey] || 0) + 1;
    });

    // Compute breakdown counts for the current filtered subset
    const filteredCounts = {
      total: filteredSchools.length,
      visited: filteredSchools.filter((s) => s.visited_by_current_user || s.visit_status === 'VISITED').length,
      unvisited: filteredSchools.filter((s) => !s.visited_by_current_user && s.visit_status !== 'VISITED').length,
      byBoard: {} as Record<string, number>,
      byDistrict: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
      byProgramme: {} as Record<string, number>,
      byArea: {} as Record<string, number>,
    };

    filteredSchools.forEach((s) => {
      if (s.board) filteredCounts.byBoard[s.board] = (filteredCounts.byBoard[s.board] || 0) + 1;
      if (s.district) filteredCounts.byDistrict[s.district] = (filteredCounts.byDistrict[s.district] || 0) + 1;
      if (s.school_type) filteredCounts.byType[s.school_type] = (filteredCounts.byType[s.school_type] || 0) + 1;
      if (s.priority) filteredCounts.byPriority[s.priority] = (filteredCounts.byPriority[s.priority] || 0) + 1;
      if (s.recommended_programme) filteredCounts.byProgramme[s.recommended_programme] = (filteredCounts.byProgramme[s.recommended_programme] || 0) + 1;
      if (s.area) filteredCounts.byArea[s.area] = (filteredCounts.byArea[s.area] || 0) + 1;
    });

    return NextResponse.json({
      schools: filteredSchools,
      totalCount: filteredSchools.length,
      areas: distinctAreas.map((a) => a.area),
      districts: distinctDistricts.map((d) => d.district),
      globalCounts,
      filteredCounts,
    });
  } catch (error: any) {
    console.error('Error fetching schools:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schools', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.school_name || !body.area) {
      return NextResponse.json(
        { error: 'School name and area are required.' },
        { status: 400 }
      );
    }

    // Duplicate detection:
    // First by school_id
    if (body.school_id) {
      const existingId = await prisma.school.findUnique({
        where: { school_id: body.school_id },
      });
      if (existingId) {
        return NextResponse.json(
          { error: `Duplicate detected: School ID ${body.school_id} already exists (${existingId.school_name}).` },
          { status: 409 }
        );
      }
    }

    // Next by normalized name + address
    const normalizedName = body.school_name.trim().toLowerCase();
    const existingName = await prisma.school.findFirst({
      where: {
        school_name: {
          contains: normalizedName,
        },
        area: body.area,
      },
    });

    if (existingName) {
      return NextResponse.json(
        { error: `Potential duplicate school: '${existingName.school_name}' in area '${body.area}' is already in database (S.No #${existingName.s_no}).` },
        { status: 409 }
      );
    }

    // Assign next available s_no
    const maxSNoSchool = await prisma.school.findFirst({
      orderBy: { s_no: 'desc' },
      select: { s_no: true },
    });
    const nextSNo = (maxSNoSchool?.s_no || 487) + 1;
    const nextSchoolId = body.school_id || `S-USER-${nextSNo}`;

    const isVisited = Boolean(body.markVisited);
    const visitDateStr = body.visit_date || new Date().toISOString().split('T')[0];
    const visitDateTime = new Date(`${visitDateStr}T16:30:00.000Z`);
    const finalOutcome = body.outcome || 'Interested';

    const isEarlyYears = ['PRE-SCHOOL', 'PLAY SCHOOL', 'NURSERY', 'MONTESSORI', 'KINDERGARTEN'].includes(
      body.school_type || ''
    );

    const newSchool = await prisma.school.create({
      data: {
        s_no: nextSNo,
        school_id: nextSchoolId,
        school_name: body.school_name.trim(),
        school_code: body.school_code || nextSchoolId,
        board: body.board || 'STATE BOARD',
        medium: body.medium || 'English',
        school_type: body.school_type || (isEarlyYears ? 'PRE-SCHOOL' : 'PRIMARY'),
        category: body.category || (isEarlyYears ? 'Pre-Primary' : 'Primary'),
        address: body.address || `${body.school_name}, ${body.area}`,
        area: body.area,
        taluk: body.taluk || body.area,
        district: body.district || 'Mysuru',
        state: body.state || 'Karnataka',
        pincode: body.pincode || '570001',
        latitude: parseFloat(body.latitude) || 12.3021,
        longitude: parseFloat(body.longitude) || 76.6178,
        phone: body.phone,
        email: body.email,
        website: body.website,
        principal_name: body.principal_name || 'Head / Principal',
        contact_person: body.contact_person || body.principal_name || 'Principal',
        contact_number: body.contact_number || body.phone,
        student_strength: parseInt(body.student_strength, 10) || 200,
        nursery_available: Boolean(body.nursery_available || isEarlyYears),
        lkg_available: Boolean(body.lkg_available || isEarlyYears),
        ukg_available: Boolean(body.ukg_available || isEarlyYears),
        primary_available: body.primary_available ?? !isEarlyYears,
        secondary_available: Boolean(body.secondary_available),
        status: 'ACTIVE',
        visit_status: isVisited ? 'VISITED' : 'NOT VISITED',
        visited_by_current_user: isVisited,
        last_visit_date: isVisited ? visitDateTime : null,
        priority: body.priority || 'MEDIUM',
        opportunity_type: body.opportunity_type || (isEarlyYears ? 'D' : 'C'),
        recommended_programme: body.recommended_programme || (isEarlyYears ? 'Junior Power Quest' : 'MOM'),
        notes: body.notes || (isVisited ? 'Manually added school and marked visited.' : 'Manually added school.'),
      },
    });

    if (isVisited) {
      await prisma.schoolVisit.create({
        data: {
          school_id: newSchool.id,
          visit_date: visitDateTime,
          representative: body.representative || 'Nichhenametla Kalyan Ashrith',
          representative_id: 'KA-REP-01',
          is_current_representative: true,
          visit_type: 'FIRST_VISIT',
          purpose: 'Field Outreach & Programme Introduction',
          programme_discussed: newSchool.recommended_programme || 'Both',
          contact_person: newSchool.contact_person || 'Principal',
          contact_number: newSchool.contact_number || newSchool.phone,
          designation: 'Principal',
          interest_level: 'High',
          outcome: finalOutcome,
          notes: body.visit_notes || body.notes || `Manually added and marked visited on ${visitDateStr}.`,
          location_verified: true,
        },
      });

      // Update DailySummary for that date
      const summary = await prisma.dailySummary.findUnique({
        where: { date: visitDateStr },
      });
      if (summary) {
        await prisma.dailySummary.update({
          where: { date: visitDateStr },
          data: {
            schools_visited: summary.schools_visited + 1,
            interested: summary.interested + 1,
          },
        });
      } else {
        await prisma.dailySummary.create({
          data: {
            date: visitDateStr,
            schools_planned: 1,
            schools_visited: 1,
            revisits: 0,
            interested: 1,
            remarks: `Added and logged visit for school #${newSchool.s_no} (${newSchool.school_name}).`,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      school: newSchool,
      markedVisited: isVisited,
      message: isVisited
        ? `School #${newSchool.s_no} (${newSchool.school_name}) added and marked VISITED.`
        : `School #${newSchool.s_no} (${newSchool.school_name}) added successfully as pending unvisited stop.`,
    });
  } catch (error: any) {
    console.error('Error creating school:', error);
    return NextResponse.json(
      { error: 'Failed to create school', details: error.message },
      { status: 500 }
    );
  }
}
