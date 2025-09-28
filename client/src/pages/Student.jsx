import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import { getAuth } from '../lib/auth.js';
import { saveSel, loadSel } from '../lib/persist.js';

function normalizeText(s = '') {
  // Lowercase, collapse whitespace, trim. This is what we compare for duplicates.
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

function ErrorBanner({ msg, onClose }) {
  if (!msg) return null;
  return (
    <div className="alert danger" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span>{msg}</span>
      <button className="btn" onClick={onClose} aria-label="close error">✕</button>
    </div>
  );
}

function Board({ lectureId }) {
  const [qs, setQs] = useState([]);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const esRef = useRef(null);
  const token = getAuth()?.token;

  const load = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/lectures/${lectureId}/questions`);
      setQs(Array.isArray(data) ? data : []);
    } catch (e) {
      // keep silent on background refresh; optionally surface if you prefer
      console.warn('[load questions]', e?.message || e);
    }
  }, [lectureId]);

  useEffect(() => { if (lectureId) load(); }, [lectureId, load]);

  // SSE live updates (no route change)
  useEffect(() => {
    if (!lectureId || !token) return;
    const url =
      `${(import.meta.env.VITE_API_URL || 'http://localhost:5000')}/api/lectures/${lectureId}/stream?token=${token}`;
    const es = new EventSource(url);
    es.onmessage = () => load();
    es.onerror = () => { /* EventSource will auto-retry; keep quiet */ };
    esRef.current = es;
    return () => { try { es && es.close(); } catch {} };
  }, [lectureId, token, load]);

  const ask = async () => {
    setError('');

    const raw = text || '';
    const normalized = normalizeText(raw);
    if (!normalized) return;

    // Client-side duplicate guard (same normalized text, not deleted)
    const hasDuplicate = qs.some(q =>
      normalizeText(q?.text) === normalized && q?.status !== 'deleted'
    );
    if (hasDuplicate) {
      setError('Duplicate question detected for this lecture.');
      return;
    }

    setPosting(true);
    try {
      await apiFetch(`/api/lectures/${lectureId}/questions`, {
        method: 'POST',
        body: JSON.stringify({ text: raw }),
      });
      setText('');
      await load(); // refresh immediately
    } catch (e) {
      // If server returns a specific error (e.g., 409 conflict), apiFetch should set e.message
      setError(e?.message || 'Failed to post question');
    } finally {
      setPosting(false);
    }
  };

  const colors = ['yellow', 'pink', 'blue', 'green'];

  return (
    <div>
      <ErrorBanner msg={error} onClose={() => setError('')} />

      <div className="row" style={{ marginBottom: 12 }}>
        <input
          className="input"
          value={text}
          disabled={posting}
          onChange={e => setText(e.target.value)}
          placeholder="Ask your question..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !posting) ask();
          }}
        />
        <button className="btn success" onClick={ask} disabled={posting}>
          {posting ? 'Posting…' : 'Post'}
        </button>
      </div>

      <div className="board">
        {qs.map((q, i) => (
          <div
            key={q._id}
            className={`note ${colors[i % colors.length]}`}
            style={{ '--r': (i % 3 - 1) * 1.5 }}
          >
            <div className="meta">
              <span className="badge">{q.author?.name || 'Anon'}</span>
              <span className={'badge ' + (q.important ? 'imp' : (q.status === 'answered' ? 'ans' : 'open'))}>
                {q.important ? 'Important' : (q.status === 'answered' ? 'Answered' : 'Open')}
              </span>
            </div>

            <div style={{ whiteSpace: 'pre-wrap' }}>{q.text}</div>

            {q.answer && (
              <div style={{ marginTop: 8, fontSize: 14 }}>
                <div className="badge">Reply</div>
                <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{q.answer}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Student() {
  const [classes, setClasses] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [currentClass, setCurrentClass] = useState(loadSel('S_CUR_CLASS') || '');
  const [currentLecture, setCurrentLecture] = useState(loadSel('S_CUR_LECT') || '');
  const [code, setCode] = useState('');

  const myClasses = useCallback(async () => {
    try {
      const data = await apiFetch('/api/classes/my');
      setClasses(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('[classes/my]', e?.message || e);
    }
  }, []);

  useEffect(() => { myClasses(); }, [myClasses]);

  useEffect(() => {
    if (!currentClass) { setLectures([]); return; }
    (async () => {
      try {
        const ls = await apiFetch(`/api/classes/${currentClass}/lectures`);
        setLectures(Array.isArray(ls) ? ls : []);
      } catch (e) {
        console.warn('[class lectures]', e?.message || e);
      }
    })();
  }, [currentClass]);

  const join = async () => {
    try {
      await apiFetch('/api/classes/join', { method: 'POST', body: JSON.stringify({ code }) });
      setCode('');
      await myClasses();
      alert('Joined!');
    } catch (e) {
      alert(e.message);
    }
  };

  const selectClass = (cid) => {
    setCurrentClass(cid);
    saveSel('S_CUR_CLASS', cid);
    setCurrentLecture('');
    saveSel('S_CUR_LECT', '');
  };

  const selectLecture = (lid) => {
    setCurrentLecture(lid);
    saveSel('S_CUR_LECT', lid);
  };

  return (
    <div className="card">
      <h3>Student</h3>

      <div className="row" style={{ marginTop: 8 }}>
        <input
          className="input"
          placeholder="Class code"
          value={code}
          onChange={e => setCode((e.target.value || '').toUpperCase())}
        />
        <button className="btn primary" onClick={join}>Join class</button>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <div className="col">
          <h4>Your Classes</h4>
          <ul>
            {classes.map(c => (
              <li key={c._id} style={{ marginBottom: 8 }}>
                <button className="btn" onClick={() => selectClass(c._id)}>
                  {c.subject} <span className="badge">code: {c.code}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="col">
          <h4>Lectures</h4>
          <ul>
            {lectures.map(l => (
              <li key={l._id} style={{ marginBottom: 8 }}>
                <button className="btn" onClick={() => selectLecture(l._id)}>
                  {l.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {currentLecture && (
        <div style={{ marginTop: 12 }}>
          <h4>Board</h4>
          <Board lectureId={currentLecture} />
        </div>
      )}
    </div>
  );
}
