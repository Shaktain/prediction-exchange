import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);

    console.log('Fetching market group with ID:', id); // Debug log

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid market group ID' },
        { status: 400 }
      );
    }

    const marketGroup = await prisma.marketGroup.findUnique({
      where: { id },
      include: {
        markets: {
          orderBy: {
            yesPrice: 'desc'
          }
        }
      }
    });

    if (!marketGroup) {
      return NextResponse.json(
        { error: 'Market group not found' },
        { status: 404 }
      );
    }

    const formattedMarketGroup = {
      id: marketGroup.id,
      question: marketGroup.question,
      description: marketGroup.description,
      category: marketGroup.category,
      thumbnail: marketGroup.thumbnail,
      options: marketGroup.markets.map(m => ({
        id: m.id,
        optionText: m.optionText,
        yesPrice: Number(m.yesPrice),
        noPrice: Number(m.noPrice),
        totalVolume: Number(m.totalVolume),
        resolved: m.resolved,
        outcome: m.outcome
      }))
    };

    return NextResponse.json({ marketGroup: formattedMarketGroup });
  } catch (error) {
    console.error('Error fetching market group:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market group' },
      { status: 500 }
    );
  }
}