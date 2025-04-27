const prisma = require('../config/database');
const logger = require('../config/logger');

/**
 * Get chat analytics for a specific agent
 */
const getChatAnalytics = async (req, res) => {
  try {
    const { agentId } = req.query;
    
    if (!agentId) {
      logger.warn('Chat analytics request missing agent ID');
      return res.status(400).json({ message: 'Agent ID is required' });
    }
    
    logger.debug('Retrieving chat analytics', { agentId });
    
    // Verify agent exists and is accessible
    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    });
    
    if (!agent) {
      logger.warn('Chat analytics failed: Agent not found', { agentId });
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    // Check authorization for teachers
    if (req.user.role === 'TEACHER' && agent.teacherId !== req.user.id) {
      logger.warn('Chat analytics unauthorized access', { 
        teacherId: req.user.id, 
        agentId, 
        agentOwnerId: agent.teacherId 
      });
      return res.status(403).json({ message: 'Not authorized to access this agent' });
    }

    // Get basic analytics
    const totalChats = await prisma.chat.count({
      where: { agentId }
    });

    const totalMessages = await prisma.message.count({
      where: {
        chat: {
          agentId
        }
      }
    });

    const averageMessagesPerChat = totalChats > 0 
      ? totalMessages / totalChats 
      : 0;

    // Get most active students
    const mostActiveStudents = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        chats: {
          some: {
            agentId
          }
        }
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            chats: {
              where: {
                agentId
              }
            }
          }
        }
      },
      orderBy: {
        _count: {
          chats: 'desc'
        }
      },
      take: 5
    });

    // Popular topics analysis would require NLP/keyword extraction
    // This is a simplified placeholder using chat titles
    const popularTopics = await prisma.chat.groupBy({
      by: ['title'],
      where: {
        agentId
      },
      _count: {
        _all: true
      },
      orderBy: {
        _count: {
          _all: 'desc'
        }
      },
      take: 10
    });

    logger.info('Chat analytics retrieved successfully', { agentId });

    res.status(200).json({
      totalChats,
      totalMessages,
      averageMessagesPerChat: parseFloat(averageMessagesPerChat.toFixed(2)),
      mostActiveStudents: mostActiveStudents.map(s => ({
        id: s.id,
        name: s.name,
        chatCount: s._count.chats
      })),
      popularTopics: popularTopics.map(t => ({
        topic: t.title,
        count: t._count._all
      }))
    });
  } catch (error) {
    logger.error('Chat analytics error', { 
      error: error.message, 
      stack: error.stack,
      agentId: req.query?.agentId
    });
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get performance metrics for a specific agent
 */
const getAgentMetrics = async (req, res) => {
  try {
    const { agentId } = req.params;
    
    if (!agentId) {
      logger.warn('Agent metrics request missing agent ID');
      return res.status(400).json({ message: 'Agent ID is required' });
    }
    
    logger.debug('Retrieving agent metrics', { agentId });
    
    // Verify agent exists and is accessible
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        teacher: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    if (!agent) {
      logger.warn('Agent metrics failed: Agent not found', { agentId });
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    // Check authorization for teachers
    if (req.user.role === 'TEACHER' && agent.teacherId !== req.user.id) {
      logger.warn('Agent metrics unauthorized access', { 
        teacherId: req.user.id, 
        agentId, 
        agentOwnerId: agent.teacherId 
      });
      return res.status(403).json({ message: 'Not authorized to access this agent' });
    }

    // Get basic metrics
    const totalChats = await prisma.chat.count({
      where: { agentId }
    });

    const totalMessages = await prisma.message.count({
      where: {
        chat: {
          agentId
        }
      }
    });

    const averageResponseTime = 2.5; // Placeholder - would need timestamp analysis
    const studentSatisfactionRate = 4.2; // Placeholder - would need rating system

    // Top questions analysis (simplified using the first few words of user messages)
    const topMessages = await prisma.message.findMany({
      where: {
        role: 'USER',
        chat: {
          agentId
        }
      },
      select: {
        content: true
      },
      take: 100
    });

    // Basic frequency analysis of questions
    const questionCounts = {};
    topMessages.forEach(msg => {
      // Get first 5 words as a key
      const key = msg.content.split(' ').slice(0, 5).join(' ');
      questionCounts[key] = (questionCounts[key] || 0) + 1;
    });

    // Convert to array and sort
    const topQuestions = Object.entries(questionCounts)
      .map(([question, count]) => ({ question, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    logger.info('Agent metrics retrieved successfully', { agentId });

    res.status(200).json({
      agent: {
        id: agent.id,
        name: agent.name,
        subject: agent.subject,
        teacher: agent.teacher
      },
      totalChats,
      totalMessages,
      averageResponseTime,
      studentSatisfactionRate,
      topQuestions
    });
  } catch (error) {
    logger.error('Agent metrics error', { 
      error: error.message, 
      stack: error.stack,
      agentId: req.params?.agentId
    });
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getChatAnalytics,
  getAgentMetrics
}; 