import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api, getToken, download } from '../api';
import { getSocket } from '../socket';
import { useApp } from '../context';
import { Avatar, Loading, fileSize } from '../components/ui';

const BASE = import.meta.env.VITE_API_URL || '';
const NAME_COLORS = ['#06cf9c', '#d6336c', '#7048e8', '#e8590c', '#1098ad', '#5c940d', '#c2255c', '#3b5bdb'];
const nameColor = (s = '') => NAME_COLORS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % NAME_COLORS.length];
const isImage = (f) => f && /^image\//.test(f.mime || '');
const hhmm = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
const dayLabel = (d) => {
  const x = new Date(d); const t = new Date(); const y = new Date(); y.setDate(t.getDate() - 1);
  if (x.toDateString() === t.toDateString()) return 'Today';
  if (x.toDateString() === y.toDateString()) return 'Yesterday';
  return x.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
};
const listTime = (d) => {
  const x = new Date(d); const t = new Date();
  if (x.toDateString() === t.toDateString()) return hhmm(d);
  const y = new Date(); y.setDate(t.getDate() - 1);
  if (x.toDateString() === y.toDateString()) return 'Yesterday';
  return x.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' });
};
const seenKey = 'ih_chat_seen';
const readSeen = () => { try { return JSON.parse(localStorage.getItem(seenKey) || '{}'); } catch { return {}; } };

// Images need the login token, so load them as blobs
function useFileUrl(id) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let u = null; let alive = true;
    fetch(BASE + '/api/chat-files/file/' + id, { headers: { Authorization: 'Bearer ' + getToken() } })
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error('x'))))
      .then((b) => { if (alive) { u = URL.createObjectURL(b); setUrl(u); } })
      .catch(() => alive && setFailed(true));
    return () => { alive = false; if (u) URL.revokeObjectURL(u); };
  }, [id]);
  return [url, failed];
}

function ImageMsg({ file, onOpen }) {
  const [url, failed] = useFileUrl(file._id);
  if (failed) return <div className="wa-file wa-missing">{'\u{1F5BC}'} Image no longer available</div>;
  if (!url) return <div className="wa-img wa-img-loading" />;
  return <img className="wa-img" src={url} alt={file.name} onClick={() => onOpen({ url, file })} />;
}

function FileMsg({ file }) {
  const { toast } = useApp();
  const ext = (file.name.split('.').pop() || 'FILE').slice(0, 4).toUpperCase();
  return (
    <button type="button" className="wa-file" onClick={() => download('/chat-files/file/' + file._id + '?download=1', file.name).catch(() => toast('This file is no longer available'))}>
      <span className="wa-file-ic">{ext}</span>
      <span className="wa-file-meta"><b>{file.name}</b><span>{fileSize(file.size || 0)} - tap to download</span></span>
    </button>
  );
}

function Viewer({ item, onClose }) {
  useEffect(() => { const h = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  return (
    <div className="wa-viewer" onClick={onClose}>
      <div className="wa-viewer-bar" onClick={(e) => e.stopPropagation()}>
        <span>{item.file.name}</span>
        <span className="spacer" />
        <a href={item.url} download={item.file.name} className="wa-viewer-btn">Download</a>
        <button className="wa-viewer-btn" onClick={onClose}>Close</button>
      </div>
      <img src={item.url} alt={item.file.name} onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

function ChatAvatar({ c }) {
  if (c.kind === 'dm') return <Avatar name={c.name} />;
  const ic = c.kind === 'announce' ? '\u{1F4E3}' : c.kind === 'team' || c.kind === 'public' ? '\u{1F465}' : '#';
  return <div className="av wa-group-av">{ic}</div>;
}

export default function Chat() {
  const { user, isAdmin, toast } = useApp();
  const loc = useLocation();
  const requestedChannel = new URLSearchParams(loc.search).get('channel');
  const [channels, setChannels] = useState(null);
  const [teams, setTeams] = useState(null);
  const [people, setPeople] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [ch, setCh] = useState(loc.state?.ch || requestedChannel || null);
  const [msgs, setMsgs] = useState([]);
  const [last, setLast] = useState({});
  const [unread, setUnread] = useState({});
  const [seen, setSeen] = useState(readSeen);
  const [q, setQ] = useState('');
  const [text, setText] = useState('');
  const [pending, setPending] = useState([]);
  const [sending, setSending] = useState(false);
  const [viewer, setViewer] = useState(null);
  const [drag, setDrag] = useState(false);
  const box = useRef(null);
  const chRef = useRef(ch); chRef.current = ch;
  const fileIn = useRef(null);

  useEffect(() => {
    Promise.all([api('/messages/channels'), api('/teams'), api('/users')])
      .then(([list, teamList, personList]) => {
        setChannels(list);
        setTeams(teamList);
        setPeople(personList);
        api('/chat-files/last?ch=' + encodeURIComponent(list.map((c) => c.id).join(','))).then(setLast).catch(() => {});
      })
      .catch((e) => setLoadError(e.message));
  }, []);
  useEffect(() => {
    const target = new URLSearchParams(loc.search).get('channel');
    if (!target || !channels?.some((channel) => channel.id === target)) return;
    setCh(target);
    if (target.startsWith('team:')) setExpandedTeam(target);
  }, [loc.search, channels]);
  useEffect(() => {
    if (!ch) return;
    setMsgs(null);
    api('/messages/' + encodeURIComponent(ch)).then(setMsgs).catch(() => setMsgs([]));
    setUnread((u) => ({ ...u, [ch]: 0 }));
    markSeen(ch);
    setPending([]);
  }, [ch]); // eslint-disable-line
  useEffect(() => {
    const s = getSocket();
    const on = (m) => {
      setLast((l) => ({ ...l, [m.channel]: m }));
      if (m.channel === chRef.current) { setMsgs((x) => (x && !x.some((y) => y._id === m._id) ? [...x, m] : x)); markSeen(m.channel); }
      else if (!m.from || m.from._id !== user._id) setUnread((u) => ({ ...u, [m.channel]: (u[m.channel] || 0) + 1 }));
    };
    s && s.on('message', on);
    return () => s && s.off('message', on);
  }, []); // eslint-disable-line
  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight; }, [msgs, ch]);

  function markSeen(c) {
    setSeen((s) => { const n = { ...s, [c]: new Date().toISOString() }; try { localStorage.setItem(seenKey, JSON.stringify(n)); } catch { /* ignore */ } return n; });
  }

  const teamRows = useMemo(() => {
    if (!channels || !teams || !people) return [];
    return teams.map((team) => {
      const channel = channels.find((item) => item.id === `team:${team._id}`);
      if (!channel) return null;
      const members = people.filter((person) => person.team?._id === team._id &&
        person._id !== user._id && ['intern', 'leader'].includes(person.role))
        .map((person) => ({
          ...person,
          channel: channels.find((item) => item.kind === 'dm' && item.userId === person._id),
        }))
        .filter((person) => person.channel);
      return { ...channel, name: team.name, teamId: team._id, members };
    }).filter(Boolean);
  }, [channels, teams, people, user._id]);

  if (loadError) return <div className="card" role="alert">Could not load chats: {loadError}</div>;
  if (!channels || !teams || !people) return <Loading />;
  const activeChannel = channels.find((c) => c.id === ch);
  const cur = activeChannel?.kind === 'team'
    ? { ...activeChannel, name: teamRows.find((team) => team.id === activeChannel.id)?.name || activeChannel.name }
    : activeChannel;
  const canPost = ch !== 'announcements' || isAdmin;
  const isGroup = cur && cur.kind !== 'dm';
  const label = (c) => c.kind === 'public' ? 'Everyone' : c.name;
  const hasNew = (c) => unread[c.id] > 0 || (last[c.id] && c.id !== ch && last[c.id].from && last[c.id].from._id !== user._id && (!seen[c.id] || last[c.id].createdAt > seen[c.id]));
  const query = q.trim().toLowerCase();
  const visibleTeams = teamRows.filter((team) => !query || team.name.toLowerCase().includes(query) ||
    team.members.some((person) => person.name.toLowerCase().includes(query)));
  const visibleMembers = (team) => team.members.filter((person) =>
    !query || team.name.toLowerCase().includes(query) || person.name.toLowerCase().includes(query));
  const shouldExpand = (team) => expandedTeam === team.id ||
    (!!query && team.members.some((person) => person.name.toLowerCase().includes(query)));
  const everyone = channels.find((c) => c.id === 'general');
  const preview = (m) => {
    if (!m) return 'No messages yet';
    const who = m.from && m.from._id === user._id ? 'You: ' : (m.from ? m.from.name.split(' ')[0] + ': ' : '');
    if (m.file) return who + (isImage(m.file) ? '\u{1F4F7} Photo' : '\u{1F4CE} ' + m.file.name) + (m.text ? ' - ' + m.text : '');
    return who + m.text;
  };

  const addFiles = (files) => {
    const list = [...files].filter(Boolean);
    if (!list.length) return;
    const max = 20 * 1024 * 1024;
    const ok = list.filter((f) => f.size <= max);
    if (ok.length < list.length) toast('Files over 20 MB were skipped');
    setPending((p) => [...p, ...ok.map((f) => ({ f, url: /^image\//.test(f.type) ? URL.createObjectURL(f) : null }))].slice(0, 10));
  };
  const removePending = (i) => setPending((p) => { if (p[i].url) URL.revokeObjectURL(p[i].url); return p.filter((_, k) => k !== i); });

  const send = async (e) => {
    if (e) e.preventDefault();
    const t = text.trim();
    if (!t && !pending.length) return;
    setSending(true);
    try {
      if (pending.length) {
        for (let i = 0; i < pending.length; i++) {
          const fd = new FormData(); fd.append('file', pending[i].f);
          if (i === 0 && t) fd.append('text', t);
          await api('/chat-files/' + encodeURIComponent(ch), { method: 'POST', form: fd });
        }
        pending.forEach((p) => p.url && URL.revokeObjectURL(p.url));
        setPending([]);
      } else if (ch === 'announcements') {
        await api('/messages/announcements', { method: 'POST', body: { text: t } });
      } else {
        const s = getSocket();
        if (s && s.connected) s.emit('message:send', { channel: ch, text: t }, (r) => r && r.error && toast(r.error));
        else await api('/messages/' + encodeURIComponent(ch), { method: 'POST', body: { text: t } });
      }
      setText('');
    } catch (x) { toast(x.message); } finally { setSending(false); }
  };

  // Build rows with date dividers and grouped senders
  const rows = [];
  (msgs || []).forEach((m, i) => {
    const prev = msgs[i - 1];
    const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
    if (newDay) rows.push({ day: dayLabel(m.createdAt), key: 'd' + m._id });
    const same = prev && !newDay && prev.from && m.from && prev.from._id === m.from._id;
    rows.push({ m, first: !same, key: m._id });
  });

  return (
    <div className={'wa' + (ch ? ' wa-open' : '')}>
      <aside className="wa-list">
        <div className="wa-list-head">Chats</div>
        <div className="wa-search"><input placeholder="Search chats" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="wa-items">
          {visibleTeams.map((team) => {
            const expanded = shouldExpand(team);
            const teamLast = last[team.id];
            const teamUnread = unread[team.id] || 0;
            const teamHasNew = hasNew(team);
            return <div className="wa-team-group" key={team.id}>
              <button type="button" className={'wa-item wa-team-toggle' + (team.id === ch ? ' on' : '')}
                aria-expanded={expanded} onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}>
                <ChatAvatar c={team} />
                <span className="wa-item-body">
                  <span className="wa-item-top"><b>{team.name}</b><span className="wa-expand-icon">{expanded ? '⌄' : '›'}</span></span>
                  <span className="wa-item-bot"><span className="wa-item-prev">{teamLast ? preview(teamLast) : `${team.members.length} members`}</span>
                    {teamHasNew && <span className="wa-badge">{teamUnread || ''}</span>}</span>
                </span>
              </button>
              {expanded && <div className="wa-team-children">
                <button type="button" className={'wa-item wa-team-room' + (team.id === ch ? ' on' : '')}
                  onClick={() => { setExpandedTeam(team.id); setCh(team.id); }}>
                  <ChatAvatar c={team} />
                  <span className="wa-item-body">
                    <span className="wa-item-top"><b>Whole team</b><span className="wa-item-time">{teamLast ? listTime(teamLast.createdAt) : ''}</span></span>
                    <span className="wa-item-bot"><span className="wa-item-prev">{preview(teamLast)}</span></span>
                  </span>
                </button>
                {visibleMembers(team).map((person) => {
                  const c = person.channel;
                  const message = last[c.id];
                  const newMessage = hasNew(c);
                  return <button type="button" key={c.id} className={'wa-item wa-team-member' + (c.id === ch ? ' on' : '')}
                    onClick={() => setCh(c.id)}>
                    <ChatAvatar c={c} />
                    <span className="wa-item-body">
                      <span className="wa-item-top"><b>{person.name}</b><span className={'wa-item-time' + (newMessage ? ' new' : '')}>{message ? listTime(message.createdAt) : ''}</span></span>
                      <span className="wa-item-bot"><span className="wa-item-prev">{preview(message)}</span>
                        {newMessage && <span className="wa-badge">{unread[c.id] || ''}</span>}</span>
                    </span>
                  </button>;
                })}
                {!visibleMembers(team).length && <div className="wa-team-empty small muted">No team members found</div>}
              </div>}
            </div>;
          })}
          {everyone && (!query || 'everyone'.includes(query) || 'general'.includes(query)) && <button type="button"
            className={'wa-item wa-everyone' + (everyone.id === ch ? ' on' : '')} onClick={() => setCh(everyone.id)}>
            <ChatAvatar c={everyone} />
            <span className="wa-item-body">
              <span className="wa-item-top"><b>Everyone</b><span className="wa-item-time">{last[everyone.id] ? listTime(last[everyone.id].createdAt) : ''}</span></span>
              <span className="wa-item-bot"><span className="wa-item-prev">{preview(last[everyone.id])}</span>
                {hasNew(everyone) && <span className="wa-badge">{unread[everyone.id] || ''}</span>}</span>
            </span>
          </button>}
          {!visibleTeams.length && (!query || !'everyone'.includes(query) && !'general'.includes(query)) && <div className="empty small">No chats found</div>}
        </div>
      </aside>

      <section className="wa-chat"
        onDragOver={(e) => { if (canPost && ch) { e.preventDefault(); setDrag(true); } }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); if (canPost && ch) addFiles(e.dataTransfer.files); }}>
        {!cur ? <div className="wa-empty"><div className="wa-empty-ic">{'\u{1F4AC}'}</div><h3>Intern Portal Chat</h3><p>Pick a chat on the left to start messaging. You can send photos and files too.</p></div> : <>
          <header className="wa-head">
            <button className="wa-back" onClick={() => setCh(null)}>&larr;</button>
            <ChatAvatar c={cur} />
            <div><div className="wa-head-name">{label(cur)}</div><div className="wa-head-sub">{cur.kind === 'dm' ? 'Direct message' : cur.kind === 'announce' ? 'Only admins can send messages' : cur.kind === 'team' ? 'Team group' : 'Everyone in the programme'}</div></div>
          </header>
          <div className="wa-msgs" ref={box}>
            {msgs === null ? <div className="wa-day"><span>Loading...</span></div> : !rows.length ? <div className="wa-day"><span>No messages yet. Say hello!</span></div> : rows.map((r) => r.day ? <div key={r.key} className="wa-day"><span>{r.day}</span></div> : (() => {
              const m = r.m; const mine = m.from && m.from._id === user._id;
              return (
                <div key={r.key} className={'wa-row' + (mine ? ' me' : '') + (r.first ? ' first' : '')}>
                  <div className={'wa-bubble' + (m.file && isImage(m.file) ? ' has-img' : '')}>
                    {!mine && isGroup && r.first && <div className="wa-name" style={{ color: nameColor(m.from && m.from.name) }}>{m.from && m.from.name}</div>}
                    {m.file && (isImage(m.file) ? <ImageMsg file={m.file} onOpen={setViewer} /> : <FileMsg file={m.file} />)}
                    {m.text && <span className="wa-text">{m.text}</span>}
                    <span className="wa-time">{hhmm(m.createdAt)}{mine && <span className="wa-tick">{'\u{2713}\u{2713}'}</span>}</span>
                  </div>
                </div>);
            })())}
          </div>
          {drag && <div className="wa-drop">Drop files to send</div>}
          {canPost ? (
            <form className="wa-compose" onSubmit={send}>
              {pending.length > 0 && <div className="wa-pending">{pending.map((p, i) => (
                <div key={i} className="wa-pend">
                  {p.url ? <img src={p.url} alt="" /> : <span className="wa-file-ic">{(p.f.name.split('.').pop() || 'FILE').slice(0, 4).toUpperCase()}</span>}
                  <span className="wa-pend-name">{p.f.name}</span>
                  <button type="button" onClick={() => removePending(i)} title="Remove">&times;</button>
                </div>))}</div>}
              <div className="wa-compose-row">
                <button type="button" className="wa-icon" title="Attach photo or file" onClick={() => fileIn.current && fileIn.current.click()}>{'\u{1F4CE}'}</button>
                <input ref={fileIn} type="file" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
                <textarea rows={1} value={text} placeholder={pending.length ? 'Add a caption...' : 'Type a message'}
                  onChange={(e) => setText(e.target.value)}
                  onPaste={(e) => { const files = [...e.clipboardData.items].filter((it) => it.kind === 'file').map((it) => it.getAsFile()); if (files.length) { e.preventDefault(); addFiles(files); } }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
                <button className="wa-send" disabled={sending || (!text.trim() && !pending.length)} title="Send">{sending ? '...' : '\u{27A4}'}</button>
              </div>
            </form>
          ) : <div className="wa-compose wa-readonly">Only admins can send messages in announcements</div>}
        </>}
      </section>
      {viewer && <Viewer item={viewer} onClose={() => setViewer(null)} />}
    </div>
  );
}