import { NextResponse } from 'next/server'
import { withAuth, getWorkOS } from '@workos-inc/authkit-nextjs'

const SPONSOR_LOGIN = process.env.GITHUB_SPONSOR_LOGIN ?? ''
const SPONSOR_TOKEN = process.env.RELEASE_GITHUB_TOKEN ?? ''
const MIN_CENTS = parseInt(process.env.GITHUB_SPONSOR_MIN_CENTS ?? '2500', 10)

interface SponsorNode {
  sponsorEntity: { login: string } | null
  tier: { monthlyPriceInCents: number; name: string; isOneTime: boolean } | null
}

async function findSponsorTier(
  githubUsername: string,
): Promise<{ sponsored: boolean; tierCents: number; tierName: string }> {
  if (!SPONSOR_LOGIN || !SPONSOR_TOKEN) {
    return { sponsored: false, tierCents: 0, tierName: '' }
  }

  const query = `
    query($login: String!, $after: String) {
      user(login: $login) {
        sponsorshipsAsMaintainer(first: 100, after: $after, includePrivate: true) {
          pageInfo { hasNextPage endCursor }
          nodes {
            sponsorEntity {
              ... on User { login }
              ... on Organization { login }
            }
            tier {
              monthlyPriceInCents
              name
              isOneTime
            }
          }
        }
      }
    }
  `

  let after: string | null = null
  const target = githubUsername.toLowerCase()

  for (let page = 0; page < 50; page++) {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SPONSOR_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables: { login: SPONSOR_LOGIN, after } }),
    })

    if (!res.ok) break

    const json = (await res.json()) as {
      data?: {
        user?: {
          sponsorshipsAsMaintainer?: {
            pageInfo: { hasNextPage: boolean; endCursor: string | null }
            nodes: SponsorNode[]
          }
        }
      }
    }

    const sponsorships = json.data?.user?.sponsorshipsAsMaintainer
    if (!sponsorships) break

    for (const node of sponsorships.nodes) {
      if (node.sponsorEntity?.login.toLowerCase() === target && node.tier && !node.tier.isOneTime) {
        return {
          sponsored: true,
          tierCents: node.tier.monthlyPriceInCents,
          tierName: node.tier.name,
        }
      }
    }

    if (!sponsorships.pageInfo.hasNextPage) break
    after = sponsorships.pageInfo.endCursor
  }

  return { sponsored: false, tierCents: 0, tierName: '' }
}

export async function GET() {
  const { user } = await withAuth()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const fullUser = await getWorkOS().userManagement.getUser(user.id)
  const metadata = (fullUser.metadata ?? {}) as Record<string, string>

  if (metadata.KnotCode === 'pro') {
    return NextResponse.json({ ok: true, plan: 'pro' })
  }

  const githubUsername = metadata.GitHub
  if (githubUsername) {
    const { sponsored, tierCents, tierName } = await findSponsorTier(githubUsername)

    if (sponsored && tierCents >= MIN_CENTS) {
      return NextResponse.json({
        ok: true,
        plan: 'sponsor',
        github_username: githubUsername,
        tier: tierName,
        tier_cents: tierCents,
      })
    }
  }

  return NextResponse.json(
    {
      error: 'not_pro',
      message: 'Your account does not have KnotCode Pro access.',
      sponsor_url: SPONSOR_LOGIN ? `https://github.com/sponsors/${SPONSOR_LOGIN}` : undefined,
    },
    { status: 403 },
  )
}
