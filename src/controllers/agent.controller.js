const prisma = require('../config/database');

const createAgent = async (req, res) => {
  try {
    const { name, subject, description } = req.body;
    const teacherId = req.user.id;
    
    // Validate request
    if (!name || !subject) {
      return res.status(400).json({ message: 'Name and subject are required' });
    }
    
    // Create agent
    const agent = await prisma.agent.create({
      data: {
        name,
        subject,
        description: description || '',
        teacherId,
      },
    });
    
    res.status(201).json({
      message: 'Agent created successfully',
      agent,
    });
  } catch (error) {
    console.error('Create agent error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllAgents = async (req, res) => {
  try {
    const agents = await prisma.agent.findMany({
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            documents: true,
          },
        },
      },
    });
    
    res.status(200).json({ agents });
  } catch (error) {
    console.error('Get all agents error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAgentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        documents: true,
      },
    });
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    res.status(200).json({ agent });
  } catch (error) {
    console.error('Get agent by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, subject, description } = req.body;
    
    // Find agent
    const agent = await prisma.agent.findUnique({
      where: { id },
      include: { teacher: true },
    });
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    // Check ownership
    if (agent.teacherId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this agent' });
    }
    
    // Update agent
    const updatedAgent = await prisma.agent.update({
      where: { id },
      data: {
        name: name || agent.name,
        subject: subject || agent.subject,
        description: description !== undefined ? description : agent.description,
      },
    });
    
    res.status(200).json({
      message: 'Agent updated successfully',
      agent: updatedAgent,
    });
  } catch (error) {
    console.error('Update agent error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteAgent = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find agent
    const agent = await prisma.agent.findUnique({
      where: { id },
    });
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    // Check ownership
    if (agent.teacherId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this agent' });
    }
    
    // Delete agent (cascade will delete documents and chats)
    await prisma.agent.delete({
      where: { id },
    });
    
    res.status(200).json({ message: 'Agent deleted successfully' });
  } catch (error) {
    console.error('Delete agent error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getTeacherAgents = async (req, res) => {
  try {
    const teacherId = req.user.id;
    
    const agents = await prisma.agent.findMany({
      where: { teacherId },
      include: {
        _count: {
          select: {
            documents: true,
            chats: true,
          },
        },
      },
    });
    
    res.status(200).json({ agents });
  } catch (error) {
    console.error('Get teacher agents error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createAgent,
  getAllAgents,
  getAgentById,
  updateAgent,
  deleteAgent,
  getTeacherAgents,
};
