import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET all markets
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const status = searchParams.get('status') || 'active';

    const where: any = { status };
    if (category && category !== 'All') {
      where.category = category;
    }

    const markets = await prisma.market.findMany({
      where,
      orderBy: {
        totalVolume: 'desc'
      }
    });

    return NextResponse.json({ markets });
  } catch (error) {
    console.error('Error fetching markets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch markets' },
      { status: 500 }
    );
  }
}

// POST create new market (admin only for now)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      title, 
      description, 
      category, 
      endDate,
      yesPrice = 0.5,
      noPrice = 0.5
    } = body;

    // Validation
    if (!title || !description || !category || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const market = await prisma.market.create({
      data: {
        title,
        description,
        category,
        endDate: new Date(endDate),
        yesPrice,
        noPrice,
        status: 'active'
      }
    });

    return NextResponse.json({
      success: true,
      market
    });
  } catch (error) {
    console.error('Error creating market:', error);
    return NextResponse.json(
      { error: 'Failed to create market' },
      { status: 500 }
    );
  }
}