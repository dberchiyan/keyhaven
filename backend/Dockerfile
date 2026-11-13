# build — every dependency, the Prisma client and the compiled app. Also the image for
# migrations and the seed (`--target build`): they need the Prisma CLI and tsx.
FROM node:26.13.1-alpine AS build

ENV TZ=UTC
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm ci --ignore-scripts

COPY . .
# Generating the client needs no database; the URL only has to look like one.
RUN DATABASE_URL=postgresql://build:build@build:5432/build npx prisma generate \
  && npm run build

CMD ["npx", "prisma", "migrate", "deploy"]

# runtime — production dependencies and the compiled app only.
FROM node:26.13.1-alpine AS runtime

ENV TZ=UTC NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
# Without peers: @prisma/client and the transactional adapter name the Prisma CLI as a peer,
# which would pull it (with Prisma Studio, pglite, TypeScript) into production.
RUN npm ci --omit=dev --legacy-peer-deps --ignore-scripts && npm cache clean --force

COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main.js"]
