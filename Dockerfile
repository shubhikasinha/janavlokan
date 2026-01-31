FROM node:20-alpine

# Step 2: Set working directory
WORKDIR /app

# Step 3: Install dependencies
COPY package*.json ./
RUN npm install

# Step 4: Copy project files
COPY . .

# Step 5: Build (For Next.js/React)
RUN npm run build

# Step 6: Expose Port 8080 (GCP's favorite)
EXPOSE 8080

# Step 7: Start the app
CMD ["npm", "start"]
