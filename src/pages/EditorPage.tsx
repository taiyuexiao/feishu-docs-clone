/**
 * 文档编辑页骨架 — 设计规范 §1.2
 * TopBar 56px + Toolbar 40px（编辑态） + 800px 居中编辑区 + 大纲面板
 * 自动保存（500ms 防抖） / 星标 / 分享弹层 / 阅读模式 / 更多菜单
 * AI帮我写浮层（用户自备模型） / 全局 Toast / 阅读模式按 E 进入编辑
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import type { Editor } from '@tiptap/core'
import { Toolbar } from '../editor/Toolbar'
import { BubbleToolbar } from '../editor/BubbleToolbar'
import { BlockHandle } from '../editor/BlockHandle'
import { OutlinePanel } from '../editor/OutlinePanel'
import { SharePopover } from '../editor/SharePopover'
import { Dropdown } from '../editor/Dropdown'
import { AISidebar } from '../editor/ai/AISidebar'
import { slashHelpers, type AIOpenOptions } from '../editor/slashHelpers'
import { currentTopBlockIndex } from '../editor/blockOps'
import { buildExtensions } from '../editor/extensions'
import {
  getDocMeta, getDocContent, saveDocContent, updateMeta, toggleStar, moveToTrash, defaultContent, createDoc,
} from '../data/store'
import * as I from '../components/icons'

type SaveStatus = 'saved' | 'saving'
type Mode = 'edit' | 'read'

/** 读取持久化内容：localStorage 存的是 JSON 字符串，需解析为文档对象（否则会被当作 HTML 文本） */
function parseStoredContent(docId: string) {
  const raw = getDocContent(docId)
  if (raw) {
    try {
      return JSON.parse(raw)
    } catch {
      /* 数据损坏时回退到空文档 */
    }
  }
  return defaultContent()
}

export default function EditorPage({ docId, onBack }: { docId: string; onBack: () => void }) {
  const meta = getDocMeta(docId)
  const [title, setTitle] = useState(meta?.title ?? '')
  const [starred, setStarred] = useState(meta?.starred ?? false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [shareOpen, setShareOpen] = useState(false)
  const [outlineOpen, setOutlineOpen] = useState(true)
  const [mode, setMode] = useState<Mode>('edit')
  const [linkCopied, setLinkCopied] = useState(false)
  const [ai, setAI] = useState<{ open: boolean; seed: AIOpenOptions & { context?: string } }>({ open: false, seed: {} })
  const [toast, setToast] = useState<{ id: number; msg: string } | null>(null)
  const titleRef = useRef<HTMLTextAreaElement>(null)

  const editor = useEditor({
    extensions: buildExtensions(),
    content: parseStoredContent(docId),
    autofocus: false,
    onUpdate: () => setSaveStatus('saving'),
  }, [docId])

  const titleSyncRef = useRef(title)
  titleSyncRef.current = title

  /* ---------- 全局 Toast（斜杠菜单/工具栏占位功能提示） ---------- */
  const showToast = useCallback((msg: string) => {
    setToast({ id: Date.now(), msg })
  }, [])
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2200)
    return () => window.clearTimeout(t)
  }, [toast])
  useEffect(() => {
    const onToast = (e: Event) => showToast((e as CustomEvent<string>).detail)
    window.addEventListener('fe-toast', onToast)
    return () => window.removeEventListener('fe-toast', onToast)
  }, [showToast])

  /* ---------- 斜杠菜单/块把手/浮条 与页面能力对接（AI 侧栏 / 副本 / Toast） ---------- */
  useEffect(() => {
    if (!editor) return
    slashHelpers.openAI = (ed: Editor, opts?: AIOpenOptions) => {
      // 上下文快照：优先当前选区，其次光标所在顶层块
      let context = ''
      try {
        const { from, to, empty } = ed.state.selection
        if (!empty && to > from) context = ed.state.doc.textBetween(from, to, '\n')
        else context = ed.state.doc.child(currentTopBlockIndex(ed))?.textContent ?? ''
      } catch {
        context = ''
      }
      setAI({ open: true, seed: { prompt: opts?.prompt, quick: opts?.quick, context: context.trim() } })
    }
    slashHelpers.toast = showToast
    slashHelpers.duplicateDoc = () => {
      const created = createDoc()
      const content = editor ? JSON.stringify(editor.getJSON()) : getDocContent(docId)
      if (content) saveDocContent(created.id, content)
      updateMeta(created.id, { title: `${titleSyncRef.current || '无标题文档'} 副本` })
      window.location.hash = `#/doc/${created.id}`
      showToast('已创建文档副本')
    }
  }, [editor, docId, showToast])

  /* ---------- 自动保存：正文防抖 500ms，卸载时 flush ---------- */
  const doSave = useCallback(() => {
    if (!editor) return
    saveDocContent(docId, JSON.stringify(editor.getJSON()))
    updateMeta(docId, { title: titleSyncRef.current })
    setSaveStatus('saved')
  }, [editor, docId])

  useEffect(() => {
    if (!editor) return
    const timer = { id: 0 }
    const schedule = () => {
      setSaveStatus('saving')
      window.clearTimeout(timer.id)
      timer.id = window.setTimeout(doSave, 500)
    }
    editor.on('update', schedule)
    const onLeave = () => doSave()
    window.addEventListener('beforeunload', onLeave)
    return () => {
      editor.off('update', schedule)
      window.removeEventListener('beforeunload', onLeave)
      window.clearTimeout(timer.id)
      doSave() // 离开页面时保存剩余改动
    }
  }, [editor, doSave])

  /* ---------- 标题变更防抖写入 meta ---------- */
  const firstTitle = useRef(true)
  useEffect(() => {
    if (firstTitle.current) { firstTitle.current = false; return }
    setSaveStatus('saving')
    const t = window.setTimeout(() => {
      updateMeta(docId, { title })
      setSaveStatus('saved')
    }, 500)
    return () => window.clearTimeout(t)
  }, [title, docId])

  /* ---------- 编辑 / 阅读模式（阅读态按 E 进入编辑，对齐飞书） ---------- */
  useEffect(() => {
    if (!editor) return
    editor.setEditable(mode === 'edit')
    // 补发空事务，让 BubbleToolbar/BlockHandle 等监听 transaction 的浮层立即刷新显隐
    editor.view.dispatch(editor.state.tr)
  }, [editor, mode])

  useEffect(() => {
    if (mode !== 'read') return
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
      if (e.key === 'e' || e.key === 'E') setMode('edit')
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mode])

  /* ---------- 新建空文档自动聚焦标题 ---------- */
  useEffect(() => {
    if (!meta?.title) titleRef.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------- 标题高度自适应（长标题自动换行） ---------- */
  useEffect(() => {
    const el = titleRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
  }, [title])

  const onStar = () => {
    const next = toggleStar(docId)
    setStarred(next)
  }

  const onCopyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href) } catch { /* ignore */ }
    setLinkCopied(true)
    window.setTimeout(() => setLinkCopied(false), 1500)
  }

  const onTrash = () => {
    moveToTrash(docId)
    onBack()
  }

  return (
    <div className="fe-editor-page">
      {/* ============ TopBar 56px ============ */}
      <header className="fe-topbar">
        <div className="fe-topbar-left">
          <button className="fe-topbar-icon-btn" title="返回" onClick={onBack}>
            <I.IconBack size={18} />
          </button>
          <span className="fe-doc-badge"><I.IconDoc size={16} /></span>
          <span className="fe-topbar-title" title={title || '无标题文档'}>
            {title || '无标题文档'}
          </span>
          <button
            className={`fe-topbar-icon-btn star ${starred ? 'on' : ''}`}
            title={starred ? '取消收藏' : '收藏'}
            onClick={onStar}
          >
            <I.IconStar size={16} filled={starred} />
          </button>
          <span className="fe-save-status">{saveStatus === 'saving' ? '保存中…' : '已保存'}</span>
        </div>

        <div className="fe-topbar-right">
          <div className="fe-avatar-group" title="协作者">
            <span className="fe-avatar fe-avatar-sm" style={{ background: 'linear-gradient(135deg,#3370FF,#7F3BF5)' }}>我</span>
            <span className="fe-avatar fe-avatar-sm" style={{ background: 'linear-gradient(135deg,#FF8800,#F54A45)' }}>张</span>
            <span className="fe-avatar fe-avatar-sm" style={{ background: 'linear-gradient(135deg,#34A853,#3370FF)' }}>李</span>
          </div>

          {/* 历史记录 */}
          <Dropdown button={() => (
            <button className="fe-topbar-icon-btn" title="历史记录"><I.IconHistory size={16} /></button>
          )}>
            {() => (
              <div className="fe-history-pop">
                <div className="fe-history-title"><I.IconHistory size={14} /> 历史记录</div>
                <div className="fe-history-empty">暂无历史记录<br /><span>版本历史与对比将在二期提供</span></div>
              </div>
            )}
          </Dropdown>

          <button className="fe-btn-primary fe-share-btn" onClick={() => setShareOpen(true)}>
            分&nbsp;&nbsp;享
          </button>

          {/* 更多 */}
          <Dropdown align="right" button={({ open }) => (
            <button className={`fe-topbar-icon-btn ${open ? 'on' : ''}`} title="更多"><I.IconMore size={16} /></button>
          )}>
            {(close) => (
              <div className="fe-menu" style={{ width: 200 }}>
                <div className="fe-mi" onClick={() => { setOutlineOpen((v) => !v); close() }}>
                  <I.IconList size={15} /><span>大纲</span>
                  <span className="fe-mi-state">{outlineOpen ? '已开启' : '已关闭'}</span>
                </div>
                <div className="fe-mi" onClick={() => { setMode(mode === 'edit' ? 'read' : 'edit'); close() }}>
                  {mode === 'edit' ? <I.IconEye size={15} /> : <I.IconPencil size={15} />}
                  <span>{mode === 'edit' ? '切换到阅读模式' : '切换到编辑模式'}</span>
                </div>
                <div className="fe-mi" onClick={() => { onCopyLink(); close() }}>
                  <I.IconLink size={15} /><span>{linkCopied ? '链接已复制' : '复制链接'}</span>
                </div>
                <div className="fe-menu-sep" />
                <div className="fe-mi danger" onClick={() => { onTrash(); close() }}>
                  <I.IconTrash size={15} /><span>移到回收站</span>
                </div>
              </div>
            )}
          </Dropdown>

          <span className="fe-topbar-vsep" />

          <button
            className={`fe-mode-btn ${mode === 'read' ? 'primary' : ''}`}
            title={mode === 'edit' ? '切换到阅读模式' : '切换到编辑模式'}
            onClick={() => setMode(mode === 'edit' ? 'read' : 'edit')}
          >
            {mode === 'edit' ? <><I.IconEye size={14} /> 阅读</> : <><I.IconPencil size={14} /> 编辑</>}
          </button>
        </div>
      </header>

      {/* ============ Toolbar 40px（编辑态显示） ============ */}
      {mode === 'edit' && editor && <div className="fe-toolbar-wrap"><Toolbar editor={editor} /></div>}

      {/* ============ 主体：大纲(左) + 编辑区 + AI侧栏(右) ============ */}
      <div className="fe-body">
        {outlineOpen && editor && <OutlinePanel editor={editor} onCollapse={() => setOutlineOpen(false)} />}
        {!outlineOpen && (
          <button className="fe-outline-rail" title="展开大纲" onClick={() => setOutlineOpen(true)}>
            <I.IconList size={14} />
            <span>大纲</span>
          </button>
        )}
        <div className="fe-content">
          <textarea
            ref={titleRef}
            className="fe-doc-title"
            placeholder="无标题文档"
            value={title}
            readOnly={mode === 'read'}
            rows={1}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                editor?.commands.focus('start')
              }
            }}
          />
          <EditorContent editor={editor} className="fe-editor" />
        </div>
        {editor && ai.open && mode === 'edit' && (
          <AISidebar editor={editor} seed={ai.seed} onClose={() => setAI((v) => ({ ...v, open: false }))} />
        )}
      </div>

      {/* ============ 浮层 ============ */}
      {editor && <BubbleToolbar editor={editor} />}
      {editor && <BlockHandle editor={editor} editable={mode === 'edit'} />}
      {shareOpen && <SharePopover docId={docId} onClose={() => setShareOpen(false)} />}

      {/* ============ Toast ============ */}
      {toast && <div className="fe-toast" key={toast.id}>{toast.msg}</div>}
    </div>
  )
}
