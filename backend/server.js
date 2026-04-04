const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const memberRoutes   = require('./routes/members');
const scheduleRoutes = require('./routes/schedules');
const authRoutes     = require('./routes/auth');
const protect        = require('./middleware/auth');

const app = express();

// ── CORS — must come before any routes ──────────────────────────────────────
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    // allow server-to-server (no origin) and listed origins
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/members',   protect, memberRoutes);
app.use('/api/schedules', protect, scheduleRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Schedule Planner API is running' });
});

// ── DB connection (cached across serverless invocations) ─────────────────────
let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGO_URI);
  isConnected = true;
  console.log('Connected to MongoDB');
}

// ── Local dev: start HTTP server ─────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5001;
  connectDB().then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  }).catch((err) => { console.error(err); process.exit(1); });
}

// ── Vercel serverless export ──────────────────────────────────────────────────
module.exports = async (req, res) => {
  await connectDB();
  app(req, res);
};
