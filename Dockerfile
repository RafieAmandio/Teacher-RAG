FROM node:18-alpine

# Install PostgreSQL client (needed for Prisma)
RUN apk add --no-cache postgresql-client

# Create app directory
WORKDIR /usr/src/app

# Create directories for uploads and logs
RUN mkdir -p uploads logs

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy Prisma schema
COPY prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy app source
COPY src ./src/

# Copy environment variables example file if it exists
COPY .env* ./

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["npm", "run", "start"] 