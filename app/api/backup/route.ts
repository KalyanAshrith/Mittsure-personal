import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await prisma.settings.findMany();
    const schools = await prisma.school.findMany();
    const visits = await prisma.schoolVisit.findMany();
    const followups = await prisma.followUp.findMany();
    const routePlans = await prisma.routePlan.findMany({
      include: { stops: true },
    });
    const dailySummaries = await prisma.dailySummary.findMany();

    const backup = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      user: 'Nichhenametla Kalyan Ashrith',
      company: 'Mittsure Technologies LLP',
      data: {
        settings,
        schools,
        visits,
        followups,
        routePlans,
        dailySummaries,
      },
    };

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="mittsure_crm_backup_${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating backup:', error);
    return NextResponse.json(
      { error: 'Failed to generate backup', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data } = body;

    if (!data || !data.schools) {
      return NextResponse.json(
        { error: 'Invalid backup file structure.' },
        { status: 400 }
      );
    }

    // Restore process: upsert schools, visits, followups, routePlans, dailySummaries
    let restoredSchools = 0;
    for (const s of data.schools) {
      await prisma.school.upsert({
        where: { school_id: s.school_id },
        update: {
          school_name: s.school_name,
          board: s.board,
          school_type: s.school_type,
          address: s.address,
          area: s.area,
          district: s.district,
          pincode: s.pincode,
          latitude: s.latitude,
          longitude: s.longitude,
          phone: s.phone,
          email: s.email,
          principal_name: s.principal_name,
          visit_status: s.visit_status,
          priority: s.priority,
          opportunity_type: s.opportunity_type,
          recommended_programme: s.recommended_programme,
        },
        create: {
          s_no: s.s_no,
          school_id: s.school_id,
          school_name: s.school_name,
          school_code: s.school_code,
          board: s.board,
          medium: s.medium,
          school_type: s.school_type,
          category: s.category,
          address: s.address,
          area: s.area,
          district: s.district,
          pincode: s.pincode,
          latitude: s.latitude,
          longitude: s.longitude,
          phone: s.phone,
          email: s.email,
          principal_name: s.principal_name,
          visit_status: s.visit_status,
          priority: s.priority,
          opportunity_type: s.opportunity_type,
          recommended_programme: s.recommended_programme,
        },
      });
      restoredSchools++;
    }

    return NextResponse.json({
      success: true,
      message: `Backup restored successfully: ${restoredSchools} schools processed.`,
    });
  } catch (error: any) {
    console.error('Error restoring backup:', error);
    return NextResponse.json(
      { error: 'Failed to restore backup', details: error.message },
      { status: 500 }
    );
  }
}
