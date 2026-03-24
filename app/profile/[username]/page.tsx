import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import PostCard from '@/components/posts/post-card'
import { formatJoinDate } from '@/lib/utils'

interface ProfilePageProps {
  params: Promise<{ username: string }>
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  const { data: posts } = await supabase
    .from('posts')
    .select('*, profiles(*)')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })

  const isOwner = user?.id === profile.id

  return (
    <main className="max-w-xl mx-auto px-4 py-8">
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-2xl">
              {profile.display_name[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{profile.display_name}</h1>
              <p className="text-gray-500">@{profile.username}</p>
              {profile.bio && (
                <p className="text-gray-700 mt-1 text-sm">{profile.bio}</p>
              )}
              <p className="text-gray-400 text-sm mt-1">
                Joined {formatJoinDate(profile.created_at)} · {posts?.length ?? 0} posts
              </p>
            </div>
          </div>
          {isOwner && (
            <Link
              href="/profile/edit"
              className="text-sm border border-gray-300 rounded-full px-4 py-1.5 hover:bg-gray-50"
            >
              Edit profile
            </Link>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {!posts || posts.length === 0 ? (
          <p className="text-center text-gray-500 py-12">No posts yet.</p>
        ) : (
          posts.map(post => <PostCard key={post.id} post={post} />)
        )}
      </div>

      <div className="mt-6">
        <Link href="/feed" className="text-sm text-blue-600 hover:underline">
          ← Back to feed
        </Link>
      </div>
    </main>
  )
}
