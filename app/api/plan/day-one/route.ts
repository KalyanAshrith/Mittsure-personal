import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { PlanningEngine } from '@/lib/planningEngine';
import { SchoolData } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const schools = await prisma.school.findMany({
      orderBy: { s_no: 'asc' },
    });

    const dayOnePlan = PlanningEngine.generateDayOnePlan(schools as unknown as SchoolData[]);

    return NextResponse.json({
      success: true,
      dayOnePlan,
    });
  } catch (error: any) {
    console.error('Error generating Day 1 plan:', error);
    return NextResponse.json(
      { error: 'Failed to generate Day 1 plan', details: error.message },
      { status: 500 }
    );
  }
}
