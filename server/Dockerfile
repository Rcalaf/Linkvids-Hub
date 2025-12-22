# 1. Use official Node.js image (Lightweight version)
FROM node:18-alpine

# 2. Set working directory
WORKDIR /app

# 3. Copy package.json and install dependencies
COPY package*.json ./
RUN npm install --production

# 4. Copy the rest of the application code
COPY . .

# 5. Expose the port (matches your .env PORT)
EXPOSE 5000

# 6. Start the server
CMD ["node", "server.js"]