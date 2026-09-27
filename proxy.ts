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
  //DEF
  if (pathname === '/resident/login') {
    return response
  }
  //LOSE TOKEN
  if (error || !userId) {
    return NextResponse.redirect(new URL('/resident/login', request.url))
  }


  //STRICT ROUTES 
  if (pathname.startsWith('/admin')) {
    const role = claims.user_metadata?.role

    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  }

  if (pathname.startsWith('/resident')) {
    const { data: resident, error: residentError } = await supabase
      .from('residents')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (residentError || !resident) {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }

    return NextResponse.redirect(new URL('/resident/dashboard', request.url));
  }

  if (pathname.startsWith('/operator')) {
    const { data: operator, error: operatorError } = await supabase
      .from('operators')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (operatorError || !operator) {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/resident/:path*', '/operator/:path*', '/admin/:path*'],
}
