FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY . .

RUN npm pkg delete devDependencies["@repo/eslint-config"]
RUN npm pkg delete devDependencies["@repo/typescript-config"]

RUN npm install --omit=dev
RUN npm run build

FROM node:20-alpine

WORKDIR /app
COPY --from=builder /app /app

EXPOSE 8000
CMD ["npm", "run", "start"]
