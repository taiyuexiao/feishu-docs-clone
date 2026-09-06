import { describe, expect, it } from 'vitest'
import { getUsedMaxHeadingLevel, getVisibleHeadingLevels, getNestedHeadingLevels } from '../src/editor/headingLevels'

/** 构造 headingLevels 依赖的最小 doc 假对象 */
function fakeDoc(levels: number[]) {
  const nodes = levels.map((lv) => ({
    type: { name: lv === 0 ? 'paragraph' : 'heading' },
    attrs: { level: lv },
  }))
  return {
    descendants(cb: (node: { type: { name: string }; attrs: { level: number } }) => boolean) {
      for (const n of nodes) if (!cb(n)) break
    },
  } as never
}

describe('标题渐进显示规则', () => {
  it('新文档只显示 1~3 级', () => {
    expect(getVisibleHeadingLevels(fakeDoc([]))).toEqual([1, 2, 3])
  })

  it('使用 H3 后出现 H4', () => {
    expect(getVisibleHeadingLevels(fakeDoc([1, 2, 3]))).toEqual([1, 2, 3, 4])
  })

  it('使用 H5 后出现 H6', () => {
    expect(getVisibleHeadingLevels(fakeDoc([5]))).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('已用 H9 时封顶 1~9', () => {
    expect(getVisibleHeadingLevels(fakeDoc([9]))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('最深层级推导正确', () => {
    expect(getUsedMaxHeadingLevel(fakeDoc([2, 6, 3]))).toBe(6)
    expect(getUsedMaxHeadingLevel(fakeDoc([]))).toBe(0)
  })

  it('其他标题子菜单收录未展示级别', () => {
    expect(getNestedHeadingLevels(fakeDoc([]))).toEqual([4, 5, 6, 7, 8, 9])
    expect(getNestedHeadingLevels(fakeDoc([3]))).toEqual([5, 6, 7, 8, 9])
    expect(getNestedHeadingLevels(fakeDoc([9]))).toEqual([])
  })
})
