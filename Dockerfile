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

ENV NODE_ENV=production

# Generate Prisma client
RUN npx prisma generate

# Run migrations and seed database
RUN npx prisma migrate deploy && npx prisma db seed

EXPOSE 3000

CMD ["npm", "start"]
