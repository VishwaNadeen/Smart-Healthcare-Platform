# Smart Healthcare Platform

Smart Healthcare Platform is a full-stack healthcare system built with a microservice architecture. It includes a patient-facing web application, an admin dashboard, and separate backend services for authentication, doctor management, patient management, appointments, telemedicine, payments, notifications, and AI-assisted symptom checking.

## Overview

This platform is designed to support the main workflows of a digital healthcare product:

- patient registration and profile management
- doctor onboarding and verification
- doctor specialty and availability management
- appointment booking and tracking
- online consultation and telemedicine sessions
- prescription and consultation note management
- online payment processing and refund handling
- notification history and outbound alerts
- AI symptom checking and follow-up chat
- admin-level monitoring and operational control

## Main Applications

### Patient / Doctor Frontend

Location: `frontend/web-client`

The main frontend is a React + TypeScript + Vite application used by patients and doctors.

Key functions:

- public pages such as home, about, and contact
- login, email verification, OTP login, and password reset
- patient registration and patient profile management
- doctor registration and doctor profile management
- medical history and report upload management
- appointment booking for patients
- appointment management for doctors
- telemedicine waiting room, consultation room, chat, and session summaries
- payment checkout, success/cancel pages, payment history, and doctor earnings
- notification history view
- AI symptom checker, history, and symptom check details

Main route areas:

- `/` home page
- `/login`, `/verify-email`, `/forgot-password`
- `/register`, `/signup`, `/patient/profile`, `/medical-history`
- `/doctor/register`, `/doctor/profile`, `/availability`
- `/appointments/*`
- `/consultation/*`, `/doctor-sessions`, `/patient-sessions`
- `/payment/*`, `/notifications`, `/earnings`
- `/ai`, `/ai/history`, `/ai/check/:id`

### Admin Dashboard

Location: `admin`

The admin dashboard is a separate React + TypeScript + Vite application for platform operators and administrators.

Key functions:

- admin authentication
- dashboard access for platform oversight
- user management
- doctor review and verification support
- appointment monitoring
- payment monitoring
- operational/admin workflows

Main route areas:

- `/login`
- `/` dashboard
- `/users`
- `/doctors`
- `/appointments`
- `/payments`
- `/operations`

## Backend Microservices

All backend services are in the `services/` directory.

### 1. Auth Service

Location: `services/auth-service`

Base route: `/api/auth`

Purpose:

- central authentication and identity management
- JWT-based user authentication
- role-aware access for patient, doctor, and admin users
- email verification and login OTP flow
- password reset and password verification
- user self-service account access
- internal identity lookup/update for other services

Important functions:

- register users
- login and logout
- request and confirm email verification
- request and verify login OTP
- forgot password and reset password
- get current authenticated user with `/me`
- role-based dashboard checks for patient, doctor, and admin
- internal cross-service user cleanup and identity updates

### 2. Doctor Service

Location: `services/doctor-service`

Base routes:

- `/api/doctors`
- `/api/specialties`

Purpose:

- doctor onboarding and doctor profile management
- doctor specialty management
- doctor verification handling
- doctor profile image upload
- doctor availability management

Important functions:

- public doctor registration
- list all doctors and get doctor details
- get and update current doctor profile
- upload and remove doctor profile image
- get and update doctor availability
- admin review of doctor verifications
- admin update/delete doctor records
- specialty create/read/update/delete

### 3. Patient Service

Location: `services/patient-service`

Base routes:

- `/api/patients`
- `/api/patients/:id/reports` via `/api`

Purpose:

- patient onboarding and profile management
- patient medical history handling
- patient report upload and file management
- admin-side patient management
- cross-service patient lookup for notifications and internal workflows

Important functions:

- create patient profile
- get all patients and admin patient lists
- get and update current patient profile
- upload and remove patient profile image
- update patient status from admin side
- delete current patient or delete patient by admin
- upload, edit, list, and delete medical reports
- internal lookup by auth user ID

### 4. Appointment Service

Location: `services/appointment-service`

Base route: `/api/appointments`

Purpose:

- appointment booking lifecycle
- specialty-based doctor discovery
- patient appointment management
- doctor appointment status updates
- appointment rescheduling
- admin visibility into appointment operations
- internal appointment data access for payment and telemedicine services

Important functions:

- list specialties for appointment booking
- search doctors by specialty
- create appointment
- get patient appointments
- get doctor appointments
- update or cancel appointment
- doctor-side status updates
- reschedule appointments and respond to reschedule requests
- appointment tracking
- admin appointment list
- admin patient appointment stats
- admin refund queue view
- internal status and payment-status updates

### 5. Telemedicine Service

Location: `services/telemedicine-service`

Base routes:

- `/api/telemedicine`
- `/api/telemedicine/chat`
- `/api/telemedicine/prescriptions`

Purpose:

- telemedicine session lifecycle
- session access control
- consultation chat
- participant presence tracking
- consultation notes
- prescription creation and update
- session data lookup by appointment, doctor, or patient

Important functions:

- create session
- create internal session from other services
- get all sessions and session statistics
- get session by appointment, doctor, patient, or session ID
- update session status
- load consultation messages
- send consultation chat messages
- heartbeat/disconnect presence tracking
- create and update prescriptions
- update consultation notes

### 6. Payment Service

Location: `services/payment-service`

Base route: `/api/payments`

Purpose:

- payment initiation and payment status tracking
- PayHere payment gateway integration
- appointment payment state updates
- patient and doctor payment history
- receipt downloads
- refund handling

Important functions:

- initiate payment
- handle payment gateway notifications
- get payment by order ID
- get payment by appointment ID
- get all payments
- get patient payment history
- get doctor payment history
- refund payment
- download payment receipt

### 7. Notification Service

Location: `services/notification-service`

Base route: `/api/notifications`

Purpose:

- centralized notification sending
- notification history storage
- email delivery
- SMS / WhatsApp delivery support

Important functions:

- send notification
- get all notifications
- get notification history by recipient

### 8. AI Symptom Service

Location: `services/ai-symptom-service`

Base route: `/api/symptoms`

Purpose:

- AI-assisted symptom conversation flow
- guided symptom question flow
- symptom analysis and recommendation support
- patient symptom history
- reopen/close symptom checks

Important functions:

- get symptom questions
- start symptom conversation
- analyze symptoms
- chat about an existing symptom check
- get latest symptom check for current patient
- get symptom history
- get symptom check by ID
- close or reopen symptom checks

## Service Communication

The platform is built as cooperating services rather than a single backend.

Examples of cross-service behavior:

- auth service provides identity and role data to other services
- appointment service works with doctor service and auth service
- appointment service can trigger telemedicine session creation
- payment service updates appointment payment status
- notification service is used for alerts and history
- patient and doctor services provide profile data for downstream features
- telemedicine service validates session access through appointment and auth-related data

Internal service routes are protected with a shared internal secret in several services.

## Technologies Used

### Frontend

- React
- TypeScript
- Vite
- React Router
- Tailwind CSS
- Framer Motion
- Axios
- Jitsi React SDK

### Backend

- Node.js
- Express
- MongoDB with Mongoose
- JWT authentication
- Multer for file upload handling
- Cloudinary for media storage

### Integrations

- PayHere for payments
- SMTP email sending
- Twilio SMS / WhatsApp messaging
- Gemini API for symptom analysis support

### DevOps / Deployment

- Docker
- Docker Compose
- Kubernetes manifests in `kubernetes/`

## Project Structure

```text
Smart-Healthcare-Platform/
|-- admin/                        # Admin dashboard
|-- frontend/
|   |-- web-client/              # Patient and doctor web app
|-- services/
|   |-- ai-symptom-service/
|   |-- appointment-service/
|   |-- auth-service/
|   |-- doctor-service/
|   |-- notification-service/
|   |-- patient-service/
|   |-- payment-service/
|   `-- telemedicine-service/
|-- kubernetes/                  # K8s manifests
|-- docker-compose.yml
`-- package.json
```

## Default Local Ports

From the current project setup:

- `5001` appointment service
- `5002` auth service
- `5003` doctor service
- `5004` notification service
- `5005` patient service
- `5006` payment service
- `5007` telemedicine service
- `5010` AI symptom service
- `5173` frontend web client in Docker
- `5174` admin dashboard in Docker

## Environment and Configuration

The project uses environment variables across services and frontend apps.

Common backend configuration:

- `PORT`
- `MONGO_URI`
- `JWT_SECRET`
- `INTERNAL_SERVICE_SECRET`

Common service URL configuration:

- `AUTH_SERVICE_URL`
- `DOCTOR_SERVICE_URL`
- `PATIENT_SERVICE_URL`
- `APPOINTMENT_SERVICE_URL`
- `TELEMEDICINE_SERVICE_URL`
- `NOTIFICATION_SERVICE_URL`

Frontend Vite variables:

- `VITE_AUTH_SERVICE_URL`
- `VITE_DOCTOR_SERVICE_URL`
- `VITE_PATIENT_SERVICE_URL`
- `VITE_APPOINTMENT_SERVICE_URL`
- `VITE_TELEMEDICINE_SERVICE_URL`
- `VITE_PAYMENT_SERVICE_URL`
- `VITE_NOTIFICATION_SERVICE_URL`
- `VITE_AI_SYMPTOM_API_URL`

Additional integration variables used by the platform:

- SMTP settings for auth email flow
- Cloudinary credentials for image/file handling
- Twilio credentials for SMS / WhatsApp notifications
- PayHere merchant credentials and callback URLs
- Gemini API key and model settings

## Running the Project

### Option 1: Run Everything in Development

From the project root:

```bash
npm install
npm run dev
```

This starts:

- all backend microservices
- the main web frontend
- the admin dashboard

### Option 2: Run Individual Apps or Services

Examples:

```bash
npm run web-client
npm run admin
npm run auth
npm run doctor
npm run patient
npm run appointment
npm run telemedicine
npm run payment
npm run notification
npm run ai-symptom
```

### Option 3: Run with Docker Compose

```bash
docker compose up --build
```

The Docker setup includes:

- backend services
- frontend app
- admin app

## Deployment Notes

The repository also contains Kubernetes manifests for several services inside `kubernetes/`, including:

- appointment service
- doctor service
- patient service
- payment service
- notification service

This makes the project suitable for containerized deployment workflows beyond local development.

## Functional Summary

### Patient Side

- register and manage patient profile
- manage medical history
- upload and maintain reports
- book appointments
- pay for consultations
- join telemedicine sessions
- view prescriptions and notifications
- use AI symptom checking

### Doctor Side

- register as a doctor
- maintain doctor profile
- manage availability
- review appointments
- run telemedicine consultations
- create prescriptions and consultation notes
- track earnings and payment history

### Admin Side

- access admin dashboard
- manage users
- review doctor records and verification workflow
- inspect appointments
- inspect payments
- support operations monitoring

## Notes

- This repository already uses a microservice-oriented design, so each service should be configured with its own `.env` file.
- Some services expose internal routes for secure service-to-service communication.
- The frontend and admin apps are separate deployments and should be configured with the correct backend service URLs.

## Future README Improvements

If needed, this README can be extended further with:

- API endpoint documentation table
- setup instructions for every `.env` file
- screenshots for frontend and admin dashboards
- architecture diagram
- contribution guide
- test and CI instructions
