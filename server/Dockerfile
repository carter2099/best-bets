FROM node:22-alpine

WORKDIR /app

# Add build dependencies
RUN apk add --no-cache python3 make gcc

COPY package*.json ./
RUN npm install
RUN npm rebuild

COPY . .

EXPOSE 3001

# Use nodemon in development
CMD ["npm", "run", "dev"] 