const express = require('express');
const {
  createAgent,
  getAllAgents,
  getAgentById,
  updateAgent,
  deleteAgent,
  getTeacherAgents,
} = require('../controllers/agent.controller');
const { verifyToken, isTeacher } = require('../middleware/auth.middleware');

const router = express.Router();

// All routes are protected
router.use(verifyToken);

// Routes accessible to all authenticated users
router.get('/', getAllAgents);
router.get('/:id', getAgentById);

// Routes accessible only to teachers
router.post('/', isTeacher, createAgent);
router.put('/:id', isTeacher, updateAgent);
router.delete('/:id', isTeacher, deleteAgent);
router.get('/teacher/agents', isTeacher, getTeacherAgents);

// The metrics route is defined in analytics.routes.js
// router.get('/:agentId/metrics'

module.exports = router;
