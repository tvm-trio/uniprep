FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /mono-repo

COPY . .

WORKDIR /uniprep/apps/api

RUN npm install

RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /mono-repo/apps/api /app

EXPOSE 8000

CMD ["npm", "run", "start"]
