const express = require('express');
const { checkHealth } = require('../controllers/health.controller');

const router = express.Router();

// Public health check route
router.get('/', checkHealth);

module.exports = router; 