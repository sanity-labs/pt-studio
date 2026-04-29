import {defineBehavior, effect} from '@portabletext/editor/behaviors'
import {SCHEMA} from './schema'
import {docsByType} from './data'
import {activeType, type StudioState, type Pane} from './state'

/**
 * All keyboard input for pt-studio is captured by the Portable Text
 * Editor's Behaviors API. Tab/Shift-Tab cycles panes, ↑↓ moves the
 * selection within the active pane, Enter or → drills in, Esc or ←
 * backs out, E enters edit mode, Esc exits it.
 *
 * Every matched key is consumed by a single `effect()` action with
 * nothing else returned, so the editor never inserts a character.
 */

const NAV_KEYS = new Set<string>([
  'Tab',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Enter', 'Escape',
  'e', 'E',
  's', 'S',
  ' ',
])

const PANES: Pane[] = ['tree', 'list', 'form']

const flash = (s: StudioState, msg: string, durationMs = 2500) => {
  s.flash = msg
  s.flashUntil = Date.now() + durationMs
}

const nudge = (s: StudioState) => {
  s.lastTickMs = Date.now()
  s.blinkPhase = 0 // reset blink so cursor stays solid right after a keystroke
}

export const makeStudioBehaviors = (stateRef: {current: StudioState}) => {
  const onKeyDown = defineBehavior({
    on: 'keyboard.keydown',
    guard: ({event}) => NAV_KEYS.has(event.originEvent.key),
    actions: [
      ({event}) => [
        effect(() => {
          const s = stateRef.current
          const key = event.originEvent.key
          const shift = event.originEvent.shiftKey
          const meta = event.originEvent.metaKey || event.originEvent.ctrlKey
          nudge(s)

          // Cmd+S → faux-save flash
          if ((key === 's' || key === 'S') && meta) {
            flash(s, '✓ Saved (faux — this is a mocked studio)')
            return
          }

          if (s.editing) {
            if (key === 'Escape') {
              s.editing = false
              flash(s, 'Discarded edit')
            }
            // All other keys are consumed but do nothing — we don't actually
            // mutate the underlying value in the demo.
            return
          }

          // Tab to switch pane
          if (key === 'Tab') {
            const idx = PANES.indexOf(s.activePane)
            const next = shift
              ? PANES[(idx - 1 + PANES.length) % PANES.length]
              : PANES[(idx + 1) % PANES.length]
            s.activePane = next
            flash(s, `Pane: ${labelForPane(next)}`)
            return
          }

          // Up/down move within the active pane
          if (key === 'ArrowUp' || key === 'ArrowDown') {
            const dir = key === 'ArrowUp' ? -1 : 1
            if (s.activePane === 'tree') {
              s.treeIndex = clamp(s.treeIndex + dir, 0, SCHEMA.length - 1)
              s.listIndex = 0
              s.formIndex = 0
            } else if (s.activePane === 'list') {
              const docs = docsByType(activeType(s).name)
              s.listIndex = clamp(s.listIndex + dir, 0, Math.max(0, docs.length - 1))
              s.formIndex = 0
            } else {
              const fields = activeType(s).fields
              s.formIndex = clamp(s.formIndex + dir, 0, Math.max(0, fields.length - 1))
            }
            return
          }

          // Right / Enter → drill in
          if (key === 'ArrowRight' || key === 'Enter') {
            if (s.activePane === 'tree') {
              s.activePane = 'list'
              flash(s, `Opened ${activeType(s).pluralTitle}`)
            } else if (s.activePane === 'list') {
              s.activePane = 'form'
              const t = activeType(s)
              const docs = docsByType(t.name)
              const doc = docs[s.listIndex]
              if (doc) flash(s, `Opened ${doc.values.title || doc.values.name || doc._id}`)
            } else {
              // already in the form — Enter starts edit mode
              if (key === 'Enter') {
                s.editing = true
                flash(s, 'Editing — Esc to discard')
              }
            }
            return
          }

          // Left / Escape → back out
          if (key === 'ArrowLeft' || key === 'Escape') {
            if (s.activePane === 'form') {
              s.activePane = 'list'
            } else if (s.activePane === 'list') {
              s.activePane = 'tree'
            }
            return
          }

          // E to enter edit mode from anywhere in the form pane
          if ((key === 'e' || key === 'E') && s.activePane === 'form') {
            s.editing = true
            flash(s, 'Editing — Esc to discard')
            return
          }
        }),
      ],
    ],
  })

  // Belt-and-braces: the editor would otherwise treat 'e', 'E', 's', etc.
  // as text input. We swallow any single-char insert that maps to a nav
  // key, so the editor never accumulates content.
  const blockTextInput = defineBehavior({
    on: 'insert.text',
    guard: ({event}) => {
      if (event.text.length !== 1) return false
      const k = event.text
      return NAV_KEYS.has(k) || NAV_KEYS.has(k.toLowerCase())
    },
    actions: [() => [effect(() => {})]],
  })

  // Block break/soft break (Enter in editor world)
  const blockBreak = defineBehavior({
    on: 'insert.break',
    guard: () => true,
    actions: [() => [effect(() => {})]],
  })
  const blockSoftBreak = defineBehavior({
    on: 'insert.soft break',
    guard: () => true,
    actions: [() => [effect(() => {})]],
  })

  return [onKeyDown, blockTextInput, blockBreak, blockSoftBreak]
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

const labelForPane = (p: Pane) =>
  p === 'tree' ? 'Structure' : p === 'list' ? 'Documents' : 'Form'
