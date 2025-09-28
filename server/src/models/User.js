import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['student', 'teacher', 'ta'], default: 'student' },
  classesEnrolled: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }],
  classesTeaching: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }],
  classesTA: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }],
}, { timestamps: true });

export default mongoose.model('User', userSchema);
