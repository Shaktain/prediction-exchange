// app/api/comments/route.ts - Universal API for both markets and market groups
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/comments?marketId=123 OR ?marketGroupId=456
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const marketId = searchParams.get('marketId');
    const marketGroupId = searchParams.get('marketGroupId');

    if (!marketId && !marketGroupId) {
      return NextResponse.json(
        { error: 'Either Market ID or Market Group ID is required' },
        { status: 400 }
      );
    }

    // Build where clause based on what's provided
    const whereClause: any = {
      isDeleted: false
    };

    if (marketId) {
      whereClause.marketId = parseInt(marketId);
    }
    if (marketGroupId) {
      whereClause.marketGroupId = parseInt(marketGroupId);
    }

    // Get all comments (including replies)
    const comments = await prisma.comment.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            walletAddress: true
          }
        },
        replies: {
          where: {
            isDeleted: false
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                walletAddress: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Separate top-level comments from replies
    const topLevelComments = comments.filter(c => !c.parentId);

    return NextResponse.json({
      success: true,
      comments: topLevelComments,
      totalCount: topLevelComments.length
    });

  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

// POST /api/comments - Create new comment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { marketId, marketGroupId, userId, content, parentId } = body;

    if (!userId || !content) {
      return NextResponse.json(
        { error: 'User ID and content are required' },
        { status: 400 }
      );
    }

    if (!marketId && !marketGroupId) {
      return NextResponse.json(
        { error: 'Either Market ID or Market Group ID is required' },
        { status: 400 }
      );
    }

    // Validate content length
    if (content.trim().length < 1 || content.length > 1000) {
      return NextResponse.json(
        { error: 'Comment must be between 1 and 1000 characters' },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify market or market group exists
    if (marketId) {
      const market = await prisma.market.findUnique({
        where: { id: parseInt(marketId) }
      });

      if (!market) {
        return NextResponse.json(
          { error: 'Market not found' },
          { status: 404 }
        );
      }
    }

    if (marketGroupId) {
      const marketGroup = await prisma.marketGroup.findUnique({
        where: { id: parseInt(marketGroupId) }
      });

      if (!marketGroup) {
        return NextResponse.json(
          { error: 'Market group not found' },
          { status: 404 }
        );
      }
    }

    // If parentId provided, verify parent comment exists
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId }
      });

      if (!parentComment) {
        return NextResponse.json(
          { error: 'Parent comment not found' },
          { status: 404 }
        );
      }
    }

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        marketId: marketId ? parseInt(marketId) : null,
        marketGroupId: marketGroupId ? parseInt(marketGroupId) : null,
        userId,
        content: content.trim(),
        parentId: parentId || null
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            walletAddress: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      comment
    });

  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}

// DELETE /api/comments - Delete/soft delete comment
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');
    const userId = searchParams.get('userId');

    if (!commentId || !userId) {
      return NextResponse.json(
        { error: 'Comment ID and user ID are required' },
        { status: 400 }
      );
    }

    // Get comment
    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    // Verify user owns the comment
    if (comment.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized - you can only delete your own comments' },
        { status: 403 }
      );
    }

    // Soft delete the comment
    await prisma.comment.update({
      where: { id: commentId },
      data: { 
        isDeleted: true,
        content: '[deleted]' // Replace content
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Comment deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}