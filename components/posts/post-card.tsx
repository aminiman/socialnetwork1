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
        </div>
      </div>
    </div>
  )
}
