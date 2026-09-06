/**
 * 视图路由：home（云文档首页）| editor（文档编辑页）
 * hash 同步：#/doc/{id}，刷新/回退可恢复视图
 */
import { useCallback, useEffect, useState } from 'react'
import Home from './pages/Home'
import EditorPage from './pages/EditorPage'

interface View {
  name: 'home' | 'editor'
  docId?: string
}

function parseHash(): View {
  const m = window.location.hash.match(/^#\/doc\/(.+)$/)
  return m ? { name: 'editor', docId: m[1] } : { name: 'home' }
}

export default function App() {
  const [view, setView] = useState<View>(() => parseHash())

  useEffect(() => {
    const onHash = () => setView(parseHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const openDoc = useCallback((id: string) => {
    window.location.hash = `#/doc/${id}`
  }, [])

  const goHome = useCallback(() => {
    window.location.hash = ''
  }, [])

  if (view.name === 'editor' && view.docId) {
    return <EditorPage key={view.docId} docId={view.docId} onBack={goHome} />
  }
  return <Home onOpen={openDoc} />
}
