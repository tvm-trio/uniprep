FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json turbo.json ./

COPY apps/api/package.json apps/api/

RUN npm ci

COPY . .

RUN npx turbo run build --filter=api

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

EXPOSE 8000

CMD ["node", "apps/api/dist/main.js"]



