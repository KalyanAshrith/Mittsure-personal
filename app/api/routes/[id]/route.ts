import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const routePlan = await prisma.routePlan.findFirst({
      where: {
        OR: [{ id }, { date: id }],
      },
      include: {
        stops: {
          include: {
            school: {
              include: {
                visits: {
                  orderBy: { visit_date: 'desc' },
                  take: 1,
                },
              },
            },
          },
          orderBy: { optimized_sequence: 'asc' },
        },
      },
    });

    if (!routePlan) {
      return NextResponse.json({ error: 'Route plan not found' }, { status: 404 });
    }

    // Safeguard: For today and future route plans, ensure no visited school appears as a pending stop
    const todayStr = new Date().toISOString().split('T')[0];
    if (routePlan.date >= todayStr && Array.isArray(routePlan.stops)) {
      routePlan.stops = routePlan.stops.filter((st: any) => {
        if (!st.school) return false;
        // If school was visited by current user and stop is still pending, exclude it
        if (st.school.visited_by_current_user && st.status !== 'VISITED') return false;
        return true;
      });
    }

    return NextResponse.json({ routePlan });
  } catch (error: any) {
    console.error('Error fetching route plan:', error);
    return NextResponse.json(
      { error: 'Failed to fetch route plan', details: error.message },
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

    const existing = await prisma.routePlan.findFirst({
      where: {
        OR: [{ id }, { date: id }],
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Route plan not found' }, { status: 404 });
    }

    const updated = await prisma.routePlan.update({
      where: { id: existing.id },
      data: {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.remarks !== undefined && { remarks: body.remarks }),
        ...(body.is_locked !== undefined && { is_locked: Boolean(body.is_locked) }),
        ...(body.day_type !== undefined && { day_type: body.day_type }),
      },
    });

    return NextResponse.json({ success: true, routePlan: updated });
  } catch (error: any) {
    console.error('Error updating route plan:', error);
    return NextResponse.json(
      { error: 'Failed to update route plan', details: error.message },
      { status: 500 }
    );
  }
}
