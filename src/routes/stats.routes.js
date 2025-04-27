const express = require('express');
const { getStats, getTeacherStats } = require('../controllers/stats.controller');
const { verifyToken, isTeacher } = require('../middleware/auth.middleware');

const router = express.Router();

// All routes are protected
router.use(verifyToken);

// Main statistics endpoint - accessible to all authenticated users
router.get('/', getStats);

// Teacher-specific statistics - accessible only to teachers
router.get('/teacher', isTeacher, getTeacherStats);

module.exports = router; 