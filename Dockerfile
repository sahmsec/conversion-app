FROM node:20-alpine
RUN apk add --no-cache openssl

WORKDIR /app

# Install ALL dependencies — the production build (Vite) needs devDependencies.
COPY package.json package-lock.json* ./
RUN npm ci --include=dev && npm cache clean --force

COPY . .

RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

# Runs `prisma generate && prisma migrate deploy` then starts the Remix server.
CMD ["npm", "run", "docker-start"]
