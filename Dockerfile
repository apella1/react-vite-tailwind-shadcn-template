# Development: Vite dev server with HMR
# Production: static build served by nginx (added in a later phase)
#
# node:22-slim ships with a built-in "node" user (uid 1000, gid 1000).
# We use it rather than creating a new one to keep the image minimal.
FROM node:22-slim

# Install pnpm as root before switching users
RUN npm install -g pnpm@9

# Create the working directory and give ownership to the node user.
# Must be done as root before USER is set.
RUN mkdir -p /app && chown -R node:node /app

WORKDIR /app

# Switch to the non-root node user for all subsequent steps
USER node

# Copy package files and install dependencies as the node user.
# Ownership is already correct from the chown above.
COPY --chown=node:node package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy the rest of the source with correct ownership
COPY --chown=node:node . .

EXPOSE 5176

# --host 0.0.0.0 is required so Vite's port is accessible outside the container
CMD ["pnpm", "dev", "--host", "0.0.0.0"]
