# Use Node.js as base
FROM node:22-bookworm

# Install minimal dependencies
RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Download pre-built Leo v3.4.0 binary (CORRECT URL)
RUN curl -L -o /tmp/leo.zip https://github.com/ProvableHQ/leo/releases/download/v3.4.0/leo-v3.4.0-x86_64-unknown-linux-gnu.zip \
    && unzip /tmp/leo.zip -d /usr/local/bin/ \
    && chmod +x /usr/local/bin/leo \
    && rm /tmp/leo.zip

# Verify Leo installation
RUN leo --version

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV LEO_PATH=/usr/local/bin/leo

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Start the application
CMD ["node", "relayer/index.js"]
