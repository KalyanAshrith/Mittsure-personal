import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const school = await prisma.school.findFirst({
      where: {
        OR: [{ id: id }, { school_id: id }, { s_no: isNaN(parseInt(id, 10)) ? -1 : parseInt(id, 10) }],
      },
      include: {
        visits: {
          orderBy: { visit_date: 'desc' },
        },
        followups: {
          orderBy: { due_date: 'desc' },
        },
      },
    });

    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    return NextResponse.json({ school });
  } catch (error: any) {
    console.error('Error fetching school details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch school details', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const updated = await prisma.school.update({
      where: { id },
      data: {
        school_name: body.school_name,
        board: body.board,
        school_type: body.school_type,
        address: body.address,
        area: body.area,
        pincode: body.pincode,
        phone: body.phone,
        email: body.email,
        principal_name: body.principal_name,
        contact_person: body.contact_person,
        contact_number: body.contact_number,
        student_strength: body.student_strength ? parseInt(body.student_strength, 10) : undefined,
        priority: body.priority,
        opportunity_type: body.opportunity_type,
        recommended_programme: body.recommended_programme,
        notes: body.notes,
        latitude: body.latitude ? parseFloat(body.latitude) : undefined,
        longitude: body.longitude ? parseFloat(body.longitude) : undefined,
      },
    });

    return NextResponse.json({ success: true, school: updated });
  } catch (error: any) {
    console.error('Error updating school:', error);
    return NextResponse.json(
      { error: 'Failed to update school', details: error.message },
      { status: 500 }
    );
  }
}
