import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import { getAuth } from '../lib/auth.js';
import { saveSel, loadSel } from '../lib/persist.js';

function QItem({ q, onChange }){
  const [answer, setAnswer] = useState(q.answer || '');

  return (
    <div className="note blue">
      <div className="meta">
        <span className="badge">{q.author?.name || 'Anon'}</span>
        <span className={"badge " + (q.important ? 'imp' : (q.status==='answered'?'ans':'open'))}>
          {q.important ? 'Important' : (q.status==='answered' ? 'Answered' : 'Open')}
        </span>
      </div>

      <div style={{whiteSpace:'pre-wrap'}}>{q.text}</div>

      {/* Show existing reply if present */}
      {q.answer && (
        <div className="answer" style={{marginTop:8}}>
          <div className="badge">
            Answered by {q.answeredBy?.role || 'User'}: {q.answeredBy?.name || 'Unknown'} ({q.answeredBy?.email || 'N/A'})
          </div>
          <div className="note-text">{q.answer}</div>
        </div>
      )}

      <div className="row" style={{marginTop:8}}>
        <button className="btn" onClick={()=>onChange(q._id, { important: !q.important })}>
          {q.important ? 'Unmark important' : 'Mark important'}
        </button>
      </div>

      {/* Reply box */}
      <div style={{marginTop:8}}>
        <textarea
          className="input"
          rows="2"
          value={answer}
          onChange={e=>setAnswer(e.target.value)}
          placeholder="Type a reply..."
        />
        <div style={{display:'flex', justifyContent:'flex-end', marginTop:6}}>
          <button className="btn success" onClick={()=>onChange(q._id, { answer })}>Reply</button>
        </div>
      </div>
    </div>
  );
}

function Board({ lectureId, onlyUnanswered, onlyImportant }){
  const [qs, setQs] = useState([]);
  const token = getAuth()?.token;
  const esRef = useRef(null);

  const load = useCallback(async () => {
    try { setQs(await apiFetch(`/api/lectures/${lectureId}/questions`)); } catch {}
  }, [lectureId]);

  useEffect(()=>{ load(); }, [load]);

  useEffect(() => {
    if (!lectureId || !token) return;
    const url = `${(import.meta.env.VITE_API_URL || 'http://localhost:5000')}/api/lectures/${lectureId}/stream?token=${token}`;
    const es = new EventSource(url);
    es.onmessage = () => load();
    esRef.current = es;
    return () => { es && es.close(); };
  }, [lectureId, token, load]);

  const patch = async (id, body) => {
    await apiFetch(`/api/questions/${id}`, { method:'PATCH', body: JSON.stringify(body) });
    load();
  };

  // --- filtering logic ---
  let filtered = qs;
  if (onlyImportant)  filtered = filtered.filter(q => !!q.important);
  if (onlyUnanswered) filtered = filtered.filter(q => q.status !== 'answered');

  return (
    <div className="board">
      {filtered.length === 0 ? (
        <div className="badge">No questions match the selected filters.</div>
      ) : (
        filtered.map(q => <QItem key={q._id} q={q} onChange={patch} />)
      )}
    </div>
  );
}

export default function TA(){
  const [classes, setClasses] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [currentClass, setCurrentClass] = useState(loadSel('TA_CUR_CLASS'));
  const [currentLecture, setCurrentLecture] = useState(loadSel('TA_CUR_LECT'));

  // filter states
  const [showOnlyUnanswered, setShowOnlyUnanswered] = useState(false);
  const [showOnlyImportant, setShowOnlyImportant] = useState(false);

  const myClasses = async () => setClasses(await apiFetch('/api/classes/my'));
  useEffect(()=>{ myClasses(); }, []);

  useEffect(() => {
    (async () => {
      if (currentClass) {
        setLectures(await apiFetch(`/api/classes/${currentClass}/lectures`));
      }
    })();
  }, [currentClass]);

  const selectClass = (cid) => {
    setCurrentClass(cid);
    saveSel('TA_CUR_CLASS', cid);
    setCurrentLecture('');
    saveSel('TA_CUR_LECT', '');
  };

  const selectLecture = (lid) => {
    setCurrentLecture(lid);
    saveSel('TA_CUR_LECT', lid);
  };

  const clearFilters = () => {
    setShowOnlyImportant(false);
    setShowOnlyUnanswered(false);
  };

  return (
    <div className="card">
      <h3>Teaching Assistant</h3>
      <div className="row" style={{marginTop:12}}>
        <div className="col">
          <h4>Your Classes</h4>
          <ul>
            {classes.map(c => (
              <li key={c._id} style={{marginBottom:8}}>
                <button className={`btn selectable ${currentClass === c._id ? 'selected' : ''}`} onClick={()=>selectClass(c._id)}>
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
              <li key={l._id} style={{marginBottom:8}}>
                <button className={`btn selectable ${currentLecture === l._id ? 'selected' : ''}`} onClick={()=>selectLecture(l._id)}>
                  {l.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {currentLecture && (
        <div style={{marginTop:12}}>
          <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:8}}>
            <h4 style={{margin:0}}>Board</h4>
            {/* Filter controls */}
            <label style={{display:'flex', alignItems:'center', gap:6}}>
              <input
                type="checkbox"
                checked={showOnlyUnanswered}
                onChange={e=>setShowOnlyUnanswered(e.target.checked)}
              />
              Show only Unanswered
            </label>
            <label style={{display:'flex', alignItems:'center', gap:6}}>
              <input
                type="checkbox"
                checked={showOnlyImportant}
                onChange={e=>setShowOnlyImportant(e.target.checked)}
              />
              Show only Important
            </label>
            {(showOnlyUnanswered || showOnlyImportant) && (
              <button className="btn" onClick={clearFilters}>Clear filters</button>
            )}
          </div>

          <Board
            lectureId={currentLecture}
            onlyUnanswered={showOnlyUnanswered}
            onlyImportant={showOnlyImportant}
          />
        </div>
      )}
    </div>
  );
}
