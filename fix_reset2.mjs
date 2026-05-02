import { readFileSync, writeFileSync } from 'fs'
let f = readFileSync('src/app/auth/reset-password/page.tsx', 'utf8')
f = f.replace("import { useState, useEffect, Suspense }","import { useState, useEffect, useRef, Suspense }")
f = f.replace("  const searchParams = useSearchParams()\n","  const searchParams = useSearchParams()\n  const supabaseRef = useRef(createBrowserClient())\n")
f = f.replace("    const supabase = createBrowserClient()\n    supabase.auth.exchangeCodeForSession","    supabaseRef.current.auth.exchangeCodeForSession")
f = f.replace("    const supabase = createBrowserClient()\n    const { error: updateError } = await supabase.auth.updateUser","    const { error: updateError } = await supabaseRef.current.auth.updateUser")
writeFileSync('src/app/auth/reset-password/page.tsx', f, 'utf8')
console.log('Done')