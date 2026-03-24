export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-4 flex gap-4">
      <aside className="w-44 shrink-0">
        <div className="h-6 bg-gray-300 animate-pulse rounded-t" />
        <div className="h-16 bg-gray-200 animate-pulse rounded-b" />
      </aside>
      <div className="flex-1 space-y-3">
        <div className="h-24 bg-gray-200 animate-pulse rounded" />
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-gray-200 animate-pulse rounded" />
        ))}
      </div>
    </div>
  )
}
