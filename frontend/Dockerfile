 # Stage 1: Base image (Lightweight Alpine Linux)
 FROM node:20-alpine AS base
 
 # Stage 2: Install dependencies
 FROM base AS deps
 WORKDIR /app
 COPY package*.json ./
 RUN npm install
 
 # Stage 3: Build Next.js application
 FROM base AS builder
 WORKDIR /app
 COPY --from=deps /app/node_modules ./node_modules
 COPY . .
 ENV NODE_ENV=production
 ENV BACKEND_URL=http://backend:8000
 RUN npm run build
 
 # Stage 4: Production Runner (~120MB ultra-lightweight)
 FROM base AS runner
 WORKDIR /app
 ENV NODE_ENV=production
 ENV PORT=3000
 ENV HOSTNAME="0.0.0.0"
 
 # Copy built standalone output
 COPY --from=builder /app/.next/standalone ./
 COPY --from=builder /app/.next/static ./.next/static
 
 EXPOSE 3000
 CMD ["node", "server.js"]