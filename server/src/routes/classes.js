import express from 'express';
import Class from '../models/Class.js';
import Lecture from '../models/Lecture.js';
import User from '../models/User.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { generateClassCode } from '../utils/genCode.js';

const router = express.Router();

// POST /api/classes - create a class (teacher only)
router.post('/', authRequired, requireRole('teacher'), async (req, res) => {
  try {
    const { subject } = req.body || {};
    if (!subject) return res.status(400).json({ error: 'Missing subject' });
    let code;
    while (true) {
      code = generateClassCode();
      const exists = await Class.findOne({ code });
      if (!exists) break;
    }
    const cls = await Class.create({ subject, code, owner: req.user.id });
    await User.findByIdAndUpdate(req.user.id, { $addToSet: { classesTeaching: cls._id } });
    res.json(cls);
  } catch (e) {
    console.error('[create class]', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// IMPORTANT: define /my BEFORE any '/:id' dynamic routes
// GET /api/classes/my - list classes by role
router.get('/my', authRequired, async (req, res) => {
  try {
    const role = req.user.role;
    let classes = [];
    if (role === 'teacher') {
      classes = await Class.find({ owner: req.user.id }).lean();
    } else if (role === 'ta') {
      classes = await Class.find({ tas: req.user.id }).lean();
    } else {
      classes = await Class.find({ students: req.user.id }).lean();
    }
    res.json(classes);
  } catch (e) {
    console.error('[my classes]', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/classes/join - join by code (student only)
router.post('/join', authRequired, requireRole('student'), async (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ error: 'Missing code' });
    const cls = await Class.findOne({ code });
    if (!cls) return res.status(404).json({ error: 'Invalid class code' });
    await Class.findByIdAndUpdate(cls._id, { $addToSet: { students: req.user.id } });
    await User.findByIdAndUpdate(req.user.id, { $addToSet: { classesEnrolled: cls._id } });
    res.json({ ok: true, classId: cls._id });
  } catch (e) {
    console.error('[join class]', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// NEW: GET /api/classes/:id - class details with members
router.get('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const cls = await Class.findById(id).lean();
    if (!cls) return res.status(404).json({ error: 'Class not found' });
    const uid = req.user.id;
    const allowed = String(cls.owner) === uid || cls.tas.some(x => String(x) === uid) || cls.students.some(x => String(x) === uid);
    if (!allowed) return res.status(403).json({ error: 'Not a member of class' });

    const owner = await User.findById(cls.owner).select('name email role').lean();
    const tas = await User.find({ _id: { $in: cls.tas } }).select('name email role').lean();
    const students = await User.find({ _id: { $in: cls.students } }).select('name email role').lean();
    res.json({ ...cls, owner, tas, students });
  } catch (e) {
    console.error('[class details]', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/classes/:id/add-ta - teacher adds a TA by email
router.post('/:id/add-ta', authRequired, requireRole('teacher'), async (req, res) => {
  try {
    const { email } = req.body || {};
    const { id } = req.params;
    const cls = await Class.findById(id);
    if (!cls) return res.status(404).json({ error: 'Class not found' });
    if (String(cls.owner) !== req.user.id) return res.status(403).json({ error: 'Not class owner' });
    const ta = await User.findOne({ email, role: 'ta' });
    if (!ta) return res.status(404).json({ error: 'TA user not found (role must be ta)' });
    await Class.findByIdAndUpdate(id, { $addToSet: { tas: ta._id } });
    await User.findByIdAndUpdate(ta._id, { $addToSet: { classesTA: id } });
    res.json({ ok: true });
  } catch (e) {
    console.error('[add ta]', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/classes/:id/remove-student - teacher removes a student
router.post('/:id/remove-student', authRequired, requireRole('teacher'), async (req, res) => {
  try {
    const { studentId } = req.body || {};
    const { id } = req.params;
    const cls = await Class.findById(id);
    if (!cls) return res.status(404).json({ error: 'Class not found' });
    if (String(cls.owner) != req.user.id) return res.status(403).json({ error: 'Not class owner' });
    await Class.findByIdAndUpdate(id, { $pull: { students: studentId } });
    await User.findByIdAndUpdate(studentId, { $pull: { classesEnrolled: id } });
    res.json({ ok: true });
  } catch (e) {
    console.error('[remove student]', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/classes/:id/lectures - create lecture (teacher only)
router.post('/:id/lectures', authRequired, requireRole('teacher'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body || {};
    if (!title) return res.status(400).json({ error: 'Missing title' });
    const cls = await Class.findById(id);
    if (!cls) return res.status(404).json({ error: 'Class not found' });
    if (String(cls.owner) !== req.user.id) return res.status(403).json({ error: 'Not class owner' });
    const lec = await Lecture.create({ classId: id, title });
    res.json(lec);
  } catch (e) {
    console.error('[create lecture]', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/classes/:id/lectures - list lectures for a class (authorized participants)
router.get('/:id/lectures', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const cls = await Class.findById(id);
    if (!cls) return res.status(404).json({ error: 'Class not found' });
    const uid = req.user.id;
    const allowed = String(cls.owner) === uid || cls.tas.some(x => String(x) === uid) || cls.students.some(x => String(x) === uid);
    if (!allowed) return res.status(403).json({ error: 'Not a member of class' });
    const lectures = await Lecture.find({ classId: id }).sort({ createdAt: -1 }).lean();
    res.json(lectures);
  } catch (e) {
    console.error('[list lectures]', e);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
