FROM oven/bun:debian

WORKDIR /app

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install -y git 

ARG PUBLIC_APP_URL
ARG PUBLIC_API_URL

COPY ./package.json ./
COPY ./bun.lock ./

RUN bun install

COPY . .
# COPY ./.env.example ./.env

RUN bun --bun run build

EXPOSE 4173

CMD ["bun", "run", "preview"]