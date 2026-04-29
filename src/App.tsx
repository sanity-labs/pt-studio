import {useEffect, useMemo, useRef} from 'react'
import {
  EditorProvider,
  PortableTextEditable,
  defineSchema,
  useEditor,
} from '@portabletext/editor'
import {BehaviorPlugin} from '@portabletext/editor/plugins'
import {makeStudioBehaviors} from './studio/behaviors'
import {makeInitialState, type StudioState} from './studio/state'
import {renderStudio} from './studio/render'

const schemaDefinition = defineSchema({
  decorators: [
    {name: 'chrome'},
    {name: 'title'},
    {name: 'fg'},
    {name: 'muted'},
    {name: 'cursor'},
    {name: 'selA'},
    {name: 'selI'},
    {name: 'accent'},
    {name: 'statusD'},
    {name: 'statusP'},
    {name: 'statusC'},
    {name: 'crumb'},
    {name: 'editBan'},
  ],
  styles: [{name: 'normal'}],
  annotations: [],
  lists: [],
  inlineObjects: [],
  blockObjects: [],
})

function StudioBridge({stateRef}: {stateRef: {current: StudioState}}) {
  const editor = useEditor()

  useEffect(() => {
    let raf = 0
    const tick = () => {
      // Drive cursor blink on a 500ms cadence — bumped each time we tick.
      const now = Date.now()
      const s = stateRef.current
      const phase = Math.floor(now / 500)
      if (phase !== s.blinkPhase) s.blinkPhase = phase
      const blocks = renderStudio(s)
      editor.send({type: 'update value', value: blocks})
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [editor, stateRef])

  // Keep focus inside the editor so it receives keystrokes.
  useEffect(() => {
    const grab = () => editor.send({type: 'focus'})
    const t = setTimeout(grab, 60)
    window.addEventListener('click', grab)
    return () => {
      clearTimeout(t)
      window.removeEventListener('click', grab)
    }
  }, [editor])

  return null
}

export function App() {
  const stateRef = useRef<StudioState>(makeInitialState())
  ;(window as unknown as {__pts?: StudioState}).__pts = stateRef.current
  const behaviors = useMemo(() => makeStudioBehaviors(stateRef), [])
  const initialValue = useMemo(() => renderStudio(stateRef.current), [])

  return (
    <div className="screen">
      <div className="frame">
        <EditorProvider initialConfig={{schemaDefinition, initialValue}}>
          <BehaviorPlugin behaviors={behaviors} />
          <StudioBridge stateRef={stateRef} />
          <div className="terminal">
            <PortableTextEditable
              className="pte"
              spellCheck={false}
              renderDecorator={(props) => (
                <span className={`d-${props.value}`}>{props.children}</span>
              )}
              renderBlock={(props) => <div className="row">{props.children}</div>}
              renderChild={(props) => <>{props.children}</>}
            />
          </div>
        </EditorProvider>
      </div>
      <footer className="explainer">
        <strong>PT-STUDIO —</strong> the entire studio shell, rendered as ASCII
        inside a single <code>@portabletext/editor</code> field. Each row is a
        Portable Text block. <kbd>Tab</kbd> switches panes,{' '}
        <kbd>↑</kbd>/<kbd>↓</kbd> moves the selection, <kbd>Enter</kbd> or
        <kbd>→</kbd> drills in, <kbd>Esc</kbd> or <kbd>←</kbd> backs out.
        Every keystroke is captured by a <code>defineBehavior</code> rule that
        runs <code>effect()</code> to mutate a small navigation ref —
        nothing else is returned, so the editor never inserts text.
      </footer>
    </div>
  )
}
