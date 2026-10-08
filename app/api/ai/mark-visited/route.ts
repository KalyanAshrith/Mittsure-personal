import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { AIAssistantService, AIMatchedSchoolItem } from '@/lib/aiAssistant';
import { SchoolData } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      text,
      items: providedItems,
      date = new Date().toISOString().split('T')[0],
      defaultOutcome = 'Interested',
      notes,
    } = body;

    let itemsToProcess: AIMatchedSchoolItem[] = [];

    if (Array.isArray(providedItems) && providedItems.length > 0) {
      itemsToProcess = providedItems.filter((i) => !i.shouldSkipVisit);
    } else if (text && typeof text === 'string' && text.trim().length > 0) {
      const allSchools = await prisma.school.findMany({
        include: {
          visits: {
            where: { is_current_representative: true },
          },
        },
      });

      const parsed = AIAssistantService.parseAndMatchMarkedSchools(
        text,
        allSchools as unknown as SchoolData[],
        { defaultOutcome, targetDate: date }
      );
      itemsToProcess = parsed.items.filter((i) => !i.shouldSkipVisit);
    } else {
      return NextResponse.json(
        { error: 'Either "items" array or "text" string must be provided.' },
        { status: 400 }
      );
    }

    if (itemsToProcess.length === 0) {
      return NextResponse.json(
        { error: 'No schools found to mark as visited.' },
        { status: 400 }
      );
    }

    const recordedVisits = [];
    let firstVisitsCount = 0;
    let revisitsCount = 0;
    let newSchoolsCreatedCount = 0;

    // Fetch existing route plan for that date if available
    const routePlan = await prisma.routePlan.findFirst({
      where: { date },
      include: { stops: true },
    });

    const visitDateTime = new Date(`${date}T16:30:00.000Z`);

    for (const item of itemsToProcess) {
      if (item.shouldSkipVisit) continue;

      let school = item.matchedSchool;
      let isNewSchoolCreated = false;

      // If unmatched, auto-create the new school as requested by the user
      if (!school || !school.id) {
        const candidate =
          item.newSchoolCandidate ||
          AIAssistantService.extractCandidateDetailsFromLine(item.rawInput);

        // Check if school already exists by name
        const existing = await prisma.school.findFirst({
          where: {
            school_name: {
              contains: candidate.school_name.trim(),
            },
          },
          include: {
            visits: {
              where: { is_current_representative: true },
            },
          },
        });

        if (existing) {
          school = existing as unknown as SchoolData;
        } else {
          // Assign next available s_no
          const maxSchool = await prisma.school.findFirst({
            orderBy: { s_no: 'desc' },
            select: { s_no: true },
          });
          const nextSNo = (maxSchool?.s_no || 487) + 1;
          const nextSchoolId = `S-USER-${nextSNo}`;

          const isEarlyYears = [
            'PRE-SCHOOL',
            'PLAY SCHOOL',
            'NURSERY',
            'MONTESSORI',
            'KINDERGARTEN',
          ].includes(candidate.school_type || '');

          const created = await prisma.school.create({
            data: {
              s_no: nextSNo,
              school_id: nextSchoolId,
              school_name: candidate.school_name.trim(),
              school_code: nextSchoolId,
              board: candidate.board || 'STATE BOARD',
              medium: 'English',
              school_type: candidate.school_type || (isEarlyYears ? 'PRE-SCHOOL' : 'PRIMARY'),
              category: isEarlyYears ? 'Pre-Primary' : 'Primary',
              address: candidate.address || `${candidate.school_name}, ${candidate.area}`,
              area: candidate.area || 'Mysuru',
              taluk: candidate.area || 'Mysuru',
              district: candidate.district || 'Mysuru',
              state: 'Karnataka',
              pincode: '570001',
              latitude: 12.3021,
              longitude: 76.6178,
              principal_name: 'Head / Principal',
              contact_person: 'Principal',
              student_strength: 200,
              nursery_available: Boolean(isEarlyYears),
              lkg_available: Boolean(isEarlyYears),
              ukg_available: Boolean(isEarlyYears),
              primary_available: !isEarlyYears,
              secondary_available: false,
              status: 'ACTIVE',
              visit_status: 'VISITED',
              visited_by_current_user: true,
              last_visit_date: visitDateTime,
              priority: 'MEDIUM',
              opportunity_type: isEarlyYears ? 'D' : 'C',
              recommended_programme: isEarlyYears ? 'Junior Power Quest' : 'MOM',
              notes: 'Auto-created via AI Batch and marked visited.',
            },
          });

          school = created as unknown as SchoolData;
          isNewSchoolCreated = true;
          newSchoolsCreatedCount++;
        }
      }

      // Verify if previously visited
      const pastVisits = await prisma.schoolVisit.findMany({
        where: {
          school_id: school.id,
          is_current_representative: true,
        },
      });

      const isRevisit =
        !isNewSchoolCreated &&
        (item.isRevisit || pastVisits.length > 0 || school.visited_by_current_user);
      const visitType = isRevisit ? 'REVISIT' : 'FIRST_VISIT';
      const statusToSet = isRevisit ? 'REVISITED' : 'VISITED';

      if (isRevisit) revisitsCount++;
      else firstVisitsCount++;

      // Strict Zero Assumed Registrations Rule:
      // Only record Registration Confirmed if outcome explicitly set by user
      const finalOutcome = item.proposedOutcome || defaultOutcome || 'Interested';

      // 1. Create SchoolVisit record
      await prisma.schoolVisit.create({
        data: {
          school_id: school.id,
          visit_date: visitDateTime,
          representative: 'Nichhenametla Kalyan Ashrith',
          representative_id: 'KA-REP-01',
          is_current_representative: true,
          visit_type: visitType,
          purpose: isRevisit
            ? 'Field Revisit & Continuous Engagement'
            : 'Field Outreach & Programme Introduction',
          programme_discussed: school.recommended_programme || 'Both',
          contact_person:
            school.contact_person && !school.contact_person.includes('Head')
              ? school.contact_person
              : school.principal_name && !school.principal_name.includes('Head')
              ? school.principal_name
              : 'Principal',
          contact_number: school.phone || school.contact_number,
          designation: 'Principal',
          interest_level: 'High',
          outcome: finalOutcome,
          notes:
            item.notes ||
            notes ||
            (isNewSchoolCreated
              ? `Auto-created and logged as visited from field marked list for ${date}.`
              : `AI Batch Auto-Mark: Logged from field marked list for ${date}.`),
          location_verified: true,
        },
      });

      // 2. Update School record
      await prisma.school.update({
        where: { id: school.id },
        data: {
          visit_status: statusToSet,
          visited_by_current_user: true,
          last_visit_date: visitDateTime,
        },
      });

      // 3. Update matching RouteStop if stop exists on today's route plan
      if (routePlan && routePlan.stops.length > 0) {
        const matchingStop = routePlan.stops.find((s) => s.school_id === school.id);
        if (matchingStop) {
          await prisma.routeStop.update({
            where: { id: matchingStop.id },
            data: {
              status: 'VISITED',
              notes: `AI Marked as visited: ${finalOutcome}`,
            },
          });
        }
      }

      // Purge this school from any FUTURE route plans so visited schools never appear in upcoming circuits
      await prisma.routeStop.deleteMany({
        where: {
          school_id: school.id,
          route_plan: {
            date: { gt: date },
          },
        },
      });

      // Complete any pending/overdue follow-ups for this school
      await prisma.followUp.updateMany({
        where: {
          school_id: school.id,
          status: { not: 'Completed' },
        },
        data: {
          status: 'Completed',
          outcome: `Completed during rep visit: ${finalOutcome}`,
        },
      });

      recordedVisits.push({
        s_no: school.s_no,
        school_id: school.school_id,
        school_name: school.school_name,
        area: school.area,
        board: school.board,
        visit_type: visitType,
        visit_status: statusToSet,
        outcome: finalOutcome,
        isNewSchool: isNewSchoolCreated,
      });
    }

    // Check if all stops in RoutePlan are completed
    if (routePlan) {
      const refreshedPlan = await prisma.routePlan.findUnique({
        where: { id: routePlan.id },
        include: { stops: true },
      });
      if (refreshedPlan && refreshedPlan.stops.every((s) => s.status === 'VISITED')) {
        await prisma.routePlan.update({
          where: { id: routePlan.id },
          data: { status: 'COMPLETED' },
        });
      }
    }

    // 4. Update DailySummary
    const summary = await prisma.dailySummary.findUnique({
      where: { date },
    });

    const totalProcessed = itemsToProcess.length;
    if (summary) {
      await prisma.dailySummary.update({
        where: { date },
        data: {
          schools_visited: summary.schools_visited + firstVisitsCount,
          revisits: summary.revisits + revisitsCount,
          interested: summary.interested + totalProcessed,
          remarks: summary.remarks
            ? `${summary.remarks}; AI Batch logged ${totalProcessed} visits.`
            : `AI Batch logged ${totalProcessed} visits (${firstVisitsCount} new, ${revisitsCount} revisits).`,
        },
      });
    } else {
      await prisma.dailySummary.create({
        data: {
          date,
          schools_planned: totalProcessed,
          schools_visited: firstVisitsCount,
          revisits: revisitsCount,
          interested: totalProcessed,
          remarks: `AI Batch logged ${totalProcessed} visits (${firstVisitsCount} new, ${revisitsCount} revisits).`,
        },
      });
    }

    // Compute updated total unique schools visited
    const totalUniqueVisited = await prisma.school.count({
      where: {
        OR: [
          { visit_status: 'VISITED' },
          { visit_status: 'REVISITED' },
          { visited_by_current_user: true },
        ],
      },
    });

    return NextResponse.json({
      success: true,
      date,
      totalMarked: recordedVisits.length,
      firstVisitsCount,
      revisitsCount,
      newSchoolsCreatedCount,
      totalUniqueVisited,
      assumedRegistrations: 0,
      recordedVisits,
    });
  } catch (error: any) {
    console.error('Error in mark-visited API:', error);
    return NextResponse.json(
      { error: 'Failed to mark schools as visited', details: error.message },
      { status: 500 }
    );
  }
}
