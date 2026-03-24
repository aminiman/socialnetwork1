'use client'

import { useState } from 'react'
import PostCard from './post-card'
import type { Post } from '@/lib/types'

interface PostListProps {
  initialPosts: Post[]
  currentUserId?: string
}

export default function PostList({ initialPosts, currentUserId }: PostListProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const handleDelete = (postId: string) => setPosts(prev => prev.filter(p => p.id !== postId))

  if (posts.length === 0) {
    return <p className="text-gray-500 text-center py-6">No posts yet.</p>
  }

  return (
    <div className="space-y-2">
      {posts.map(post => (
        <PostCard
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          onDelete={handleDelete}
        />
      ))}
    </div>
  )
}
