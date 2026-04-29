// A real Portable Text mini-renderer. Takes a PT block array and produces
// styled ASCII rows suitable for embedding inside another PT field — yes,
// PTE-in-PTE. Supports the styles we actually use in the mocked posts:
// h1/h2/h3, normal paragraphs, blockquote, code, bullet & numbered lists,
// and inline marks (strong, em, code, link).

export type PtSpan = {
  _type: 'span'
  text: string
  marks?: string[]
}

export type PtBlock = {
  _type: 'block'
  style?: 'normal' | 'h1' | 'h2' | 'h3' | 'blockquote' | 'code'
  listItem?: 'bullet' | 'number'
  level?: number
  children: PtSpan[]
  markDefs?: Array<{_key: string; _type: string; href?: string}>
}

export type PtRun = {
  text: string
  /** how to color the run — kept generic so the studio renderer can map it */
  kind: 'fg' | 'muted' | 'accent' | 'cursor' | 'h' | 'quote' | 'code-bg' | 'link'
}

const wrapWithMarks = (span: PtSpan, defaultKind: PtRun['kind']): PtRun => {
  const marks = span.marks ?? []
  if (marks.includes('code')) return {text: span.text, kind: 'code-bg'}
  if (marks.some((m) => m.startsWith('link') || m.startsWith('http'))) {
    return {text: span.text, kind: 'link'}
  }
  // strong / em → bumped to accent so they read out
  if (marks.includes('strong') || marks.includes('em')) {
    return {text: span.text, kind: 'accent'}
  }
  return {text: span.text, kind: defaultKind}
}

const wrap = (runs: PtRun[], width: number): PtRun[][] => {
  // Greedy word-wrap that preserves run boundaries. Splits each run on
  // whitespace, accumulates into lines, and never exceeds `width`.
  const out: PtRun[][] = []
  let line: PtRun[] = []
  let lineLen = 0

  const push = (r: PtRun) => {
    if (lineLen + [...r.text].length > width && line.length > 0) {
      out.push(line)
      line = []
      lineLen = 0
    }
    if (line.length > 0 && line[line.length - 1].kind === r.kind) {
      line[line.length - 1].text += r.text
    } else if (r.text.length > 0) {
      line.push({...r})
    }
    lineLen += [...r.text].length
  }

  for (const r of runs) {
    // split on whitespace, preserving spaces
    const parts = r.text.split(/(\s+)/)
    for (const p of parts) {
      if (!p) continue
      if (/^\s+$/.test(p)) {
        if (lineLen === 0) continue // skip leading whitespace on a new line
        push({text: p, kind: r.kind})
      } else {
        // Long word — if it doesn't fit, force break
        let chunk = p
        while ([...chunk].length > width) {
          const slice = [...chunk].slice(0, width).join('')
          if (lineLen > 0) {
            out.push(line)
            line = []
            lineLen = 0
          }
          push({text: slice, kind: r.kind})
          out.push(line)
          line = []
          lineLen = 0
          chunk = [...chunk].slice(width).join('')
        }
        if (chunk) push({text: chunk, kind: r.kind})
      }
    }
  }
  if (line.length > 0) out.push(line)
  if (out.length === 0) out.push([{text: '', kind: 'fg'}])
  return out
}

export type CursorAt = {blockIndex: number; offset: number; visible: boolean} | null

// Walk a block's children, splitting at the cursor offset to inject a
// cursor run when this block is the focused one.
const childrenWithCursor = (
  children: PtSpan[],
  defaultKind: PtRun['kind'],
  cursorOffset: number | null,
  cursorVisible: boolean,
): PtRun[] => {
  const runs: PtRun[] = []
  let consumed = 0
  let inserted = false
  for (const span of children) {
    const base = wrapWithMarks(span, defaultKind)
    const len = span.text.length
    if (
      cursorOffset !== null &&
      !inserted &&
      cursorOffset >= consumed &&
      cursorOffset <= consumed + len
    ) {
      const cut = cursorOffset - consumed
      if (cut > 0) runs.push({...base, text: span.text.slice(0, cut)})
      runs.push({text: cursorVisible ? '▌' : ' ', kind: 'cursor'})
      inserted = true
      if (len - cut > 0) runs.push({...base, text: span.text.slice(cut)})
    } else {
      if (span.text.length > 0) runs.push(base)
    }
    consumed += len
  }
  if (cursorOffset !== null && !inserted) {
    runs.push({text: cursorVisible ? '▌' : ' ', kind: 'cursor'})
  }
  return runs
}

export const renderPortableText = (
  blocks: PtBlock[],
  width: number,
  cursor: CursorAt = null,
): PtRun[][] => {
  const out: PtRun[][] = []
  let listCounter = 0
  let lastListType: 'bullet' | 'number' | undefined

  for (let bIdx = 0; bIdx < blocks.length; bIdx++) {
    const b = blocks[bIdx]
    const isCursorBlock = cursor != null && cursor.blockIndex === bIdx
    // List separator handling — reset numbering when leaving a list
    if (!b.listItem && lastListType) {
      lastListType = undefined
      listCounter = 0
    }

    const cursorOffset = isCursorBlock ? cursor!.offset : null
    const cursorVisible = isCursorBlock ? cursor!.visible : true

    if (b.listItem === 'bullet') {
      const indent = '  '.repeat(b.level ?? 1)
      const prefix = `${indent}• `
      const innerWidth = Math.max(8, width - prefix.length)
      const runs = childrenWithCursor(b.children, 'fg', cursorOffset, cursorVisible)
      const lines = wrap(runs, innerWidth)
      for (let i = 0; i < lines.length; i++) {
        const lead = i === 0 ? prefix : ' '.repeat(prefix.length)
        out.push([{text: lead, kind: 'muted'}, ...lines[i]])
      }
      lastListType = 'bullet'
      continue
    }

    if (b.listItem === 'number') {
      if (lastListType !== 'number') listCounter = 0
      listCounter++
      const indent = '  '.repeat(b.level ?? 1)
      const prefix = `${indent}${listCounter}. `
      const innerWidth = Math.max(8, width - prefix.length)
      const runs = childrenWithCursor(b.children, 'fg', cursorOffset, cursorVisible)
      const lines = wrap(runs, innerWidth)
      for (let i = 0; i < lines.length; i++) {
        const lead = i === 0 ? prefix : ' '.repeat(prefix.length)
        out.push([{text: lead, kind: 'muted'}, ...lines[i]])
      }
      lastListType = 'number'
      continue
    }

    switch (b.style) {
      case 'h1': {
        const runs = childrenWithCursor(b.children, 'h', cursorOffset, cursorVisible)
        const lines = wrap(runs, width)
        for (const line of lines) out.push(line)
        const flatLen = b.children.reduce((acc, c) => acc + c.text.length, 0)
        out.push([{text: '═'.repeat(Math.min(width, flatLen || 4)), kind: 'h'}])
        out.push([{text: '', kind: 'fg'}])
        break
      }
      case 'h2': {
        const runs = childrenWithCursor(b.children, 'h', cursorOffset, cursorVisible)
        const lines = wrap(runs, width)
        for (const line of lines) out.push(line)
        const flatLen = b.children.reduce((acc, c) => acc + c.text.length, 0)
        out.push([{text: '─'.repeat(Math.min(width, flatLen || 4)), kind: 'h'}])
        out.push([{text: '', kind: 'fg'}])
        break
      }
      case 'h3': {
        const runs = childrenWithCursor(b.children, 'h', cursorOffset, cursorVisible)
        out.push([{text: '› ', kind: 'h'}, ...runs])
        out.push([{text: '', kind: 'fg'}])
        break
      }
      case 'blockquote': {
        const runs = childrenWithCursor(b.children, 'quote', cursorOffset, cursorVisible)
        const lines = wrap(runs, width - 4)
        for (const line of lines) out.push([{text: '┃  ', kind: 'quote'}, ...line])
        out.push([{text: '', kind: 'fg'}])
        break
      }
      case 'code': {
        const runs = childrenWithCursor(b.children, 'code-bg', cursorOffset, cursorVisible)
        const lines = wrap(runs, width - 4)
        for (const line of lines) out.push([{text: '  ', kind: 'fg'}, ...line])
        out.push([{text: '', kind: 'fg'}])
        break
      }
      default: {
        // normal paragraph
        const runs = childrenWithCursor(b.children, 'fg', cursorOffset, cursorVisible)
        const lines = wrap(runs, width)
        for (const line of lines) out.push(line)
        out.push([{text: '', kind: 'fg'}])
        break
      }
    }
  }

  // strip trailing blank line for tidiness
  while (out.length > 0 && out[out.length - 1].length === 1 && out[out.length - 1][0].text === '') {
    out.pop()
  }
  return out
}
