# Flamingo frontend — Vite + React + TS (dev image).
# For production we would build static assets and serve them from a CDN / nginx;
# this image runs the Vite dev server for the local compose stack.
FROM node:20-alpine

WORKDIR /app

# Install deps first for better layer caching.
COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
