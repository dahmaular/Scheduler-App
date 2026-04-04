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
const corsOptions = {
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
app.use(cors(corsOptions));

app.use(express.json());

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/members',   protect, memberRoutes);
app.use('/api/schedules', protect, scheduleRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Schedule Planner API is running' });
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/schedule-planner';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
