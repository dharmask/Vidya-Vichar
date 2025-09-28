
import React, { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import { saveAuth } from '../lib/auth.js';

function DarkToggle(){
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem('dark') === '1';
    setDark(stored);
    document.body.classList.toggle('dark', stored);
  }, []);
  const onChange = (e) => {
    const v = e.target.checked;
    setDark(v);
    localStorage.setItem('dark', v ? '1' : '0');
    document.body.classList.toggle('dark', v);
  };
  return (
    <label className="toggler">
      <input type="checkbox" checked={dark} onChange={onChange} />
      <span>{dark ? 'Dark' : 'Light'} mode</span>
    </label>
  );
}

export default function Login({ onLogin }){
  const [mode, setMode] = useState('login');
  const [role, setRole] = useState('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const doSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'register') {
        const out = await apiFetch('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, password, role })
        });
        onLogin(saveAuth(out));
      } else {
        const out = await apiFetch('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
        onLogin(saveAuth(out));
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="container" style={{display:'grid', placeItems:'center', minHeight:'100vh'}}>
      <div className="card" style={{maxWidth: 720, width:'100%'}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <h2 style={{margin:'6px 0'}}>🎓 VidyaVichar</h2>
          <DarkToggle />
        </div>
        <div className="row" style={{marginTop: 8}}>
          <button className={"btn " + (mode === 'login' ? 'primary' : '')} onClick={()=>setMode('login')}>Login</button>
          <button className={"btn " + (mode === 'register' ? 'primary' : '')} onClick={()=>setMode('register')}>Sign up</button>
        </div>

        {mode === 'register' && (
          <div style={{marginTop: 12}}>
            <div className="segmented">
              <input id="role-student" name="role" type="radio" className="item" checked={role==='student'} onChange={()=>setRole('student')} />
              <label htmlFor="role-student" className="item">Student</label>
              <input id="role-ta" name="role" type="radio" className="item" checked={role==='ta'} onChange={()=>setRole('ta')} />
              <label htmlFor="role-ta" className="item">Teaching Assistant</label>
              <input id="role-teacher" name="role" type="radio" className="item" checked={role==='teacher'} onChange={()=>setRole('teacher')} />
              <label htmlFor="role-teacher" className="item">Teacher</label>
              <span className="slider"></span>
            </div>
          </div>
        )}

        <form onSubmit={doSubmit} style={{marginTop: 14}}>
          {mode === 'register' && (
            <div className="row">
              <div className="col">
                <label>Name</label>
                <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name" required />
              </div>
            </div>
          )}
          <div className="row">
            <div className="col">
              <label>Email</label>
              <input className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" type="email" required />
            </div>
            <div className="col">
              <label>Password</label>
              <input className="input" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" type="password" required />
            </div>
          </div>

          {error && <div className="badge" style={{marginTop:10, borderColor:'#ef4444', color:'#ef4444'}}>⚠️ {error}</div>}
          <div style={{display:'flex', justifyContent:'flex-end', marginTop:12}}>
            <button className="btn primary" type="submit">{mode === 'register' ? 'Create account' : 'Login'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
