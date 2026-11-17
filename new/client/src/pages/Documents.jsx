import { useState } from 'react';
import { api, download } from '../api';
import { useApp } from '../context';
import { useApi, Loading, Empty, fmtDate, fileSize } from '../components/ui';

const COL = { pdf: ['#dc2626', '#fdeceb'], docx: ['#2563eb', '#e6eefc'], doc: ['#2563eb', '#e6eefc'], pptx: ['#ea580c', '#fff1e6'], png: ['#16a34a', '#e8f8ee'], jpg: ['#16a34a', '#e8f8ee'], zip: ['#6b7280', '#f0f1f6'], csv: ['#059669', '#e6f7f1'], xlsx: ['#059669', '#e6f7f1'] };

export default function Documents() {
  const { user, isAdmin, toast } = useApp();
  const [cat, setCat] = useState('');
  const [docs, reload] = useApi('/documents' + (cat ? '?category=' + cat : ''), [cat]);
  const [upCat, setUpCat] = useState('Learning');
  const [busy, setBusy] = useState(false);
  if (!docs) return <Loading />;

  const upload = async (e) => {
    const files = [...e.target.files]; if (!files.length) return;
    setBusy(true);
    try {
      for (const f of files) { const fd = new FormData(); fd.append('file', f); fd.append('category', upCat); await api('/documents', { method: 'POST', form: fd }); }
      toast(files.length + ' file(s) uploaded'); reload();
    } catch (x) { toast(x.message); } finally { setBusy(false); e.target.value = ''; }
  };
  const remove = async (d) => { await api('/documents/' + d._id, { method: 'DELETE' }); reload(); toast('Deleted'); };

  return (<>
    <div className="toolbar">
      {['', 'Learning', 'Project', 'Policy'].map((c) => <button key={c} className={'btn sm' + (c === cat ? '' : ' ghost')} onClick={() => setCat(c)}>{c || 'All'}</button>)}
      <div className="spacer" />
      <select className="search" style={{ minWidth: 'auto' }} value={upCat} onChange={(e) => setUpCat(e.target.value)}>
        <option>Learning</option><option>Project</option>{isAdmin && <option>Policy</option>}</select>
      <label className="btn" style={{ cursor: 'pointer' }}>{busy ? 'Uploading…' : '⬆ Upload'}<input type="file" hidden multiple onChange={upload} disabled={busy} /></label>
    </div>
    <div className="card">{docs.length ? <div className="list">{docs.map((d) => { const ext = d.name.split('.').pop().toLowerCase(); const [c, bg] = COL[ext] || ['#6b7280', '#f0f1f6']; return (
      <div className="li" key={d._id}><div className="doc-ic" style={{ background: bg, color: c }}>{ext.slice(0, 4).toUpperCase()}</div>
        <div className="grow"><div className="t">{d.name}</div><div className="s">{d.category} · {fileSize(d.size)} · {d.uploadedBy?.name} · {fmtDate(d.createdAt)}{d.team ? ' · ' + d.team.name + ' only' : ''}</div></div>
        <button className="btn ghost sm" onClick={() => download(`/documents/${d._id}/download`, d.name).catch((e) => toast(e.message))}>Download</button>
        {(isAdmin || d.uploadedBy?._id === user._id) && <button className="btn ghost sm" onClick={() => remove(d)}>Delete</button>}</div>); })}</div> : <Empty>No files yet</Empty>}</div>
  </>);
}
