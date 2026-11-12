FROM node:24.19.0-bookworm-slim AS build
WORKDIR /app
RUN npm install -g npm@12.2.0
COPY package*.json .npmrc ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm ci --no-audit --no-fund
COPY tsconfig.base.json ./
COPY packages/contracts packages/contracts
COPY apps/web apps/web
RUN npm run build -w @siga/web

FROM nginx:1.30.5-alpine AS runtime
ARG SIGA_VERSION=0.1.0
LABEL org.opencontainers.image.version=$SIGA_VERSION
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
