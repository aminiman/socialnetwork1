import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import PostList from '@/components/posts/post-list'
import Navbar from '@/components/ui/navbar'
import { formatJoinDate } from '@/lib/utils'

interface ProfilePageProps {
  params: Promise<{ username: string }>
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (profileError || !profile) notFound()

  const { data: posts } = await supabase
    .from('posts')
    .select('*, profiles!user_id(*)')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })

  const isOwner = user?.id === profile.id

  // Reuse already-fetched profile if viewing own page, else fetch current user's username
  let currentUsername: string | undefined
  if (isOwner) {
    currentUsername = profile.username
  } else if (user) {
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single()
    currentUsername = currentProfile?.username
  }

  return (
    <>
      <Navbar username={currentUsername} />
      <div className="max-w-5xl mx-auto px-4 py-4 flex gap-4">

        {/* Left sidebar */}
        <aside className="w-44 shrink-0 space-y-1">
          <div className="bg-[#3b5998] text-white text-xs font-bold px-2 py-1 rounded-t">
            {profile.display_name}
          </div>
          <div className="bg-white border border-gray-300 rounded-b text-xs divide-y divide-gray-200">
            <Link href="/feed" className="block px-3 py-2 hover:bg-blue-50 text-[#3b5998]">← Back to Feed</Link>
            {isOwner && (
              <Link href="/profile/edit" className="block px-3 py-2 hover:bg-blue-50 text-[#3b5998]">
                Edit Profile
              </Link>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">

          {/* Profile header */}
          <div className="bg-white border border-gray-300 rounded mb-3">
            <div className="bg-[#3b5998] text-white text-xs font-bold px-3 py-1 rounded-t">
              {profile.display_name}&apos;s Profile
            </div>
            <div className="p-4 flex gap-4">
              {/* Avatar */}
              <div className="w-20 h-20 rounded bg-blue-100 flex items-center justify-center text-[#3b5998] font-bold text-4xl shrink-0 border border-gray-300">
                {profile.display_name[0].toUpperCase()}
              </div>
              {/* Info */}
              <div className="flex-1">
                <table className="text-xs w-full">
                  <tbody>
                    <tr>
                      <td className="text-gray-500 pr-4 py-0.5 w-32">Name:</td>
                      <td className="font-semibold text-gray-900">{profile.display_name}</td>
                    </tr>
                    <tr>
                      <td className="text-gray-500 pr-4 py-0.5">Username:</td>
                      <td className="text-gray-800">@{profile.username}</td>
                    </tr>
                    {profile.bio && (
                      <tr>
                        <td className="text-gray-500 pr-4 py-0.5">About me:</td>
                        <td className="text-gray-800">{profile.bio}</td>
                      </tr>
                    )}
                    <tr>
                      <td className="text-gray-500 pr-4 py-0.5">Member since:</td>
                      <td className="text-gray-800">{formatJoinDate(profile.created_at)}</td>
                    </tr>
                    <tr>
                      <td className="text-gray-500 pr-4 py-0.5">Posts:</td>
                      <td className="text-gray-800">{posts?.length ?? 0}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Posts */}
          <div className="bg-white border border-gray-300 rounded">
            <div className="bg-[#3b5998] text-white text-xs font-bold px-3 py-1 rounded-t">
              {profile.display_name}&apos;s Posts
            </div>
            <div className="p-3">
              <PostList
                initialPosts={posts ?? []}
                currentUserId={user?.id}
              />
            </div>
          </div>

        </main>
      </div>
    </>
  )
}
