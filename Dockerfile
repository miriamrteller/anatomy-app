FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY src ./src
COPY tsconfig.json ./

RUN npm run build

FROM node:20-alpine

WORKDIR /app

# Install OpenSSL (required by Prisma)
RUN apk add --no-cache openssl

COPY package*.json ./

RUN npm ci

COPY --from=builder /app/dist ./dist
COPY prisma ./prisma
COPY docker-entrypoint.sh .

ENV NODE_ENV=production

# Generate Prisma client
RUN npx prisma generate

# Make entrypoint script executable
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

# Use entrypoint script to run migrations and start server
ENTRYPOINT ["./docker-entrypoint.sh"]

