import {SCHEMA} from './schema'

export type Pane = 'tree' | 'list' | 'form'

export type StudioState = {
  activePane: Pane
  /** index into SCHEMA */
  treeIndex: number
  /** index into docsByType(activeType) */
  listIndex: number
  /** index into the active doc's fields */
  formIndex: number
  /** if non-null, we're "editing" the focused field — purely visual, the
   *  edit doesn't actually round-trip to data. */
  editing: boolean
  /** ms timestamp of last keystroke; drives the cursor blink. */
  lastTickMs: number
  /** counter to force the blink. */
  blinkPhase: number
  /** breadcrumb / status messages */
  flash: string
  flashUntil: number
  /** scroll offsets per pane in case content overflows */
  treeScroll: number
  listScroll: number
  formScroll: number
}

export const makeInitialState = (): StudioState => ({
  activePane: 'tree',
  treeIndex: 0,
  listIndex: 0,
  formIndex: 0,
  editing: false,
  lastTickMs: 0,
  blinkPhase: 0,
  flash: 'Welcome — Tab/Shift-Tab to switch panes, ↑↓ to move, Enter or → to drill in, Esc or ← to back out',
  flashUntil: Date.now() + 8000,
  treeScroll: 0,
  listScroll: 0,
  formScroll: 0,
})

export const activeType = (s: StudioState) => SCHEMA[s.treeIndex] ?? SCHEMA[0]
