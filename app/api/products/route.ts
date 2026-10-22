import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const category = searchParams.get('category');

    const whereProd: any = { is_active: true };
    if (category && category !== 'ALL') {
      whereProd.category = category;
    }

    const products = await prisma.product.findMany({
      where: whereProd,
      include: {
        books: {
          orderBy: [{ grade: 'asc' }, { subject: 'asc' }],
        },
      },
      orderBy: { created_at: 'asc' },
    });

    let schoolDiscussions: any[] = [];
    if (schoolId) {
      schoolDiscussions = await prisma.schoolProductDiscussion.findMany({
        where: { school_id: schoolId },
        include: { product: true },
        orderBy: { created_at: 'desc' },
      });
    }

    return NextResponse.json({
      products,
      schoolDiscussions,
      totalProducts: products.length,
    });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_id, product_id, interest_level, sample_given, sample_details, notes, visit_id } = body;

    if (!school_id || !product_id) {
      return NextResponse.json(
        { error: 'school_id and product_id are required' },
        { status: 400 }
      );
    }

    const discussion = await prisma.schoolProductDiscussion.create({
      data: {
        school_id,
        product_id,
        visit_id: visit_id || null,
        interest_level: interest_level || 'Interested',
        sample_given: Boolean(sample_given),
        sample_details: sample_details || null,
        notes: notes || null,
      },
      include: {
        product: true,
        school: true,
      },
    });

    return NextResponse.json({
      success: true,
      discussion,
    });
  } catch (error: any) {
    console.error('Error saving product discussion:', error);
    return NextResponse.json(
      { error: 'Failed to record product discussion', details: error.message },
      { status: 500 }
    );
  }
}
