// Mocked content. No `@sanity/client`, no Content Lake — just enough fake
// documents that the studio shell looks alive. Body fields are real
// Portable Text arrays so we can demo PTE-in-PTE rendering.

import type {PtBlock} from './portableText'

export type DocStatus = 'draft' | 'published' | 'changed'

export type Doc = {
  _id: string
  _type: string
  status: DocStatus
  updatedAt: string
  values: Record<string, unknown>
}

const iso = (d: string) => d

// ── Body content for posts ─────────────────────────────────────────────

const PTDOOM_BODY: PtBlock[] = [
  {_type: 'block', style: 'h2', children: [{_type: 'span', text: 'Why on earth would you do this?'}]},
  {_type: 'block', style: 'normal', children: [
    {_type: 'span', text: 'Because Portable Text is just '},
    {_type: 'span', text: 'data', marks: ['em']},
    {_type: 'span', text: ', and the editor is just an event router. Once you control the input pipeline, you can render anything in the document — including a working game.'},
  ]},
  {_type: 'block', style: 'h2', children: [{_type: 'span', text: 'The trick'}]},
  {_type: 'block', style: 'normal', listItem: 'number', level: 1, children: [
    {_type: 'span', text: 'Match '},
    {_type: 'span', text: 'keyboard.keydown', marks: ['code']},
    {_type: 'span', text: ' with a '},
    {_type: 'span', text: 'defineBehavior', marks: ['code']},
    {_type: 'span', text: ' rule.'},
  ]},
  {_type: 'block', style: 'normal', listItem: 'number', level: 1, children: [
    {_type: 'span', text: 'Run '},
    {_type: 'span', text: 'effect()', marks: ['code']},
    {_type: 'span', text: ' to mutate game state. Return no other action — the key is swallowed.'},
  ]},
  {_type: 'block', style: 'normal', listItem: 'number', level: 1, children: [
    {_type: 'span', text: 'On every animation frame, raycast the world to ASCII and call '},
    {_type: 'span', text: "editor.send({type: 'update value', value})", marks: ['code']},
    {_type: 'span', text: '.'},
  ]},
  {_type: 'block', style: 'blockquote', children: [
    {_type: 'span', text: 'No canvas. No WebGL. Just Portable Text.'},
  ]},
]

const BEHAVIORS_BODY: PtBlock[] = [
  {_type: 'block', style: 'h2', children: [{_type: 'span', text: 'Guards, effects, and the event router'}]},
  {_type: 'block', style: 'normal', children: [
    {_type: 'span', text: 'A '},
    {_type: 'span', text: 'Behavior', marks: ['strong']},
    {_type: 'span', text: ' is three things: an event matcher, a guard, and a list of actions. Actions are one of '},
    {_type: 'span', text: 'execute', marks: ['code']},
    {_type: 'span', text: ', '},
    {_type: 'span', text: 'forward', marks: ['code']},
    {_type: 'span', text: ', '},
    {_type: 'span', text: 'raise', marks: ['code']},
    {_type: 'span', text: ', or '},
    {_type: 'span', text: 'effect', marks: ['code']},
    {_type: 'span', text: '.'},
  ]},
  {_type: 'block', style: 'normal', listItem: 'bullet', level: 1, children: [
    {_type: 'span', text: 'execute', marks: ['code']},
    {_type: 'span', text: ' — run a synthetic event to completion.'},
  ]},
  {_type: 'block', style: 'normal', listItem: 'bullet', level: 1, children: [
    {_type: 'span', text: 'forward', marks: ['code']},
    {_type: 'span', text: ' — pass to the next behavior in the chain.'},
  ]},
  {_type: 'block', style: 'normal', listItem: 'bullet', level: 1, children: [
    {_type: 'span', text: 'raise', marks: ['code']},
    {_type: 'span', text: ' — re-emit the event back at the top of the pipeline.'},
  ]},
  {_type: 'block', style: 'normal', listItem: 'bullet', level: 1, children: [
    {_type: 'span', text: 'effect', marks: ['code']},
    {_type: 'span', text: ' — your escape hatch into the host app.'},
  ]},
]

const PT_EVERYWHERE_BODY: PtBlock[] = [
  {_type: 'block', style: 'h2', children: [{_type: 'span', text: 'From bodies to traces'}]},
  {_type: 'block', style: 'normal', children: [
    {_type: 'span', text: 'Five years ago Portable Text was the body field of a CMS. Today it shows up in chat transcripts, AI agent traces, design tokens, and now '},
    {_type: 'span', text: 'a first-person shooter', marks: ['em']},
    {_type: 'span', text: '. The reason is mundane: structured rich text is the right primitive for human-readable content with computer-readable structure.'},
  ]},
  {_type: 'block', style: 'h3', children: [{_type: 'span', text: 'Three lessons we learned'}]},
  {_type: 'block', style: 'normal', listItem: 'bullet', level: 1, children: [
    {_type: 'span', text: 'Make the data model boring. The boring shape (block / span / mark) survives a decade.'},
  ]},
  {_type: 'block', style: 'normal', listItem: 'bullet', level: 1, children: [
    {_type: 'span', text: 'Push policy to the edge. The editor doesn’t pick formats; behaviors do.'},
  ]},
  {_type: 'block', style: 'normal', listItem: 'bullet', level: 1, children: [
    {_type: 'span', text: 'Treat the renderer as a separate concern. PT goes to React, HTML, MDX, terminals, ASCII — pick yours.'},
  ]},
]

const Q2_BODY: PtBlock[] = [
  {_type: 'block', style: 'h2', children: [{_type: 'span', text: 'Three big bets this quarter'}]},
  {_type: 'block', style: 'normal', listItem: 'number', level: 1, children: [
    {_type: 'span', text: 'Agents — first-class actors that can read, draft, and request review on documents.'},
  ]},
  {_type: 'block', style: 'normal', listItem: 'number', level: 1, children: [
    {_type: 'span', text: 'Content Lake v2 — faster fan-out, richer query shapes, durable subscriptions.'},
  ]},
  {_type: 'block', style: 'normal', listItem: 'number', level: 1, children: [
    {_type: 'span', text: 'Editor v6 — the new behaviors API, plus a redesigned PTE.'},
  ]},
  {_type: 'block', style: 'blockquote', children: [
    {_type: 'span', text: 'Internal preview only. Don’t share before the announce date (May 12).'},
  ]},
]

const EOIN_BIO: PtBlock[] = [
  {_type: 'block', style: 'normal', children: [
    {_type: 'span', text: 'EM on Content Apps. Builds the studio you’re looking at right now (yes, the ASCII one). Previously '},
    {_type: 'span', text: 'iqval.no', marks: ['link']},
    {_type: 'span', text: '.'},
  ]},
]

const MARCUS_BIO: PtBlock[] = [
  {_type: 'block', style: 'normal', children: [
    {_type: 'span', text: 'Staff engineer on the editor team. Spends most days inside Slate, comes out occasionally for daylight. Maintains '},
    {_type: 'span', text: '@portabletext/editor', marks: ['code']},
    {_type: 'span', text: '.'},
  ]},
]

const PRIYA_BIO: PtBlock[] = [
  {_type: 'block', style: 'normal', children: [
    {_type: 'span', text: 'Developer advocate. Travels for conferences, ships demos, and writes the docs you actually want to read.'},
  ]},
]

// ── The mocked content ────────────────────────────────────────────────

export const DOCS: Doc[] = [
  // Posts
  {
    _id: 'post-rendering-fps-in-pte',
    _type: 'post',
    status: 'published',
    updatedAt: iso('2026-04-21T09:14:00Z'),
    values: {
      title: 'I built a first-person shooter inside a Portable Text field',
      slug: 'rendering-fps-in-pte',
      publishedAt: iso('2026-04-21T08:00:00Z'),
      author: 'author-eoin-falconer',
      categories: ['category-engineering', 'category-portable-text'],
      cover: 'image-pt-doom-cover',
      excerpt: 'Every row is a Portable Text block. WASD is captured by the Behaviors API. No canvas, no WebGL — just PTE.',
      body: PTDOOM_BODY,
    },
  },
  {
    _id: 'post-behaviors-api-deep-dive',
    _type: 'post',
    status: 'changed',
    updatedAt: iso('2026-04-28T14:02:00Z'),
    values: {
      title: 'A deep dive into the Behaviors API',
      slug: 'behaviors-api-deep-dive',
      publishedAt: iso('2026-04-15T08:00:00Z'),
      author: 'author-marcus-sanchez',
      categories: ['category-engineering'],
      cover: 'image-behaviors-cover',
      excerpt: 'Guards, effects, raise/forward — and why your editor is really an event router.',
      body: BEHAVIORS_BODY,
    },
  },
  {
    _id: 'post-portable-text-everywhere',
    _type: 'post',
    status: 'published',
    updatedAt: iso('2026-04-08T12:30:00Z'),
    values: {
      title: 'Portable Text is everywhere now',
      slug: 'portable-text-everywhere',
      publishedAt: iso('2026-04-08T13:00:00Z'),
      author: 'author-priya-shah',
      categories: ['category-portable-text', 'category-product'],
      cover: 'image-portable-text-cover',
      excerpt: 'From CMS bodies to chat transcripts to AI agent traces — why structured rich text won.',
      body: PT_EVERYWHERE_BODY,
    },
  },
  {
    _id: 'post-q2-roadmap-preview',
    _type: 'post',
    status: 'draft',
    updatedAt: iso('2026-04-29T10:21:00Z'),
    values: {
      title: 'Q2 roadmap preview (DRAFT)',
      slug: 'q2-roadmap-preview',
      author: 'author-eoin-falconer',
      categories: ['category-product'],
      cover: 'image-q2-roadmap-cover',
      excerpt: 'Three big bets this quarter: agents, content lake v2, and the new editor.',
      body: Q2_BODY,
    },
  },

  // Pages
  {
    _id: 'page-home',
    _type: 'page',
    status: 'published',
    updatedAt: iso('2026-04-25T17:45:00Z'),
    values: {
      title: 'Homepage',
      slug: '/',
      hero: 'image-homepage-hero',
      tagline: 'The composable content cloud',
      cta: 'Get started',
      ctaHref: 'https://www.sanity.io/get-started',
      noindex: false,
    },
  },
  {
    _id: 'page-pricing',
    _type: 'page',
    status: 'changed',
    updatedAt: iso('2026-04-27T11:08:00Z'),
    values: {
      title: 'Pricing',
      slug: '/pricing',
      hero: 'image-pricing-hero',
      tagline: 'Free for small teams. Scales with you.',
      cta: 'Compare plans',
      ctaHref: '/plans',
      noindex: false,
    },
  },
  {
    _id: 'page-about',
    _type: 'page',
    status: 'published',
    updatedAt: iso('2026-03-12T09:00:00Z'),
    values: {
      title: 'About',
      slug: '/about',
      hero: 'image-about-hero',
      tagline: 'Content infrastructure for ambitious teams.',
      cta: 'Read our story',
      ctaHref: '/about/story',
    },
  },

  // Authors — Bluesky handles, real bios
  {
    _id: 'author-eoin-falconer',
    _type: 'author',
    status: 'published',
    updatedAt: iso('2026-02-04T10:00:00Z'),
    values: {
      name: 'Eoin Falconer',
      role: 'Engineering Manager, Content Apps',
      avatar: 'image-avatar-eoin',
      bio: EOIN_BIO,
      bluesky: '@eoin.bsky.social',
    },
  },
  {
    _id: 'author-marcus-sanchez',
    _type: 'author',
    status: 'published',
    updatedAt: iso('2026-01-22T10:00:00Z'),
    values: {
      name: 'Marcus Sanchez',
      role: 'Staff Engineer, Editor',
      avatar: 'image-avatar-marcus',
      bio: MARCUS_BIO,
      bluesky: '@marcus.bsky.social',
    },
  },
  {
    _id: 'author-priya-shah',
    _type: 'author',
    status: 'changed',
    updatedAt: iso('2026-04-28T16:18:00Z'),
    values: {
      name: 'Priya Shah',
      role: 'Developer Advocate',
      avatar: 'image-avatar-priya',
      bio: PRIYA_BIO,
      bluesky: '@priya.bsky.social',
    },
  },

  // Categories
  {
    _id: 'category-engineering',
    _type: 'category',
    status: 'published',
    updatedAt: iso('2026-01-10T08:00:00Z'),
    values: {
      title: 'Engineering',
      slug: 'engineering',
      description: 'Posts about how we build Sanity.',
      color: '#f03e2f',
    },
  },
  {
    _id: 'category-portable-text',
    _type: 'category',
    status: 'published',
    updatedAt: iso('2026-01-10T08:00:00Z'),
    values: {
      title: 'Portable Text',
      slug: 'portable-text',
      description: 'Everything about the structured rich-text format.',
      color: '#ffaa00',
    },
  },
  {
    _id: 'category-product',
    _type: 'category',
    status: 'published',
    updatedAt: iso('2026-01-10T08:00:00Z'),
    values: {
      title: 'Product',
      slug: 'product',
      description: 'Roadmap, releases, and customer stories.',
      color: '#00aaff',
    },
  },

  // Site settings
  {
    _id: 'siteSettings-singleton',
    _type: 'siteSettings',
    status: 'published',
    updatedAt: iso('2026-04-04T12:00:00Z'),
    values: {
      siteName: 'sanity.io',
      tagline: 'The composable content cloud',
      primaryColor: '#f03e2f',
      footer: '© Sanity Inc. All rights reserved.',
    },
  },
]

export const docsByType = (typeName: string): Doc[] =>
  DOCS.filter((d) => d._type === typeName).sort((a, b) =>
    a.updatedAt < b.updatedAt ? 1 : -1,
  )

export const docById = (id: string): Doc | undefined => DOCS.find((d) => d._id === id)
