FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY src ./src
COPY prisma ./prisma
COPY tsconfig.json tsconfig.prod.json ./

RUN npx tsc --project tsconfig.prod.json

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY docker-entrypoint.sh .

ENV NODE_ENV=production

# Generate Prisma client
RUN npx prisma generate

# Make entrypoint script executable
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

# Use entrypoint script to run migrations and start server
ENTRYPOINT ["./docker-entrypoint.sh"]

