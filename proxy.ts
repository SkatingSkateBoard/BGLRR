import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  if (
    process.env.NODE_ENV !== 'production' &&
    (request.cookies.get('bglrr_preview')?.value === '1' ||
      request.nextUrl.searchParams.get('preview') === '1')
  ) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),

        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })

          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data, error } = await supabase.auth.getClaims()
  const claims = data?.claims
  const userId = claims?.sub
  const pathname = request.nextUrl.pathname

  //public paths
  const publicPaths = ['/resident/login', '/operator/login', '/unauthorized', '/resident/signup', '/resident/otp']

   const role = claims?.app_metadata?.role
  const ROLES = ["resident", "operator", "admin", "responder"]

  if (userId && (pathname === '/resident/login' || pathname === '/operator/login')) {
    if (role === 'resident') return NextResponse.redirect(new URL('/resident/dashboard', request.url))
    if (role === 'operator') return NextResponse.redirect(new URL('/operator/dashboard', request.url))
    if (role === 'admin') return NextResponse.redirect(new URL('/admin/create', request.url))
    if (role === 'responder') return NextResponse.redirect(new URL('/responder/dashboard', request.url))
  }

  if (publicPaths.includes(pathname)) {
    return response;
  }

  if (error || !userId) {
    const loginPath = pathname.startsWith('/resident')
    ? '/resident/login'
    : '/operator/login';
    return NextResponse.redirect(new URL(loginPath, request.url));
  }


  //default paths based on role
  if (pathname === '/') {
    if (role === 'resident') return NextResponse.redirect(new URL('/resident/dashboard', request.url));
    if (role === 'operator') return NextResponse.redirect(new URL('/operator/dashboard', request.url));
    if (role === 'admin') return NextResponse.redirect(new URL('/admin/create', request.url));
    if (role === 'responder') return NextResponse.redirect(new URL('/responder/dashboard', request.url));
  }

  const currentPath = ROLES.find((r) => pathname.startsWith(`/${r}`));
  if (currentPath && role !== currentPath) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/', '/resident/:path*', '/operator/:path*', '/admin/:path*'],
}
