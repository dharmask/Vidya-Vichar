import express from 'express';
import Lecture from '../models/Lecture.js';
import Class from '../models/Class.js';
import Question from '../models/Question.js';
import { authRequired } from '../middleware/auth.js';
import { subscribe, publish } from '../utils/sse.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Helper: verify token from query for SSE
function verifyFromQuery(req){
  const token = req.query.token;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
  } catch (e) { return null; }
}

// GET /api/lectures/:id/stream  (SSE live updates). Auth via ?token=
router.get('/:id/stream', async (req, res) => {
  const user = verifyFromQuery(req);
  if (!user) return res.status(401).end();
  const { id } = req.params;
  const lec = await Lecture.findById(id);
  if (!lec) return res.status(404).end();
  const cls = await Class.findById(lec.classId);
  if (!cls) return res.status(404).end();
  const uid = user.id;
  const allowed = String(cls.owner) === uid || cls.tas.some(x => String(x) === uid) || cls.students.some(x => String(x) === uid);
  if (!allowed) return res.status(403).end();

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  res.write('retry: 1500\n\n'); // reconnection delay
  subscribe(id, res);
});

// GET /api/lectures/:id/questions - list questions for a lecture (members can view)
router.get('/:id/questions', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const lec = await Lecture.findById(id);
    if (!lec) return res.status(404).json({ error: 'Lecture not found' });

    const cls = await Class.findById(lec.classId);
    if (!cls) return res.status(404).json({ error: 'Class not found' });

    const uid = req.user.id;
    const allowed =
      String(cls.owner) === uid ||
      cls.tas.some(x => String(x) === uid) ||
      cls.students.some(x => String(x) === uid);
    if (!allowed) return res.status(403).json({ error: 'Not a member of class' });

    const qs = await Question.find({ lectureId: id, status: { $ne: 'deleted' } })
      .sort({ important: -1, createdAt: 1 })
      .populate('author', 'name email role')
      .populate('answeredBy', 'name email role')
      .lean();

    res.json(qs);
  } catch (e) {
    console.error('[list questions]', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/lectures/:id/questions - post new question
router.post('/:id/questions', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body || {};
    if (!text || !text.trim()) return res.status(400).json({ error: 'Empty question' });
    const lec = await Lecture.findById(id);
    if (!lec) return res.status(404).json({ error: 'Lecture not found' });
    const cls = await Class.findById(lec.classId);
    if (!cls) return res.status(404).json({ error: 'Class not found' });
    const uid = req.user.id;
    const allowed = String(cls.owner) === uid || cls.tas.some(x => String(x) === uid) || cls.students.some(x => String(x) === uid);
    if (!allowed) return res.status(403).json({ error: 'Not a member of class' });
    try {
      const q = await Question.create({ lectureId: id, text: text.trim(), author: uid });
      publish(id, { type: 'create', id: q._id });
      res.json(q);
    } catch (dup) {
      if (dup.code === 11000) return res.status(409).json({ error: 'Duplicate question already asked by you' });
      throw dup;
    }
  } catch (e) {
    console.error('[create question]', e);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
