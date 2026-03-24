'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Post } from '@/lib/types'

const MAX_CHARS = 280

interface PostComposerProps {
  userId: string
  displayName: string
  username: string
  onPost: (post: Post) => void
  onPostRollback: (postId: string) => void
}

export default function PostComposer({ userId, displayName, username, onPost, onPostRollback }: PostComposerProps) {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const remaining = MAX_CHARS - content.length
  const isOverLimit = remaining < 0
  const isEmpty = content.trim().length === 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isEmpty || isOverLimit || loading) return

    setLoading(true)
    setError(null)

    const optimisticPost: Post = {
      id: crypto.randomUUID(),
      user_id: userId,
      content: content.trim(),
      created_at: new Date().toISOString(),
      profiles: {
        id: userId,
        display_name: displayName,
        username,
        bio: null,
        avatar_url: null,
        created_at: new Date().toISOString(),
      },
    }

    onPost(optimisticPost)
    setContent('')

    const supabase = createClient()
    const { error: insertError } = await supabase
      .from('posts')
      .insert({ user_id: userId, content: optimisticPost.content })

    if (insertError) {
      setError('Failed to post. Please try again.')
      onPostRollback(optimisticPost.id)
      setLoading(false)
      return
    }

    setLoading(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-4">
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="What's on your mind?"
        rows={3}
        className="w-full resize-none text-gray-800 placeholder-gray-400 focus:outline-none text-sm"
      />
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
        <span className={`text-sm ${remaining <= 20 ? (isOverLimit ? 'text-red-500 font-medium' : 'text-orange-500') : 'text-gray-400'}`}>
          {remaining}
        </span>
        <div className="flex items-center gap-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={isEmpty || isOverLimit || loading}
            className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>
    </form>
  )
}
