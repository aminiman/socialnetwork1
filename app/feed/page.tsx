'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import PostComposer from '@/components/posts/post-composer'
import PostCard from '@/components/posts/post-card'
import type { Post, Profile } from '@/lib/types'

export default function FeedPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: profileData }, { data: postsData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase
          .from('posts')
          .select('*, profiles(*)')
          .order('created_at', { ascending: false })
          .limit(50),
      ])

      setProfile(profileData)
      setPosts(postsData ?? [])
      setLoading(false)
    }

    load()
  }, [router])

  const handleNewPost = (post: Post) => {
    setPosts(prev => [post, ...prev])
  }

  if (loading) {
    return (
      <main className="max-w-xl mx-auto px-4 py-8 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-xl" />
        ))}
      </main>
    )
  }

  return (
    <main className="max-w-xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Feed</h1>
        {profile && (
          <a href={`/profile/${profile.username}`} className="text-sm text-blue-600 hover:underline">
            @{profile.username}
          </a>
        )}
      </div>

      {profile && (
        <div className="mb-4">
          <PostComposer
            userId={profile.id}
            displayName={profile.display_name}
            onPost={handleNewPost}
          />
        </div>
      )}

      <div className="space-y-3">
        {posts.length === 0 ? (
          <p className="text-center text-gray-500 py-12">
            No posts yet — be the first to post!
          </p>
        ) : (
          posts.map(post => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </main>
  )
}
