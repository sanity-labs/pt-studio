import ReactDOM from 'react-dom/client'
import {App} from './App'
import './styles.css'

// No <StrictMode>: the rerender loop + editor.send pattern doesn't tolerate
// double-mount in dev. Production is unaffected.
ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
