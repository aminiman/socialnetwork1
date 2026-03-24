'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/ui/navbar'
import type { Profile } from '@/lib/types'

export default function EditProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error || !data) { router.push('/feed'); return }

      setProfile(data)
      setDisplayName(data.display_name)
      setBio(data.bio ?? '')
      setLoading(false)
    }
    load()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    setError(null)
    setSuccess(false)

    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim(), bio: bio.trim() || null })
      .eq('id', profile.id)

    if (error) {
      setError('Failed to save changes.')
      setSaving(false)
      return
    }

    setSuccess(true)
    setSaving(false)
    router.push(`/profile/${profile.username}`)
  }

  if (loading) {
    return (
      <>
        <Navbar username={profile?.username} />
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="h-48 bg-gray-200 animate-pulse rounded" />
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar username={profile?.username} />
      <div className="max-w-5xl mx-auto px-4 py-4 flex gap-4">
        <aside className="w-44 shrink-0 space-y-1">
          <div className="bg-[#3b5998] text-white text-xs font-bold px-2 py-1 rounded-t">
            {profile?.display_name}
          </div>
          <div className="bg-white border border-gray-300 rounded-b text-xs divide-y divide-gray-200">
            <Link href={`/profile/${profile?.username}`} className="block px-3 py-2 hover:bg-blue-50 text-[#3b5998]">
              ← My Profile
            </Link>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <div className="bg-white border border-gray-300 rounded">
            <div className="bg-[#3b5998] text-white text-xs font-bold px-3 py-1 rounded-t">
              Edit Profile
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Display name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#3b5998]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Bio</label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  rows={3}
                  placeholder="Tell people about yourself"
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#3b5998]"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              {success && <p className="text-sm text-green-600">Profile updated!</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#3b5998] text-white px-4 py-1.5 rounded text-sm hover:bg-[#2d4473] disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
                <Link
                  href={`/profile/${profile?.username}`}
                  className="px-4 py-1.5 rounded text-sm border border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </main>
      </div>
    </>
  )
}
