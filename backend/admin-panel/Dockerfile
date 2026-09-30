# REGISTRY lets the aramina server pull base images through Arvan's
# Docker Hub mirror (DOCKER_REGISTRY=docker.arvancloud.ir in .env) —
# direct Docker Hub pulls from there crawl at a few KB/s.
ARG REGISTRY=docker.io
FROM ${REGISTRY}/library/node:20-alpine AS builder

WORKDIR /app

# NPM_REGISTRY: the Liara npm mirror on the server (registry.npmjs.org
# crawls from Iran).
ARG NPM_REGISTRY=https://registry.npmjs.org/
RUN npm config set registry ${NPM_REGISTRY}

# The npm download cache is a BuildKit cache shared with the landing
# (same id): a package either one downloaded isn't downloaded again.
COPY package.json package-lock.json* ./
RUN --mount=type=cache,id=mathmotion-npm,target=/root/.npm,sharing=locked \
    if [ -f package-lock.json ]; then npm ci --prefer-offline; else npm install --prefer-offline; fi

COPY . .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

FROM ${REGISTRY}/library/node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
