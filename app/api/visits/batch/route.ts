import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      date,
      planId,
      visits,
      stopIds = [],
      schoolIds = [],
      defaultOutcome = 'Interested',
      revisitSchoolIds = [],
      notes,
    } = body;

    if (!date && (!visits || !Array.isArray(visits) || visits.length === 0)) {
      return NextResponse.json(
        { error: 'Either "date" or "visits" array is required.' },
        { status: 400 }
      );
    }

    const recordedVisits = [];
    const revisitSet = new Set(revisitSchoolIds);
    let firstVisitCount = 0;
    let revisitCount = 0;

    // Mode A: Batch by Date / Plan (Evening Wrap-Up)
    if (date && (!visits || visits.length === 0)) {
      const plan = await prisma.routePlan.findFirst({
        where: planId ? { id: planId } : { date },
        include: { stops: { include: { school: true } } },
      });

      if (!plan || plan.stops.length === 0) {
        return NextResponse.json(
          { error: `No route plan found with stops for ${date}` },
          { status: 404 }
        );
      }

      const stopsToProcess = (Array.isArray(stopIds) && stopIds.length > 0)
        ? plan.stops.filter((s: any) => stopIds.includes(s.id) || stopIds.includes(s.school_id))
        : (Array.isArray(schoolIds) && schoolIds.length > 0)
        ? plan.stops.filter((s: any) => schoolIds.includes(s.school_id) || schoolIds.includes(s.id))
        : plan.stops;

      for (const stop of stopsToProcess) {
        const school = stop.school;
        const visitDate = new Date();

        // Check if Kalyan already visited
        const previousVisits = await prisma.schoolVisit.findMany({
          where: { school_id: school.id, is_current_representative: true },
        });
        const isExplicitRevisit = revisitSet.has(school.id);
        const isRevisit = isExplicitRevisit || previousVisits.length > 0 || school.visited_by_current_user;
        const visitType = isRevisit ? 'REVISIT' : 'FIRST_VISIT';

        if (isRevisit) revisitCount++;
        else firstVisitCount++;

        const visitRecord = await prisma.schoolVisit.create({
          data: {
            school_id: school.id,
            visit_date: visitDate,
            representative: 'Nichhenametla Kalyan Ashrith',
            representative_id: 'KA-REP-01',
            is_current_representative: true,
            visit_type: visitType,
            purpose: isRevisit ? 'Field Revisit & Progress Follow-Up' : 'Field Outreach Visit',
            programme_discussed: school.recommended_programme || 'Both',
            contact_person: (school.contact_person && !school.contact_person.includes('Head'))
              ? school.contact_person
              : (school.principal_name && !school.principal_name.includes('Head'))
              ? school.principal_name
              : 'Principal',
            contact_number: school.phone || school.contact_number,
            designation: 'Principal',
            interest_level: 'High',
            outcome: defaultOutcome,
            notes: notes || `Evening wrap-up: Field visit logged for ${date}.`,
            location_verified: true,
          },
        });

        // Strict rule: NEVER mark as REGISTRATION unless explicitly selected
        const schoolVisitStatus = defaultOutcome === 'Registration Confirmed'
          ? 'REGISTRATION'
          : (isRevisit ? 'REVISITED' : 'VISITED');

        // Update school
        await prisma.school.update({
          where: { id: school.id },
          data: {
            visit_status: schoolVisitStatus,
            visited_by_current_user: true,
            last_visit_date: visitDate,
          },
        });

        // Update stop status
        await prisma.routeStop.update({
          where: { id: stop.id },
          data: { status: 'VISITED' },
        });

        recordedVisits.push(visitRecord);
      }

      // Update plan status to COMPLETED
      await prisma.routePlan.update({
        where: { id: plan.id },
        data: { status: 'COMPLETED' },
      });

      // Upsert DailySummary for date
      await prisma.dailySummary.upsert({
        where: { date },
        update: {
          schools_visited: recordedVisits.length,
          revisits: revisitCount,
          remarks: notes || `Evening wrap-up complete: ${recordedVisits.length} schools visited (${firstVisitCount} first visits, ${revisitCount} revisits).`,
        },
        create: {
          date,
          schools_planned: plan.stops.length,
          schools_visited: recordedVisits.length,
          revisits: revisitCount,
          total_distance_km: plan.total_distance_km,
          total_travel_time: plan.total_duration_formatted,
          remarks: notes || `Evening wrap-up complete: ${recordedVisits.length} schools visited.`,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Evening wrap-up complete: Successfully logged ${recordedVisits.length} visits (${firstVisitCount} first visits, ${revisitCount} revisits) for ${date}.`,
        count: recordedVisits.length,
        firstVisitCount,
        revisitCount,
      });
    }

    // Mode B: Custom visits array with individual notes/outcomes
    for (const v of visits) {
      let school = null;
      if (v.school_id) {
        school = await prisma.school.findUnique({ where: { id: v.school_id } });
      } else if (v.s_no) {
        school = await prisma.school.findUnique({ where: { s_no: Number(v.s_no) } });
      }

      if (!school) continue;

      const visitDate = v.visit_date ? new Date(v.visit_date) : (date ? new Date(`${date}T12:00:00Z`) : new Date());

      const previousVisits = await prisma.schoolVisit.findMany({
        where: { school_id: school.id, is_current_representative: true },
      });
      const isRevisit = previousVisits.length > 0;
      const visitType = isRevisit ? 'REVISIT' : 'FIRST_VISIT';

      const outcome = v.outcome || defaultOutcome;

      const visitRecord = await prisma.schoolVisit.create({
        data: {
          school_id: school.id,
          visit_date: visitDate,
          representative: 'Nichhenametla Kalyan Ashrith',
          representative_id: 'KA-REP-01',
          is_current_representative: true,
          visit_type: visitType,
          purpose: v.purpose || 'Field Outreach Visit',
          programme_discussed: v.programme_discussed || school.recommended_programme || 'Both',
          contact_person: v.contact_person || school.principal_name || 'Principal',
          contact_number: v.contact_number || school.phone,
          designation: v.designation || 'Principal',
          interest_level: v.interest_level || 'High',
          outcome: outcome,
          notes: v.notes || `Field visit recorded for ${school.school_name}.`,
          location_verified: true,
        },
      });

      // Update school
      await prisma.school.update({
        where: { id: school.id },
        data: {
          visit_status: outcome === 'Registration Confirmed' ? 'REGISTRATION' : (outcome === 'Follow-up Required' ? 'FOLLOW-UP' : 'VISITED'),
          visited_by_current_user: true,
          last_visit_date: visitDate,
        },
      });

      // Update any matching RouteStop
      await prisma.routeStop.updateMany({
        where: { school_id: school.id },
        data: { status: 'VISITED' },
      });

      recordedVisits.push(visitRecord);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully logged ${recordedVisits.length} visits.`,
      count: recordedVisits.length,
      visits: recordedVisits,
    });
  } catch (error: any) {
    console.error('Error batch logging visits:', error);
    return NextResponse.json(
      { error: 'Failed to batch log visits', details: error.message },
      { status: 500 }
    );
  }
}
