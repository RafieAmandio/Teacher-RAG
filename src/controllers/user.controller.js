const prisma = require('../config/database');
const logger = require('../config/logger');

const getAllUsers = async (req, res) => {
  try {
    // Only return non-sensitive user data
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
    
    logger.debug('Retrieved all users', { count: users.length });

    res.status(200).json({ users });
  } catch (error) {
    logger.error('Get all users error', { 
      error: error.message, 
      stack: error.stack 
    });
    res.status(500).json({ message: 'Server error' });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
    
    if (!user) {
      logger.warn('User not found', { userId: id });
      return res.status(404).json({ message: 'User not found' });
    }
    
    logger.debug('Retrieved user by ID', { userId: id });

    res.status(200).json({ user });
  } catch (error) {
    logger.error('Get user by ID error', { 
      error: error.message, 
      stack: error.stack,
      userId: req.params?.id
    });
    res.status(500).json({ message: 'Server error' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    // Only allow users to update their own profile
    if (id !== req.user.id) {
      logger.warn('Unauthorized user update attempt', { 
        requesterId: req.user.id, 
        targetUserId: id 
      });
      return res.status(403).json({ message: 'Not authorized to update this user' });
    }
    
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { name },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
    
    logger.info('User updated successfully', { userId: id });

    res.status(200).json({
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    logger.error('Update user error', { 
      error: error.message, 
      stack: error.stack,
      userId: req.params?.id
    });
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Search users by name or email
 */
const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.trim() === '') {
      logger.warn('Empty search query provided');
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    logger.debug('Searching users', { query });
    
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      },
      take: 20 // Limit results
    });
    
    logger.info('User search completed', { 
      query, 
      resultCount: users.length 
    });
    
    res.status(200).json({ users });
  } catch (error) {
    logger.error('User search error', { 
      error: error.message, 
      stack: error.stack,
      query: req.query?.query
    });
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  searchUsers
};
