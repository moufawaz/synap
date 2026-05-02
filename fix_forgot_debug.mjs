import { readFileSync, writeFileSync } from 'fs'
let f = readFileSync('src/app/auth/forgot-password/page.tsx', 'utf8')
f = f.replace(
  "setError('Something went wrong. Please try again.')",
  "setError(resetError.message || 'Something went wrong. Please try again.')"
)
writeFileSync('src/app/auth/forgot-password/page.tsx', f, 'utf8')
console.log('Done')