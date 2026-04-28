FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY src ./src
COPY prisma ./prisma
COPY tsconfig.json .

RUN npm run build

RUN npm ci --only=production

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "start"]
