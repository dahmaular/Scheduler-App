const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET  = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

// ── POST /api/auth/login ─────────────────────────────────────────────────────
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const token = jwt.sign(
    { id: user._id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );

  return res.json({
    token,
    user: { id: user._id, email: user.email, name: user.name, role: user.role },
  });
};

// ── POST /api/auth/seed ──────────────────────────────────────────────────────
// Creates the initial admin user. Should be called once, then disabled or
// protected in production.
const seed = async (req, res) => {
  const { email, password, name, seedKey } = req.body;

  // Require a seed key env var so random people can't create admins
  if (seedKey !== process.env.SEED_KEY) {
    return res.status(403).json({ message: 'Invalid seed key' });
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    return res.status(409).json({ message: 'User already exists' });
  }

  const user = await User.create({
    email,
    password,
    name: name || 'Admin',
    role: 'admin',
  });

  return res.status(201).json({
    message: 'Admin user created',
    user: { id: user._id, email: user.email, name: user.name },
  });
};

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
const me = async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });
  return res.json(user);
};

module.exports = { login, seed, me };
