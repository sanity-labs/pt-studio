// Pure mutation helpers for PtBlock arrays. Used by the PT-in-PT editor:
// the user's keystrokes call these to insert/delete characters, split
// blocks on Enter, and merge blocks on Backspace at offset 0.
//
// Spans are merged when adjacent and their marks match, so we don't
// fragment the array unnecessarily.

import type {PtBlock, PtSpan} from './portableText'

/** Flat text length of a single block (sum of span text lengths). */
export const blockTextLen = (b: PtBlock): number =>
  b.children.reduce((acc, s) => acc + s.text.length, 0)

const sameMarks = (a: string[] = [], b: string[] = []) => {
  if (a.length !== b.length) return false
  const sa = [...a].sort()
  const sb = [...b].sort()
  return sa.every((m, i) => m === sb[i])
}

const newKey = () => Math.random().toString(36).slice(2, 9)

/** Locate the span and intra-span index that contains a given block offset. */
const locate = (b: PtBlock, offset: number): {spanIdx: number; intra: number} => {
  let acc = 0
  for (let i = 0; i < b.children.length; i++) {
    const len = b.children[i].text.length
    if (offset <= acc + len) return {spanIdx: i, intra: offset - acc}
    acc += len
  }
  // Past the end → place at end of last span (or 0/0 if empty)
  if (b.children.length === 0) return {spanIdx: 0, intra: 0}
  return {spanIdx: b.children.length - 1, intra: b.children[b.children.length - 1].text.length}
}

/** Insert a single character at the given offset in the block, with the
 *  supplied marks. Splits the existing span when marks differ. */
export const insertCharAt = (
  block: PtBlock,
  offset: number,
  ch: string,
  marks: string[],
): void => {
  if (block.children.length === 0) {
    block.children.push({_type: 'span', text: ch, marks: [...marks]} as PtSpan)
    return
  }
  const {spanIdx, intra} = locate(block, offset)
  const span = block.children[spanIdx]
  const spanMarks = span.marks ?? []

  // Same marks as existing span → just splice into the text
  if (sameMarks(spanMarks, marks)) {
    span.text = span.text.slice(0, intra) + ch + span.text.slice(intra)
    return
  }

  // Different marks → split the span and insert a new one between the parts
  const before = span.text.slice(0, intra)
  const after = span.text.slice(intra)
  const inserts: PtSpan[] = []
  if (before.length > 0) inserts.push({_type: 'span', text: before, marks: [...spanMarks]})
  inserts.push({_type: 'span', text: ch, marks: [...marks]})
  if (after.length > 0) inserts.push({_type: 'span', text: after, marks: [...spanMarks]})
  block.children.splice(spanIdx, 1, ...inserts)
  // Coalesce neighbours with matching marks (cheap pass)
  coalesce(block)
}

/** Coalesce adjacent spans with identical marks. */
const coalesce = (block: PtBlock) => {
  for (let i = block.children.length - 1; i > 0; i--) {
    const a = block.children[i - 1]
    const b = block.children[i]
    if (sameMarks(a.marks ?? [], b.marks ?? [])) {
      a.text += b.text
      block.children.splice(i, 1)
    }
  }
  // Drop empty spans (but keep at least one)
  if (block.children.length > 1) {
    block.children = block.children.filter((s) => s.text.length > 0)
    if (block.children.length === 0) {
      block.children.push({_type: 'span', text: '', marks: []})
    }
  }
}

/** Delete the character that ends at `offset` (i.e., the char to the left
 *  of the cursor). Returns true if a deletion happened, false if offset 0
 *  with nothing to delete (caller should consider merge-with-previous). */
export const deleteCharAt = (block: PtBlock, offset: number): boolean => {
  if (offset <= 0) return false
  if (block.children.length === 0) return false
  const {spanIdx, intra} = locate(block, offset)
  const span = block.children[spanIdx]
  if (intra > 0) {
    span.text = span.text.slice(0, intra - 1) + span.text.slice(intra)
  } else {
    // intra === 0 means we should look at the previous span's last char
    if (spanIdx === 0) return false
    const prev = block.children[spanIdx - 1]
    prev.text = prev.text.slice(0, -1)
  }
  coalesce(block)
  return true
}

/** Forward delete: remove the char at offset. */
export const forwardDeleteAt = (block: PtBlock, offset: number): boolean => {
  if (block.children.length === 0) return false
  const total = blockTextLen(block)
  if (offset >= total) return false
  const {spanIdx, intra} = locate(block, offset)
  const span = block.children[spanIdx]
  if (intra < span.text.length) {
    span.text = span.text.slice(0, intra) + span.text.slice(intra + 1)
  } else if (spanIdx + 1 < block.children.length) {
    const next = block.children[spanIdx + 1]
    next.text = next.text.slice(1)
  }
  coalesce(block)
  return true
}

/** Split a block at `offset`. The new (right-hand) block is returned and
 *  inherits style 'normal' (so a heading + Enter starts a paragraph). */
export const splitBlockAt = (
  blocks: PtBlock[],
  blockIdx: number,
  offset: number,
): PtBlock => {
  const block = blocks[blockIdx]
  const total = blockTextLen(block)
  const at = Math.max(0, Math.min(total, offset))

  // Build left children
  const leftChildren: PtSpan[] = []
  const rightChildren: PtSpan[] = []
  let consumed = 0
  for (const span of block.children) {
    const len = span.text.length
    const startsAt = consumed
    const endsAt = consumed + len
    if (endsAt <= at) {
      leftChildren.push({...span, marks: [...(span.marks ?? [])]})
    } else if (startsAt >= at) {
      rightChildren.push({...span, marks: [...(span.marks ?? [])]})
    } else {
      const cut = at - startsAt
      if (cut > 0) leftChildren.push({...span, text: span.text.slice(0, cut), marks: [...(span.marks ?? [])]})
      if (span.text.length - cut > 0) rightChildren.push({...span, text: span.text.slice(cut), marks: [...(span.marks ?? [])]})
    }
    consumed = endsAt
  }
  if (leftChildren.length === 0) leftChildren.push({_type: 'span', text: '', marks: []})
  if (rightChildren.length === 0) rightChildren.push({_type: 'span', text: '', marks: []})

  block.children = leftChildren
  const newBlock: PtBlock = {
    _type: 'block',
    style: 'normal',
    children: rightChildren,
    markDefs: [],
  }
  blocks.splice(blockIdx + 1, 0, newBlock)
  coalesce(block)
  coalesce(newBlock)
  return newBlock
}

/** Merge block `blockIdx` into the previous block. Returns the cursor
 *  offset that should be used in the (now larger) previous block — which
 *  is the length of the previous block's text *before* the merge. */
export const mergeBlockWithPrev = (
  blocks: PtBlock[],
  blockIdx: number,
): number | null => {
  if (blockIdx <= 0) return null
  const prev = blocks[blockIdx - 1]
  const cur = blocks[blockIdx]
  const cursorAt = blockTextLen(prev)
  prev.children = [...prev.children, ...cur.children]
  blocks.splice(blockIdx, 1)
  coalesce(prev)
  return cursorAt
}

/** Toggle a mark in an array of marks, returning a new array. */
export const toggleMark = (marks: string[], mark: string): string[] =>
  marks.includes(mark) ? marks.filter((m) => m !== mark) : [...marks, mark]

/** Spans of the block at the offset's right edge — used to seed `ptMarks`
 *  when entering a block, so typing continues the existing run's style. */
export const marksAtOffset = (block: PtBlock, offset: number): string[] => {
  if (block.children.length === 0) return []
  const {spanIdx} = locate(block, offset)
  const span = block.children[spanIdx]
  return [...(span.marks ?? [])]
}
