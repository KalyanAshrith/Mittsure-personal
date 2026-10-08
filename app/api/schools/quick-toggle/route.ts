import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const schoolId = body.schoolId || body.school_id;
    const s_no = body.s_no;
    const targetStatus = body.targetStatus !== undefined ? body.targetStatus : body.visited;

    if (!schoolId && !s_no) {
      return NextResponse.json(
        { error: 'schoolId or s_no is required' },
        { status: 400 }
      );
    }

    // Find school
    const school = await prisma.school.findFirst({
      where: schoolId
        ? { OR: [{ id: schoolId }, { school_id: schoolId }, { school_id: 'School-' + schoolId }] }
        : { s_no: Number(s_no) },
      include: {
        visits: {
          where: { is_current_representative: true },
          orderBy: { visit_date: 'desc' },
          take: 1,
        },
      },
    });

    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    const currentlyVisited = Boolean(school.visited_by_current_user || school.visit_status === 'VISITED');
    const makeVisited = targetStatus !== undefined ? Boolean(targetStatus) : !currentlyVisited;

    if (makeVisited) {
      // Mark as Visited
      const visitDate = new Date();
      await prisma.school.update({
        where: { id: school.id },
        data: {
          visited_by_current_user: true,
          visit_status: 'VISITED',
          last_visit_date: visitDate,
        },
      });

      // Create a clean visit record by Kalyan Ashrith
      await prisma.schoolVisit.create({
        data: {
          school_id: school.id,
          visit_date: visitDate,
          representative: 'Nichhenametla Kalyan Ashrith',
          representative_id: 'KA-REP-01',
          is_current_representative: true,
          visit_type: school.visits.length > 0 ? 'REVISIT' : 'FIRST_VISIT',
          purpose: 'Field Outreach & Programme Introduction',
          programme_discussed: school.recommended_programme || 'Both',
          contact_person: (school.principal_name && !school.principal_name.includes('Head'))
            ? school.principal_name
            : school.contact_person || 'Principal',
          contact_number: school.phone || school.contact_number,
          designation: 'Principal',
          interest_level: 'High',
          outcome: 'Interested', // Strict rule: never assume registration confirmed
          notes: `Marked visited on ${visitDate.toLocaleDateString('en-IN')}.`,
          location_verified: true,
        },
      });

      // Update any active route stop to VISITED
      await prisma.routeStop.updateMany({
        where: { school_id: school.id },
        data: { status: 'VISITED' },
      });
    } else {
      // Mark as Not Visited
      await prisma.school.update({
        where: { id: school.id },
        data: {
          visited_by_current_user: false,
          visit_status: 'NOT VISITED',
          last_visit_date: null,
        },
      });

      // Remove recent visits logged by current representative to prevent ghost counts
      await prisma.schoolVisit.deleteMany({
        where: {
          school_id: school.id,
          is_current_representative: true,
        },
      });

      // Update active route stops back to PENDING
      await prisma.routeStop.updateMany({
        where: { school_id: school.id },
        data: { status: 'PENDING' },
      });
    }

    // Get live updated counts
    const totalAssigned = await prisma.school.count();
    const completed = await prisma.school.count({
      where: { visited_by_current_user: true },
    });
    const remaining = totalAssigned - completed;

    return NextResponse.json({
      success: true,
      schoolId: school.id,
      s_no: school.s_no,
      school_name: school.school_name,
      isVisited: makeVisited,
      status: makeVisited ? 'VISITED' : 'NOT VISITED',
      counts: {
        total: totalAssigned,
        completed,
        remaining,
        completionPercentage: Number(((completed / totalAssigned) * 100).toFixed(1)),
      },
    });
  } catch (error: any) {
    console.error('Error in quick-toggle visit status:', error);
    return NextResponse.json(
      { error: 'Failed to toggle visit status', details: error.message },
      { status: 500 }
    );
  }
}
