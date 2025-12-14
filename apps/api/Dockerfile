FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /mono-repo

COPY . .

WORKDIR /mono-repo/apps/api

RUN npm ci

RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /mono-repo/apps/api /app

EXPOSE 8000

CMD ["npm", "run", "start"]
