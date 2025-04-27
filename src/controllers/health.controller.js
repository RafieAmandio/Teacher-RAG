const logger = require('../config/logger');
const prisma = require('../config/database');

/**
 * Health check endpoint to verify API status
 */
const checkHealth = async (req, res) => {
  try {
    // Verify database connection
    await prisma.$queryRaw`SELECT 1`;

    logger.debug('Health check successful');
    
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    logger.error('Health check failed', { 
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: 'API is experiencing issues'
    });
  }
};

module.exports = {
  checkHealth
}; 