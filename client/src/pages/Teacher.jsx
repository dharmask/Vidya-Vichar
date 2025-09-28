import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import { getAuth } from '../lib/auth.js';
import { saveSel, loadSel } from '../lib/persist.js';

function QItem({ q, onChange, onDelete }){
  const [answer, setAnswer] = useState(q.answer || '');
  return (
    <div className="note yellow">
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
        <button className="btn" onClick={()=>onChange(q._id, { status: 'answered' })}>Mark answered</button>
        <button className="btn" onClick={()=>onDelete(q._id)}>Delete</button>
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

  const patch = async (id, body) => { await apiFetch(`/api/questions/${id}`, { method:'PATCH', body: JSON.stringify(body) }); };
  const del = async (id) => { await apiFetch(`/api/questions/${id}`, { method:'DELETE' }); };

  // --- filtering logic (client-side) ---
  let filtered = qs;
  if (onlyImportant)  filtered = filtered.filter(q => !!q.important);
  if (onlyUnanswered) filtered = filtered.filter(q => q.status !== 'answered'); // treat anything not 'answered' as unanswered

  return (
    <div className="board">
      {filtered.length === 0 ? (
        <div className="badge">No questions match the selected filters.</div>
      ) : (
        filtered.map(q => (
          <QItem
            key={q._id}
            q={q}
            onChange={(...args)=>patch(...args).then(load)}
            onDelete={(...args)=>del(...args).then(load)}
          />
        ))
      )}
    </div>
  );
}

export default function Teacher(){
  const [classes, setClasses] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [currentClass, setCurrentClass] = useState(loadSel('T_CUR_CLASS'));
  const [currentLecture, setCurrentLecture] = useState(loadSel('T_CUR_LECT'));
  const [taEmail, setTaEmail] = useState('');
  const [classInfo, setClassInfo] = useState(null);

  // --- NEW: filter states ---
  const [showOnlyUnanswered, setShowOnlyUnanswered] = useState(false);
  const [showOnlyImportant, setShowOnlyImportant] = useState(false);

  const myClasses = async () => setClasses(await apiFetch('/api/classes/my'));
  useEffect(()=>{ myClasses(); }, []);

  useEffect(() => {
    (async () => {
      if (currentClass) {
        setClassInfo(await apiFetch(`/api/classes/${currentClass}`));
        setLectures(await apiFetch(`/api/classes/${currentClass}/lectures`));
      }
    })();
  }, [currentClass]);

  const createClass = async () => {
    const cls = await apiFetch('/api/classes', { method:'POST', body: JSON.stringify({ subject }) });
    setSubject('');
    myClasses();
    alert('Class created. Code: ' + cls.code);
  };

  const addTA = async () => {
    await apiFetch(`/api/classes/${currentClass}/add-ta`, { method:'POST', body: JSON.stringify({ email: taEmail }) });
    setTaEmail('');
    setClassInfo(await apiFetch(`/api/classes/${currentClass}`));
    alert('TA added');
  };

  const removeStudent = async (studentId) => {
    await apiFetch(`/api/classes/${currentClass}/remove-student`, { method:'POST', body: JSON.stringify({ studentId }) });
    setClassInfo(await apiFetch(`/api/classes/${currentClass}`));
  };

  const selectClass = async (cid) => {
    setCurrentClass(cid);
    saveSel('T_CUR_CLASS', cid);
    setCurrentLecture('');
    saveSel('T_CUR_LECT', '');
  };

  const createLecture = async () => {
    await apiFetch(`/api/classes/${currentClass}/lectures`, { method:'POST', body: JSON.stringify({ title }) });
    setTitle('');
    setLectures(await apiFetch(`/api/classes/${currentClass}/lectures`));
  };

  const selectLecture = (lid) => {
    setCurrentLecture(lid);
    saveSel('T_CUR_LECT', lid);
  };

  const clearFilters = () => {
    setShowOnlyImportant(false);
    setShowOnlyUnanswered(false);
  };

  return (
    <div className="card">
      <h3>Teacher</h3>

      <div className="row" style={{marginTop:8}}>
        <input className="input" placeholder="New class subject (e.g., System Design)" value={subject} onChange={e=>setSubject(e.target.value)} />
        <button className="btn primary" onClick={createClass}>Create class</button>
      </div>

      <div className="row" style={{marginTop:12}}>
        <div className="col">
          <h4>Your Classes</h4>
          <ul>
            {classes.map(c => (
              <li key={c._id} style={{marginBottom:8}}>
                <button className={`btn selectable ${currentClass === c._id ? 'selected' : ''}`} onClick={()=>selectClass(c._id)}>{c.subject} <span className="badge">code: {c.code}</span></button>
              </li>
            ))}
          </ul>

{currentClass && classInfo && (
  <div className="card" style={{marginTop:12}}>
    <h4>Manage Class</h4>
    <div className="row">
      <input
        className="input"
        placeholder="Add TA by email (must be role=ta)"
        value={taEmail}
        onChange={e=>setTaEmail(e.target.value)}
      />
      <button className="btn" onClick={addTA}>Add TA</button>
    </div>

    {/* --- NEW: TA List --- */}
    <div style={{marginTop:12}}>
      <h4>Teaching Assistants</h4>
      {classInfo.tas?.length ? (
        <ul>
          {classInfo.tas.map(ta => (
            <li key={ta._id} style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6}}>
              <span>{ta.name} <span className="badge">{ta.email}</span></span>
              <button
                className="btn"
                onClick={async () => {
                  await apiFetch(`/api/classes/${currentClass}/remove-ta`, {
                    method:'POST',
                    body: JSON.stringify({ taId: ta._id })
                  });
                  setClassInfo(await apiFetch(`/api/classes/${currentClass}`));
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : <div className="badge">No TAs yet</div>}
    </div>

    {/* --- Students List --- */}
    <div style={{marginTop:12}}>
      <h4>Students</h4>
      {classInfo.students?.length ? (
        <ul>
          {classInfo.students.map(s => (
            <li key={s._id} style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6}}>
              <span>{s.name} <span className="badge">{s.email}</span></span>
              <button className="btn" onClick={()=>removeStudent(s._id)}>Remove</button>
            </li>
          ))}
        </ul>
      ) : <div className="badge">No students yet</div>}
    </div>
  </div>
)}

        </div>
        <div className="col">
          <h4>Lectures</h4>
          {currentClass && (
            <div className="row">
              <input className="input" placeholder="New lecture title (e.g., Lecture 1 - Intro)" value={title} onChange={e=>setTitle(e.target.value)} />
              <button className="btn primary" onClick={createLecture}>Create lecture</button>
            </div>
          )}
          <ul style={{marginTop:8}}>
            {lectures.map(l => (
              <li key={l._id} style={{marginBottom:8}}>
                <button className={`btn selectable ${currentLecture === l._id ? 'selected' : ''}`} onClick={()=>selectLecture(l._id)}>{l.title}</button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {currentLecture && (
        <div style={{marginTop:12}}>
          <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:8}}>
            <h4 style={{margin:0}}>Board</h4>
            {/* --- NEW: Filter controls --- */}
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