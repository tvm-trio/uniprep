FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /uniprep
COPY . .

ARG NODE_APP_DIR=apps/api
RUN npm ci -w $NODE_APP_DIR

RUN npm run build -w $NODE_APP_DIR

RUN mkdir /app \
    && cp -R $NODE_APP_DIR /app \
    && cd /app \
    && npm prune --production

FROM node:20-alpine

WORKDIR /app
COPY --from=builder /app /app

EXPOSE 8000

CMD ["npm", "run", "start"]
