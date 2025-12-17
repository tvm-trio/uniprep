FROM node:18-alpine AS builder

WORKDIR /uniprep

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/

RUN npm ci

COPY . .

RUN npx turbo run build --filter=api

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /uniprep/node_modules ./node_modules

COPY --from=builder /uniprep/apps/api/dist ./apps/api/dist
COPY --from=builder /uniprep/apps/api/package.json ./apps/api/package.json

EXPOSE 8000

CMD ["node", "apps/api/dist/main.js"]



