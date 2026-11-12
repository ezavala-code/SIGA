FROM node:24.19.0-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
RUN npm install -g npm@12.2.0
COPY package*.json .npmrc ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm ci --no-audit --no-fund
COPY tsconfig.base.json ./
COPY packages/contracts packages/contracts
COPY apps/api apps/api
RUN npm run build -w @siga/api

FROM build AS migrate
USER node
CMD ["node", "node_modules/prisma/build/index.js", "migrate", "deploy", "--config", "apps/api/prisma.config.ts"]

FROM build AS production-deps
RUN npm prune --omit=dev --workspace=@siga/api --workspace=@siga/contracts --ignore-scripts

FROM node:24.19.0-bookworm-slim AS runtime
ARG SIGA_VERSION=0.1.0
ENV NODE_ENV=production
LABEL org.opencontainers.image.version=$SIGA_VERSION
WORKDIR /app
RUN mkdir -p /data/certificados && chown node:node /data/certificados && chmod 700 /data/certificados
COPY --from=production-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=node:node /app/apps/api/assets ./apps/api/assets
COPY --from=build --chown=node:node /app/packages/contracts ./packages/contracts
USER node
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
