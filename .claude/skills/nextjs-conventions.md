# Skill: nextjs-conventions
> Correct Next.js App Router patterns for this project.
> Read before creating any component or Route Handler.

---

## The Core Decision: Server or Client Component?

**Default to Server. Add `'use client'` only when you need one of these:**
- `useState` or `useReducer`
- `useEffect`
- Event handlers (`onClick`, `onChange`, `onSubmit`)
- Browser APIs (`window`, `localStorage`, `navigator`)
- Realtime subscriptions (Supabase channel)
- Third-party client libraries that use the above

### Decision tree
```
Does this component need interactivity or browser APIs?
├── No  → Server Component (default, no directive needed)
└── Yes → 'use client' at top of file
           └── Can I extract just the interactive part?
               ├── Yes → Keep parent as Server, extract small Client Component
               └── No  → Whole component is 'use client'
```

### Common mistake: over-using `'use client'`
```typescript
// ❌ Wrong — entire page is client-side for no reason
'use client'
export default async function DashboardPage() {
  const documents = await fetchDocuments() // can't use await in client component anyway
  return <DocumentList documents={documents} />
}

// ✅ Correct — Server Component fetches, Client Component handles interaction
// app/dashboard/page.tsx (Server Component — no directive)
export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: documents } = await supabase.from('documents').select('*')
  return <DocumentList initialDocuments={documents} /> // Client Component below
}

// components/documents/document-list.tsx
'use client'
export function DocumentList({ initialDocuments }: { initialDocuments: Document[] }) {
  const [documents, setDocuments] = useState(initialDocuments)
  // Realtime subscription here
}
```

---

## File Structure Conventions

```
app/
  layout.tsx                    — root layout, providers go here
  page.tsx                      — public landing (redirect to /login)
  login/
    page.tsx                    — Server Component, renders LoginForm
  register/
    page.tsx                    — Server Component, renders RegisterForm
  dashboard/
    page.tsx                    — Server Component, auth check + data fetch
    loading.tsx                 — Suspense fallback (skeleton)
    error.tsx                   — Error boundary ('use client' required)
  officer/
    page.tsx                    — Server Component, role check + data fetch
    loading.tsx
  api/
    documents/
      route.ts                  — GET all documents (officer)
      signed-url/
        route.ts                — GET signed URL for file download
      [id]/
        status/
          route.ts              — PATCH document status (officer action)

components/
  ui/                           — generic: Button, Badge, Modal, Toast
  documents/
    upload-zone.tsx             — 'use client' — file drag/drop
    document-list.tsx           — 'use client' — realtime subscription
    status-badge.tsx            — Server OK (pure display)
  officer/
    review-queue.tsx            — 'use client' — optimistic updates
    flag-dialog.tsx             — 'use client' — modal with form

lib/
  supabase.ts                   — browser client
  supabase-server.ts            — server client
  supabase-admin.ts             — service role (server-only)
  types.ts                      — all TypeScript interfaces
  utils.ts                      — shared helpers (cn(), formatDate(), etc.)
```

---

## Route Handler Templates

### GET with auth check
```typescript
// app/api/documents/route.ts
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createServerSupabaseClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('documents')
    .select('*, profiles(full_name)')
    .order('uploaded_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
```

### PATCH with role check
```typescript
// app/api/documents/[id]/status/route.ts
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import type { DocStatus } from '@/lib/types'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Role check
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'loan_officer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { status, flag_note }: { status: DocStatus; flag_note?: string } = body

  const { data, error } = await supabase
    .from('documents')
    .update({
      status,
      flag_note: flag_note ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
```

### Common Route Handler mistakes to avoid
- ❌ Forgetting `return` before `NextResponse` — function continues executing after response sent
- ❌ Using `getSession()` for auth checks — use `getUser()` which re-validates with the server
- ❌ Not handling the case where `params.id` is undefined
- ❌ Returning 200 for all errors — use proper status codes (401, 403, 404, 500)

---

## Data Fetching Patterns

### Server Component — direct Supabase query (preferred)
```typescript
// app/dashboard/page.tsx
export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: documents, error } = await supabase
    .from('documents')
    .select('*')
    .eq('borrower_id', user.id)
    .order('uploaded_at', { ascending: false })

  if (error) throw error // caught by error.tsx boundary

  return <DocumentList initialDocuments={documents ?? []} userId={user.id} />
}
```

### Client Component — fetch from Route Handler
```typescript
// Only use this when you need client-side refetch (e.g. after upload)
'use client'
const refreshDocuments = async () => {
  const res = await fetch('/api/documents')
  if (!res.ok) throw new Error('Failed to fetch documents')
  const data = await res.json()
  setDocuments(data)
}
```

### Decision rule: Server query vs Route Handler fetch
| Situation | Use |
|---|---|
| Initial page load data | Server Component direct query |
| Data needed after user action (post-upload refresh) | Route Handler fetch |
| Data that updates in real time | Realtime subscription (see supabase-patterns skill) |
| Sensitive operation (delete, status change) | Route Handler with auth check |

---

## Loading and Error States — Required Pattern

Every page that fetches data needs all three files:

```typescript
// app/dashboard/loading.tsx — shown during Server Component fetch
export default function Loading() {
  return (
    <div className="space-y-3">
      {[1,2,3].map(i => (
        <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg" />
      ))}
    </div>
  )
}

// app/dashboard/error.tsx — catches thrown errors from page.tsx
'use client'
export default function Error({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div className="text-center py-12">
      <p className="text-red-600 mb-4">Something went wrong loading your documents.</p>
      <button onClick={reset} className="btn-primary">Try again</button>
    </div>
  )
}
```

### Checklist for code-reviewer agent
- [ ] Every `app/**/page.tsx` that fetches data has a sibling `loading.tsx`
- [ ] Every `app/**/page.tsx` that can throw has a sibling `error.tsx` with `'use client'`
- [ ] All list/table components have an empty state (not just `{documents.map(...)}`)
- [ ] All async Route Handlers have try/catch or check `error` from Supabase response
- [ ] No `useEffect` for data fetching that could be a Server Component instead

---

## TypeScript Conventions

```typescript
// lib/types.ts — single source of truth, import everywhere
export type Role = 'borrower' | 'loan_officer'
export type DocStatus = 'pending' | 'reviewed' | 'flagged' | 'approved'
export type AppStatus = 'open' | 'under_review' | 'closed'

export interface Profile {
  id: string
  full_name: string
  role: Role
  created_at: string
}

export interface Document {
  id: string
  application_id: string
  borrower_id: string
  file_name: string
  file_path: string
  doc_type: string | null
  status: DocStatus
  flag_note: string | null
  uploaded_at: string
  reviewed_at: string | null
}

// Component props — always typed with interface, never inline
interface DocumentListProps {
  initialDocuments: Document[]
  userId: string
}
```

### Rules
- No `any` — if Supabase returns an unknown shape, type it with `as Document`
- No inline prop types — always a named interface
- Supabase responses always destructure `{ data, error }` and check `error` first