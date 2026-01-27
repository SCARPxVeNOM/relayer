# Use Node.js as base with Rust support
FROM node:22-bookworm

# Install build dependencies for Rust and Leo
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Install Leo CLI
RUN cargo install leo-lang

# Verify Leo installation
RUN leo --version

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Copy Aleo program files (both for backward compatibility)
COPY aleo/advance_privacy ./aleo/advance_privacy
COPY aleo/privacy_barrier ./aleo/privacy_barrier

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV LEO_PATH=/root/.cargo/bin/leo

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Start the application
CMD ["node", "relayer/index.js"]
