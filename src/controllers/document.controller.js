const documentService = require('../services/document.service');
const prisma = require('../config/database');
const logger = require('../config/logger');

// Keep track of documents that are being processed
const processingDocuments = new Map();

const uploadDocument = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      logger.warn('Document upload failed: No file uploaded', { userId: req.user.id });
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const { title, agentId } = req.body;
    
    // Validate request
    if (!title || !agentId) {
      logger.warn('Document upload failed: Missing required fields', { 
        userId: req.user.id,
        providedFields: { title: !!title, agentId: !!agentId }
      });
      return res.status(400).json({ message: 'Title and agent ID are required' });
    }
    
    // Check if agent exists and belongs to user
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });
    
    if (!agent) {
      logger.warn('Document upload failed: Agent not found', { 
        userId: req.user.id, 
        agentId 
      });
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    if (agent.teacherId !== req.user.id) {
      logger.warn('Document upload failed: Unauthorized', { 
        userId: req.user.id, 
        agentId,
        teacherId: agent.teacherId
      });
      return res.status(403).json({ message: 'Not authorized to upload to this agent' });
    }
    
    // Create a temporary document entry to track processing status
    const tempDocument = {
      id: req.file.filename, // Use filename as temporary ID
      status: 'processing',
      progress: 0,
      error: null,
      file: req.file,
      title,
      agentId,
      userId: req.user.id,
      startTime: Date.now()
    };
    
    processingDocuments.set(tempDocument.id, tempDocument);
    
    logger.info('Document processing started', { 
      tempId: tempDocument.id,
      userId: req.user.id,
      agentId
    });
    
    // Process document in the background
    processDocumentAsync(tempDocument);
    
    // Return the temporary document ID for status checks
    res.status(202).json({
      message: 'Document upload accepted and processing started',
      documentId: tempDocument.id,
      status: 'processing'
    });
  } catch (error) {
    logger.error('Upload document error', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({ message: 'Server error' });
  }
};

// Asynchronous document processing
const processDocumentAsync = async (tempDocument) => {
  try {
    // Update progress to 10%
    tempDocument.progress = 10;
    
    // Process document
    const document = await documentService.processDocument(
      tempDocument.file, 
      tempDocument.title, 
      tempDocument.agentId
    );
    
    // Update the temporary document with success info
    tempDocument.status = 'completed';
    tempDocument.progress = 100;
    tempDocument.documentId = document.id; // Store the real document ID
    
    logger.info('Document processing completed successfully', { 
      tempId: tempDocument.id,
      documentId: document.id,
      userId: tempDocument.userId,
      agentId: tempDocument.agentId,
      processingTime: Date.now() - tempDocument.startTime
    });
    
    // Keep the status for at least 5 minutes before removing
    setTimeout(() => {
      processingDocuments.delete(tempDocument.id);
    }, 5 * 60 * 1000);
  } catch (error) {
    // Update the temporary document with error info
    tempDocument.status = 'failed';
    tempDocument.error = error.message;
    
    logger.error('Document processing failed', { 
      tempId: tempDocument.id,
      error: error.message,
      stack: error.stack,
      userId: tempDocument.userId,
      agentId: tempDocument.agentId
    });
    
    // Keep the error status for at least 15 minutes before removing
    setTimeout(() => {
      processingDocuments.delete(tempDocument.id);
    }, 15 * 60 * 1000);
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
      logger.warn('Get documents failed: Agent not found', { agentId });
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    // Get documents
    const documents = await prisma.document.findMany({
      where: { agentId },
    });
    
    logger.debug('Retrieved documents by agent', { 
      agentId, 
      count: documents.length 
    });
    
    res.status(200).json({ documents });
  } catch (error) {
    logger.error('Get documents by agent error', { 
      error: error.message, 
      stack: error.stack,
      agentId: req.params?.agentId 
    });
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
      logger.warn('Delete document failed: Document not found', { documentId: id });
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Check authorization
    if (document.agent.teacherId !== req.user.id) {
      logger.warn('Delete document failed: Unauthorized', { 
        userId: req.user.id, 
        documentId: id,
        teacherId: document.agent.teacherId
      });
      return res.status(403).json({ message: 'Not authorized to delete this document' });
    }
    
    // Delete document
    await documentService.deleteDocument(id);
    
    logger.info('Document deleted successfully', { 
      userId: req.user.id, 
      documentId: id 
    });
    
    res.status(200).json({ message: 'Document deleted successfully' });
  } catch (error) {
    logger.error('Delete document error', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user?.id,
      documentId: req.params?.id
    });
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get document processing status
 */
const getDocumentStatus = async (req, res) => {
  try {
    const { documentId } = req.params;
    
    logger.debug('Checking document status', { documentId });
    
    // Check if document is being processed
    const processingDoc = processingDocuments.get(documentId);
    
    if (processingDoc) {
      logger.debug('Found processing document status', { 
        documentId, 
        status: processingDoc.status 
      });
      
      return res.status(200).json({
        id: documentId,
        status: processingDoc.status,
        progress: processingDoc.progress,
        error: processingDoc.error,
        documentId: processingDoc.documentId // Only present if completed
      });
    }
    
    // If not in processing map, check if it exists in the database
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        title: true,
        agentId: true,
        createdAt: true
      }
    });
    
    if (document) {
      logger.debug('Document found in database', { documentId });
      
      return res.status(200).json({
        id: documentId,
        status: 'completed',
        progress: 100,
        error: null,
        document
      });
    }
    
    logger.warn('Document status check failed: Document not found', { documentId });
    
    // Document not found in processing map or database
    res.status(404).json({ 
      message: 'Document not found',
      status: 'unknown'
    });
  } catch (error) {
    logger.error('Get document status error', { 
      error: error.message, 
      stack: error.stack,
      documentId: req.params?.documentId
    });
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  uploadDocument,
  getDocumentsByAgent,
  deleteDocument,
  getDocumentStatus
};
