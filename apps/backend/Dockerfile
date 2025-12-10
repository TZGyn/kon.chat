FROM oven/bun

WORKDIR /app

COPY / ./

ARG PUBLIC_APP_URL
ARG PUBLIC_API_URL

ARG TURBO_TELEMETRY_DISABLED=1

RUN bun install
RUN bun run build --filter=!./apps/web

EXPOSE 3000

CMD ["bun", "backend/index.ts"]