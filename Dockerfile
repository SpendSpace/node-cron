FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
# --include=dev is explicit: typescript is a devDependency and npm ci SKIPS
# devDependencies when NODE_ENV=production (verified), which would break
# 'npm run build' (tsc) if Railway injected it into the build.
RUN npm ci --include=dev

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

CMD ["node", "dist/index.js"]
