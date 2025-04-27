#!/bin/bash

# Check if .env file exists
if [ ! -f .env ]; then
  echo "Error: .env file not found!"
  echo "Please create a .env file with the following variables:"
  echo "- JWT_SECRET"
  echo "- OPENAI_API_KEY"
  echo "- PINECONE_API_KEY"
  echo "- PINECONE_ENVIRONMENT"
  echo "- PINECONE_INDEX_NAME"
  exit 1
fi

# Make sure the logs directory exists
mkdir -p logs

# Pull the latest images
docker-compose pull

# Build the application
docker-compose build

# Start the application in detached mode
docker-compose up -d

echo "RAG Education App is starting..."
echo "The API will be available at http://localhost:3000"
echo "To view logs: docker-compose logs -f"
echo "To stop: docker-compose down" 