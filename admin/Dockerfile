# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG VITE_AUTH_SERVICE_URL=http://smart-healthcare.local
ARG VITE_TELEMEDICINE_SERVICE_URL=http://smart-healthcare.local
ARG VITE_APPOINTMENT_SERVICE_URL=http://smart-healthcare.local
ARG VITE_DOCTOR_SERVICE_URL=http://smart-healthcare.local
ARG VITE_PAYMENT_SERVICE_URL=http://smart-healthcare.local

ENV VITE_AUTH_SERVICE_URL=$VITE_AUTH_SERVICE_URL
ENV VITE_TELEMEDICINE_SERVICE_URL=$VITE_TELEMEDICINE_SERVICE_URL
ENV VITE_APPOINTMENT_SERVICE_URL=$VITE_APPOINTMENT_SERVICE_URL
ENV VITE_DOCTOR_SERVICE_URL=$VITE_DOCTOR_SERVICE_URL
ENV VITE_PAYMENT_SERVICE_URL=$VITE_PAYMENT_SERVICE_URL

RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80


CMD ["nginx", "-g", "daemon off;"]