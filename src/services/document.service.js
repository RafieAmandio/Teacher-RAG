const fs = require('fs').promises;
const pdf = require('pdf-parse');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const vectorDBService = require('./vectordb.service');
const prisma = require('../config/database');
const logger = require('../config/logger');

class DocumentService {
  constructor() {
    this.chunkSize = 1000; // Characters per chunk
    this.chunkOverlap = 200; // Characters overlap between chunks
    logger.info('Document service initialized', { 
      chunkSize: this.chunkSize, 
      chunkOverlap: this.chunkOverlap 
    });
  }

  async processDocument(file, title, agentId) {
    try {
      logger.debug('Processing document', { 
        filename: file.filename, 
        title, 
        agentId 
      });
      
      // Read PDF file
      const filePath = path.join(__dirname, '../../uploads', file.filename);
      const dataBuffer = await fs.readFile(filePath);
      
      logger.debug('PDF file read successfully', { 
        size: dataBuffer.length, 
        path: filePath 
      });
      
      // Parse PDF to text
      const pdfData = await pdf(dataBuffer);
      const text = pdfData.text;
      
      logger.debug('PDF parsed to text', { 
        textLength: text.length,
        pageCount: pdfData.numpages 
      });
      
      // Chunk the text
      const chunks = this.chunkText(text);
      
      logger.debug('Text chunked', { 
        chunkCount: chunks.length 
      });
      
      // Create vector ID
      const vectorId = uuidv4();
      
      // Create document in database
      const document = await prisma.document.create({
        data: {
          title,
          filePath: file.filename,
          content: text,
          vectorId,
          agentId,
        }
      });
      
      logger.info('Document created in database', { 
        documentId: document.id, 
        agentId,
        vectorId 
      });
      
      // Create embeddings and store in Pinecone
      logger.debug('Creating embeddings for chunks', { 
        documentId: document.id,
        chunkCount: chunks.length 
      });
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkId = `${vectorId}_chunk_${i}`;
        
        // Create embedding
        const embedding = await vectorDBService.createEmbedding(chunk);
        
        // Store in Pinecone
        await vectorDBService.upsertVector(chunkId, embedding, {
          documentId: document.id,
          agentId: agentId,
          content: chunk,
          title: title,
          chunkIndex: i
        });
        
        logger.debug('Chunk embedded and stored', { 
          documentId: document.id,
          chunkId,
          chunkIndex: i 
        });
      }
      
      logger.info('Document processing completed', { 
        documentId: document.id,
        chunksProcessed: chunks.length 
      });
      
      // Delete the original file after processing
      try {
        await fs.unlink(filePath);
        logger.info('Original file deleted after processing', { 
          filePath,
          documentId: document.id
        });
      } catch (deleteError) {
        logger.warn('Failed to delete original file after processing', { 
          error: deleteError.message,
          filePath,
          documentId: document.id
        });
      }
      
      return document;
    } catch (error) {
      logger.error('Error processing document', {
        error: error.message,
        stack: error.stack,
        filename: file?.filename,
        agentId
      });
      throw error;
    }
  }

  chunkText(text) {
    const chunks = [];
    let i = 0;
    
    while (i < text.length) {
      // Extract chunk
      const chunk = text.substring(i, i + this.chunkSize);
      chunks.push(chunk);
      
      // Move forward with overlap
      i += (this.chunkSize - this.chunkOverlap);
    }
    
    return chunks;
  }

  async deleteDocument(documentId) {
    try {
      logger.debug('Deleting document', { documentId });
      
      // Get document
      const document = await prisma.document.findUnique({
        where: { id: documentId }
      });
      
      if (!document) {
        logger.warn('Document deletion failed: Document not found', { documentId });
        throw new Error('Document not found');
      }
      
      // Check if file exists before trying to delete it
      const filePath = path.join(__dirname, '../../uploads', document.filePath);
      try {
        await fs.access(filePath);
        // File exists, try to delete it
        await fs.unlink(filePath);
        logger.debug('Document file deleted', { 
          documentId, 
          filePath: document.filePath 
        });
      } catch (fileErr) {
        // File doesn't exist or can't be accessed, which is fine since we're deleting records anyway
        logger.debug('Document file not found or already deleted', { 
          documentId, 
          filePath: document.filePath 
        });
      }
      
      // Delete from database
      await prisma.document.delete({
        where: { id: documentId }
      });
      
      logger.debug('Document record deleted from database', { documentId });
      
      // Delete vectors from Pinecone
      // This is a basic implementation - in production you'd want to find and delete all chunks
      await vectorDBService.deleteVector(document.vectorId);
      
      logger.info('Document deleted successfully', { 
        documentId, 
        vectorId: document.vectorId 
      });
      
      return { success: true };
    } catch (error) {
      logger.error('Error deleting document', { 
        error: error.message, 
        stack: error.stack,
        documentId
      });
      throw error;
    }
  }
}

module.exports = new DocumentService();
