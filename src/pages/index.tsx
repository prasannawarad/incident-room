/**
 * Landing page — a STATIC page.
 *
 * It lives at the top level of src/pages/ (not under (app)/), so it renders
 * with no DeepSpace providers: no auth session fetch, no records WebSocket.
 * That makes it cheap to serve and safe for logged-out / crawler traffic.
 *
 * Top-level pages are also prerendered to static HTML at build
 * (prerender.ts, via vite.config.ts) so crawlers read real content.
 * Keep them renderable without a browser: no window/document during render,
 * prose in HTML text, reveal animations in CSS keyframes rather than JS-driven
 * initial states. `<Seo>` comes first and reads src/seo.ts.
 */

import { Link } from 'react-router-dom'
import { Seo } from '../components/Seo'
import { buttonVariants } from '@/components/ui'
import { cn } from '@/lib/utils'
import { seo } from '../seo'

const STEPS = [
  {
    n: '01',
    title: 'Log the timeline',
    body: 'Open an incident, add entries as things happen — event, action, or note. Anyone signed in can add one.',
  },
  {
    n: '02',
    title: 'Live sync',
    body: "Everyone with the link sees the same timeline update as it's written, with who else is in the room.",
  },
  {
    n: '03',
    title: 'Grounded postmortem',
    body: 'Once there are enough entries, generate a postmortem. Every claim cites the entries it came from — no invented root cause.',
  },
] as const

export default function Landing() {
  return (
    <>
      <Seo {...seo} path="/" />
      <div data-testid="static-landing" className="min-h-screen px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            incident-room
          </p>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            The incident timeline that drafts its own postmortem
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-muted-foreground">
            Teams log what's happening in one shared, live timeline. When it's over, AI drafts
            the postmortem — grounded only in what was written, every claim cited to an entry.
          </p>
          <Link to="/home" className={cn(buttonVariants({ size: 'lg' }), 'gap-2')}>
            Sign in
          </Link>
        </div>

        <div className="mx-auto mt-16 grid max-w-3xl gap-4 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.n} className="rounded-lg border border-border bg-card p-5 text-left">
              <p className="mb-2 font-mono text-xs text-primary">{step.n}</p>
              <h2 className="mb-1.5 text-sm font-semibold text-foreground">{step.title}</h2>
              <p className="text-sm text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
