const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const logger = require('../config/logger');

const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      logger.warn('Authentication failed: No token provided', { 
        path: req.originalUrl 
      });
      return res.status(401).json({ message: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });
    
    if (!user) {
      logger.warn('Authentication failed: User not found', { 
        userId: decoded.id, 
        path: req.originalUrl 
      });
      return res.status(401).json({ message: 'User not found' });
    }
    
    logger.debug('User authenticated', { 
      userId: user.id, 
      role: user.role, 
      path: req.originalUrl 
    });
    
    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error', { 
      error: error.message, 
      stack: error.stack,
      path: req.originalUrl
    });
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const isTeacher = (req, res, next) => {
  if (req.user && req.user.role === 'TEACHER') {
    logger.debug('Teacher authorization successful', { 
      userId: req.user.id, 
      path: req.originalUrl 
    });
    next();
  } else {
    logger.warn('Teacher authorization failed: Insufficient permissions', { 
      userId: req.user?.id, 
      role: req.user?.role,
      path: req.originalUrl 
    });
    res.status(403).json({ message: 'Requires teacher role' });
  }
};

module.exports = { verifyToken, isTeacher };
