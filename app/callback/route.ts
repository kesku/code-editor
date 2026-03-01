import { handleAuth } from '@workos-inc/authkit-nextjs'

export const dynamic = 'force-static'
export function generateStaticParams() { return [] }

export const GET = handleAuth({ returnPathname: '/' })
