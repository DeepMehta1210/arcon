FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json tsconfig.json ./
RUN npm install

COPY src ./src
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV OPENWA_PORT=3050
ENV OPENWA_ENGINE=baileys
ENV OPENWA_STORAGE=sqlite

COPY package.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

VOLUME ["/app/data/sessions"]

EXPOSE 3050

CMD ["node", "dist/main.js"]
