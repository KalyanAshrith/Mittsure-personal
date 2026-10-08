import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('status') || 'ALL'; // ALL, TODAY, OVERDUE, PENDING, COMPLETED

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let where: any = {};

    if (filter === 'TODAY') {
      where = {
        OR: [
          { status: 'Today' },
          {
            due_date: {
              gte: today,
              lt: tomorrow,
            },
            status: { not: 'Completed' },
          },
        ],
      };
    } else if (filter === 'OVERDUE') {
      where = {
        OR: [
          { status: 'Overdue' },
          {
            due_date: { lt: today },
            status: { in: ['Pending', 'Today', 'Overdue'] },
          },
        ],
      };
    } else if (filter === 'PENDING') {
      where = {
        status: { in: ['Pending', 'Today', 'Overdue'] },
      };
    } else if (filter === 'COMPLETED') {
      where = {
        status: 'Completed',
      };
    }

    const followups = await prisma.followUp.findMany({
      where,
      orderBy: { due_date: 'asc' },
      include: {
        school: true,
        visit: true,
      },
    });

    // Categorize counts
    const todayCount = await prisma.followUp.count({
      where: {
        OR: [
          { status: 'Today' },
          {
            due_date: { gte: today, lt: tomorrow },
            status: { not: 'Completed' },
          },
        ],
      },
    });

    const overdueCount = await prisma.followUp.count({
      where: {
        OR: [
          { status: 'Overdue' },
          {
            due_date: { lt: today },
            status: { in: ['Pending', 'Today', 'Overdue'] },
          },
        ],
      },
    });

    const pendingCount = await prisma.followUp.count({
      where: {
        status: { in: ['Pending', 'Today', 'Overdue'] },
      },
    });

    const completedCount = await prisma.followUp.count({
      where: {
        status: 'Completed',
      },
    });

    return NextResponse.json({
      followups,
      counts: {
        today: todayCount,
        overdue: overdueCount,
        pending: pendingCount,
        completed: completedCount,
      },
    });
  } catch (error: any) {
    console.error('Error fetching followups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch followups', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, due_date, due_time, notes, outcome } = body;

    if (!id) {
      return NextResponse.json({ error: 'Follow-up ID is required.' }, { status: 400 });
    }

    const updated = await prisma.followUp.update({
      where: { id },
      data: {
        status: status || undefined,
        due_date: due_date ? new Date(due_date) : undefined,
        due_time: due_time || undefined,
        notes: notes !== undefined ? notes : undefined,
        outcome: outcome || undefined,
      },
      include: {
        school: true,
      },
    });

    return NextResponse.json({ success: true, followup: updated });
  } catch (error: any) {
    console.error('Error updating followup:', error);
    return NextResponse.json(
      { error: 'Failed to update followup', details: error.message },
      { status: 500 }
    );
  }
}
