
import React, { useEffect, useState } from 'react';
import Login from './pages/Login.jsx';
import Teacher from './pages/Teacher.jsx';
import Student from './pages/Student.jsx';
import TA from './pages/TA.jsx';
import { getAuth, clearAuth } from './lib/auth.js';

export default function App(){
  const [auth, setAuth] = useState(getAuth());

  useEffect(() => {
    const handle = setInterval(() => setAuth(getAuth()), 1000);
    return () => clearInterval(handle);
  }, []);

  const logout = () => { clearAuth(); setAuth(null); };

  if (!auth) return <Login onLogin={(a)=>setAuth(a)} />;

  return (
    <div className="container">
      <header className="topbar">
        <div className="brand">🎓 VidyaVichar</div>
        <div className="row" style={{alignItems:'center'}}>
          <div className="badge">{auth.user.role}</div>
          <button className="btn" onClick={logout}>Logout</button>
        </div>
      </header>
      {auth.user.role === 'teacher' && <Teacher />}
      {auth.user.role === 'student' && <Student />}
      {auth.user.role === 'ta' && <TA />}
    </div>
  );
}
