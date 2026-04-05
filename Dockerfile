FROM node:22-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src
COPY README.md ./

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/notes.db

RUN mkdir -p /app/data && chown -R node:node /app

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD node -e "fetch(`http://127.0.0.1:${process.env.PORT || 3000}/health`).then((res) => { if (!res.ok) process.exit(1); }).catch(() => process.exit(1));"

CMD ["npm", "start"]