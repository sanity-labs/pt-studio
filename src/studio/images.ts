// A tiny library of hand-authored ASCII-art image previews. Each one is a
// fixed-size rectangular block keyed by image reference id. The form
// renderer looks the value up here and prints it inline.
//
// Width is chosen to fit comfortably inside the form pane (≈48 cols).

export type AsciiImage = {
  width: number
  height: number
  rows: string[]
  meta: string // human label shown beneath the image
}

const PT_DOOM_COVER: AsciiImage = {
  width: 48,
  height: 10,
  meta: '1280 × 720  ·  jpg  ·  204 kB  ·  pt-doom hero',
  rows: [
    '████████████████████████████████████████████████',
    '██▓▓▒░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░▒▓██',
    '██▓░ ▄▀▀▀▀▀▀▄  ▄▀▀▀▀▀▀▄  ▄▀▀▀▀▀▀▄ ░░░░░░░░░░░▓██',
    '██▓░ █  PT  █  █ DOOM █  █ HELL █ ░░░░░░░░░░░▓██',
    '██▓░ ▀▄▄▄▄▄▄▀  ▀▄▄▄▄▄▄▀  ▀▄▄▄▄▄▄▀ ░░░░░░░░░░░▓██',
    '██▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░▓██',
    '██▓░ ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀ portable text ▀▀▀▀▀▀▀▀░▓██',
    '██▓▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▓██',
    '██▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓██',
    '████████████████████████████████████████████████',
  ],
}

const BEHAVIORS_COVER: AsciiImage = {
  width: 48,
  height: 10,
  meta: '1280 × 720  ·  jpg  ·  178 kB  ·  behaviors deep dive',
  rows: [
    '┌──────────────────────────────────────────────┐',
    '│  keyboard.keydown                            │',
    '│       │                                      │',
    '│       ▼                                      │',
    '│  ╔══════════╗   ╔══════════╗   ╔══════════╗  │',
    '│  ║  guard   ║──▶║  effect  ║──▶║  state   ║  │',
    '│  ╚══════════╝   ╚══════════╝   ╚══════════╝  │',
    '│       │                                      │',
    '│       └─▶ event swallowed (no other action)  │',
    '└──────────────────────────────────────────────┘',
  ],
}

const PORTABLE_TEXT_COVER: AsciiImage = {
  width: 48,
  height: 10,
  meta: '1280 × 720  ·  png  ·  92 kB  ·  pt anywhere',
  rows: [
    '┌── { _type: "block" } ────────────────────────┐',
    '│   children: [                                │',
    '│     { _type: "span", text: "Hello, " },      │',
    '│     { _type: "span", text: "world",          │',
    '│       marks: ["em", "strong"] }              │',
    '│   ]                                          │',
    '│   markDefs: [],                              │',
    '│   style: "h2",                               │',
    '│   _key: "abc123"                             │',
    '└──────────────────────────────────────────────┘',
  ],
}

const Q2_ROADMAP_COVER: AsciiImage = {
  width: 48,
  height: 10,
  meta: '1280 × 720  ·  png  ·  64 kB  ·  q2 roadmap diagram',
  rows: [
    'agents       ████████████████████░░░░░░░░░  72%',
    'content lake ███████████░░░░░░░░░░░░░░░░░░  39%',
    'editor v6    ████████████████████████░░░░░  84%',
    '                                                ',
    '─────────── milestones ────────────────────── ',
    '  ▣ wave-1 spec        ▣ design lock           ',
    '  ▣ private alpha      ▢ beta gate             ',
    '  ▢ public preview     ▢ ga                    ',
    '                                                ',
    'window: Apr 14 → Jun 30   ·   owner: e.falconer',
  ],
}

const HOMEPAGE_HERO: AsciiImage = {
  width: 48,
  height: 10,
  meta: '1920 × 1080  ·  png  ·  340 kB  ·  homepage hero',
  rows: [
    '╔══════════════════════════════════════════════╗',
    '║     ▄▄▄    ▄▄▄    ▄▄▄    ▄▄▄    ▄▄▄    ▄▄▄  ║',
    '║    ▐███▌  ▐███▌  ▐███▌  ▐███▌  ▐███▌  ▐███▌ ║',
    '║     ▀▀▀    ▀▀▀    ▀▀▀    ▀▀▀    ▀▀▀    ▀▀▀  ║',
    '║          The composable content cloud        ║',
    '║                                              ║',
    '║       ┌────────────────────────────┐         ║',
    '║       │   ▶  Get started  ◀        │         ║',
    '║       └────────────────────────────┘         ║',
    '╚══════════════════════════════════════════════╝',
  ],
}

const PRICING_HERO: AsciiImage = {
  width: 48,
  height: 10,
  meta: '1920 × 1080  ·  png  ·  220 kB  ·  pricing hero',
  rows: [
    '┌───── FREE ─────┐  ┌──── GROWTH ───┐  ┌── ENT ─┐',
    '│                │  │               │  │        │',
    '│      $0        │  │     $99       │  │ Custom │',
    '│  /forever      │  │  /month       │  │        │',
    '│                │  │               │  │        │',
    '│  3 users       │  │  20 users     │  │  ∞     │',
    '│  100k API/mo   │  │  unlimited    │  │  ∞     │',
    '│                │  │  ──── ★ ────  │  │        │',
    '│   [ start ]    │  │  [ upgrade ]  │  │ [ talk ]│',
    '└────────────────┘  └───────────────┘  └────────┘',
  ],
}

const ABOUT_HERO: AsciiImage = {
  width: 48,
  height: 10,
  meta: '1920 × 1080  ·  jpg  ·  410 kB  ·  team photo',
  rows: [
    '┌──────────────────────────────────────────────┐',
    '│   ◉   ◉   ◉   ◉   ◉   ◉   ◉   ◉   ◉   ◉      │',
    '│  /│\\ /│\\ /│\\ /│\\ /│\\ /│\\ /│\\ /│\\ /│\\ /│\\     │',
    '│  / \\ / \\ / \\ / \\ / \\ / \\ / \\ / \\ / \\ / \\     │',
    '│                                              │',
    '│   the team that ships sanity, gathered for   │',
    '│   our annual onsite in Brooklyn, NY · 2026   │',
    '│                                              │',
    '│  ──────────────────────────────────────────  │',
    '│   sanity inc · all rights reserved 2026      │',
    '└──────────────────────────────────────────────┘',
  ],
}

// Eoin's avatar — converted from his Slack profile picture by resizing to
// 40×20 and mapping pixel luminance through the ` ░▒▓█` block ramp.
const AVATAR_EOIN: AsciiImage = {
  width: 40,
  height: 20,
  meta: '512 × 512 · png · avatar (from Slack)',
  rows: [
    '▓▓▓▒▒▒░░░░░░░ ░▒▒▒▒▒▒▒▒▒░░░░░░░░░▒░░░░▒▒',
    '▓▓▓▒▒▒░░░░░░░░▒▒░░▒▒▒▒▒▒▒░░░░░░░▒░░░░▒▒▒',
    '▓▓▓▒░▒░░░░░▒▒▒▒░░▒░░░▒▒▒▒░░░░░░▒░░░░▒░░░',
    '▓▓▓▒░▒░░░░▒▒▒▒▒░░░░░░░░░░░░░░░▒░░░░░░░░░',
    '▓▓▓▒░▒░░▒▓▒▒▒▒▒░░░░░░░░░░░░ ░░░░░░░░░░░░',
    '▓▓▓▒░▒░░▓▓▓▒▒▒░░░░▒▒▒▒▒░░     ░░░░░░░░░░',
    '▓▓▒▒░▒░▒▓▒▒▒░▒░░▒▒▒▒▒▒▒▒░       ▒▒▒░▒▒▒▒',
    '▒▒▒▒░░░▓▒▒▒▒▒▒▒░▒▒▒▒▒▒▒▒░       ░▒▒▒▒▒░░',
    '▒▒▒▒░░░▒▒▒▒▒▒▒░░░▒▒▒▒░░░░░░     ░▒▒░░░░░',
    '▓▓▒░░░░░▒▒▒▓▒▒▒░░▒▒▒░░░░░░░░░   ░▒░░░░░░',
    '▓▓▒░░░░░░▒▓▓▓▓▒▒▒▒▓▒░░░░░░░░░░░░░░░░░░░░',
    '▓▒░░░ ░░░░▒▓▓▓▓▓▓▓▓▒▒░░░▒▒▒░░░░░░░░░░░░░',
    '▓░░░░ ░░░░▓▓▓▓▓▒▒▓▓▒▒░░░▒▒░░░░░░░░░░░▒▒▒',
    '░░░░░░░░░░░▓▓▓▒▒▒▒▒▒░░░░░▒▒░░░░░░░▒▒▒▓▓▒',
    '░░░░░░░ ░░░▒▓▓▒▒▒▒▒▒▒░░░░░░░░░░░░░▒▓▒▒░ ',
    '░░░░▒░░ ░░░░▒▓▒▒▒▓▒▒▒▒░░░░░░░░░░░░░░    ',
    '░░░░▒░░░░░░░▒▒▒▓▓▓▒▒▒▒░░░░░  ▒▒░        ',
    '░░░▒▒▒▒▒▒▒▒▒▒░░▒▒▓▒▒▒▒▒░░     ░      ░░ ',
    '▒▒▓▓▓▓▓▓▓▓▓█▓░░░░░░░░░        ░░░░░░░░  ',
    '▓▓▓▓▓▓▓▓▓▓▓▓▓░░░             ░▒▒▒▒▒▒▒▒▒▒',
  ],
}

const AVATAR_MARCUS: AsciiImage = {
  width: 16,
  height: 8,
  meta: '512 × 512 · png · avatar',
  rows: [
    '  ▄▄▄▄▄▄▄▄▄▄  ',
    ' █▓▓▓▓▓▓▓▓▓▓█ ',
    ' █▓▒█▒▒▒█▒▓█  ',
    ' █▓▒▒▒▼▒▒▒▓█  ',
    '  █▓▒▀▀▀▀▒▓█  ',
    '   ▀▀▄▄▄▄▀▀   ',
    '   ╱██████╲   ',
    '  ─┘──────└─  ',
  ],
}

const AVATAR_PRIYA: AsciiImage = {
  width: 16,
  height: 8,
  meta: '512 × 512 · png · avatar',
  rows: [
    '   ▄▄▄▄▄▄▄▄   ',
    '  █▒▒▒▒▒▒▒▒█  ',
    ' █▒▒♦▒▒▒♦▒▒█ ',
    ' █▒▒▒▒•▒▒▒▒█ ',
    ' █▒▒▒\\_/▒▒▒█ ',
    '  █▓▒▒▒▒▒▒▓█  ',
    '   ███████   ',
    '  ─┘──────└─ ',
  ],
}

export const IMAGES: Record<string, AsciiImage> = {
  'image-pt-doom-cover': PT_DOOM_COVER,
  'image-behaviors-cover': BEHAVIORS_COVER,
  'image-portable-text-cover': PORTABLE_TEXT_COVER,
  'image-q2-roadmap-cover': Q2_ROADMAP_COVER,
  'image-homepage-hero': HOMEPAGE_HERO,
  'image-pricing-hero': PRICING_HERO,
  'image-about-hero': ABOUT_HERO,
  'image-avatar-eoin': AVATAR_EOIN,
  'image-avatar-marcus': AVATAR_MARCUS,
  'image-avatar-priya': AVATAR_PRIYA,
}

export const findImage = (id: unknown): AsciiImage | undefined =>
  typeof id === 'string' ? IMAGES[id] : undefined
