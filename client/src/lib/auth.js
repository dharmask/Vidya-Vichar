
export function saveAuth({ token, user }){
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  return { token, user };
}
export function getAuth(){
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  if (!token || !user) return null;
  return { token, user: JSON.parse(user) };
}
export function clearAuth(){
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}
