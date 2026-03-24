# Skill: supabase-patterns
> Correct Supabase patterns for this stack: Next.js App Router + @supabase/ssr.
> Read this before writing any Supabase code. Agents reference this for verification checklists.

---

## Client Initialization — The One Rule

**There are two clients. Use the right one or auth breaks.**

### Browser client — Client Components only
```typescript
// lib/supabase.ts
import { createBrowserClient } from '@supabase/ssr'

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
```

### Server client — Server Components, Route Handlers, middleware
```typescript
// lib/supabase-server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const createServerSupabaseClient = async () => {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

### Service role client — Route Handlers only, NEVER in Client Components
```typescript
// lib/supabase-admin.ts
import { createClient } from '@supabase/supabase-js'

// Only import this in /app/api/ files — never in components
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // server-only env var
)
```

### Decision rule
| Where is the code running? | Which client? |
|---|---|
| `'use client'` component | `createClient()` from `lib/supabase.ts` |
| Server Component (no `'use client'`) | `createServerSupabaseClient()` |
| Route Handler (`app/api/`) | `createServerSupabaseClient()` or `supabaseAdmin` |
| `middleware.ts` | Inline `createServerClient` with request/response cookies |

---

## Middleware — Copy-Paste Template

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isPublicRoute = 
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/register')

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

---

## Auth — Profile Creation on Signup

### Client-side pattern (use this for interview speed)
```typescript
// app/register/page.tsx — after supabase.auth.signUp succeeds
const { data: authData, error: authError } = await supabase.auth.signUp({
  email,
  password,
})

if (authData.user) {
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: authData.user.id,
      full_name: fullName,
      role: selectedRole, // 'borrower' | 'loan_officer'
    })

  if (profileError) throw new Error(`Profile creation failed: ${profileError.message}`)
}
```

### Getting the current user's role (Server Component)
```typescript
const supabase = await createServerSupabaseClient()
const { data: { user } } = await supabase.auth.getUser()

if (!user) redirect('/login')

const { data: profile } = await supabase
  .from('profiles')
  .select('role, full_name')
  .eq('id', user.id)
  .single()

if (profile?.role !== 'loan_officer') redirect('/dashboard')
```

---

## RLS — Templates for This Project

### Pattern: user owns their own rows
```sql
-- Borrowers can only see/edit their own documents
create policy "borrower_own_documents"
  on documents
  for all
  using (auth.uid() = borrower_id)
  with check (auth.uid() = borrower_id);
```

### Pattern: role-based read access
```sql
-- Loan officers can read all documents
create policy "loan_officer_read_all_documents"
  on documents
  for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role = 'loan_officer'
    )
  );
```

### Pattern: role-based write access (specific columns only)
```sql
-- Loan officers can update status and flag_note only
create policy "loan_officer_update_document_status"
  on documents
  for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role = 'loan_officer'
    )
  )
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role = 'loan_officer'
    )
  );
```

### Critical: block role self-promotion
```sql
-- Users cannot change their own role
create policy "no_self_role_promotion"
  on profiles
  for update
  using (auth.uid() = id)
  with check (
    role = (select role from profiles where id = auth.uid())
  );
```

### RLS checklist (for security-auditor agent)
- [ ] `alter table [table] enable row level security` on every table
- [ ] Every table has at least one policy — a table with RLS enabled but no policies denies ALL access
- [ ] `profiles` table blocks role self-promotion
- [ ] `documents` table: borrowers see only their rows, loan officers see all
- [ ] `loan_applications` table: same pattern as documents
- [ ] Storage bucket `loan-documents` is NOT public

---

## Storage — Upload + Signed URL Pattern

### Upload from client (borrower uploads their own file)
```typescript
const uploadDocument = async (file: File, userId: string, applicationId: string) => {
  const filePath = `${userId}/${applicationId}/${file.name}`

  const { error: uploadError } = await supabase.storage
    .from('loan-documents')
    .upload(filePath, file, { upsert: false })

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

  // Insert metadata to documents table
  const { error: dbError } = await supabase
    .from('documents')
    .insert({
      application_id: applicationId,
      borrower_id: userId,
      file_name: file.name,
      file_path: filePath,
      status: 'pending',
    })

  if (dbError) {
    // Storage upload succeeded but DB insert failed — log this gap
    console.error('DB insert failed after successful upload:', dbError)
    throw new Error(`Document record failed: ${dbError.message}`)
  }
}
```

### Generate signed URL (Route Handler — server side only)
```typescript
// app/api/documents/signed-url/route.ts
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const filePath = request.nextUrl.searchParams.get('path')
  if (!filePath) return NextResponse.json({ error: 'Missing path' }, { status: 400 })

  const { data, error } = await supabase.storage
    .from('loan-documents')
    .createSignedUrl(filePath, 60) // 60 second expiry

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ url: data.signedUrl })
}
```

### Common mistakes to avoid
- ❌ Never call `createSignedUrl` in a Client Component with the anon key — it bypasses RLS
- ❌ Never use `getPublicUrl` for private buckets — it returns a URL that 404s
- ❌ Don't store the signed URL in state long-term — they expire (60s above)
- ✅ Always generate signed URLs in a Route Handler, pass them to the client on demand

---

## Realtime — Subscription Template

```typescript
// In a Client Component — subscribe to document status changes for current user
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { Document } from '@/lib/types'

export function useDocumentUpdates(borrowerId: string) {
  const [documents, setDocuments] = useState<Document[]>([])
  const supabase = createClient()

  useEffect(() => {
    // Initial fetch
    const fetchDocuments = async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('borrower_id', borrowerId)
        .order('uploaded_at', { ascending: false })

      if (!error && data) setDocuments(data)
    }

    fetchDocuments()

    // Realtime subscription — filtered to this borrower's documents
    const subscription = supabase
      .channel(`documents:${borrowerId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'documents',
          filter: `borrower_id=eq.${borrowerId}`,
        },
        (payload) => {
          setDocuments(prev =>
            prev.map(doc =>
              doc.id === payload.new.id ? { ...doc, ...payload.new } : doc
            )
          )
        }
      )
      .subscribe()

    // CRITICAL: Always unsubscribe on unmount
    return () => {
      supabase.removeChannel(subscription)
    }
  }, [borrowerId]) // borrowerId in deps — re-subscribe if user changes

  return documents
}
```

### Common mistakes to avoid
- ❌ Missing cleanup `return () => supabase.removeChannel(subscription)` — memory leak
- ❌ Empty dependency array `[]` when `borrowerId` is used inside — stale closure
- ❌ Subscribing to unfiltered table changes — receives all rows, ignores RLS
- ✅ Always filter the subscription: `filter: \`borrower_id=eq.${borrowerId}\``

---

## Decision Rules: Supabase Feature Selection

| Need | Use | Why |
|---|---|---|
| Live status updates in borrower UI | Realtime subscription | Lower latency than polling, built into Supabase |
| Email on status change | Database Webhook → Edge Function + Resend | Realtime doesn't send emails |
| File download link | Signed URL via Route Handler | Private bucket requires auth |
| Role check in a Server Component | Query `profiles` table | JWT claims not set up by default |
| Admin operation (bypassing RLS) | `supabaseAdmin` in Route Handler | Service role bypasses RLS — server only |
| Auth state in a Client Component | `supabase.auth.getUser()` | Never trust `getSession()` for security checks |