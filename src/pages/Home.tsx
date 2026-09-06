import { useMemo, useState } from 'react'
import * as I from '../components/icons'
import { Dropdown } from '../editor/Dropdown'
import {
  listDocs, createDoc, toggleStar, moveToTrash, restoreDoc, destroyDoc,
  type DocMeta,
} from '../data/store'

type Nav = 'home' | 'mine' | 'shared' | 'wiki' | 'star' | 'trash'

function formatTime(ts: number) {
  const d = new Date(ts)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const yest = new Date(now.getTime() - 86400000).toDateString() === d.toDateString()
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  const md = `${d.getMonth() + 1}-${d.getDate()}`
  if (sameDay) return `今天 ${hm}`
  if (yest) return `昨天 ${hm}`
  if (d.getFullYear() === now.getFullYear()) return md
  return `${d.getFullYear()}-${md}`
}

const NAVS: { key: Nav; label: string; icon: (s: number) => React.ReactNode }[] = [
  { key: 'home', label: '主页', icon: (s) => <I.IconHome size={s} /> },
  { key: 'mine', label: '我的空间', icon: (s) => <I.IconFolder size={s} /> },
  { key: 'shared', label: '共享空间', icon: (s) => <I.IconUsers size={s} /> },
  { key: 'wiki', label: '知识库', icon: (s) => <I.IconBook size={s} /> },
  { key: 'star', label: '收藏', icon: (s) => <I.IconStar size={s} /> },
  { key: 'trash', label: '回收站', icon: (s) => <I.IconTrash size={s} /> },
]

const NAV_TITLE: Record<Nav, string> = {
  home: '主页', mine: '我的空间', shared: '共享空间', wiki: '知识库', star: '收藏', trash: '回收站',
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="fe-empty">
      <div className="fe-empty-icon"><I.IconDoc size={48} /></div>
      <div className="fe-empty-text">{text}</div>
    </div>
  )
}

export default function Home({ onOpen }: { onOpen: (id: string) => void }) {
  const [nav, setNav] = useState<Nav>('home')
  const [docs, setDocs] = useState<DocMeta[]>(() => listDocs())
  const [q, setQ] = useState('')
  const refresh = () => setDocs(listDocs())

  const visible = useMemo(() => {
    return docs
      .filter((d) => {
        if (nav === 'trash') return d.deleted
        if (nav === 'shared' || nav === 'wiki') return false
        if (nav === 'star') return d.starred && !d.deleted
        return !d.deleted
      })
      .filter((d) => !q.trim() || d.title.toLowerCase().includes(q.trim().toLowerCase()))
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }, [docs, nav, q])

  const emptyByNav = {
    home: '暂无文档，点击右上角「新建」创建一篇文档',
    mine: '暂无文档，点击右上角「新建」创建一篇文档',
    shared: '暂无共享内容',
    wiki: '暂无知识库',
    star: '暂无收藏，打开文档后点击 ★ 加入收藏',
    trash: '回收站是空的',
  } as const

  return (
    <div className="fe-home">
      <header className="fe-header">
        <div className="fe-logo">
          <svg width="24" height="24" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#3370FF" /><path d="M6.5 13.5 18 7l-4.2 10.5-2.2-3.8-5.1-.2Z" fill="#fff" /><path d="m11.6 13.7 2.2-2.9" stroke="#3370FF" strokeWidth="1.2" /></svg>
        </div>
        <span className="fe-header-title">云文档</span>
        <div className="fe-search">
          <I.IconSearch size={14} />
          <input
            placeholder="搜索文档"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="fe-avatar fe-avatar-me">我</div>
      </header>
      <div className="fe-home-body">
        <aside className="fe-sidenav">
          {NAVS.map((n) => (
            <div
              key={n.key}
              className={`fe-nav-item ${nav === n.key ? 'on' : ''}`}
              onClick={() => { setNav(n.key); refresh() }}
            >
              <span className="fe-nav-icon">{n.icon(16)}</span>
              {n.label}
            </div>
          ))}
          <div className="fe-sidenav-foot">本地storage版 · 二期接入协作</div>
        </aside>
        <main className="fe-main">
          <div className="fe-main-head">
            <h1 className="fe-main-title">{NAV_TITLE[nav]}</h1>
            {nav !== 'trash' && (
              <Dropdown
                align="right"
                button={({ open }) => (
                  <button className={`fe-btn-primary${open ? ' on' : ''}`}>
                    <I.IconPlus size={14} /> 新建
                    <I.IconChevronDown size={12} />
                  </button>
                )}
              >
                {(close) => (
                  <div className="fe-menu" style={{ width: 160 }}>
                    <div
                      className="fe-mi"
                      onClick={() => {
                        const meta = createDoc()
                        refresh()
                        close()
                        onOpen(meta.id)
                      }}
                    >
                      <I.IconDoc size={15} />
                      <span>文档</span>
                    </div>
                  </div>
                )}
              </Dropdown>
            )}
          </div>
          {visible.length === 0 ? (
            <EmptyState text={emptyByNav[nav]} />
          ) : (
            <table className="fe-table">
              <thead>
                <tr>
                  <th>名称</th>
                  <th style={{ width: 160 }}>所有者</th>
                  <th style={{ width: 160 }}>修改时间</th>
                  <th style={{ width: 120 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((d) => (
                  <tr
                    key={d.id}
                    className="fe-doc-row"
                    onDoubleClick={() => !d.deleted && onOpen(d.id)}
                  >
                    <td>
                      <span className="fe-doc-name" onClick={() => !d.deleted && onOpen(d.id)}>
                        <I.IconDoc size={16} />
                        <span className="t">{d.title || '无标题文档'}</span>
                      </span>
                    </td>
                    <td>
                      <span className="fe-owner"><span className="fe-avatar fe-avatar-sm">我</span> 我</span>
                    </td>
                    <td className="fe-dim">{formatTime(d.updatedAt)}</td>
                    <td>
                      <div className="fe-row-actions">
                        {nav === 'trash' ? (
                          <>
                            <button className="fe-link-btn" onClick={() => { restoreDoc(d.id); refresh() }}>恢复</button>
                            <button className="fe-link-btn fe-danger" onClick={() => { destroyDoc(d.id); refresh() }}>彻底删除</button>
                          </>
                        ) : (
                          <>
                            <button
                              className={`fe-icon-btn ${d.starred ? 'on' : ''}`}
                              title={d.starred ? '取消收藏' : '收藏'}
                              onClick={(e) => { e.stopPropagation(); toggleStar(d.id); refresh() }}
                            >
                              {d.starred ? <I.IconStarFill size={15} /> : <I.IconStar size={15} />}
                            </button>
                            <button
                              className="fe-icon-btn"
                              title="移到回收站"
                              onClick={(e) => { e.stopPropagation(); moveToTrash(d.id); refresh() }}
                            >
                              <I.IconTrash size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </main>
      </div>
    </div>
  )
}
