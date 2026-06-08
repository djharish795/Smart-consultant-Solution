# Use the official Microsoft Playwright image which has Node and Chromium pre-installed
FROM mcr.microsoft.com/playwright:v1.44.1-jammy

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (skipping browser download since they are pre-baked in the image)
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npm install

# Copy application files
COPY . .

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "server.js"]
