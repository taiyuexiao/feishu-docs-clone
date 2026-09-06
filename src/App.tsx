/**
 * 视图路由：home（云文档首页）| editor（文档编辑页）
 * hash 同步：#/doc/{id}，刷新/回退可恢复视图
 * 启动：先初始化 IndexedDB 数据层（含旧 localStorage 迁移）+ 应用主题
 */
import { useCallback, useEffect, useState } from 'react'
import Home from './pages/Home'
import EditorPage from './pages/EditorPage'
import { initStore } from './data/store'

interface View {
  name: 'home' | 'editor'
  docId?: string
}

function parseHash(): View {
  const m = window.location.hash.match(/^#\/doc\/(.+)$/)
  return m ? { name: 'editor', docId: m[1] } : { name: 'home' }
}

function applyTheme() {
  const saved = localStorage.getItem('feishu-clone:theme')
  if (saved) document.documentElement.setAttribute('data-theme', saved)
}

export default function App() {
  const [view, setView] = useState<View>(() => parseHash())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void initStore().then(() => {
      applyTheme()
      setReady(true)
    })
  }, [])

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

  if (!ready) return null
  if (view.name === 'editor' && view.docId) {
    return <EditorPage key={view.docId} docId={view.docId} onBack={goHome} />
  }
  return <Home onOpen={openDoc} />
}
