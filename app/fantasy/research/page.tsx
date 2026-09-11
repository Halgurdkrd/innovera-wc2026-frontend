'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// The M3_SHRUNK research view has been merged into the main /fantasy page
// (Best XI first, full tab set, same verified artifact API). This route is
// kept only so existing links/bookmarks still land somewhere useful --
// any gw/tab query parameters are forwarded as-is, since /fantasy uses the
// exact same parameter names.
function ResearchRedirectInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const qs = searchParams.toString()
    router.replace(qs ? `/fantasy?${qs}` : '/fantasy')
  }, [router, searchParams])

  return null
}

export default function ResearchRedirect() {
  return (
    <Suspense fallback={null}>
      <ResearchRedirectInner />
    </Suspense>
  )
}
