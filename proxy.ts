import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
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
  const role = claims?.app_metadata?.role

  // Helper: sends any logged-in user to their role's dashboard
  const getDashboardByRole = (userRole?: string) => {
    switch (userRole) {
      case 'resident':
        return '/pwa/resident/dashboard'
      case 'responder':
        return '/pwa/responder/dashboard'
      case 'operator':
        return '/operator/dashboard'
      case 'admin':
        return '/admin/create'
      default:
        return '/unauthorized'
    }
  }

  // Public paths (accessible without logging in)
  const publicPaths = [
    '/pwa/resident/login',
    '/pwa/resident/signup',
    '/pwa/resident/otp',
    '/pwa/responder/login',
    '/operator/login',
    '/unauthorized',
  ]

  // Login pages (if already logged in, redirect away to dashboard)
  const loginPaths = [
    '/pwa/resident/login',
    '/pwa/responder/login',
    '/operator/login',
  ]

  if (userId && loginPaths.includes(pathname)) {
    return NextResponse.redirect(new URL(getDashboardByRole(role), request.url))
  }

  if (publicPaths.includes(pathname)) {
    return response
  }

  // Not logged in:
  // - /pwa/responder/* -> /pwa/responder/login
  // - /pwa and /pwa/*  -> /pwa/resident/login (base PWA login)
  // - everything else  -> /operator/login
  if (error || !userId) {
    let loginPath = '/operator/login'

    if (pathname.startsWith('/pwa/responder')) {
      loginPath = '/pwa/responder/login'
    } else if (pathname.startsWith('/pwa')) {
      loginPath = '/pwa/resident/login'
    }

    return NextResponse.redirect(new URL(loginPath, request.url))
  }

  // Logged in at entry points ('/' or '/pwa'): send to role dashboard
  if (pathname === '/' || pathname === '/pwa' || pathname === '/pwa/') {
    return NextResponse.redirect(new URL(getDashboardByRole(role), request.url))
  }

  // Role-based route guards
  if (pathname.startsWith('/pwa/resident') && role !== 'resident') {
    return NextResponse.redirect(new URL('/unauthorized', request.url))
  }

  if (pathname.startsWith('/pwa/responder') && role !== 'responder') {
    return NextResponse.redirect(new URL('/unauthorized', request.url))
  }

  if (pathname.startsWith('/operator') && role !== 'operator') {
    return NextResponse.redirect(new URL('/unauthorized', request.url))
  }

  if (pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/unauthorized', request.url))
  }

  return response
}

export const config = {
  matcher: ['/', '/pwa', '/pwa/:path*', '/operator/:path*', '/admin/:path*'],
}