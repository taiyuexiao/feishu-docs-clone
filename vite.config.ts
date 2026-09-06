import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // 预声明全部 tiptap 依赖，避免运行中触发二次优化
    include: [
      'react',
      'react-dom',
      '@tiptap/core',
      '@tiptap/react',
      '@tiptap/suggestion',
      '@tiptap/starter-kit',
      '@tiptap/pm/state',
      '@tiptap/pm/model',
      '@tiptap/pm/view',
      '@tiptap/pm/transform',
      '@tiptap/extension-heading',
      '@tiptap/extension-bold',
      '@tiptap/extension-italic',
      '@tiptap/extension-strike',
      '@tiptap/extension-code',
      '@tiptap/extension-code-block',
      '@tiptap/extension-color',
      '@tiptap/extension-highlight',
      '@tiptap/extension-image',
      '@tiptap/extension-link',
      '@tiptap/extension-placeholder',
      '@tiptap/extension-table',
      '@tiptap/extension-table-cell',
      '@tiptap/extension-table-header',
      '@tiptap/extension-table-row',
      '@tiptap/extension-task-item',
      '@tiptap/extension-task-list',
      '@tiptap/extension-text-align',
      '@tiptap/extension-text-style',
      '@tiptap/extension-underline',
    ],
  },
  server: {
    port: 5174,
  },
})
