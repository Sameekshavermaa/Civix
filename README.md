# Civix – AI-Powered Residential Society Management System

> A full-stack, production-ready web application for apartment complexes, gated communities, and residential societies. Civix centralises complaint management, notices, maintenance tracking, and resident engagement with an AI-powered complaint analysis service.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Architecture Overview](#architecture-overview)
3. [Project Structure](#project-structure)
4. [Getting Started](#getting-started)
5. [Default Credentials](#default-credentials)
6. [API Overview](#api-overview)
7. [AI Service](#ai-service)
8. [Security](#security)
9. [Features by Role](#features-by-role)

---

## Tech Stack

| Layer     | Technology                         |
|-----------|------------------------------------|
| Frontend  | HTML5, CSS3, Vanilla JavaScript    |
| Backend   | Java 17, Spring Boot 3.2           |
| Database  | MySQL 8.x                          |
| AI        | Python 3.10+, Flask                |
| Auth      | JWT (jjwt 0.11.5), BCrypt          |

---

## Architecture Overview

```
civix-frontend/        ← Vanilla HTML/CSS/JS SPA
civix-backend/         ← Spring Boot REST API (port 8080)
civix-ai/              ← Python Flask AI microservice (port 5000)
database/              ← MySQL schema + seed SQL scripts
```

**Request flow:**
```
Browser → Spring Boot API (JWT-secured) → MySQL
                     ↓ (async)
              Python AI Service → Complaint analysis result
```

---

## Project Structure

```
windsurf-project/
├── civix-backend/
│   ├── pom.xml
│   └── src/main/java/com/civix/
│       ├── CivixApplication.java
│       ├── config/           AppConfig.java
│       ├── controller/       Auth, Complaint, Notice, Maintenance, Resident, Dashboard
│       ├── dto/
│       │   ├── request/      LoginRequest, RegisterRequest, ComplaintRequest, …
│       │   └── response/     ApiResponse, AuthResponse, ComplaintResponse, …
│       ├── entity/           User, Role, Resident, Complaint, Notice, …
│       ├── exception/        GlobalExceptionHandler, custom exceptions
│       ├── repository/       JPA repositories
│       ├── security/         JwtUtils, JwtAuthFilter, SecurityConfig, …
│       └── service/          Auth, Complaint, Notice, Maintenance, Resident, Dashboard, AI, …
├── civix-frontend/
│   ├── index.html            Login / Register page
│   ├── dashboard.html        Main SPA (all pages via JS routing)
│   ├── css/
│   │   ├── main.css
│   │   └── auth.css
│   └── js/
│       ├── config.js         API base URL, storage keys
│       ├── api.js            Fetch wrapper + named API calls
│       ├── auth.js           Login / Register logic
│       ├── utils.js          Toast, Modal, formatters, utilities
│       ├── app.js            Main controller, dashboard, sidebar
│       ├── complaints.js     Complaint CRUD + filters
│       ├── notices.js        Notice CRUD + publish toggle
│       ├── maintenance.js    Dues, payments, monthly charges
│       └── residents.js      Resident CRUD + profile
├── civix-ai/
│   ├── app.py                Flask AI service
│   └── requirements.txt
└── database/
    ├── civix_schema.sql      Full schema (DDL)
    └── civix_seed.sql        Demo data
```

---

## Getting Started

### Prerequisites

- Java 17+
- Maven 3.8+
- MySQL 8.x
- Python 3.10+
- A modern browser

---

### 1. Database Setup

```bash
mysql -u root -p < database/civix_schema.sql
mysql -u root -p < database/civix_seed.sql
```

Update credentials in `civix-backend/src/main/resources/application.properties`:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/civix_db?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
spring.datasource.username=root
spring.datasource.password=your_password
```

---

### 2. Backend (Spring Boot)

```bash
cd civix-backend
mvn clean install -DskipTests
mvn spring-boot:run
```

API will be available at: `http://localhost:8080/api`

---

### 3. AI Service (Python Flask)

```bash
cd civix-ai
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

AI service will be available at: `http://localhost:5000`

---

### 4. Frontend

Open directly in a browser or serve with any static file server:

```bash
# Option 1: Python simple server
cd civix-frontend
python -m http.server 8081

# Option 2: VS Code Live Server (recommended)
# Right-click index.html → Open with Live Server
```

Then navigate to: `http://localhost:8081`

---

## Default Credentials

| Role    | Username       | Password     |
|---------|----------------|--------------|
| Admin   | `admin`        | `Admin@123`  |
| Resident| `rahul.sharma` | `Admin@123`  |
| Resident| `priya.patel`  | `Admin@123`  |
| Resident| `amit.kumar`   | `Admin@123`  |

> **Note:** The seed data uses a placeholder BCrypt hash. Run the backend's password encoder once, or use the register endpoint to create real users.

---

## API Overview

Base URL: `http://localhost:8080/api`

| Method | Endpoint                              | Auth     | Description                      |
|--------|---------------------------------------|----------|----------------------------------|
| POST   | `/auth/login`                         | Public   | Login, returns JWT               |
| POST   | `/auth/register`                      | Public   | Register new resident            |
| POST   | `/auth/refresh`                       | Public   | Refresh access token             |
| POST   | `/auth/logout`                        | JWT      | Logout                           |
| GET    | `/dashboard/admin/{societyId}`        | ADMIN    | Admin dashboard stats            |
| GET    | `/dashboard/resident`                 | RESIDENT | Resident dashboard stats         |
| GET    | `/complaints/categories`             | Public   | List complaint categories        |
| POST   | `/complaints`                         | RESIDENT | Submit new complaint             |
| GET    | `/complaints/my`                      | RESIDENT | Get my complaints                |
| GET    | `/complaints/society/{id}`            | ADMIN    | Get all society complaints       |
| PUT    | `/complaints/{id}/status`             | ADMIN    | Update complaint status          |
| GET    | `/notices/society/{id}`               | JWT      | Get active notices               |
| GET    | `/notices/society/{id}/all`           | ADMIN    | Get all notices (incl. drafts)   |
| POST   | `/notices/society/{id}`               | ADMIN    | Create notice                    |
| PUT    | `/notices/{id}`                       | ADMIN    | Update notice                    |
| DELETE | `/notices/{id}`                       | ADMIN    | Delete notice                    |
| PATCH  | `/notices/{id}/publish`               | ADMIN    | Toggle publish status            |
| GET    | `/maintenance/my`                     | RESIDENT | My maintenance dues              |
| GET    | `/maintenance/society/{id}`           | ADMIN    | All maintenance records          |
| POST   | `/maintenance/society/{id}/charges`   | ADMIN    | Create monthly charges           |
| POST   | `/maintenance/payments`               | ADMIN    | Record a payment                 |
| GET    | `/residents/profile`                  | RESIDENT | My profile                       |
| PUT    | `/residents/profile`                  | RESIDENT | Update my profile                |
| GET    | `/residents/society/{id}`             | ADMIN    | List all residents               |
| POST   | `/residents/society/{id}`             | ADMIN    | Add resident                     |
| PUT    | `/residents/{id}`                     | ADMIN    | Update resident                  |
| DELETE | `/residents/{id}`                     | ADMIN    | Deactivate resident              |

---

## AI Service

The Python Flask microservice at port 5000 provides:

| Endpoint          | Method | Description                                       |
|-------------------|--------|---------------------------------------------------|
| `/health`         | GET    | Health check                                      |
| `/analyze`        | POST   | Analyze complaint: category, priority, duplicate  |
| `/batch-analyze`  | POST   | Analyze multiple complaints                       |
| `/categories`     | GET    | List known complaint categories                   |

**Sample request:**
```json
POST /analyze
{
  "complaint_id": 42,
  "title": "Water leaking from ceiling",
  "description": "There is a continuous drip from the bathroom ceiling slab."
}
```

**Sample response:**
```json
{
  "complaint_id": 42,
  "category": "Plumbing",
  "priority": "HIGH",
  "confidence": 0.94,
  "duplicate": null
}
```

The AI uses **keyword-based TF-IDF similarity** and rule-based classification — no external ML dependencies required.

---

## Security

- **JWT Authentication** — All protected endpoints require `Authorization: Bearer <token>`
- **Role-Based Access Control** — `ROLE_ADMIN` and `ROLE_RESIDENT` enforced via `@PreAuthorize`
- **BCrypt Password Hashing** — Strength factor 10
- **Refresh Tokens** — Stored in DB, single-use rotation
- **CORS** — Configurable via `civix.cors.allowed-origins`
- **Global Exception Handler** — Consistent error response format
- **Audit Logging** — All key actions logged asynchronously

---

## Features by Role

### Resident
- Role-based dashboard with society stats
- Submit complaints with AI auto-categorization and priority suggestion
- Track complaint status with full history timeline
- View active and pinned society notices
- View personal maintenance dues and payment history
- Update profile and emergency contact info

### Society Admin
- Full dashboard with financial and operational KPIs
- Manage all residents (add, update, deactivate)
- Manage and update all complaints (assign, resolve, close)
- Create, publish, pin and delete notices
- Create monthly maintenance charges for all residents
- Record payments and track dues
- View reports and analytics summary
