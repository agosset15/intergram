FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY . .

RUN npm ci
RUN npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.js ./server.js
COPY --from=build /app/package.json ./package.json

USER node
EXPOSE 3000
CMD ["node", "server.js"]
