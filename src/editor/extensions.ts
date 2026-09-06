// Tiptap Schema 定义 —— 对照设计规范 v2（块模型 / Markdown 快捷输入 / 飞书交互扩展）
import StarterKit from '@tiptap/starter-kit'
import { type AnyExtension } from '@tiptap/core'
import type { Level } from '@tiptap/extension-heading'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Image from '@tiptap/extension-image'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import { Callout } from './CalloutView'
import { FeCodeBlock } from './CodeBlockView'
import { MockBlock } from './mockBlocks'
import { SlashMenuExtension } from './SlashMenu'
import { FeBold, FeItalic, FeStrike, FeCode } from './markRules'
import { FeishuBlockInputRules } from './blockInputRules'
import { FeIndent } from './indent'
import { FeishuShortcuts } from './shortcuts'
import { BlockSelect } from './blockSelect'

/** 飞书支持标题 1~9 级；Tiptap Level 类型只声明到 6，此处扩展 */
const HEADING_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as unknown as Level[]

export function buildExtensions(): AnyExtension[] {
  return [
    StarterKit.configure({
      heading: { levels: HEADING_LEVELS },
      codeBlock: false, // 使用自定义代码块（带语言选择 + 复制）
      bold: false,      // 行内 Markdown 规则替换为放宽版（对齐飞书，见 markRules.ts）
      italic: false,
      strike: false,
      code: false,
    }),
    FeBold,
    FeItalic,
    FeStrike,
    FeCode,
    FeishuBlockInputRules,
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    Underline,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Link.configure({ openOnClick: false, autolink: true }),
    Placeholder.configure({
      placeholder: ({ node }) =>
        node.type.name === 'heading' ? '标题' : '输入 / 快速插入内容',
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Image,
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    Callout,
    FeCodeBlock,
    MockBlock,
    // ---- 飞书交互扩展 ----
    FeIndent,
    SlashMenuExtension,
    FeishuShortcuts,
    BlockSelect,
  ]
}
