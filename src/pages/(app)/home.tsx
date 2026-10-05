/**
 * `/home` is scaffold-only — not a page in SPEC.md. Kept as a redirect
 * (rather than deleted) so it stays a valid dynamic route: tests/smoke.spec.ts,
 * tests/api.spec.ts, and tests/collab.spec.ts all navigate here to assert the
 * (app) provider boundary (nav shell, WebSocket, signed-in chip) mounts
 * correctly, independent of which page renders inside it.
 */

import { Navigate } from 'react-router-dom'

export default function HomePage() {
  return <Navigate to="/incidents" replace />
}
