const openai = require('../config/openai');
const vectorDBService = require('./vectordb.service');
const prisma = require('../config/database');
const logger = require('../config/logger');

class RAGService {
  constructor() {
    this.model = 'gpt-4o';
    logger.info('RAG service initialized', { model: this.model });
  }

  async processQuery(agentId, query, chatId) {
    try {
      logger.debug('Processing RAG query', { agentId, chatId, queryLength: query.length });
      
      // Get agent information
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
      });

      if (!agent) {
        logger.error('RAG query failed: Agent not found', { agentId, chatId });
        throw new Error('Agent not found');
      }

      // Perform similarity search
      logger.debug('Performing similarity search', { agentId, chatId });
      const searchResults = await vectorDBService.similaritySearch(query, 5, {
        agentId: agentId
      });

      logger.debug('Similarity search completed', { 
        agentId, 
        chatId, 
        resultCount: searchResults.length 
      });

      // Extract relevant context
      const context = searchResults.map(result => {
        return result.metadata.content;
      }).join('\n\n');

      logger.debug('Context extracted', { 
        agentId, 
        chatId, 
        context: context
      });

      // Build system message with context and agent info
      const systemMessage = `You are an educational AI assistant focused on ${agent.subject}. 
      Your name is ${agent.name}.
      ${agent.description || ''}
      
      Use the following context information to answer the student's question:
      ${context}
      
      If you don't know the answer based on the provided context, say so clearly but try to provide helpful related information. Always be supportive and encouraging to students.`;

      // Get chat history
      logger.debug('Retrieving chat history', { chatId });
      const history = await prisma.message.findMany({
        where: { chatId },
        orderBy: { createdAt: 'asc' },
        take: 15 // Limit history to last 15 messages
      });

      // Format history for OpenAI
      const messages = [
        { role: 'system', content: systemMessage },
      ];

      // Add chat history
      history.forEach(msg => {
        messages.push({
          role: msg.role === 'USER' ? 'user' : 'assistant',
          content: msg.content
        });
      });

      // Add current user query
      messages.push({ role: 'user', content: query });

      // Generate response
      logger.debug('Generating OpenAI response', { 
        agentId, 
        chatId, 
        model: this.model,
        messageCount: messages.length 
      });
      
      const completion = await openai.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
      });

      const response = completion.choices[0].message.content;
      
      logger.info('RAG query processed successfully', { 
        agentId, 
        chatId, 
        responseLength: response.length,
        tokensUsed: completion.usage?.total_tokens 
      });
      
      return response;
    } catch (error) {
      logger.error('Error in RAG service', { 
        error: error.message, 
        stack: error.stack, 
        agentId, 
        chatId 
      });
      throw error;
    }
  }
}

module.exports = new RAGService();
