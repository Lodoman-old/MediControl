FROM node:20-slim
RUN npm install -g pnpm@9.12.0
RUN apt-get update -y && apt-get install -y openssl ca-certificates && apt-get clean
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY tsconfig.base.json ./
COPY apps/api/ apps/api/

RUN pnpm install --frozen-lockfile --filter @medicontrol/api

WORKDIR /app/apps/api
RUN npx prisma generate
RUN npm run build
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/bin/sh", "docker-entrypoint.sh"]
