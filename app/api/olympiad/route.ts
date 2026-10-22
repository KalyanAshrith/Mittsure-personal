import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    const schoolId = searchParams.get('schoolId');

    const campaigns = await prisma.olympiadCampaign.findMany({
      include: {
        records: {
          include: {
            school: {
              select: {
                id: true,
                school_name: true,
                area: true,
                district: true,
                student_strength: true,
                contact_person: true,
                phone: true,
              },
            },
          },
          orderBy: { updated_at: 'desc' },
        },
      },
    });

    const whereRecord: any = {};
    if (campaignId) whereRecord.campaign_id = campaignId;
    if (schoolId) whereRecord.school_id = schoolId;

    const records = await prisma.olympiadSchoolRecord.findMany({
      where: whereRecord,
      include: {
        campaign: true,
        school: true,
      },
      orderBy: { updated_at: 'desc' },
    });

    // Summary statistics
    const totalIntroduced = await prisma.olympiadSchoolRecord.count({
      where: { status: 'INTRODUCED' },
    });
    const totalProposalSent = await prisma.olympiadSchoolRecord.count({
      where: { status: 'PROPOSAL_SENT' },
    });
    const totalRegistered = await prisma.olympiadSchoolRecord.count({
      where: { status: 'REGISTERED' },
    });

    const studentAggregates = await prisma.olympiadSchoolRecord.aggregate({
      _sum: {
        expected_students: true,
        registered_students: true,
      },
    });

    return NextResponse.json({
      campaigns,
      records,
      summary: {
        totalIntroduced,
        totalProposalSent,
        totalRegistered,
        expectedStudentsTotal: studentAggregates._sum.expected_students || 0,
        registeredStudentsTotal: studentAggregates._sum.registered_students || 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching Olympiad data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Olympiad records', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      campaign_id,
      school_id,
      status = 'INTRODUCED',
      expected_students,
      registered_students,
      coordinator_name,
      coordinator_phone,
      notes,
    } = body;

    if (!campaign_id || !school_id) {
      return NextResponse.json(
        { error: 'campaign_id and school_id are required' },
        { status: 400 }
      );
    }

    // Upsert Olympiad record for school
    const existing = await prisma.olympiadSchoolRecord.findFirst({
      where: { campaign_id, school_id },
    });

    let record;
    if (existing) {
      record = await prisma.olympiadSchoolRecord.update({
        where: { id: existing.id },
        data: {
          status,
          expected_students: expected_students !== undefined ? Number(expected_students) : existing.expected_students,
          registered_students: registered_students !== undefined ? Number(registered_students) : existing.registered_students,
          coordinator_name: coordinator_name !== undefined ? coordinator_name : existing.coordinator_name,
          coordinator_phone: coordinator_phone !== undefined ? coordinator_phone : existing.coordinator_phone,
          notes: notes !== undefined ? notes : existing.notes,
        },
        include: { school: true, campaign: true },
      });
    } else {
      record = await prisma.olympiadSchoolRecord.create({
        data: {
          campaign_id,
          school_id,
          status,
          expected_students: expected_students ? Number(expected_students) : null,
          registered_students: registered_students ? Number(registered_students) : null,
          coordinator_name: coordinator_name || null,
          coordinator_phone: coordinator_phone || null,
          notes: notes || null,
        },
        include: { school: true, campaign: true },
      });
    }

    return NextResponse.json({
      success: true,
      record,
    });
  } catch (error: any) {
    console.error('Error saving Olympiad record:', error);
    return NextResponse.json(
      { error: 'Failed to record Olympiad registration', details: error.message },
      { status: 500 }
    );
  }
}
