const prisma = require('../config/database');
const logger = require('../config/logger');

/**
 * Get system-wide statistics for the dashboard
 */
const getStats = async (req, res) => {
  try {
    logger.debug('Retrieving system statistics');
    
    // Get counts for various entities
    const [
      totalAgents,
      totalDocuments,
      totalChats,
      activeStudents
    ] = await Promise.all([
      prisma.agent.count(),
      prisma.document.count(),
      prisma.chat.count(),
      prisma.user.count({
        where: {
          role: 'STUDENT',
          // Active in the last 30 days
          chats: {
            some: {
              updatedAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              }
            }
          }
        }
      })
    ]);

    // Get statistics by teacher (if user is admin or system needs it)
    const teacherStats = await prisma.user.findMany({
      where: {
        role: 'TEACHER'
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            agentsCreated: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Get statistics by subject
    const subjectStats = await prisma.agent.groupBy({
      by: ['subject'],
      _count: {
        _all: true
      }
    });

    logger.info('Statistics retrieved successfully');

    res.status(200).json({
      totalAgents,
      totalDocuments,
      totalChats,
      activeStudents,
      teacherStats: teacherStats.map(t => ({
        id: t.id,
        name: t.name,
        agentCount: t._count.agentsCreated
      })),
      subjectStats: subjectStats.map(s => ({
        subject: s.subject,
        count: s._count._all
      }))
    });
  } catch (error) {
    logger.error('Failed to retrieve statistics', { 
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({ message: 'Failed to retrieve statistics' });
  }
};

/**
 * Get statistics for a specific teacher
 */
const getTeacherStats = async (req, res) => {
  try {
    const teacherId = req.user.id;
    
    logger.debug('Retrieving teacher statistics', { teacherId });
    
    // Get counts for teacher's entities
    const [
      agentCount,
      documentCount,
      chatCount,
      studentCount
    ] = await Promise.all([
      prisma.agent.count({
        where: { teacherId }
      }),
      prisma.document.count({
        where: { 
          agent: {
            teacherId
          }
        }
      }),
      prisma.chat.count({
        where: {
          agent: {
            teacherId
          }
        }
      }),
      prisma.user.count({
        where: {
          role: 'STUDENT',
          chats: {
            some: {
              agent: {
                teacherId
              }
            }
          }
        }
      })
    ]);

    // Get statistics by agent
    const agentStats = await prisma.agent.findMany({
      where: {
        teacherId
      },
      select: {
        id: true,
        name: true,
        subject: true,
        _count: {
          select: {
            chats: true,
            documents: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    logger.info('Teacher statistics retrieved successfully', { teacherId });

    res.status(200).json({
      agentCount,
      documentCount,
      chatCount,
      studentCount,
      agentStats: agentStats.map(a => ({
        id: a.id,
        name: a.name,
        subject: a.subject,
        chatCount: a._count.chats,
        documentCount: a._count.documents
      }))
    });
  } catch (error) {
    logger.error('Failed to retrieve teacher statistics', { 
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    
    res.status(500).json({ message: 'Failed to retrieve statistics' });
  }
};

module.exports = {
  getStats,
  getTeacherStats
}; 