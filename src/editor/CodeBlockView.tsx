import { useState } from 'react'
import CodeBlock from '@tiptap/extension-code-block'
import { NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react'

export const CODE_LANGUAGES = [
  'plain', 'javascript', 'typescript', 'jsx', 'tsx', 'python', 'java', 'go', 'rust',
  'c', 'cpp', 'csharp', 'html', 'css', 'json', 'yaml', 'bash', 'sql', 'markdown',
]

/** 代码块 NodeView：顶部语言选择 + 复制按钮 */
export function CodeBlockView({ node, updateAttributes, selected }: NodeViewProps) {
  const language = (node.attrs.language as string) || 'plain'
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(node.textContent)
    } catch {
      // 剪贴板不可用时忽略
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <NodeViewWrapper className="fe-codeblock" as="div" data-selected={selected ? 'true' : undefined}>
      <div className="fe-codeblock-header" contentEditable={false}>
        <div className="fe-codeblock-lang">
          <select
            value={language}
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => updateAttributes({ language: e.target.value })}
          >
            {CODE_LANGUAGES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        <button
          className="fe-codeblock-copy"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onCopy}
        >
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      <NodeViewContent className="fe-codeblock-content" as="pre" />
    </NodeViewWrapper>
  )
}

/**
 * 代码块 Node：基于官方 CodeBlock 扩展（保留 ``` 输入规则与快捷键），
 * 覆盖 language 属性默认值并接入自定义 NodeView
 */
export const FeCodeBlock = CodeBlock.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      language: {
        default: 'plain',
        parseHTML: (el) => el.getAttribute('data-language') || 'plain',
        renderHTML: (attrs) => ({ 'data-language': attrs.language }),
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView)
  },
})
