# --- Stage 1: Build the React App ---
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install

# 1. Accept the argument
ARG VITE_API_URL
# 2. Set it as an environment variable for the build command
ENV VITE_API_URL=$VITE_API_URL

COPY . .
# This creates the /dist folder
RUN npm run build

# --- Stage 2: Serve with Nginx ---
FROM nginx:alpine

# Copy the custom Nginx config (we will create this next)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the build output from Stage 1 to Nginx html folder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]