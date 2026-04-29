// Mocked Sanity schema — generic blog/marketing. We don't actually run
// Sanity's schema validator; this is just typed metadata our ASCII studio
// renders against.

export type FieldKind =
  | 'string'
  | 'text'
  | 'slug'
  | 'datetime'
  | 'reference'
  | 'array'
  | 'image'
  | 'portableText'
  | 'boolean'
  | 'number'

export type Field = {
  name: string
  label: string
  kind: FieldKind
  /** For reference fields: the document type they point to. */
  to?: string
  /** Description shown under the label. */
  description?: string
  /** UI hint: render the field as full-width, not in a half column. */
  full?: boolean
}

export type DocType = {
  name: string
  title: string
  pluralTitle: string
  icon: string // single ASCII glyph used in the structure tree
  fields: Field[]
}

export const SCHEMA: DocType[] = [
  {
    name: 'post',
    title: 'Blog post',
    pluralTitle: 'Blog posts',
    icon: '✎',
    fields: [
      {name: 'title', label: 'Title', kind: 'string', full: true},
      {name: 'slug', label: 'Slug', kind: 'slug'},
      {name: 'publishedAt', label: 'Published at', kind: 'datetime'},
      {name: 'author', label: 'Author', kind: 'reference', to: 'author'},
      {name: 'categories', label: 'Categories', kind: 'array'},
      {name: 'cover', label: 'Cover image', kind: 'image'},
      {name: 'excerpt', label: 'Excerpt', kind: 'text', full: true},
      {name: 'body', label: 'Body', kind: 'portableText', full: true, description: 'Long-form content. (Yes, a Portable Text field inside a Portable Text field.)'},
    ],
  },
  {
    name: 'page',
    title: 'Marketing page',
    pluralTitle: 'Marketing pages',
    icon: '◐',
    fields: [
      {name: 'title', label: 'Title', kind: 'string', full: true},
      {name: 'slug', label: 'Slug', kind: 'slug'},
      {name: 'hero', label: 'Hero', kind: 'image'},
      {name: 'tagline', label: 'Tagline', kind: 'string', full: true},
      {name: 'sections', label: 'Sections', kind: 'array'},
      {name: 'cta', label: 'CTA label', kind: 'string'},
      {name: 'ctaHref', label: 'CTA link', kind: 'string'},
      {name: 'noindex', label: 'Hide from search engines', kind: 'boolean'},
    ],
  },
  {
    name: 'author',
    title: 'Author',
    pluralTitle: 'Authors',
    icon: '☻',
    fields: [
      {name: 'name', label: 'Name', kind: 'string', full: true},
      {name: 'role', label: 'Role', kind: 'string'},
      {name: 'avatar', label: 'Avatar', kind: 'image'},
      {name: 'bio', label: 'Bio', kind: 'portableText', full: true},
      {name: 'twitter', label: 'Twitter handle', kind: 'string'},
    ],
  },
  {
    name: 'category',
    title: 'Category',
    pluralTitle: 'Categories',
    icon: '◆',
    fields: [
      {name: 'title', label: 'Title', kind: 'string', full: true},
      {name: 'slug', label: 'Slug', kind: 'slug'},
      {name: 'description', label: 'Description', kind: 'text', full: true},
      {name: 'color', label: 'Accent color', kind: 'string'},
    ],
  },
  {
    name: 'siteSettings',
    title: 'Site settings',
    pluralTitle: 'Site settings',
    icon: '⚙',
    fields: [
      {name: 'siteName', label: 'Site name', kind: 'string', full: true},
      {name: 'tagline', label: 'Tagline', kind: 'string', full: true},
      {name: 'primaryColor', label: 'Primary color', kind: 'string'},
      {name: 'social', label: 'Social links', kind: 'array'},
      {name: 'footer', label: 'Footer text', kind: 'text', full: true},
    ],
  },
]

export const findType = (name: string): DocType | undefined =>
  SCHEMA.find((t) => t.name === name)
