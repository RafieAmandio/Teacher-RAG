const documentService = require('../services/document.service');
const prisma = require('../config/database');

const uploadDocument = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const { title, agentId } = req.body;
    
    // Validate request
    if (!title || !agentId) {
      return res.status(400).json({ message: 'Title and agent ID are required' });
    }
    
    // Check if agent exists and belongs to user
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    if (agent.teacherId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to upload to this agent' });
    }
    
    // Process document
    const document = await documentService.processDocument(req.file, title, agentId);
    
    res.status(201).json({
      message: 'Document uploaded and processed successfully',
      document,
    });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getDocumentsByAgent = async (req, res) => {
  try {
    const { agentId } = req.params;
    
    // Check if agent exists
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    // Get documents
    const documents = await prisma.document.findMany({
      where: { agentId },
    });
    
    res.status(200).json({ documents });
  } catch (error) {
    console.error('Get documents by agent error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get document
    const document = await prisma.document.findUnique({
      where: { id },
      include: { agent: true },
    });
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Check authorization
    if (document.agent.teacherId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this document' });
    }
    
    // Delete document
    await documentService.deleteDocument(id);
    
    res.status(200).json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  uploadDocument,
  getDocumentsByAgent,
  deleteDocument,
};
