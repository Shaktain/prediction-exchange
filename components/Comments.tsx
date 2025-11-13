// components/Comments.tsx - Using uncontrolled input approach
'use client';
import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Reply, Trash2, Send, Loader2 } from 'lucide-react';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  parentId: string | null;
  user: {
    id: string;
    username: string | null;
    walletAddress: string;
  };
  replies: Comment[];
}

interface CommentsProps {
  marketId?: number;
  marketGroupId?: number;
  userId: string | null;
}

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const getUserDisplay = (user: Comment['user']) => {
  return user.username || `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`;
};

function CommentItem({ 
  comment, 
  isReply = false,
  userId,
  replyingTo,
  submitting,
  onReplyClick,
  onSubmitReply,
  onDeleteComment
}: { 
  comment: Comment; 
  isReply?: boolean;
  userId: string | null;
  replyingTo: string | null;
  submitting: boolean;
  onReplyClick: (commentId: string) => void;
  onSubmitReply: (commentId: string, content: string) => void;
  onDeleteComment: (commentId: string) => void;
}) {
  const isOwner = userId === comment.userId;
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (inputRef.current && inputRef.current.value.trim()) {
      onSubmitReply(comment.id, inputRef.current.value.trim());
      inputRef.current.value = '';
    }
  };

  return (
    <div className={`${isReply ? 'ml-12 mt-3' : 'mt-4'}`}>
      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {getUserDisplay(comment.user).charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <span className="font-semibold text-gray-900">
                {getUserDisplay(comment.user)}
              </span>
              <span className="text-gray-500 text-sm ml-2">
                {formatTimestamp(comment.createdAt)}
              </span>
            </div>
          </div>
          
          {isOwner && (
            <button
              onClick={() => onDeleteComment(comment.id)}
              className="text-gray-400 hover:text-red-600 transition-colors"
              title="Delete comment"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <p className="text-gray-800 whitespace-pre-wrap">{comment.content}</p>

        {!isReply && userId && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <button
              onClick={() => onReplyClick(comment.id)}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 transition-colors"
            >
              <Reply className="w-4 h-4" />
              {replyingTo === comment.id ? 'Cancel' : 'Reply'}
            </button>
          </div>
        )}

        {replyingTo === comment.id && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                defaultValue=""
                placeholder="Write a reply..."
                autoFocus
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmit();
                  }
                  if (e.key === 'Escape') {
                    onReplyClick(comment.id);
                  }
                }}
                disabled={submitting}
              />
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-w-[44px]"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-2">
          {comment.replies.map((reply) => (
            <CommentItem 
              key={reply.id} 
              comment={reply} 
              isReply 
              userId={userId}
              replyingTo={replyingTo}
              submitting={submitting}
              onReplyClick={onReplyClick}
              onSubmitReply={onSubmitReply}
              onDeleteComment={onDeleteComment}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Comments({ marketId, marketGroupId, userId }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchComments();
  }, [marketId, marketGroupId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (marketId) params.append('marketId', marketId.toString());
      if (marketGroupId) params.append('marketGroupId', marketGroupId.toString());
      
      const response = await fetch(`/api/comments?${params}`);
      const data = await response.json();

      if (data.success) {
        setComments(data.comments);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId || !newComment.trim()) return;

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketId: marketId || null,
          marketGroupId: marketGroupId || null,
          userId,
          content: newComment.trim()
        })
      });

      const data = await response.json();

      if (data.success) {
        setNewComment('');
        await fetchComments();
      } else {
        setError(data.error || 'Failed to post comment');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      setError('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplyClick = (commentId: string) => {
    setReplyingTo(replyingTo === commentId ? null : commentId);
  };

  const handleSubmitReply = async (parentId: string, content: string) => {
    if (!userId || !content) return;

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketId: marketId || null,
          marketGroupId: marketGroupId || null,
          userId,
          content,
          parentId
        })
      });

      const data = await response.json();

      if (data.success) {
        setReplyingTo(null);
        await fetchComments();
      } else {
        setError(data.error || 'Failed to post reply');
      }
    } catch (error) {
      console.error('Error posting reply:', error);
      setError('Failed to post reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!userId) return;
    
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const response = await fetch(`/api/comments?commentId=${commentId}&userId=${userId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        await fetchComments();
      } else {
        alert(data.error || 'Failed to delete comment');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment');
    }
  };

  return (
    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 mt-8">
      <div className="flex items-center gap-2 mb-6">
        <MessageCircle className="w-5 h-5 text-gray-700" />
        <h3 className="text-lg font-bold text-gray-900">
          Discussion ({comments.length})
        </h3>
      </div>

      {userId ? (
        <form onSubmit={handleSubmitComment} className="mb-6">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your thoughts..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            maxLength={1000}
            disabled={submitting}
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm text-gray-500">
              {newComment.length}/1000
            </span>
            <button
              type="submit"
              disabled={!newComment.trim() || submitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Post Comment
                </>
              )}
            </button>
          </div>
          {error && (
            <p className="text-sm text-red-600 mt-2">{error}</p>
          )}
        </form>
      ) : (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
          <p className="text-blue-800">Connect your wallet to join the discussion</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-gray-500 mt-2">Loading comments...</p>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8">
          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500">No comments yet. Be the first to share your thoughts!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem 
              key={comment.id} 
              comment={comment}
              userId={userId}
              replyingTo={replyingTo}
              submitting={submitting}
              onReplyClick={handleReplyClick}
              onSubmitReply={handleSubmitReply}
              onDeleteComment={handleDeleteComment}
            />
          ))}
        </div>
      )}
    </div>
  );
}
