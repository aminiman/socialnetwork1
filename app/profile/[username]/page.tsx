import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import PostList from '@/components/posts/post-list'
import Navbar from '@/components/ui/navbar'
import FollowButton from '@/components/profile/follow-button'
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

  const [postsResult, followersResult, followingResult] = await Promise.all([
    supabase
      .from('posts')
      .select('*, profiles!user_id(*), likes(user_id)')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', profile.id),
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', profile.id),
  ])

  const followerCount = followersResult.count ?? 0
  const followingCount = followingResult.count ?? 0
  const isOwner = user?.id === profile.id

  // Check if current user follows this profile
  let isFollowing = false
  if (user && !isOwner) {
    const { data: followRow } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('following_id', profile.id)
      .single()
    isFollowing = !!followRow
  }

  // Get current user's username for navbar
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
              <div className="w-20 h-20 rounded bg-blue-100 flex items-center justify-center text-[#3b5998] font-bold text-4xl shrink-0 border border-gray-300">
                {profile.display_name[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <table className="text-xs">
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
                        <td className="text-gray-800">{postsResult.data?.length ?? 0}</td>
                      </tr>
                      <tr>
                        <td className="text-gray-500 pr-4 py-0.5">Followers:</td>
                        <td className="text-gray-800">{followerCount}</td>
                      </tr>
                      <tr>
                        <td className="text-gray-500 pr-4 py-0.5">Following:</td>
                        <td className="text-gray-800">{followingCount}</td>
                      </tr>
                    </tbody>
                  </table>
                  {!isOwner && user && (
                    <FollowButton
                      currentUserId={user.id}
                      targetUserId={profile.id}
                      initialFollowing={isFollowing}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Information panel */}
          <div className="bg-white border border-gray-300 rounded mb-3">
            <div className="bg-[#e8edf5] border-b border-gray-300 text-[#3b5998] text-xs font-bold px-3 py-1">
              Information
            </div>
            <div className="p-4 text-xs space-y-4">
              {/* Account Info */}
              <div>
                <p className="font-bold text-[#3b5998] mb-1">Account Info</p>
                <table className="w-full">
                  <tbody>
                    <InfoRow label="Name:" value={profile.display_name} />
                    <InfoRow label="Member since:" value={formatJoinDate(profile.created_at)} />
                  </tbody>
                </table>
              </div>
              {/* Basic Info */}
              {(profile.relationship_status || profile.birthday || profile.hometown) && (
                <div>
                  <p className="font-bold text-[#3b5998] mb-1">Basic Info</p>
                  <table className="w-full">
                    <tbody>
                      <InfoRow label="Relationship Status:" value={profile.relationship_status} />
                      <InfoRow label="Birthday:" value={profile.birthday} />
                      <InfoRow label="Hometown:" value={profile.hometown} />
                    </tbody>
                  </table>
                </div>
              )}
              {/* Personal Info */}
              {(profile.activities || profile.interests || profile.favorite_music || profile.favorite_books || profile.favorite_quotes || profile.bio) && (
                <div>
                  <p className="font-bold text-[#3b5998] mb-1">Personal Info</p>
                  <table className="w-full">
                    <tbody>
                      <InfoRow label="Activities:" value={profile.activities} />
                      <InfoRow label="Interests:" value={profile.interests} />
                      <InfoRow label="Favorite Music:" value={profile.favorite_music} />
                      <InfoRow label="Favorite Books:" value={profile.favorite_books} />
                      <InfoRow label="Favorite Quotes:" value={profile.favorite_quotes} />
                      <InfoRow label="About Me:" value={profile.bio} />
                    </tbody>
                  </table>
                </div>
              )}
              {/* Education Info */}
              {(profile.college || profile.high_school) && (
                <div>
                  <p className="font-bold text-[#3b5998] mb-1">Education Info</p>
                  <table className="w-full">
                    <tbody>
                      <InfoRow label="College:" value={profile.college} />
                      <InfoRow label="High School:" value={profile.high_school} />
                    </tbody>
                  </table>
                </div>
              )}
              {/* Work Info */}
              {(profile.employer || profile.work_period || profile.work_description) && (
                <div>
                  <p className="font-bold text-[#3b5998] mb-1">Work Info</p>
                  <table className="w-full">
                    <tbody>
                      <InfoRow label="Company:" value={profile.employer} />
                      <InfoRow label="Time Period:" value={profile.work_period} />
                      <InfoRow label="Description:" value={profile.work_description} />
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Posts */}
          <div className="bg-white border border-gray-300 rounded">
            <div className="bg-[#3b5998] text-white text-xs font-bold px-3 py-1 rounded-t">
              {profile.display_name}&apos;s Posts
            </div>
            <div className="p-3">
              <PostList
                initialPosts={postsResult.data ?? []}
                currentUserId={user?.id}
              />
            </div>
          </div>

        </main>
      </div>
    </>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <tr>
      <td className="text-gray-500 pr-4 py-0.5 w-36 align-top">{label}</td>
      <td className="text-gray-800 font-semibold">{value}</td>
    </tr>
  )
}
