'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

interface NavbarProps {
  username?: string
}

export default function Navbar({ username }: NavbarProps) {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="bg-[#3b5998] border-b border-[#2d4473]">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-10">
        <Link href="/feed" className="text-white font-bold text-lg tracking-tight">
          socialnetwork
        </Link>
        <nav className="flex items-center gap-4 text-xs text-blue-200">
          <Link href="/feed" className="hover:text-white">home</Link>
          {username && (
            <Link href={`/profile/${username}`} className="hover:text-white">profile</Link>
          )}
          <button onClick={handleLogout} className="hover:text-white cursor-pointer">
            logout
          </button>
        </nav>
      </div>
    </div>
  )
}
