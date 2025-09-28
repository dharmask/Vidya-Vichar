
export function saveSel(key, value){ localStorage.setItem(key, value || ''); }
export function loadSel(key){ return localStorage.getItem(key) || ''; }
