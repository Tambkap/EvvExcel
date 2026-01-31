# -------- Build stage --------
FROM node:18-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build   # => tạo thư mục dist/

# -------- Nginx stage --------
FROM nginx:alpine

# XÓA config mặc định
RUN rm /etc/nginx/conf.d/default.conf

# Copy React build (Vite = dist)
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config cho SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
