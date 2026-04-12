FROM node:20-slim

# pnpm 설치
RUN npm install -g corepack && corepack enable pnpm

WORKDIR /app

# 의존성 파일 먼저 복사 (캐시 활용)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY server/package.json ./server/

RUN pnpm install --frozen-lockfile

# 소스 복사
COPY packages/ ./packages/
COPY server/ ./server/

# 빌드 (의존 순서 보장)
RUN pnpm --filter @hagent/shared build
RUN pnpm --filter @hagent/db build
RUN pnpm --filter @hagent/server build

EXPOSE 3200

CMD ["node", "server/dist/index.js"]
