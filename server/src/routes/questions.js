import express from 'express';
import Question from '../models/Question.js';
import Lecture from '../models/Lecture.js';
import Class from '../models/Class.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { publish } from '../utils/sse.js';

const router = express.Router();

async function roleInClass(user, cls) {
  const uid = user.id;
  const isTeacher = String(cls?.owner) === uid;
  const isTA      = Array.isArray(cls?.tas)      && cls.tas.some(x => String(x) === uid);
  const isStudent = Array.isArray(cls?.students) && cls.students.some(x => String(x) === uid);
  return { isTeacher, isTA, isStudent };
}

// PATCH /api/questions/:id - update (answer, mark important, mark answered, etc.)
router.patch('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const { important, status, answer } = req.body || {};

    const q = await Question.findById(id);
    if (!q) return res.status(404).json({ error: 'Question not found' });

    const lec = await Lecture.findById(q.lectureId);
    if (!lec) return res.status(404).json({ error: 'Lecture not found' });

    const cls = await Class.findById(lec.classId);
    if (!cls) return res.status(404).json({ error: 'Class not found' });

    const roles = await roleInClass(req.user, cls);
    if (!(roles.isTeacher || roles.isTA)) {
      return res.status(403).json({ error: 'Only teacher/TA can update' });
    }

    if (q.status === 'deleted') {
      return res.status(409).json({ error: 'Cannot update a deleted question' });
    }

    if (typeof important === 'boolean') q.important = important;
   
    if (typeof answer === 'string') {
      q.answer = answer;
      q.answeredBy = req.user.id;
      q.status = 'answered';
    }

    if (status && ['open', 'answered', 'deleted'].includes(status)) {
      q.status = status;
    }

    await q.save();

    const populatedQ = await Question.findById(q._id)
  .populate('author', 'name email role')
  .populate('answeredBy', 'name email role');

    publish(q.lectureId, { type: 'update', id: q._id });
    return res.json(populatedQ);
  } catch (e) {
    console.error('[patch question]', e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/questions/:id - delete (teacher only)
router.delete('/:id', authRequired, requireRole('teacher'), async (req, res) => {
  try {
    const { id } = req.params;

    const q = await Question.findById(id);
    if (!q) return res.status(404).json({ error: 'Question not found' });

    const lec = await Lecture.findById(q.lectureId);
    if (!lec) return res.status(404).json({ error: 'Lecture not found' });

    const cls = await Class.findById(lec.classId);
    if (!cls) return res.status(404).json({ error: 'Class not found' });

    if (String(cls.owner) !== req.user.id) {
      return res.status(403).json({ error: 'Only class owner (teacher) can delete' });
    }

    if (q.status === 'deleted') {
      // idempotent delete
      return res.json({ ok: true });
    }

    q.status = 'deleted';
    await q.save();

    publish(q.lectureId, { type: 'delete', id: q._id });
    return res.json({ ok: true });
  } catch (e) {
    console.error('[delete question]', e);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
