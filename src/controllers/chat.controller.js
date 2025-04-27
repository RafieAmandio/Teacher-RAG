const prisma = require('../config/database');
const ragService = require('../services/rag.service');
const logger = require('../config/logger');

const createChat = async (req, res) => {
  try {
    const { agentId, title } = req.body;
    const userId = req.user.id;
    
    logger.debug('Chat creation attempt', { userId, agentId });
    
    // Validate request
    if (!agentId) {
      logger.warn('Chat creation failed: Missing agent ID', { userId });
      return res.status(400).json({ message: 'Agent ID is required' });
    }
    
    // Check if agent exists
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });
    
    if (!agent) {
      logger.warn('Chat creation failed: Agent not found', { userId, agentId });
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    // Create chat
    const chat = await prisma.chat.create({
      data: {
        title: title || 'New Chat',
        userId,
        agentId,
      },
    });
    
    logger.info('Chat created successfully', { 
      userId, 
      chatId: chat.id, 
      agentId 
    });
    
    res.status(201).json({
      message: 'Chat created successfully',
      chat,
    });
  } catch (error) {
    logger.error('Create chat error', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({ message: 'Server error' });
  }
};

const getUserChats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    logger.debug('Getting user chats', { userId });
    
    const chats = await prisma.chat.findMany({
      where: { userId },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            subject: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
    
    logger.debug('Retrieved user chats', { 
      userId, 
      chatCount: chats.length 
    });
    
    res.status(200).json({ chats });
  } catch (error) {
    logger.error('Get user chats error', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({ message: 'Server error' });
  }
};

const getChatById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    logger.debug('Getting chat by ID', { userId, chatId: id });
    
    // Get chat
    const chat = await prisma.chat.findUnique({
      where: { id },
      include: {
        agent: true,
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });
    
    if (!chat) {
      logger.warn('Get chat failed: Chat not found', { userId, chatId: id });
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Check ownership
    if (chat.userId !== userId) {
      logger.warn('Get chat failed: Unauthorized access', { 
        userId, 
        chatId: id, 
        ownerUserId: chat.userId 
      });
      return res.status(403).json({ message: 'Not authorized to access this chat' });
    }
    
    logger.debug('Retrieved chat by ID', { 
      userId, 
      chatId: id, 
      messageCount: chat.messages.length 
    });
    
    res.status(200).json({ chat });
  } catch (error) {
    logger.error('Get chat by ID error', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user?.id, 
      chatId: req.params?.id
    });
    res.status(500).json({ message: 'Server error' });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { chatId, content } = req.body;
    const userId = req.user.id;
    
    logger.debug('Message send attempt', { userId, chatId });
    
    // Validate request
    if (!chatId || !content) {
      logger.warn('Send message failed: Missing required fields', { 
        userId, 
        providedFields: { chatId: !!chatId, content: !!content } 
      });
      return res.status(400).json({ message: 'Chat ID and content are required' });
    }
    
    // Get chat
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: { agent: true },
    });
    
    if (!chat) {
      logger.warn('Send message failed: Chat not found', { userId, chatId });
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Check ownership
    if (chat.userId !== userId) {
      logger.warn('Send message failed: Unauthorized access', { 
        userId, 
        chatId, 
        ownerUserId: chat.userId 
      });
      return res.status(403).json({ message: 'Not authorized to send message to this chat' });
    }
    
    // Create user message
    const userMessage = await prisma.message.create({
      data: {
        content,
        role: 'USER',
        chatId,
        userId,
      },
    });
    
    logger.info('User message created', { 
      userId, 
      chatId, 
      messageId: userMessage.id,
      contentLength: content.length
    });
    
    // Process with RAG
    logger.debug('Processing query with RAG service', { 
      userId, 
      chatId, 
      agentId: chat.agent.id 
    });
    
    const agentResponse = await ragService.processQuery(chat.agent.id, content, chatId);
    
    // Create agent message
    const assistantMessage = await prisma.message.create({
      data: {
        content: agentResponse,
        role: 'ASSISTANT',
        chatId,
      },
    });
    
    logger.info('Assistant message created', { 
      userId, 
      chatId, 
      messageId: assistantMessage.id,
      responseLength: agentResponse.length
    });
    
    // Update chat timestamp
    await prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });
    
    res.status(200).json({
      messages: [userMessage, assistantMessage],
    });
  } catch (error) {
    logger.error('Send message error', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user?.id, 
      chatId: req.body?.chatId
    });
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteChat = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    logger.debug('Chat deletion attempt', { userId, chatId: id });
    
    // Get chat
    const chat = await prisma.chat.findUnique({
      where: { id },
    });
    
    if (!chat) {
      logger.warn('Delete chat failed: Chat not found', { userId, chatId: id });
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Check ownership
    if (chat.userId !== userId) {
      logger.warn('Delete chat failed: Unauthorized access', { 
        userId, 
        chatId: id, 
        ownerUserId: chat.userId 
      });
      return res.status(403).json({ message: 'Not authorized to delete this chat' });
    }
    
    // Delete chat (cascade will delete messages)
    await prisma.chat.delete({
      where: { id },
    });
    
    logger.info('Chat deleted successfully', { userId, chatId: id });
    
    res.status(200).json({ message: 'Chat deleted successfully' });
  } catch (error) {
    logger.error('Delete chat error', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user?.id, 
      chatId: req.params?.id
    });
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createChat,
  getUserChats,
  getChatById,
  sendMessage,
  deleteChat,
};
