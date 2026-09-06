import { useEffect, useReducer } from 'react'
import type { Editor } from '@tiptap/core'
import { Dropdown } from './Dropdown'
import { ToolbarBtn, ColorPanel } from './ToolbarBtns'
import { LinkEditor } from './LinkEditor'
import { TextStyleMenu } from './TextStyleMenu'
import { keyHint } from './shortcuts'
import { slashHelpers } from './slashHelpers'
import * as I from '../components/icons'

/**
 * 浮动工具栏（对齐飞书最新版）：
 * 问问AI | 解释 | T 文本样式 | B I U S 行内代码 | 颜色(合并面板) | 链接 | 缩进增减 | 评论
 * 位置：默认在选区上方，空间不足时移到下方
 */
export function BubbleToolbar({ editor }: { editor: Editor }) {
  const [, force] = useReducer((x: number) => x + 1, 0)

  useEffect(() => {
    const update = () => {
      const dom = document.querySelector<HTMLElement>('.fe-bubble')
      if (!dom) return
      const { state, view } = editor
      const { from, to, empty } = state.selection
      if (empty || !editor.isEditable || editor.isActive('codeBlock')) {
        dom.style.display = 'none'
        return
      }
      try {
        const a = view.coordsAtPos(from)
        const b = view.coordsAtPos(to)
        const left = Math.min(Math.max((a.left + b.left) / 2, 260), window.innerWidth - 260)
        const top = Math.min(a.top, b.top)
        const bottom = Math.max(a.bottom, b.bottom)
        const barH = 44
        const width = dom.offsetWidth
        const showBelow = top < barH + 8
        const nextLeft = Math.max(Math.min(left - width / 2, window.innerWidth - width - 8), 8)
        const nextTop = showBelow ? Math.min(bottom + 8, window.innerHeight - barH - 8) : Math.max(top - barH, 8)
        dom.style.left = `${nextLeft}px`
        dom.style.top = `${nextTop}px`
        dom.style.display = 'flex'
      } catch {
        dom.style.display = 'none'
      }
    }
    const raf = () => requestAnimationFrame(update)
    editor.on('selectionUpdate', raf)
    editor.on('transaction', raf)
    window.addEventListener('scroll', raf, true)
    window.addEventListener('resize', raf)
    raf()
    return () => {
      editor.off('selectionUpdate', raf)
      editor.off('transaction', raf)
      window.removeEventListener('scroll', raf, true)
      window.removeEventListener('resize', raf)
    }
  }, [editor])

  const c = () => editor.chain().focus()

  return (
    <div className="fe-bubble" onMouseDown={(e) => e.preventDefault()}>
      {/* AI 入口（对齐飞书浮条最左侧「问问豆包/解释」，此处为问问AI） */}
      <button
        type="button"
        className="fe-tbtn fe-bubble-ai"
        title="问问AI：在右侧 AI 栏中就所选内容继续提问"
        onClick={() => slashHelpers.openAI(editor)}
      >
        <I.IconAI size={14} />
        <span>问问AI</span>
      </button>
      <button
        type="button"
        className="fe-tbtn fe-bubble-ai"
        title="解释所选内容"
        onClick={() => slashHelpers.openAI(editor, { prompt: '请解释以下内容的含义与背景，分条输出要点：' })}
      >
        <span>解释</span>
      </button>

      <span className="fe-tool-sep" />

      {/* T 文本样式菜单 */}
      <Dropdown width={210} button={({ open }) => (
        <ToolbarBtn icon={<><span className="fe-bubble-t">T</span><I.IconChevronDown size={10} /></>} tip="文本样式" on={open} />
      )}>
        {(close) => <TextStyleMenu editor={editor} onPick={() => { force(); close() }} />}
      </Dropdown>

      <span className="fe-tool-sep" />

      <ToolbarBtn icon={<I.IconBold size={15} />} tip={`加粗 ${keyHint('⌘B', 'Ctrl+B')}`} on={editor.isActive('bold')} onClick={() => c().toggleBold().run()} />
      <ToolbarBtn icon={<I.IconItalic size={15} />} tip={`斜体 ${keyHint('⌘I', 'Ctrl+I')}`} on={editor.isActive('italic')} onClick={() => c().toggleItalic().run()} />
      <ToolbarBtn icon={<I.IconUnderline size={15} />} tip={`下划线 ${keyHint('⌘U', 'Ctrl+U')}`} on={editor.isActive('underline')} onClick={() => c().toggleUnderline().run()} />
      <ToolbarBtn icon={<I.IconStrike size={15} />} tip={`删除线 ${keyHint('⌘⇧X', 'Ctrl+Shift+X')}`} on={editor.isActive('strike')} onClick={() => c().toggleStrike().run()} />
      <ToolbarBtn icon={<I.IconCode size={15} />} tip={`行内代码 ${keyHint('Ctrl+⌘C', 'Ctrl+Shift+C')}`} on={editor.isActive('code')} onClick={() => c().toggleCode().run()} />

      <span className="fe-tool-sep" />

      {/* 颜色（字体 + 背景合并） */}
      <Dropdown button={({ open }) => (
        <ToolbarBtn icon={<I.IconFontColor size={15} />} tip={`颜色 ${keyHint('⌘⌥H', 'Ctrl+Alt+H')}`} on={open} />
      )}>
        {(close) => <ColorPanel editor={editor} onChange={force} />}
      </Dropdown>

      <Dropdown width={264} button={({ open }) => (
        <ToolbarBtn icon={<I.IconLink size={15} />} tip={`链接 ${keyHint('⌘K', 'Ctrl+K')}`} on={editor.isActive('link') || open} />
      )}>
        {(close) => <LinkEditor editor={editor} close={close} />}
      </Dropdown>

      {/* 缩进 */}
      <ToolbarBtn icon={<I.IconIndentOut size={15} />} tip="减少缩进" onClick={() => c().decreaseIndent().run()} />
      <ToolbarBtn icon={<I.IconIndentIn size={15} />} tip="增加缩进" onClick={() => c().increaseIndent().run()} />

      <span className="fe-tool-sep" />

      <ToolbarBtn
        icon={<I.IconComment size={15} />}
        tip={`评论 ${keyHint('⌘⌥M', 'Ctrl+Alt+M')}`}
        onClick={() => window.dispatchEvent(new CustomEvent('fe-toast', { detail: '评论功能即将上线，二期接入' }))}
      />
    </div>
  )
}
