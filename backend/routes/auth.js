const express = require('express');
const router = express.Router();
const { login, seed, me } = require('../controllers/authController');
const protect = require('../middleware/auth');

router.post('/login', login);
router.post('/seed',  seed);
router.get('/me',     protect, me);

module.exports = router;
