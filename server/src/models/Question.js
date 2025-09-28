import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  lectureId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lecture', required: true, index: true },
  text: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  important: { type: Boolean, default: false },
  status: { type: String, enum: ['open', 'answered', 'deleted'], default: 'open' },
  answer: { type: String, default: '' },
  answeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

questionSchema.index({ lectureId: 1, author: 1, text: 1 }, { unique: true });

export default mongoose.model('Question', questionSchema);
