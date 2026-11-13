# Build the landing (Astro) and the SPA, then serve both with nginx, which also proxies /api to
# the backend. Build context: the repository root (docker-compose.yml), so both packages are seen.
FROM node:26.13.1-alpine AS landing
WORKDIR /landing
COPY landing/package.json landing/package-lock.json landing/.npmrc ./
RUN npm ci --ignore-scripts
COPY landing/ .
RUN npm run build

FROM node:26.13.1-alpine AS app
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json frontend/.npmrc ./
# No git hooks inside the image.
RUN npm ci --ignore-scripts
COPY frontend/ .
RUN npm run build

FROM nginx:1.30.6-alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=app /app/dist /usr/share/nginx/html
COPY --from=landing /landing/dist /usr/share/nginx/landing
EXPOSE 80
