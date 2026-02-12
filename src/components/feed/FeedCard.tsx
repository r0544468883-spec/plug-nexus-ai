import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCredits } from '@/contexts/CreditsContext';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SparkleAnimation } from './SparkleAnimation';
import { FeedPollCard } from './FeedPollCard';
import { FeedPost } from './feedMockData';
import { Heart, MessageCircle, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeedCardProps {
  post: FeedPost;
}

export function FeedCard({ post }: FeedCardProps) {
  const { language } = useLanguage();
  const { awardCredits } = useCredits();
  const isRTL = language === 'he';

  const [liked, setLiked] = useState(false);
  const [likeSparkle, setLikeSparkle] = useState(false);
  const [commentSparkle, setCommentSparkle] = useState(false);
  const [localLikes, setLocalLikes] = useState(post.likes);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [localComments, setLocalComments] = useState(post.comments);

  const handleLike = useCallback(async () => {
    if (liked) return;
    setLiked(true);
    setLocalLikes(prev => prev + 1);

    const result = await awardCredits('feed_like');
    if (result.success) {
      setLikeSparkle(true);
      toast.success(isRTL ? '⚡ +1 דלק יומי!' : '⚡ +1 Daily Fuel earned!', {
        duration: 2000,
        style: { background: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' },
      });
      setTimeout(() => setLikeSparkle(false), 600);
    }
  }, [liked, awardCredits, isRTL]);

  const handleComment = useCallback(async () => {
    if (!commentText.trim()) return;
    setLocalComments(prev => prev + 1);
    setCommentText('');
    setShowCommentInput(false);

    const result = await awardCredits('feed_comment');
    if (result.success) {
      setCommentSparkle(true);
      toast.success(isRTL ? '⚡ +1 דלק יומי!' : '⚡ +1 Daily Fuel earned!', {
        duration: 2000,
        style: { background: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' },
      });
      setTimeout(() => setCommentSparkle(false), 600);
    }
  }, [commentText, awardCredits, isRTL]);

  const daysAgo = Math.max(1, Math.floor((Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
  const timeLabel = isRTL ? `לפני ${daysAgo} ימים` : `${daysAgo}d ago`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/20 text-primary font-semibold text-sm">
                {post.recruiterAvatar}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{post.recruiterName}</p>
              <p className="text-xs text-muted-foreground truncate">
                {post.companyName} · {timeLabel}
              </p>
            </div>
          </div>

          {/* Content */}
          <p className="text-sm leading-relaxed mb-3">
            {isRTL ? post.contentHe : post.content}
          </p>

          {/* Poll */}
          {post.postType === 'poll' && post.pollOptions && (
            <FeedPollCard options={post.pollOptions} postId={post.id} />
          )}

          {/* Actions */}
          <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className={cn('gap-1.5 relative', liked && 'text-primary')}
              onClick={handleLike}
            >
              <Heart className={cn('w-4 h-4', liked && 'fill-primary')} />
              <span className="text-xs">{localLikes}</span>
              <SparkleAnimation show={likeSparkle} />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 relative"
              onClick={() => setShowCommentInput(!showCommentInput)}
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs">{localComments}</span>
              <SparkleAnimation show={commentSparkle} />
            </Button>
          </div>

          {/* Comment input */}
          {showCommentInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex gap-2 mt-2"
            >
              <Input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={isRTL ? 'כתוב תגובה...' : 'Write a comment...'}
                className="text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleComment()}
              />
              <Button size="icon" variant="ghost" onClick={handleComment} disabled={!commentText.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
