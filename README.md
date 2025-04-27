# RAG Education App

This application provides a retrieval-augmented generation (RAG) system for educational purposes with separate teacher and student accounts.

## Features

- User authentication (Teachers and Students)
- Teachers can create subject-specific AI agents
- Teachers can upload knowledge documents (PDFs)
- Students can chat with AI agents and get knowledge-based responses
- All chat data is stored and retrievable

## Technology Stack

- **Backend**: Node.js with Express
- **Database**: PostgreSQL with Prisma ORM
- **AI**: OpenAI for embeddings and chat completions
- **Vector Database**: Pinecone for similarity search
- **Authentication**: JWT-based authentication

## Setup Instructions

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up your environment variables in `.env` file
4. Set up PostgreSQL database
5. Run migrations: `npx prisma migrate dev`
6. Seed the database: `npm run seed`
7. Start the development server: `npm run dev`

## Environment Variables

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `JWT_SECRET`: Secret for JWT tokens
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API key
- `PINECONE_API_KEY`: Pinecone API key
- `PINECONE_ENVIRONMENT`: Pinecone environment
- `PINECONE_INDEX_NAME`: Pinecone index name

## API Endpoints

### Authentication
- `POST /api/auth/register`: Register new user
- `POST /api/auth/login`: Login user
- `GET /api/auth/profile`: Get current user profile

### Users
- `GET /api/users`: Get all users
- `GET /api/users/:id`: Get user by ID
- `PUT /api/users/:id`: Update user profile

### Agents
- `POST /api/agents`: Create new agent (Teacher only)
- `GET /api/agents`: Get all agents
- `GET /api/agents/:id`: Get agent by ID
- `PUT /api/agents/:id`: Update agent (Teacher only)
- `DELETE /api/agents/:id`: Delete agent (Teacher only)
- `GET /api/agents/teacher/agents`: Get teacher's agents (Teacher only)

### Documents
- `POST /api/documents`: Upload document (Teacher only)
- `GET /api/documents/agent/:agentId`: Get documents by agent
- `DELETE /api/documents/:id`: Delete document (Teacher only)

### Chats
- `POST /api/chats`: Create new chat
- `GET /api/chats`: Get user's chats
- `GET /api/chats/:id`: Get chat by ID
- `POST /api/chats/message`: Send message to chat
- `DELETE /api/chats/:id`: Delete chat

## Default Users

After running the seed script, the following users will be available:

- **Teacher**: teacher@example.com / teacher123
- **Student**: student@example.com / student123
