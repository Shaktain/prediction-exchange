import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type } = body;

    if (type === 'single') {
      // Create a single standalone market
      const { title, description, category, endDate, yesPrice, noPrice } = body;

      // Validation
      if (!title || !description || !category || !endDate) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        );
      }

      if (title.length > 100) {
        return NextResponse.json(
          { error: 'Title must be 100 characters or less' },
          { status: 400 }
        );
      }

      if (description.length > 500) {
        return NextResponse.json(
          { error: 'Description must be 500 characters or less' },
          { status: 400 }
        );
      }

      const market = await prisma.market.create({
        data: {
          title,
          description,
          category,
          endDate: new Date(endDate),
          yesPrice: yesPrice || 0.5,
          noPrice: noPrice || 0.5,
          status: 'active'
        }
      });

      return NextResponse.json({
        success: true,
        market
      });

    } else if (type === 'multiple') {
      // Create a market group with multiple options
      const { question, description, category, thumbnail, endDate, options } = body;

      // Validation
      if (!question || !description || !category || !endDate || !options || options.length < 2) {
        return NextResponse.json(
          { error: 'Missing required fields or insufficient options' },
          { status: 400 }
        );
      }

      if (question.length > 100) {
        return NextResponse.json(
          { error: 'Question must be 100 characters or less' },
          { status: 400 }
        );
      }

      if (description.length > 500) {
        return NextResponse.json(
          { error: 'Description must be 500 characters or less' },
          { status: 400 }
        );
      }

      // Validate option lengths
      for (const option of options) {
        if (option.text.length > 50) {
          return NextResponse.json(
            { error: 'Each option must be 50 characters or less' },
            { status: 400 }
          );
        }
      }

      // Create market group and all options in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create the market group
        const marketGroup = await tx.marketGroup.create({
          data: {
            question,
            description,
            category,
            thumbnail: thumbnail || '💰'
          }
        });

        // Create all market options
        const markets = await Promise.all(
          options.map((option: any) =>
            tx.market.create({
              data: {
                marketGroupId: marketGroup.id,
                optionText: option.text,
                description,
                category,
                endDate: new Date(endDate),
                yesPrice: option.yesPrice || 0.5,
                noPrice: option.noPrice || 0.5,
                status: 'active'
              }
            })
          )
        );

        return { marketGroup, markets };
      });

      return NextResponse.json({
        success: true,
        marketGroup: result.marketGroup,
        markets: result.markets
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid market type' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error creating market:', error);
    return NextResponse.json(
      { error: 'Failed to create market' },
      { status: 500 }
    );
  }
}