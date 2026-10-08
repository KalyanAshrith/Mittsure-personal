import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { AIAssistantService } from '@/lib/aiAssistant';
import { SchoolData } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'pitch') {
      const { schoolId, programme = 'Both' } = body;
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        include: { visits: true },
      });

      if (!school) {
        return NextResponse.json({ error: 'School not found' }, { status: 404 });
      }

      const pitch = AIAssistantService.generatePitch({
        school: school as unknown as SchoolData,
        targetProgramme: programme,
        pastVisits: school.visits as any,
      });

      return NextResponse.json({ success: true, pitch });
    }

    if (action === 'objection') {
      const { objection, schoolType, board } = body;
      if (!objection) {
        return NextResponse.json({ error: 'Objection text is required' }, { status: 400 });
      }

      const guidance = AIAssistantService.handleObjection({
        objection,
        schoolType,
        board,
      });

      return NextResponse.json({ success: true, guidance });
    }

    if (action === 'route-advice') {
      const { schoolIds, date = new Date().toISOString().split('T')[0], userRemarks } = body;
      const schools = await prisma.school.findMany({
        where: { id: { in: schoolIds || [] } },
      });

      const advice = AIAssistantService.getDailyRouteAdvice({
        date,
        selectedSchools: schools as unknown as SchoolData[],
        userRemarks,
      });

      return NextResponse.json({ success: true, advice });
    }

    return NextResponse.json({ error: 'Invalid AI action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in AI assistant route:', error);
    return NextResponse.json(
      { error: 'AI Assistant operation failed', details: error.message },
      { status: 500 }
    );
  }
}
