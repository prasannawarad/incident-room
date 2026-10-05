/**
 * Theme catalog.
 *
 * Incident Room ships one theme: `ops` — a dense, dark, ops-console
 * palette (defined in both styles.css's @theme block and themes.css's
 * [data-theme="ops"] override, kept in sync). No light theme / toggle: SPEC
 * calls for a dark-default ops tool, not a themeable product.
 *
 * Color values live in styles.css / themes.css — this file is metadata only.
 */

export const THEMES = [
  {
    id: 'ops',
    label: 'Ops',
    description: 'Dense, dark ops-console palette. Cyan accent, severity colors, monospace timestamps.',
  },
] as const

export type ThemeId = (typeof THEMES)[number]['id']

/** Read the currently active theme id from <html data-theme>. */
export function getActiveTheme(): ThemeId {
  if (typeof document === 'undefined') return 'ops'
  const id = document.documentElement.getAttribute('data-theme') as ThemeId | null
  return id ?? 'ops'
}

/** Look up a theme entry by id, or fall back to the first theme. */
export function getTheme(id: string) {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]
}
