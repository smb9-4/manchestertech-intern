import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { useApp } from '../context';
import { Avatar } from './ui';

export default function TaskComments({ task, onClose }) {
  const { user, toast } = useApp();
  const [list, setList] = useState(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const box = useRef(null);

  const load = () => api('/task-comments/' + task._id).then(setList).catch((e) => toast(e.message));
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []); // eslint-disable-line
  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight; }, [list]);

  const send = async (e) => {
    e.preventDefault();
    const t = text.trim(); if (!t) return;
    setBusy(true);
    try { const c = await api('/task-comments/' + task._id, { method: 'POST', body: { text: t } }); setList((x) => [...(x || []), c]); setText(''); }
    catch (x) { toast(x.message); } finally { setBusy(false); }
  };

  return (
    <div className="overlay open" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 600 }}>
        <header>Comments: {task.title}<button type="button" onClick={onClose}>&times;</button></header>
        <div className="body" style={{ gap: 10 }}>
          <div className="small muted">{task.project && task.project.name} - assigned to {task.assignee && task.assignee.name}</div>
          <div ref={box} className="msgs" style={{ maxHeight: 360, minHeight: 160, border: '1px solid var(--line)', borderRadius: 10, padding: 14 }}>
            {!list ? <div className="empty">Loading...</div> : !list.length ? <div className="empty">No comments yet. Ask a question or give an update.</div> :
              list.map((c) => { const mine = c.user && c.user._id === user._id; return (
                <div key={c._id} className={'msg' + (mine ? ' mine' : '')}><Avatar sm name={c.user && c.user.name} />
                  <div><div className="h"><b>{c.user && c.user.name}</b> - {new Date(c.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                    <div className="b" style={{ whiteSpace: 'pre-wrap' }}>{c.text}</div></div></div>); })}
          </div>
          <form onSubmit={send} style={{ display: 'flex', gap: 8 }}>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Write a comment..." style={{ flex: 1, padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 10, resize: 'vertical' }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) send(e); }} />
            <button className="btn" disabled={busy}>Send</button>
          </form>
          <div className="small muted">Enter to send, Shift+Enter for a new line.</div>
        </div>
      </div>
    </div>
  );
}