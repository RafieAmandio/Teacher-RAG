const express = require('express');
const { getChatAnalytics, getAgentMetrics } = require('../controllers/analytics.controller');
const { verifyToken } = require('../middleware/auth.middleware');

const router = express.Router();

// All routes are protected
router.use(verifyToken);

// Chat analytics endpoint
router.get('/chats', getChatAnalytics);

// Agent metrics endpoint
router.get('/agents/:agentId/metrics', getAgentMetrics);

module.exports = router; 