import { describe, expect, it } from 'vitest'
import { filterSlashItems, buildSlashItems, type SlashItem } from '../src/editor/slashItems'
import { looksLikeMarkdown } from '../src/editor/mdPaste'
import type { Editor } from '@tiptap/core'

/** 最小 editor 假对象：文档为空 */
function fakeEditor(): Editor {
  return {
    state: {
      doc: {
        childCount: 1,
        child: () => ({ type: { name: 'paragraph' }, content: { size: 0 } }),
        descendants: () => true,
      },
      selection: { from: 1, to: 1, empty: true },
    },
    chain: () => ({ focus: () => ({ run: () => true }) }),
  } as unknown as Editor
}

describe('斜杠菜单', () => {
  const items = buildSlashItems(fakeEditor())

  it('包含 AI 置顶条目与四大分组', () => {
    expect(items[0].group).toBe('AI')
    const groups = new Set(items.map((i) => i.group))
    expect(groups.has('基础')).toBe(true)
    expect(groups.has('常用')).toBe(true)
    expect(groups.has('按钮')).toBe(true)
    expect(groups.has('团队协作')).toBe(true)
  })

  it('新文档只有一~三级标题（渐进规则）', () => {
    const headings = items.filter((i) => i.title.includes('级标题'))
    expect(headings.map((h) => h.title)).toEqual(['一级标题', '二级标题', '三级标题'])
  })

  it('拼音缩写与英文关键词可命中', () => {
    const filtered = filterSlashItems(items as SlashItem[], 'gs')
    expect(filtered.some((i) => i.title === '公式')).toBe(true)
    expect(filterSlashItems(items, 'bg').some((i) => i.title === '表格')).toBe(true)
    expect(filterSlashItems(items, 'image').some((i) => i.title === '图片')).toBe(true)
  })

  it('无结果返回空数组', () => {
    expect(filterSlashItems(items as SlashItem[], 'zzzz')).toEqual([])
  })
})

describe('其他', () => {
  it('md 判定边界', () => {
    expect(looksLikeMarkdown('a | b')).toBe(false)
  })
})
