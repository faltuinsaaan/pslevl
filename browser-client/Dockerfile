# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Accept build args for environment
ARG VITE_SIGNALING_URL=ws://localhost:8080
ARG VITE_SESSION_URL=http://localhost:3000

ENV VITE_SIGNALING_URL=$VITE_SIGNALING_URL
ENV VITE_SESSION_URL=$VITE_SESSION_URL

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build SvelteKit for production
RUN npm run build

# Production stage - Nginx
FROM nginx:alpine

# Copy built static files
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
