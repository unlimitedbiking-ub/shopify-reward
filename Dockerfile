# Use the official Node.js image with Alpine
FROM node:18-alpine

# Expose application port
EXPOSE 3000

# Set the working directory
WORKDIR /app

# Set production environment variable
ENV NODE_ENV=production

# Install dependencies
COPY package.json package-lock.json* ./

# Install OpenSSL and required build dependencies
RUN apk add --no-cache openssl && \
    npm ci --omit=dev && \
    npm cache clean --force

# Optional: Remove unnecessary CLI tools
RUN npm remove @shopify/cli

# Copy application files
COPY . .

# Build the application
RUN npm run build

# Define the startup command
CMD ["npm", "run", "docker-start"]