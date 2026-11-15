# TokenArmor Production Dockerfile
FROM node:24-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

# Copy package files
COPY package.json ./

# Copy source and UI assets
COPY core/ ./core/
COPY ee/ ./ee/
COPY ui/ ./ui/
COPY LICENSE ./
COPY PRICING.md ./

# Create non-root user for container security
USER node

EXPOSE 8080

CMD ["node", "core/src/server.js"]
