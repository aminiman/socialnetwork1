'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { formatRelativeTime } from '@/lib/utils'
import type { Comment } from '@/lib/types'

interface CommentSectionProps {
  postId: string
  currentUserId?: string
  currentDisplayName?: string
}

export default function CommentSection({ postId, currentUserId, currentDisplayName }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('comments')
        .select('*, profiles(id, username, display_name, bio, avatar_url, created_at)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
      setComments(data ?? [])
      setLoading(false)
    }
    fetch()
  }, [postId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || !currentUserId || submitting) return
    setSubmitting(true)

    const optimistic: Comment = {
      id: crypto.randomUUID(),
      post_id: postId,
      user_id: currentUserId,
      content: content.trim(),
      created_at: new Date().toISOString(),
      profiles: {
        id: currentUserId,
        display_name: currentDisplayName ?? '',
        username: '',
        bio: null,
        avatar_url: null,
        created_at: new Date().toISOString(),
      },
    }
    setComments(prev => [...prev, optimistic])
    setContent('')

    const supabase = createClient()
    const { error } = await supabase
      .from('comments')
      .insert({ post_id: postId, user_id: currentUserId, content: optimistic.content })

    if (error) {
      setComments(prev => prev.filter(c => c.id !== optimistic.id))
    }
    setSubmitting(false)
  }

  const handleDelete = async (commentId: string) => {
    setComments(prev => prev.filter(c => c.id !== commentId))
    const supabase = createClient()
    await supabase.from('comments').delete().eq('id', commentId)
  }

  return (
    <div className="mt-2 pt-2 border-t border-gray-100">
      {loading ? (
        <div className="h-4 w-24 bg-gray-100 animate-pulse rounded" />
      ) : (
        <div className="space-y-2">
          {comments.map(comment => (
            <div key={comment.id} className="flex gap-2 text-xs">
              <div className="w-6 h-6 rounded bg-blue-100 border border-gray-200 flex items-center justify-center text-[#3b5998] font-bold shrink-0">
                {comment.profiles?.display_name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded px-2 py-1">
                <div className="flex items-baseline gap-2">
                  <Link href={`/profile/${comment.profiles?.username}`} className="font-semibold text-[#3b5998] hover:underline">
                    {comment.profiles?.display_name}
                  </Link>
                  <span className="text-gray-400">{formatRelativeTime(comment.created_at)}</span>
                  {comment.user_id === currentUserId && (
                    <button onClick={() => handleDelete(comment.id)} className="ml-auto text-gray-300 hover:text-red-400">✕</button>
                  )}
                </div>
                <p className="text-gray-800 mt-0.5">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {currentUserId && (
        <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
          <input
            type="text"
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Write a comment…"
            maxLength={280}
            className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#3b5998]"
          />
          <button
            type="submit"
            disabled={!content.trim() || submitting}
            className="bg-[#3b5998] text-white px-3 py-1 rounded text-xs font-medium hover:bg-[#2d4473] disabled:opacity-50"
          >
            Post
          </button>
        </form>
      )}
    </div>
  )
}
