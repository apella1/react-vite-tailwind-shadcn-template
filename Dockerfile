# Development: Vite dev server with HMR
# Production: build static files and serve via nginx (added later)
FROM node:22-slim

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# Copy package files first for layer caching
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

EXPOSE 5173

# --host 0.0.0.0 is required so the port is accessible outside the container
CMD ["pnpm", "dev", "--host", "0.0.0.0"]
