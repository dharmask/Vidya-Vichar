
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
      <div className="row" style={{marginTop:8}}>
        <button className="btn" onClick={()=>onChange(q._id, { important: !q.important })}>
          {q.important ? 'Unmark important' : 'Mark important'}
        </button>
      </div>
      <div style={{marginTop:8}}>
        <textarea className="input" rows="2" value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Type a reply..." />
        <div style={{display:'flex', justifyContent:'flex-end', marginTop:6}}>
          <button className="btn success" onClick={()=>onChange(q._id, { answer })}>Reply</button>
        </div>
      </div>
    </div>
  );
}

function Board({ lectureId }){
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

  return (
    <div className="board">
      {qs.map(q => <QItem key={q._id} q={q} onChange={patch} />)}
    </div>
  );
}

export default function TA(){
  const [classes, setClasses] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [currentClass, setCurrentClass] = useState(loadSel('TA_CUR_CLASS'));
  const [currentLecture, setCurrentLecture] = useState(loadSel('TA_CUR_LECT'));

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

  return (
    <div className="card">
      <h3>Teaching Assistant</h3>
      <div className="row" style={{marginTop:12}}>
        <div className="col">
          <h4>Your Classes</h4>
          <ul>
            {classes.map(c => (
              <li key={c._id} style={{marginBottom:8}}>
                <button className="btn" onClick={()=>selectClass(c._id)}>{c.subject} <span className="badge">code: {c.code}</span></button>
              </li>
            ))}
          </ul>
        </div>
        <div className="col">
          <h4>Lectures</h4>
          <ul>
            {lectures.map(l => (
              <li key={l._id} style={{marginBottom:8}}>
                <button className="btn" onClick={()=>selectLecture(l._id)}>{l.title}</button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {currentLecture && (
        <div style={{marginTop:12}}>
          <h4>Board</h4>
          <Board lectureId={currentLecture} />
        </div>
      )}
    </div>
  );
}
