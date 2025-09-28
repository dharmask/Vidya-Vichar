import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import morgan from 'morgan';

import authRoutes from './routes/auth.js';
import classRoutes from './routes/classes.js';
import lectureRoutes from './routes/lectures.js';
import questionRoutes from './routes/questions.js';

const app = express();

const ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: ORIGIN, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.json({ ok: true, service: 'VidyaVichar API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/lectures', lectureRoutes);
app.use('/api/questions', questionRoutes);

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vidyavichar';
const PORT = process.env.PORT || 5000;

mongoose.connect(MONGO_URI, { })
  .then(() => {
    console.log('[server] connected to MongoDB');
    app.listen(PORT, () => console.log(`[server] listening on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('[server] Mongo connection error:', err);
    process.exit(1);
  });
