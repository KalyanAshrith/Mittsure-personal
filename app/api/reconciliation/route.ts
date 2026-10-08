import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const totalAssigned = await prisma.school.count();

    const personallyCompletedSchools = await prisma.school.findMany({
      where: { visited_by_current_user: true },
      orderBy: { s_no: 'asc' },
      select: {
        id: true,
        s_no: true,
        school_id: true,
        school_name: true,
        area: true,
        board: true,
        visit_status: true,
        last_visit_date: true,
        visits: {
          where: { is_current_representative: true },
          orderBy: { visit_date: 'desc' },
          take: 1,
          select: {
            outcome: true,
            visit_date: true,
            notes: true,
          }
        }
      }
    });

    const previousRepSchools = await prisma.school.findMany({
      where: {
        visited_by_previous_rep: true,
        visited_by_current_user: false,
      },
      orderBy: { s_no: 'asc' },
      select: {
        id: true,
        s_no: true,
        school_id: true,
        school_name: true,
        area: true,
        previous_rep_visit_date: true,
        previous_rep_notes: true,
      }
    });

    const completedSNoList = personallyCompletedSchools.map(s => s.s_no);
    const completedCount = completedSNoList.length;
    const remainingCount = totalAssigned - completedCount;

    return NextResponse.json({
      totalAssigned,
      completedCount,
      remainingCount,
      completedSNoList,
      completedSchools: personallyCompletedSchools.map(s => ({
        s_no: s.s_no,
        school_id: s.school_id,
        school_name: s.school_name,
        area: s.area,
        board: s.board,
        status: s.visit_status,
        last_visit_date: s.last_visit_date,
        latest_outcome: s.visits[0]?.outcome || 'Visited',
      })),
      previousRepSchools: previousRepSchools.map(s => ({
        s_no: s.s_no,
        school_id: s.school_id,
        school_name: s.school_name,
        area: s.area,
        previous_rep_visit_date: s.previous_rep_visit_date,
        previous_rep_notes: s.previous_rep_notes,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching reconciliation data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reconciliation data', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, importedSNos = [], bulkUpdateSNos = [] } = body;

    // 1. Reconcile comparison
    if (action === 'COMPARE') {
      const currentCompleted = await prisma.school.findMany({
        where: { visited_by_current_user: true },
        select: { s_no: true, school_name: true, area: true },
        orderBy: { s_no: 'asc' },
      });

      const currentSet = new Set<number>(currentCompleted.map((s) => s.s_no));
      const importedSet = new Set<number>(
        importedSNos.map((n: any) => parseInt(n, 10)).filter((n: number) => !isNaN(n))
      );

      const matched: number[] = [];
      const extraInCurrent: number[] = []; // In current DB but not in imported
      const missingInCurrent: number[] = []; // In imported but not marked in current DB

      Array.from(currentSet).forEach((sNo) => {
        if (importedSet.has(sNo)) {
          matched.push(sNo);
        } else {
          extraInCurrent.push(sNo);
        }
      });

      Array.from(importedSet).forEach((sNo) => {
        if (!currentSet.has(sNo)) {
          missingInCurrent.push(sNo);
        }
      });

      // Fetch details of missing schools
      const missingSchools = await prisma.school.findMany({
        where: { s_no: { in: missingInCurrent } },
        select: { s_no: true, school_name: true, area: true, board: true },
        orderBy: { s_no: 'asc' },
      });

      return NextResponse.json({
        success: true,
        currentCount: currentSet.size,
        importedCount: importedSet.size,
        matchedCount: matched.length,
        matched,
        extraInCurrent,
        missingInCurrent,
        missingSchools,
        message: `Comparison completed: ${matched.length} matched, ${missingInCurrent.length} missing in current DB, ${extraInCurrent.length} extra in current DB.`,
      });
    }

    // 2. Apply updates: Accept Imported Data or Add Missing S.Nos
    if (action === 'APPLY_IMPORTED') {
      const sNosToMark = (bulkUpdateSNos.length > 0 ? bulkUpdateSNos : importedSNos)
        .map((n: any) => parseInt(n, 10))
        .filter((n: number) => !isNaN(n));

      if (sNosToMark.length === 0) {
        return NextResponse.json({ error: 'No valid S.Nos provided to update.' }, { status: 400 });
      }

      const updatedSchools = await prisma.school.findMany({
        where: { s_no: { in: sNosToMark } },
      });

      const today = new Date();
      for (const school of updatedSchools) {
        // Create visit if none exists for current rep
        const existingVisit = await prisma.schoolVisit.findFirst({
          where: { school_id: school.id, is_current_representative: true },
        });

        if (!existingVisit) {
          await prisma.schoolVisit.create({
            data: {
              school_id: school.id,
              visit_date: today,
              representative: 'Nichhenametla Kalyan Ashrith',
              representative_id: 'KA-REP-01',
              is_current_representative: true,
              visit_type: 'FIRST_VISIT',
              purpose: 'Reconciled Outreach Visit',
              outcome: 'Interested',
              notes: 'Imported via Data Reconciliation screen.',
              location_verified: true,
            },
          });
        }

        await prisma.school.update({
          where: { id: school.id },
          data: {
            visited_by_current_user: true,
            visit_status: school.visit_status === 'NOT VISITED' ? 'VISITED' : school.visit_status,
            last_visit_date: school.last_visit_date || today,
          },
        });
      }

      const newTotalCompleted = await prisma.school.count({
        where: { visited_by_current_user: true },
      });

      return NextResponse.json({
        success: true,
        updatedCount: updatedSchools.length,
        newTotalCompleted,
        newRemaining: 487 - newTotalCompleted,
        message: `Successfully reconciled and marked ${updatedSchools.length} schools as personally completed. Total completed is now ${newTotalCompleted}.`,
      });
    }

    return NextResponse.json({ error: 'Invalid action parameter. Must be COMPARE or APPLY_IMPORTED.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in reconciliation POST:', error);
    return NextResponse.json(
      { error: 'Failed to process reconciliation', details: error.message },
      { status: 500 }
    );
  }
}
