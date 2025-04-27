const { index } = require('../config/pinecone');
const openai = require('../config/openai');
const logger = require('../config/logger');

class VectorDBService {
  constructor() {
    this.embeddingModel = 'text-embedding-3-large';
    logger.info('Vector DB service initialized', { embeddingModel: this.embeddingModel });
  }

  async createEmbedding(text) {
    try {
      logger.debug('Creating embedding', { 
        model: this.embeddingModel, 
        textLength: text.length 
      });
      
      const response = await openai.embeddings.create({
        model: this.embeddingModel,
        input: text,
      });
      
      logger.debug('Embedding created successfully', { 
        embeddingDimensions: response.data[0].embedding.length,
        usage: response.usage
      });
      
      return response.data[0].embedding;
    } catch (error) {
      logger.error('Error creating embedding', { 
        error: error.message, 
        stack: error.stack,
        textLength: text.length 
      });
      throw error;
    }
  }

  async upsertVector(id, embedding, metadata = {}) {
    try {
      logger.debug('Upserting vector', { 
        id, 
        embeddingDimensions: embedding.length,
        metadataFields: Object.keys(metadata) 
      });
      
      await index.upsert([{
        id,
        values: embedding,
        metadata
      }]);
      
      logger.debug('Vector upserted successfully', { id });
      
      return { id };
    } catch (error) {
      logger.error('Error upserting vector', { 
        error: error.message, 
        stack: error.stack,
        id 
      });
      throw error;
    }
  }

  async deleteVector(id) {
    try {
      logger.debug('Deleting vector', { id });
      
      await index.deleteOne(id);
      
      logger.debug('Vector deleted successfully', { id });
      
      return true;
    } catch (error) {
      logger.error('Error deleting vector', { 
        error: error.message, 
        stack: error.stack,
        id 
      });
      throw error;
    }
  }

  async similaritySearch(query, topK = 5, filter = {}) {
    try {
      logger.debug('Performing similarity search', { 
        queryLength: query.length, 
        topK,
        filter 
      });
      
      const queryEmbedding = await this.createEmbedding(query);
      
      const results = await index.query({
        vector: queryEmbedding,
        topK,
        filter,
        includeMetadata: true
      });
      
      const matches = results.matches || [];
      
      logger.debug('Similarity search completed', { 
        matchCount: matches.length,
        topScore: matches.length > 0 ? matches[0].score : null
      });
      
      return matches;
    } catch (error) {
      logger.error('Error in similarity search', { 
        error: error.message, 
        stack: error.stack,
        queryLength: query.length
      });
      throw error;
    }
  }
}

module.exports = new VectorDBService();
