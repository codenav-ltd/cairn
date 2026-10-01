# syntax=docker/dockerfile:1

# One build for both runtime images: `--target api` and `--target web`.

FROM node:24-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    TURBO_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile
RUN pnpm build
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm --filter @cairnhq/api deploy --prod --legacy /out/api

FROM node:24-slim AS api
WORKDIR /app
COPY --from=build /out/api/node_modules ./node_modules
COPY --from=build /repo/apps/api/package.json ./
COPY --from=build /repo/apps/api/dist ./dist
ARG CAIRN_VERSION=dev
ENV NODE_ENV=production \
    CAIRN_API_PORT=4000 \
    CAIRN_VERSION=$CAIRN_VERSION
USER node
EXPOSE 4000
CMD ["node", "dist/main.mjs"]

FROM node:24-slim AS web
WORKDIR /app
COPY --from=build /repo/apps/web/.output ./.output
ARG CAIRN_VERSION=dev
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    CAIRN_VERSION=$CAIRN_VERSION
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
