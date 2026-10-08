import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyLocation } from '@/lib/haversine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const outcome = searchParams.get('outcome');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: any = {};
    if (schoolId) where.school_id = schoolId;
    if (outcome && outcome !== 'ALL') where.outcome = outcome;

    const visits = await prisma.schoolVisit.findMany({
      where,
      take: limit,
      orderBy: { visit_date: 'desc' },
      include: {
        school: true,
      },
    });

    return NextResponse.json({ visits });
  } catch (error: any) {
    console.error('Error fetching visits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch visits', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      school_id,
      visit_date = new Date(),
      purpose = 'Field Outreach & Programme Introduction',
      programme_discussed = 'Both',
      contact_person,
      contact_number,
      designation,
      interest_level = 'Medium',
      outcome,
      notes,
      latitude,
      longitude,
      follow_up_date,
      follow_up_time,
      registration_status,
      photo_url,
    } = body;

    if (!school_id || !outcome) {
      return NextResponse.json(
        { error: 'School ID and Visit Outcome are required.' },
        { status: 400 }
      );
    }

    // Find the target school
    const school = await prisma.school.findUnique({
      where: { id: school_id },
      include: { visits: true },
    });

    if (!school) {
      return NextResponse.json({ error: 'School not found.' }, { status: 404 });
    }

    // Check if Kalyan already visited this school
    const hasPersonalPreviousVisit = school.visits.some((v: any) => v.is_current_representative);
    const visitType = hasPersonalPreviousVisit ? 'REVISIT' : 'FIRST_VISIT';
    const isRevisit = visitType === 'REVISIT';

    // GPS location verification
    let locationVerified = false;
    let distanceFromSchool: number | null = null;

    if (latitude && longitude && school.latitude && school.longitude) {
      const userSettings = await prisma.settings.findUnique({ where: { id: 'default' } });
      const thresholdRadius = userSettings?.gps_verification_radius_meters || 150;

      const verification = verifyLocation(
        parseFloat(latitude),
        parseFloat(longitude),
        school.latitude,
        school.longitude,
        thresholdRadius
      );
      locationVerified = verification.verified;
      distanceFromSchool = verification.distanceMeters;
    }

    // Parse follow-up date
    const parsedFollowUpDate = follow_up_date ? new Date(follow_up_date) : null;
    const parsedVisitDate = new Date(visit_date);

    // 1. Create the new visit record (NEVER overwrites past visits!)
    const visit = await prisma.schoolVisit.create({
      data: {
        school_id: school.id,
        visit_date: parsedVisitDate,
        representative: 'Nichhenametla Kalyan Ashrith',
        representative_id: 'KA-REP-01',
        is_current_representative: true,
        visit_type: visitType,
        purpose,
        programme_discussed,
        contact_person: contact_person || school.contact_person,
        contact_number: contact_number || school.contact_number,
        designation: designation || 'Principal',
        interest_level,
        outcome,
        notes,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        distance_from_school: distanceFromSchool,
        location_verified: locationVerified,
        follow_up_date: parsedFollowUpDate,
        follow_up_time,
        registration_status,
        photo_url,
      },
    });

    // 2. Determine updated school CRM status
    let updatedSchoolStatus = 'VISITED';
    if (outcome === 'Registration Confirmed' || outcome === 'Registration Discussion') {
      updatedSchoolStatus = 'REGISTRATION';
    } else if (outcome === 'Interested') {
      updatedSchoolStatus = 'INTERESTED';
    } else if (outcome === 'Follow-up Required') {
      updatedSchoolStatus = 'FOLLOW-UP';
    } else if (outcome === 'Not Interested') {
      updatedSchoolStatus = 'NOT INTERESTED';
    } else if (outcome === 'School Closed') {
      updatedSchoolStatus = 'CLOSED';
    }

    // Update School record: flag as visited by current user!
    await prisma.school.update({
      where: { id: school.id },
      data: {
        visit_status: updatedSchoolStatus,
        visited_by_current_user: true,
        last_visit_date: parsedVisitDate,
        next_followup_date: parsedFollowUpDate,
        contact_person: contact_person || school.contact_person,
        contact_number: contact_number || school.contact_number,
      },
    });

    // 3. If follow-up required, create or update FollowUp record
    if (outcome === 'Follow-up Required' && parsedFollowUpDate) {
      await prisma.followUp.create({
        data: {
          school_id: school.id,
          visit_id: visit.id,
          contact_person: contact_person || school.contact_person,
          contact_number: contact_number || school.contact_number,
          due_date: parsedFollowUpDate,
          due_time: follow_up_time || '11:00 AM',
          status: 'Pending',
          priority: 'HIGH',
          notes: notes || 'Scheduled follow-up visit.',
        },
      });
    }

    // 4. Update today's stop status in active RoutePlan if today is planned
    const todayDateStr = parsedVisitDate.toISOString().split('T')[0];
    const todayRoute = await prisma.routePlan.findFirst({
      where: { date: todayDateStr },
      include: { stops: true },
    });

    if (todayRoute) {
      await prisma.routeStop.updateMany({
        where: {
          route_plan_id: todayRoute.id,
          school_id: school.id,
        },
        data: {
          status: 'VISITED',
          notes: `Visited. Outcome: ${outcome}`,
        },
      });
    }

    // Purge this school from any FUTURE route plans so visited schools never appear in upcoming circuits
    await prisma.routeStop.deleteMany({
      where: {
        school_id: school.id,
        route_plan: {
          date: { gt: todayDateStr },
        },
      },
    });

    // 5. Update DailySummary counts
    const isRegistration = outcome.includes('Registration');
    const isInterested = outcome === 'Interested';
    const isFollowup = outcome === 'Follow-up Required';
    const isNotInterested = outcome === 'Not Interested';

    await prisma.dailySummary.upsert({
      where: { date: todayDateStr },
      update: {
        schools_visited: { increment: 1 },
        revisits: isRevisit ? { increment: 1 } : undefined,
        registrations: isRegistration ? { increment: 1 } : undefined,
        interested: isInterested ? { increment: 1 } : undefined,
        followups: isFollowup ? { increment: 1 } : undefined,
        not_interested: isNotInterested ? { increment: 1 } : undefined,
      },
      create: {
        date: todayDateStr,
        schools_visited: 1,
        revisits: isRevisit ? 1 : 0,
        registrations: isRegistration ? 1 : 0,
        interested: isInterested ? 1 : 0,
        followups: isFollowup ? 1 : 0,
        not_interested: isNotInterested ? 1 : 0,
        remarks: `Recorded visit for ${school.school_name}. Outcome: ${outcome}.`,
      },
    });

    return NextResponse.json({
      success: true,
      visit,
      isRevisit,
      locationVerified,
      distanceFromSchool,
      message: isRevisit
        ? `Revisit record saved for ${school.school_name}. Previous visit history preserved.`
        : `Visit saved successfully for ${school.school_name}.`,
    });
  } catch (error: any) {
    console.error('Error saving visit:', error);
    return NextResponse.json(
      { error: 'Failed to record visit', details: error.message },
      { status: 500 }
    );
  }
}
