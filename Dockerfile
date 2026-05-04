FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
COPY web/package.json web/pnpm-lock.yaml ./web/
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN pnpm install --frozen-lockfile
RUN cd web && pnpm install --frozen-lockfile

COPY . .

RUN npx prisma generate
RUN cd web && pnpm build

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "src/index.js"]
