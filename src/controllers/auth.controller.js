const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const logger = require('../config/logger');

const register = async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    
    logger.debug('User registration attempt', { email, role });
    
    // Validate request
    if (!email || !password || !name || !role) {
      logger.warn('Registration failed: Missing required fields', { 
        providedFields: { email: !!email, password: !!password, name: !!name, role: !!role } 
      });
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Check if role is valid
    if (role !== 'TEACHER' && role !== 'STUDENT') {
      logger.warn('Registration failed: Invalid role', { role });
      return res.status(400).json({ message: 'Role must be either TEACHER or STUDENT' });
    }
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      logger.warn('Registration failed: Email already in use', { email });
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
      },
    });
    
    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    logger.info('User registered successfully', { 
      userId: user.id, 
      email: user.email,
      role: user.role 
    });
    
    // Return user and token
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    logger.error('Registration error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    logger.debug('User login attempt', { email });
    
    // Validate request
    if (!email || !password) {
      logger.warn('Login failed: Missing email or password');
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });
    
    if (!user) {
      logger.warn('Login failed: User not found', { email });
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      logger.warn('Login failed: Invalid password', { userId: user.id, email });
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    logger.info('User logged in successfully', { 
      userId: user.id, 
      email: user.email,
      role: user.role 
    });
    
    // Return user and token
    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    logger.error('Login error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error' });
  }
};

const getProfile = async (req, res) => {
  try {
    // User is already attached to req from auth middleware
    const user = req.user;
    
    logger.debug('Profile accessed', { userId: user.id });
    
    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    logger.error('Get profile error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  register,
  login,
  getProfile,
};
