import { describe, expect, it } from 'vitest'
import { markdownToTiptapJSON, looksLikeMarkdown } from '../src/editor/mdPaste'

describe('Markdown 粘贴转换', () => {
  it('标题与段落', () => {
    const json = markdownToTiptapJSON('# 大标题\n\n正文一段')
    expect(json.content?.[0]).toMatchObject({ type: 'heading', attrs: { level: 1 } })
    expect(json.content?.[1]).toMatchObject({ type: 'paragraph' })
  })

  it('无序与有序列表', () => {
    const json = markdownToTiptapJSON('- a\n- b\n\n1. x\n2. y')
    expect(json.content?.[0].type).toBe('bulletList')
    expect(json.content?.[0].content).toHaveLength(2)
    expect(json.content?.[1].type).toBe('orderedList')
  })

  it('代码块与分割线', () => {
    const json = markdownToTiptapJSON('```python\nprint(1)\n```\n\n---')
    expect(json.content?.[0]).toMatchObject({ type: 'codeBlock', attrs: { language: 'python' } })
    expect(json.content?.[1].type).toBe('horizontalRule')
  })

  it('引用', () => {
    const json = markdownToTiptapJSON('> 引用一句')
    expect(json.content?.[0].type).toBe('blockquote')
  })

  it('行内样式：加粗/斜体/代码/链接', () => {
    const json = markdownToTiptapJSON('普通 **加粗** *斜体* `码` [链](https://x.com)')
    const marked = (json.content?.[0].content ?? []).filter((r) => r.marks?.length)
    expect(marked[0]).toMatchObject({ text: '加粗', marks: [{ type: 'bold' }] })
    expect(marked[1]).toMatchObject({ text: '斜体', marks: [{ type: 'italic' }] })
    expect(marked[2]).toMatchObject({ text: '码', marks: [{ type: 'code' }] })
    expect(marked[3]).toMatchObject({ text: '链', marks: [{ type: 'link' }] })
  })

  it('识别是否值得按 Markdown 处理', () => {
    expect(looksLikeMarkdown('# 标题\n正文')).toBe(true)
    expect(looksLikeMarkdown('这就是一段普通的话')).toBe(false)
  })
})
