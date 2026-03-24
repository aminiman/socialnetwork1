'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

interface FollowButtonProps {
  currentUserId: string
  targetUserId: string
  initialFollowing: boolean
}

export default function FollowButton({ currentUserId, targetUserId, initialFollowing }: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing)
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    const supabase = createClient()

    if (following) {
      setFollowing(false)
      await supabase.from('follows').delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', targetUserId)
    } else {
      setFollowing(true)
      await supabase.from('follows').insert({
        follower_id: currentUserId,
        following_id: targetUserId,
      })
    }
    setLoading(false)
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`text-xs px-4 py-1.5 rounded border font-medium transition-colors disabled:opacity-50 ${
        following
          ? 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-red-50 hover:border-red-300 hover:text-red-600'
          : 'bg-[#3b5998] border-[#3b5998] text-white hover:bg-[#2d4473]'
      }`}
    >
      {following ? 'Unfollow' : '+ Follow'}
    </button>
  )
}
