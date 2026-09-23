FROM node:22-alpine
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
COPY backend/types /app/backend/types
ARG BACKEND_URL=http://backend:3000
ENV BACKEND_URL=${BACKEND_URL}
RUN npm run build
EXPOSE 3001
CMD ["npm", "run", "start"]
