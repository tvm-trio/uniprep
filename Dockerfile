FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /repo

COPY . .

WORKDIR /repo/apps/api

RUN npm install --omit=dev

RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /repo/apps/api /app

EXPOSE 8000

CMD ["npm", "run", "start"]
