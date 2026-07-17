# ============================================
# Stage 1: Build the React/Vite app
# ============================================
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies first (Docker layer cache)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Accept API URL as a build argument (injected at build time)
ARG VITE_API_BASE_URL=http://localhost:5000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build production bundle → outputs to /app/dist
RUN npm run build

# ============================================
# Stage 2: Serve with Nginx
# ============================================
FROM nginx:stable-alpine

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
