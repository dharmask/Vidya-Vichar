
// Simple Server-Sent Events pub/sub for lecture updates
const subs = new Map(); // lectureId -> Set(res)

export function publish(lectureId, payload = { type: 'tick' }){
  const set = subs.get(String(lectureId));
  if (!set) return;
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of set) {
    res.write(data);
  }
}

export function subscribe(lectureId, res){
  const key = String(lectureId);
  if (!subs.has(key)) subs.set(key, new Set());
  subs.get(key).add(res);
  res.on('close', () => {
    const set = subs.get(key);
    if (set) set.delete(res);
  });
}
