// 文档数据层：localStorage 持久化（一期单机版）
export interface DocMeta {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  starred: boolean
  deleted: boolean
}

const INDEX_KEY = 'feishu-clone:index'
const docKey = (id: string) => `feishu-clone:doc:${id}`

function loadIndex(): DocMeta[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY)
    return raw ? (JSON.parse(raw) as DocMeta[]) : []
  } catch {
    return []
  }
}

function saveIndex(list: DocMeta[]) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(list))
}

export function listDocs(): DocMeta[] {
  return loadIndex()
}

export function getDocMeta(id: string): DocMeta | undefined {
  return loadIndex().find((d) => d.id === id)
}

export function getDocContent(id: string): string | null {
  return localStorage.getItem(docKey(id))
}

export function saveDocContent(id: string, json: string) {
  localStorage.setItem(docKey(id), json)
  touchDoc(id)
}

export function createDoc(): DocMeta {
  const now = Date.now()
  const doc: DocMeta = {
    id: `doc_${now}_${Math.random().toString(36).slice(2, 8)}`,
    title: '',
    createdAt: now,
    updatedAt: now,
    starred: false,
    deleted: false,
  }
  const list = loadIndex()
  list.unshift(doc)
  saveIndex(list)
  saveDocContent(doc.id, JSON.stringify(defaultContent()))
  return doc
}

export function updateMeta(id: string, patch: Partial<Omit<DocMeta, 'id'>>) {
  const list = loadIndex()
  const i = list.findIndex((d) => d.id === id)
  if (i >= 0) {
    list[i] = { ...list[i], ...patch }
    saveIndex(list)
    return list[i]
  }
  return undefined
}

function touchDoc(id: string) {
  updateMeta(id, { updatedAt: Date.now() })
}

export function toggleStar(id: string): boolean {
  const meta = getDocMeta(id)
  const next = !meta?.starred
  updateMeta(id, { starred: next })
  return next
}

export function moveToTrash(id: string) {
  updateMeta(id, { deleted: true })
}

export function restoreDoc(id: string) {
  updateMeta(id, { deleted: false })
}

export function destroyDoc(id: string) {
  const list = loadIndex().filter((d) => d.id !== id)
  saveIndex(list)
  localStorage.removeItem(docKey(id))
}

export function formatDate(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const yest = new Date(now.getTime() - 86400000).toDateString() === d.toDateString()
  const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  if (sameDay) return `今天 ${hhmm}`
  if (yest) return `昨天 ${hhmm}`
  const y = d.getFullYear() === now.getFullYear() ? '' : `${d.getFullYear()}-`
  return `${y}${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${hhmm}`
}

export function defaultContent() {
  return {
    type: 'doc',
    content: [{ type: 'paragraph' }],
  }
}
