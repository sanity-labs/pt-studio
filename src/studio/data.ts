// Mocked content. No `@sanity/client`, no Content Lake — just enough fake
// documents that the studio shell looks alive.

export type DocStatus = 'draft' | 'published' | 'changed'

export type Doc = {
  _id: string
  _type: string
  status: DocStatus
  updatedAt: string
  values: Record<string, unknown>
}

const iso = (d: string) => d // already iso-formatted strings

export const DOCS: Doc[] = [
  // ── Posts ────────────────────────────────────────────────────────────
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
      excerpt: 'From CMS bodies to chat transcripts to AI agent traces — why structured rich text won.',
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
      excerpt: 'Three big bets this quarter: agents, content lake v2, and the new editor.',
    },
  },

  // ── Pages ────────────────────────────────────────────────────────────
  {
    _id: 'page-home',
    _type: 'page',
    status: 'published',
    updatedAt: iso('2026-04-25T17:45:00Z'),
    values: {
      title: 'Homepage',
      slug: '/',
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
      tagline: 'Content infrastructure for ambitious teams.',
      cta: 'Read our story',
      ctaHref: '/about/story',
    },
  },

  // ── Authors ──────────────────────────────────────────────────────────
  {
    _id: 'author-eoin-falconer',
    _type: 'author',
    status: 'published',
    updatedAt: iso('2026-02-04T10:00:00Z'),
    values: {
      name: 'Eoin Falconer',
      role: 'Engineering Manager, Content Apps',
      twitter: '@eoinfalconer',
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
      twitter: '@marcus_dev',
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
      twitter: '@priyacodes',
    },
  },

  // ── Categories ───────────────────────────────────────────────────────
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

  // ── Site settings (singleton) ────────────────────────────────────────
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
