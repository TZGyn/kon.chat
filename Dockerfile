# syntax = docker/dockerfile:1

# Adjust BUN_VERSION as desired
ARG BUN_VERSION=1.2.2
FROM oven/bun:${BUN_VERSION}-slim AS base

LABEL fly_launch_runtime="SvelteKit"

# SvelteKit app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"


# Throw-away build stage to reduce size of final image
FROM base AS build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential pkg-config python-is-python3

# Install node modules
ARG TIPTAP_TOKEN
COPY .npmrc bunfig.toml bun.lock package.json ./
RUN TIPTAP_TOKEN=$TIPTAP_TOKEN bun install

# Copy application code
COPY . .

# Build application
ARG PUBLIC_APP_URL
ARG PUBLIC_API_URL

RUN PUBLIC_API_URL=$PUBLIC_API_URL PUBLIC_APP_URL=$PUBLIC_APP_URL bun run build

# Remove development dependencies
# RUN rm -rf node_modules && \
#     bun install --ci


# Final stage for app image
# FROM base

# Copy built application
# COPY --from=build /app/build /app/build
# COPY --from=build /app/node_modules /app/node_modules
# COPY --from=build /app/package.json /app

# Start the server by default, this can be overwritten at runtime
# EXPOSE 4173
# CMD [ "bun", "run", "preview", "--host" ]
