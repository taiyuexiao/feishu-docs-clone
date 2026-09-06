/**
 * 文档数据层 v2：IndexedDB 持久化 + 内存缓存（同步 API 不变，启动时加载）。
 * - 首次启动自动从旧版 localStorage 迁移
 * - 新增：快照（历史版本）、评论、文件夹、文档图标/封面、目录宽度等
 * - 写操作即时同步内存 + 异步写穿 IndexedDB
 */
export interface DocMeta {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  starred: boolean
  deleted: boolean
  icon?: string
  cover?: string
  folderId?: string | null
  width?: 'std' | 'wide'
}

export interface Folder {
  id: string
  name: string
  createdAt: number
}

export interface Snapshot {
  ts: number
  title: string
  json: string
  chars: number
}

export interface CommentItem {
  id: string
  text: string
  quote: string
  resolved: boolean
  createdAt: number
}

const DB_NAME = 'feishu-clone'
const DB_VERSION = 1
const LS_PREFIX = 'feishu-clone:'

/* ---------- 内存态 ---------- */

let metaList: DocMeta[] = []
let folders: Folder[] = []
const contents = new Map<string, string>()
const snapshots = new Map<string, Snapshot[]>()
const comments = new Map<string, CommentItem[]>()
let ready = false

export function isReady(): boolean {
  return ready
}

/* ---------- IndexedDB 基础 ---------- */

let db: IDBDatabase | null = null

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db)
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const d = req.result
      if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv')
      if (!d.objectStoreNames.contains('docs')) d.createObjectStore('docs')
      if (!d.objectStoreNames.contains('snapshots')) d.createObjectStore('snapshots')
      if (!d.objectStoreNames.contains('comments')) d.createObjectStore('comments')
    }
    req.onsuccess = () => { db = req.result; resolve(db) }
    req.onerror = () => reject(req.error)
  })
}

function idbPut(store: string, key: string, value: unknown): Promise<void> {
  return openDB().then((d) => new Promise((resolve, reject) => {
    const tx = d.transaction(store, 'readwrite')
    tx.objectStore(store).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  }))
}

function idbGetAll<T>(store: string): Promise<Array<[string, T]>> {
  return openDB().then((d) => new Promise((resolve, reject) => {
    const os = d.transaction(store).objectStore(store)
    const keysReq = os.getAllKeys()
    const valsReq = os.getAll()
    let keys: IDBValidKey[] | null = null
    let vals: T[] | null = null
    const finish = () => {
      if (keys && vals) resolve(keys.map((k, i) => [String(k), vals![i]] as [string, T]))
    }
    keysReq.onsuccess = () => { keys = keysReq.result as IDBValidKey[]; finish() }
    valsReq.onsuccess = () => { vals = valsReq.result as T[]; finish() }
    keysReq.onerror = () => reject(keysReq.error)
    valsReq.onerror = () => reject(valsReq.error)
  }))
}

function idbDelete(store: string, key: string): Promise<void> {
  return openDB().then((d) => new Promise((resolve, reject) => {
    const tx = d.transaction(store, 'readwrite')
    tx.objectStore(store).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  }))
}

/* ---------- 启动：打开 DB + 旧数据迁移 ---------- */

export async function initStore(): Promise<void> {
  if (ready) return
  await openDB()

  const hasKv = await idbGetAll<unknown>('kv')
  const metaEntry = hasKv.find(([k]) => k === 'index')
  if (!metaEntry) {
    migrateFromLocalStorage()
  } else {
    metaList = (metaEntry[1] as DocMeta[]) ?? []
    folders = ((hasKv.find(([k]) => k === 'folders')?.[1] as Folder[]) ?? [])
    for (const [id, json] of await idbGetAll<string>('docs')) contents.set(id, json)
    for (const [id, list] of await idbGetAll<Snapshot[]>('snapshots')) snapshots.set(id, list)
    for (const [id, list] of await idbGetAll<CommentItem[]>('comments')) comments.set(id, list)
  }
  ready = true
}

/** 旧版 localStorage(feishu-clone:index / feishu-clone:doc:*) → IndexedDB */
function migrateFromLocalStorage() {
  try {
    const raw = localStorage.getItem(`${LS_PREFIX}index`)
    metaList = raw ? (JSON.parse(raw) as DocMeta[]) : []
  } catch {
    metaList = []
  }
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i)
    if (!key || !key.startsWith(`${LS_PREFIX}doc:`)) continue
    const id = key.slice(LS_PREFIX.length + 4)
    contents.set(id, localStorage.getItem(key) ?? '')
    localStorage.removeItem(key)
  }
  localStorage.removeItem(`${LS_PREFIX}index`)
  void persistMeta()
  void persistFolders()
  for (const [id, json] of contents) void idbPut('docs', id, json)
}

/* ---------- 持久化 ---------- */

function persistMeta() { return idbPut('kv', 'index', metaList) }
function persistFolders() { return idbPut('kv', 'folders', folders) }
function persistSnapshots(id: string) {
  return idbPut('snapshots', id, snapshots.get(id) ?? [])
}
function persistComments(id: string) {
  return idbPut('comments', id, comments.get(id) ?? [])
}

/* ---------- 文档 CRUD（同步接口，写穿持久化） ---------- */

export function listDocs(): DocMeta[] {
  return metaList
}

export function getDocMeta(id: string): DocMeta | undefined {
  return metaList.find((d) => d.id === id)
}

export function getDocContent(id: string): string | null {
  return contents.get(id) ?? null
}

export function saveDocContent(id: string, json: string, opts?: { snapshot?: boolean }) {
  contents.set(id, json)
  void idbPut('docs', id, json)
  touchDoc(id)
  if (opts?.snapshot) pushSnapshot(id)
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
  metaList.unshift(doc)
  contents.set(doc.id, JSON.stringify(defaultContent()))
  void persistMeta()
  void idbPut('docs', doc.id, contents.get(doc.id)!)
  return doc
}

export function updateMeta(id: string, patch: Partial<Omit<DocMeta, 'id'>>): DocMeta | undefined {
  const i = metaList.findIndex((d) => d.id === id)
  if (i >= 0) {
    metaList[i] = { ...metaList[i], ...patch }
    void persistMeta()
    return metaList[i]
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
  metaList = metaList.filter((d) => d.id !== id)
  contents.delete(id)
  snapshots.delete(id)
  comments.delete(id)
  void persistMeta()
  void idbDelete('docs', id)
  void idbDelete('snapshots', id)
  void idbDelete('comments', id)
}

/* ---------- 快照（历史版本） ---------- */

const MAX_SNAPSHOTS = 50

export function pushSnapshot(id: string) {
  const json = contents.get(id) ?? ''
  let chars = 0
  try { chars = (JSON.parse(json) as { content?: unknown[] })?.content?.length ?? 0 } catch { /* ignore */ }
  const meta = getDocMeta(id)
  const list = snapshots.get(id) ?? []
  const last = list[list.length - 1]
  if (!last || last.json !== json) {
    list.push({ ts: Date.now(), title: meta?.title ?? '', json, chars })
    while (list.length > MAX_SNAPSHOTS) list.shift()
    snapshots.set(id, list)
    void persistSnapshots(id)
  }
}

export function listSnapshots(id: string): Snapshot[] {
  return [...(snapshots.get(id) ?? [])].reverse()
}

/* ---------- 评论 ---------- */

export function listComments(docId: string): CommentItem[] {
  return comments.get(docId) ?? []
}

export function addComment(docId: string, text: string, quote: string): CommentItem {
  const item: CommentItem = {
    id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    text,
    quote,
    resolved: false,
    createdAt: Date.now(),
  }
  const list = comments.get(docId) ?? []
  list.push(item)
  comments.set(docId, list)
  void persistComments(docId)
  return item
}

export function updateComment(docId: string, commentId: string, patch: Partial<Pick<CommentItem, 'resolved' | 'text'>>) {
  const list = comments.get(docId) ?? []
  const i = list.findIndex((c) => c.id === commentId)
  if (i >= 0) {
    list[i] = { ...list[i], ...patch }
    comments.set(docId, list)
    void persistComments(docId)
  }
}

export function deleteComment(docId: string, commentId: string) {
  comments.set(docId, (comments.get(docId) ?? []).filter((c) => c.id !== commentId))
  void persistComments(docId)
}

/* ---------- 文件夹 ---------- */

export function listFolders(): Folder[] {
  return folders
}

export function createFolder(name: string): Folder {
  const f: Folder = { id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`, name, createdAt: Date.now() }
  folders.push(f)
  void persistFolders()
  return f
}

export function renameFolder(id: string, name: string) {
  const f = folders.find((x) => x.id === id)
  if (f) { f.name = name; void persistFolders() }
}

export function deleteFolder(id: string) {
  folders = folders.filter((f) => f.id !== id)
  metaList.forEach((d) => { if (d.folderId === id) d.folderId = null })
  void persistFolders()
  void persistMeta()
}

/* ---------- 格式化 ---------- */

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
