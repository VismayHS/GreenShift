# GreenShift website: build with the committed site data (frontend/public/data) and serve the static build.
# Rebuild after the pipeline changes the data: docker compose up --build site
FROM node:24-slim
WORKDIR /site
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build
EXPOSE 4173
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "4173", "--strictPort"]
