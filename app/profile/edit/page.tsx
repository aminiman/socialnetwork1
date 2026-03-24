'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/ui/navbar'
import type { Profile } from '@/lib/types'

type EditableFields = Omit<Profile, 'id' | 'username' | 'avatar_url' | 'created_at'>

export default function EditProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fields, setFields] = useState<Partial<EditableFields>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (error || !data) { router.push('/feed'); return }

      setProfile(data)
      setFields({
        display_name: data.display_name,
        bio: data.bio ?? '',
        hometown: data.hometown ?? '',
        relationship_status: data.relationship_status ?? '',
        birthday: data.birthday ?? '',
        interests: data.interests ?? '',
        favorite_music: data.favorite_music ?? '',
        favorite_books: data.favorite_books ?? '',
        favorite_quotes: data.favorite_quotes ?? '',
        activities: data.activities ?? '',
        college: data.college ?? '',
        high_school: data.high_school ?? '',
        employer: data.employer ?? '',
        work_period: data.work_period ?? '',
        work_description: data.work_description ?? '',
      })
      setLoading(false)
    }
    load()
  }, [router])

  const set = (key: keyof EditableFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setFields(prev => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({
      display_name: fields.display_name?.trim() || profile.display_name,
      bio: fields.bio?.trim() || null,
      hometown: fields.hometown?.trim() || null,
      relationship_status: fields.relationship_status?.trim() || null,
      birthday: fields.birthday || null,
      interests: fields.interests?.trim() || null,
      favorite_music: fields.favorite_music?.trim() || null,
      favorite_books: fields.favorite_books?.trim() || null,
      favorite_quotes: fields.favorite_quotes?.trim() || null,
      activities: fields.activities?.trim() || null,
      college: fields.college?.trim() || null,
      high_school: fields.high_school?.trim() || null,
      employer: fields.employer?.trim() || null,
      work_period: fields.work_period?.trim() || null,
      work_description: fields.work_description?.trim() || null,
    }).eq('id', profile.id)

    if (error) { setError('Failed to save changes.'); setSaving(false); return }
    router.push(`/profile/${profile.username}`)
  }

  if (loading) return (
    <>
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="h-96 bg-gray-200 animate-pulse rounded" />
      </div>
    </>
  )

  const inputClass = "w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#3b5998]"
  const labelClass = "block text-xs font-medium text-gray-500 mb-0.5"

  return (
    <>
      <Navbar username={profile?.username} />
      <div className="max-w-5xl mx-auto px-4 py-4 flex gap-4">
        <aside className="w-44 shrink-0 space-y-1">
          <div className="bg-[#3b5998] text-white text-xs font-bold px-2 py-1 rounded-t">{profile?.display_name}</div>
          <div className="bg-white border border-gray-300 rounded-b text-xs">
            <Link href={`/profile/${profile?.username}`} className="block px-3 py-2 hover:bg-blue-50 text-[#3b5998]">← My Profile</Link>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <form onSubmit={handleSubmit} className="space-y-3">

            {/* Account Info */}
            <section className="bg-white border border-gray-300 rounded">
              <div className="bg-[#e8edf5] border-b border-gray-300 text-[#3b5998] text-xs font-bold px-3 py-1">Account Info</div>
              <div className="p-4 grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Display Name</label>
                  <input type="text" value={fields.display_name ?? ''} onChange={set('display_name')} required className={inputClass} />
                </div>
              </div>
            </section>

            {/* Basic Info */}
            <section className="bg-white border border-gray-300 rounded">
              <div className="bg-[#e8edf5] border-b border-gray-300 text-[#3b5998] text-xs font-bold px-3 py-1">Basic Info</div>
              <div className="p-4 grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Relationship Status</label>
                  <select value={fields.relationship_status ?? ''} onChange={set('relationship_status')} className={inputClass}>
                    <option value="">—</option>
                    <option>Single</option>
                    <option>In a Relationship</option>
                    <option>Engaged</option>
                    <option>Married</option>
                    <option>It&apos;s Complicated</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Birthday</label>
                  <input type="date" value={fields.birthday ?? ''} onChange={set('birthday')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Hometown</label>
                  <input type="text" value={fields.hometown ?? ''} onChange={set('hometown')} className={inputClass} />
                </div>
              </div>
            </section>

            {/* Personal Info */}
            <section className="bg-white border border-gray-300 rounded">
              <div className="bg-[#e8edf5] border-b border-gray-300 text-[#3b5998] text-xs font-bold px-3 py-1">Personal Info</div>
              <div className="p-4 grid grid-cols-2 gap-3">
                {([
                  ['activities', 'Activities'],
                  ['interests', 'Interests'],
                  ['favorite_music', 'Favorite Music'],
                  ['favorite_books', 'Favorite Books'],
                  ['favorite_quotes', 'Favorite Quotes'],
                  ['bio', 'About Me'],
                ] as [keyof EditableFields, string][]).map(([key, label]) => (
                  <div key={key} className="col-span-2">
                    <label className={labelClass}>{label}</label>
                    <textarea rows={2} value={(fields[key] as string) ?? ''} onChange={set(key)} className={inputClass + ' resize-none'} />
                  </div>
                ))}
              </div>
            </section>

            {/* Education Info */}
            <section className="bg-white border border-gray-300 rounded">
              <div className="bg-[#e8edf5] border-b border-gray-300 text-[#3b5998] text-xs font-bold px-3 py-1">Education Info</div>
              <div className="p-4 grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>College</label>
                  <input type="text" value={fields.college ?? ''} onChange={set('college')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>High School</label>
                  <input type="text" value={fields.high_school ?? ''} onChange={set('high_school')} className={inputClass} />
                </div>
              </div>
            </section>

            {/* Work Info */}
            <section className="bg-white border border-gray-300 rounded">
              <div className="bg-[#e8edf5] border-b border-gray-300 text-[#3b5998] text-xs font-bold px-3 py-1">Work Info</div>
              <div className="p-4 grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Company</label>
                  <input type="text" value={fields.employer ?? ''} onChange={set('employer')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Time Period</label>
                  <input type="text" placeholder="e.g. 2020 – Present" value={fields.work_period ?? ''} onChange={set('work_period')} className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Description</label>
                  <textarea rows={2} value={fields.work_description ?? ''} onChange={set('work_description')} className={inputClass + ' resize-none'} />
                </div>
              </div>
            </section>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2 pb-4">
              <button type="submit" disabled={saving} className="bg-[#3b5998] text-white px-6 py-2 rounded text-sm font-medium hover:bg-[#2d4473] disabled:opacity-50">
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <Link href={`/profile/${profile?.username}`} className="px-6 py-2 rounded text-sm border border-gray-300 hover:bg-gray-50">
                Cancel
              </Link>
            </div>
          </form>
        </main>
      </div>
    </>
  )
}
