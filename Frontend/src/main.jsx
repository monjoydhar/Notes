import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const API = '/api/notes'

function Icon({ name, size = 20 }) {
  const paths = {
    plus: <><path d="M12 5v14M5 12h14"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></>,
    trash: <><path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    note: <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></>,
    spark: <><path d="m12 3-1.5 5.5L5 10l5.5 1.5L12 17l1.5-5.5L19 10l-5.5-1.5Z"/><path d="m19 16-.7 2.3L16 19l2.3.7L19 22l.7-2.3L22 19l-2.3-.7Z"/></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function Modal({ note, onClose, onSave, saving }) {
  const [title, setTitle] = useState(note?.title ?? '')
  const [description, setDescription] = useState(note?.description ?? '')
  const editing = Boolean(note)

  function submit(e) {
    e.preventDefault()
    if (!title.trim() || !description.trim()) return
    onSave({ title: title.trim(), description: description.trim() })
  }

  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <form className="modal" onSubmit={submit}>
      <div className="modal-head">
        <div><span className="eyebrow">{editing ? 'EDIT NOTE' : 'NEW NOTE'}</span><h2>{editing ? 'Refine your thought' : 'Capture a thought'}</h2></div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close"/></button>
      </div>
      <label>Title<input autoFocus maxLength="100" value={title} onChange={e => setTitle(e.target.value)} placeholder="Give your note a title" /></label>
      <label>Description<textarea maxLength="1000" rows="7" value={description} onChange={e => setDescription(e.target.value)} placeholder="Write down whatever is on your mind..." /></label>
      <div className="modal-foot"><span>{description.length}/1000</span><div className="actions"><button type="button" className="btn secondary" onClick={onClose}>Cancel</button><button className="btn primary" disabled={saving || !title.trim() || !description.trim()}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create note'}</button></div></div>
    </form>
  </div>
}

function App() {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return notes
    return notes.filter(n => `${n.title} ${n.description}`.toLowerCase().includes(q))
  }, [notes, query])

  async function loadNotes() {
    setLoading(true); setError('')
    try {
      const res = await fetch(API)
      if (!res.ok) throw new Error('Could not load notes')
      setNotes(await res.json())
    } catch (e) { setError('We couldn’t connect to your notes API. Make sure the backend is running on port 3000.') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadNotes() }, [])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2500); return () => clearTimeout(t) }, [toast])

  async function saveNote(data) {
    setSaving(true)
    try {
      const editing = modal?.mode === 'edit'
      const url = editing ? `${API}/${modal.note._id}` : API
      const res = await fetch(url, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error()
      setModal(null); setToast(editing ? 'Note updated' : 'Note created'); await loadNotes()
    } catch { setToast('Something went wrong. Please try again.') }
    finally { setSaving(false) }
  }

  async function deleteNote(note) {
    if (!window.confirm(`Delete “${note.title}”?`)) return
    try {
      const res = await fetch(`${API}/${note._id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setNotes(prev => prev.filter(n => n._id !== note._id)); setToast('Note deleted')
    } catch { setToast('Couldn’t delete that note') }
  }

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#"><span className="brand-mark"><Icon name="note" size={19}/></span><span>notes<span className="dot">.</span></span></a>
      <div className="status"><span className="status-dot"/> API connected <span className="status-sep">•</span> MongoDB</div>
    </header>

    <main className="container">
      <section className="hero">
        <div><span className="eyebrow">YOUR PRIVATE SPACE</span><h1>Ideas worth <em>remembering.</em></h1><p>Create, edit and keep your thoughts in one simple place.</p></div>
        <button className="btn primary create-btn" onClick={() => setModal({ mode: 'create' })}><Icon name="plus" size={18}/> New note</button>
      </section>

      <div className="toolbar">
        <div className="search"><Icon name="search" size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search your notes..." /></div>
        <span className="count">{notes.length} {notes.length === 1 ? 'note' : 'notes'}</span>
      </div>

      {error ? <div className="error-card"><div><strong>Connection issue</strong><p>{error}</p></div><button className="btn secondary" onClick={loadNotes}>Retry</button></div> : loading ? <div className="grid">{[1,2,3].map(i => <div className="skeleton" key={i}><div/><div/><div/></div>)}</div> : filtered.length === 0 ? <div className="empty"><div className="empty-icon"><Icon name={query ? 'search' : 'spark'} size={28}/></div><h2>{query ? 'No matching notes' : 'Your notebook is empty'}</h2><p>{query ? 'Try a different search term.' : 'Start with the idea that has been sitting in your head.'}</p>{!query && <button className="btn primary" onClick={() => setModal({ mode: 'create' })}><Icon name="plus" size={17}/> Create your first note</button>}</div> : <div className="grid">{filtered.map((note, i) => <article className="note-card" key={note._id}>
        <div className="card-top"><span className="note-index">{String(i + 1).padStart(2,'0')}</span><div className="card-actions"><button className="icon-btn" title="Edit" onClick={() => setModal({ mode: 'edit', note })}><Icon name="edit" size={17}/></button><button className="icon-btn danger" title="Delete" onClick={() => deleteNote(note)}><Icon name="trash" size={17}/></button></div></div>
        <h2>{note.title}</h2><p>{note.description}</p><div className="card-bottom"><span>Saved note</span><span className="line"/></div>
      </article>)}</div>}
    </main>

    <footer><span>Built around your ideas.</span><span>REST API · Express · MongoDB</span></footer>
    {modal && <Modal note={modal.mode === 'edit' ? modal.note : null} onClose={() => setModal(null)} onSave={saveNote} saving={saving}/>} 
    {toast && <div className="toast"><span><Icon name="check" size={17}/></span>{toast}</div>}
  </div>
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)
