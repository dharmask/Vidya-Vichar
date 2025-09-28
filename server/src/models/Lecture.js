import mongoose from 'mongoose';

const lectureSchema = new mongoose.Schema({
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
  title: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model('Lecture', lectureSchema);
