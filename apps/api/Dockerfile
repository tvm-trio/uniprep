FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app

# тут копіюється ТІЛЬКИ apps/api
COPY . .

RUN npm install

RUN npm run build


FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app /app

EXPOSE 8000

CMD ["npm", "run", "start"]
