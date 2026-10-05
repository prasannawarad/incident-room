/**
 * Navigation Config
 *
 * Add one entry per nav item. Routes are handled by generouted
 * (file-based routing in src/pages/), this just controls what
 * appears in the navigation bar.
 */

import type { Role } from './constants'

export interface NavItem {
  path: string
  label: string
  roles?: Role[]
  devOnly?: boolean
}

export const nav: NavItem[] = [
  { path: '/incidents', label: 'Incidents' },
  // The /api-status debug page still exists — add
  // `{ path: '/api-status', label: 'API Status', devOnly: true }` to surface it.
  // /settings has no nav link: sign-out already lives in the account menu,
  // and nothing else on that page is needed by SPEC.md. The route itself
  // is left in place (reachable by direct URL), just not advertised.
  // ── Features add nav items below this line ──
]
