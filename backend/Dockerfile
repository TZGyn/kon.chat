FROM oven/bun

WORKDIR /app

COPY ../package.json ./
COPY ../bun.lock ./

RUN bun install

ARG PUBLIC_APP_URL
ARG PUBLIC_API_URL

COPY .. .
# COPY ./.env.example ./.env

RUN bun run build

EXPOSE 3000

CMD ["bun", "backend/index.ts"]