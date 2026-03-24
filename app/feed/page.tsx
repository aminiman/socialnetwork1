'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/ui/navbar'
import PostComposer from '@/components/posts/post-composer'
import PostCard from '@/components/posts/post-card'
import type { Post, Profile } from '@/lib/types'

export default function FeedPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [profileResult, postsResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase
          .from('posts')
          .select('*, profiles(*)')
          .order('created_at', { ascending: false })
          .limit(50),
      ])

      if (profileResult.error) { setFetchError('Failed to load profile.'); setLoading(false); return }
      if (postsResult.error) { setFetchError('Failed to load feed.'); setLoading(false); return }

      setProfile(profileResult.data)
      setPosts(postsResult.data ?? [])
      setLoading(false)
    }
    load()
  }, [router])

  const handleNewPost = (post: Post) => setPosts(prev => [post, ...prev])
  const handlePostRollback = (postId: string) => setPosts(prev => prev.filter(p => p.id !== postId))

  return (
    <>
      <Navbar username={profile?.username} />
      <div className="max-w-5xl mx-auto px-4 py-4 flex gap-4">

        {/* Left sidebar */}
        <aside className="w-44 shrink-0 space-y-1">
          <div className="bg-[#3b5998] text-white text-xs font-bold px-2 py-1 rounded-t">
            {profile?.display_name ?? ''}
          </div>
          <div className="bg-white border border-gray-300 rounded-b text-xs divide-y divide-gray-200">
            <Link href="/feed" className="block px-3 py-2 hover:bg-blue-50 text-[#3b5998]">Home</Link>
            {profile && (
              <Link href={`/profile/${profile.username}`} className="block px-3 py-2 hover:bg-blue-50 text-[#3b5998]">
                My Profile
              </Link>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {fetchError ? (
            <div className="bg-white border border-gray-300 rounded p-6 text-center text-red-600">{fetchError}</div>
          ) : loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-gray-200 animate-pulse rounded" />
              ))}
            </div>
          ) : (
            <>
              {profile && (
                <div className="mb-3">
                  <PostComposer
                    userId={profile.id}
                    displayName={profile.display_name}
                    username={profile.username}
                    onPost={handleNewPost}
                    onPostRollback={handlePostRollback}
                  />
                </div>
              )}
              <div className="space-y-2">
                {posts.length === 0 ? (
                  <div className="bg-white border border-gray-300 rounded p-8 text-center text-gray-500">
                    No posts yet — be the first to post!
                  </div>
                ) : (
                  posts.map(post => <PostCard key={post.id} post={post} />)
                )}
              </div>
            </>
          )}
        </main>

      </div>
    </>
  )
}
