import Link from 'next/link'
import { formatRelativeTime } from '@/lib/utils'
import type { Post } from '@/lib/types'

interface PostCardProps {
  post: Post
}

export default function PostCard({ post }: PostCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">
          {post.profiles?.display_name?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/profile/${post.profiles?.username}`}
              className="font-semibold text-gray-900 hover:underline"
            >
              {post.profiles?.display_name}
            </Link>
            <span className="text-gray-500 text-sm">
              @{post.profiles?.username}
            </span>
            <span className="text-gray-400 text-sm ml-auto">
              {formatRelativeTime(post.created_at)}
            </span>
          </div>
          <p className="mt-1 text-gray-800 whitespace-pre-wrap break-words">
            {post.content}
          </p>
        </div>
      </div>
    </div>
  )
}
