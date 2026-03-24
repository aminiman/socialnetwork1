'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { formatRelativeTime } from '@/lib/utils'
import type { Post } from '@/lib/types'

interface PostCardProps {
  post: Post
  currentUserId?: string
  onDelete?: (postId: string) => void
}

export default function PostCard({ post, currentUserId, onDelete }: PostCardProps) {
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(false)

  const initialLiked = post.likes?.some(l => l.user_id === currentUserId) ?? false
  const initialCount = post.likes?.length ?? 0
  const [liked, setLiked] = useState(initialLiked)
  const [likeCount, setLikeCount] = useState(initialCount)
  const [liking, setLiking] = useState(false)

  const isOwner = currentUserId === post.user_id

  const handleDelete = async () => {
    if (!confirm('Delete this post?')) return
    setDeleting(true)
    setDeleteError(false)
    const supabase = createClient()
    const { error } = await supabase.from('posts').delete().eq('id', post.id)
    if (error) {
      setDeleting(false)
      setDeleteError(true)
      return
    }
    onDelete?.(post.id)
  }

  const handleLike = async () => {
    if (!currentUserId || liking) return
    setLiking(true)

    const supabase = createClient()
    if (liked) {
      setLiked(false)
      setLikeCount(c => c - 1)
      await supabase.from('likes').delete()
        .eq('user_id', currentUserId)
        .eq('post_id', post.id)
    } else {
      setLiked(true)
      setLikeCount(c => c + 1)
      await supabase.from('likes').insert({ user_id: currentUserId, post_id: post.id })
    }
    setLiking(false)
  }

  return (
    <div className="bg-white border border-gray-300 rounded p-3 text-sm">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded bg-blue-100 border border-gray-300 flex items-center justify-center text-[#3b5998] font-bold text-xs shrink-0">
          {post.profiles?.display_name?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <Link
              href={`/profile/${post.profiles?.username}`}
              className="font-semibold text-[#3b5998] hover:underline"
            >
              {post.profiles?.display_name}
            </Link>
            {post.profiles?.username && (
              <span className="text-gray-400 text-xs">@{post.profiles.username}</span>
            )}
            <span className="text-gray-400 text-xs ml-auto">{formatRelativeTime(post.created_at)}</span>
            {isOwner && onDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-gray-300 hover:text-red-500 text-xs disabled:opacity-50 ml-1"
                title="Delete post"
              >
                ✕
              </button>
            )}
          </div>
          <p className="mt-1 text-gray-800 whitespace-pre-wrap break-words">{post.content}</p>
          {deleteError && <p className="text-xs text-red-500 mt-1">Failed to delete. Please try again.</p>}
          <div className="mt-2 flex items-center gap-1">
            <button
              onClick={handleLike}
              disabled={!currentUserId || liking}
              className={`text-xs flex items-center gap-1 px-2 py-0.5 rounded border transition-colors ${
                liked
                  ? 'border-red-300 text-red-500 bg-red-50'
                  : 'border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-400'
              } disabled:opacity-40`}
            >
              ♥ {likeCount > 0 && <span>{likeCount}</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
