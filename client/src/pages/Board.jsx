import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import { getAuth } from '../lib/auth.js';
import './student_style.css';

function normalizeText(s = '') {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

function ErrorBanner({ msg, onClose }) {
  if (!msg) return null;
  return (
    <div className="alert danger error-banner">
      <span>{msg}</span>
      <button className="btn close-btn" onClick={onClose} aria-label="close error">✕</button>
    </div>
  );
}

export default function Board({ lectureId }) {
  const [qs, setQs] = useState([]);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const esRef = useRef(null);
  const token = getAuth()?.token;

  // Load all questions
  const load = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/lectures/${lectureId}/questions`);
      setQs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('[load questions]', e?.message || e);
    }
  }, [lectureId]);

  useEffect(() => { if (lectureId) load(); }, [lectureId, load]);

  // SSE live updates
  useEffect(() => {
    if (!lectureId || !token) return;
    const url =
      `${(import.meta.env.VITE_API_URL || 'http://localhost:5000')}/api/lectures/${lectureId}/stream?token=${token}`;
    const es = new EventSource(url);
    es.onmessage = () => load();
    es.onerror = () => {};
    esRef.current = es;
    return () => { try { es && es.close(); } catch {} };
  }, [lectureId, token, load]);

  // Ask a new question
  const ask = async () => {
    setError('');
    const raw = text || '';
    const normalized = normalizeText(raw);
    if (!normalized) return;

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
      await load();
    } catch (e) {
      setError(e?.message || 'Failed to post question');
    } finally {
      setPosting(false);
    }
  };

  // Color classes to cycle
  const colorClasses = ['note-yellow', 'note-pink', 'note-blue', 'note-green'];

  return (
    <div>
      <ErrorBanner msg={error} onClose={() => setError('')} />

      {/* Input row */}
      <div className="row input-row">
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

      {/* Questions list */}
      <div className="board">
        {qs.map((q, i) => (
          <div key={q._id} className={`note ${colorClasses[i % colorClasses.length]}`}>
            <div className="meta">
              <span className="badge">{q.author?.name || 'Anon'}</span>
              <span className={'badge ' + (q.important ? 'imp' : (q.status === 'answered' ? 'ans' : 'open'))}>
                {q.important ? 'Important' : (q.status === 'answered' ? 'Answered' : 'Open')}
              </span>
            </div>

            <div className="note-text">{q.text}</div>

            {q.answer && (
              <div className="answer">
                <div className="badge">Reply</div>
                Answered by {q.answeredBy?.role || 'User'}: {q.answeredBy?.name || 'Unknown'} ({q.answeredBy?.email || 'N/A'})
                <div className="note-text">{q.answer}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
