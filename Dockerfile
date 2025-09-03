# Use Python 3.11 slim image for smaller size
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies including Node.js
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libxml2-dev \
    libxslt-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g npm@latest

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy frontend files first and build them
COPY frontend/ ./frontend/
COPY package*.json ./frontend/

# Build the frontend
WORKDIR /app/frontend
RUN npm ci && npm run build

# Remove Node.js and npm to reduce image size
RUN apt-get remove -y nodejs npm curl \
    && apt-get autoremove -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Return to app directory
WORKDIR /app

# Copy the rest of the backend files
COPY . .

# Make entrypoint script executable
RUN chmod +x entrypoint.sh

# Create a non-root user for security
RUN useradd --create-home --shell /bin/bash app && chown -R app:app /app
USER app

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Use entrypoint script
ENTRYPOINT ["./entrypoint.sh"]
CMD ["api"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/api/metrics', timeout=5)" || exit 1
