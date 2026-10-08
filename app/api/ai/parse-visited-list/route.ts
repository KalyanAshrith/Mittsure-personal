import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { AIAssistantService } from '@/lib/aiAssistant';
import { SchoolData } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, date, defaultOutcome = 'Interested' } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Input text is required to parse schools list.' },
        { status: 400 }
      );
    }

    const allSchools = await prisma.school.findMany({
      include: {
        visits: {
          where: { is_current_representative: true },
        },
      },
    });

    const parsedResult = AIAssistantService.parseAndMatchMarkedSchools(
      text,
      allSchools as unknown as SchoolData[],
      {
        defaultOutcome,
        targetDate: date,
      }
    );

    return NextResponse.json({
      success: true,
      result: parsedResult,
    });
  } catch (error: any) {
    console.error('Error in parse-visited-list API:', error);
    return NextResponse.json(
      { error: 'Failed to parse school list', details: error.message },
      { status: 500 }
    );
  }
}
