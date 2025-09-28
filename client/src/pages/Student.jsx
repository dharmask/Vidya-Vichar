
import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import { saveSel, loadSel } from '../lib/persist.js';
import Board from './Board.jsx';
import './student_style.css';

export default function Student() {
  const [classes, setClasses] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [currentClass, setCurrentClass] = useState(loadSel('S_CUR_CLASS') || '');
  const [currentLecture, setCurrentLecture] = useState(loadSel('S_CUR_LECT') || '');
  const [code, setCode] = useState('');

  // Fetch user classes
  const myClasses = useCallback(async () => {
    try {
      const data = await apiFetch('/api/classes/my');
      setClasses(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('[classes/my]', e?.message || e);
    }
  }, []);

  useEffect(() => { myClasses(); }, [myClasses]);

  // Fetch lectures for selected class
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

  // Join class
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
    <div className="card student-container">
      <h3>Student</h3>

      {/* Join class input */}
      <div className="row join-row">
        <input
          className="input"
          placeholder="Class code"
          value={code}
          onChange={e => setCode((e.target.value || '').toUpperCase())}
        />
        <button className="btn primary" onClick={join}>Join class</button>
      </div>

      {/* Class & Lecture selection */}
      <div className="row class-lecture-row">
        <div className="col">
          <h4>Your Classes</h4>
          <ul>
            {classes.map(c => (
              <li key={c._id}>
                <button className={`btn selectable ${currentClass === c._id ? 'selected' : ''}`}
                 onClick={() => selectClass(c._id)}>
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
              <li key={l._id}>
                <button className={`btn selectable ${currentLecture === l._id ? 'selected' : ''}`} 
                onClick={() => selectLecture(l._id)}>
                  {l.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Board */}
      {currentLecture && (
        <div className="board-container">
          <h4>Board</h4>
          <Board lectureId={currentLecture} />
        </div>
      )}
    </div>
  );
}
