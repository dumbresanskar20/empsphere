# 🌌 EmpSphere — Enterprise Employee Management System

[![Node.js Version](https://img.shields.io/badge/Node.js-v14%2B-green.svg?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![Express.js Framework](https://img.shields.io/badge/Express-v4.22-lightgrey.svg?style=for-the-badge&logo=express)](https://expressjs.com)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas-green.svg?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/atlas)
[![Python Automation](https://img.shields.io/badge/Python-Reports-blue.svg?style=for-the-badge&logo=python)](https://www.python.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**EmpSphere** is a premium, full-stack, enterprise-grade **Employee Management System** designed to digitize, streamline, and automate human resource operations. It features a highly responsive and vibrant administrative dashboard powered by **Chart.js**, a comprehensive employee self-service portal, secure JWT role-based authentication, and Python-powered document and report automation.

---

## 🗺️ System Architecture

EmpSphere is built on a **3-tier Client-Server Architecture** designed for high throughput, seamless scaling, and maximum modularity:

```mermaid
graph TD
    subgraph Client Layer (Presentation)
        A[HTML5 / CSS3 Layouts] --> B[Vanilla ES6 Javascript]
        B --> C[Chart.js Analytics Engine]
    end

    subgraph Server Layer (Application Logic)
        D[Node.js / Express Server]
        E[JWT Auth & Middleware]
        F[Multer File Uploader]
        G[Node-Cron Automation]
        
        B -- "Asynchronous REST APIs (Fetch)" --> D
        D --> E
        D --> F
        D --> G
    end

    subgraph Database Layer (Data Persistence)
        H[MongoDB Atlas Cloud]
        I[Mongoose ODM Models]
        
        D --> I
        I --> H
    end

    subgraph Automation & Reporting
        J[Python 3 Engine]
        K[python-docx Library]
        
        J --> K
        K --> L[Word Reports & Docs]
    end
```

---

## ✨ Core Features

### 📊 Admin Control Center & Dashboard
- **Real-Time Analytics**: Visual breakdown of employee distributions, leave requests, and department metrics utilizing **Chart.js**.
- **Approval Workflow**: A streamlined panel for approving/rejecting employee sign-ups, leave applications, and resignation submissions.
- **Salary Administration**: Generate monthly salary slips, calculate bonuses, track deductions, and view transaction history.
- **Department Management**: Dynamically categorize staff into structural units and view live team stats.

### 👤 Employee Self-Service Portal
- **Interactive Leave Application**: Request leaves with intuitive type selectors (Sick, Casual, Annual, etc.) and real-time status tracking.
- **Secure Vault Uploads**: Upload onboarding verification documents (Aadhar, PAN, Passport) via high-performance multer storage.
- **Personal Analytics**: Direct overview of personal leave balances, past salary disbursements, and pending tasks.
- **Profile Customization**: Update vital details, contact info, and profile avatars in real time.

### 🛡️ Enterprise Security
- **Role-Based Access Control (RBAC)**: Distinct permissions for `admin` and `employee` roles enforced by Express middleware.
- **JWT Authentication**: High-security session tracking with JSON Web Tokens stored in headers.
- **Password Encryption**: Industry-standard secure password hashing using **bcryptjs** with 10 salt rounds.

---

## 🛠️ Technology Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | HTML5, CSS3, JavaScript (ES6+), Chart.js | Modern, responsive layouts styled without heavy dependencies for supercharged load speeds. |
| **Backend** | Node.js, Express.js | Robust RESTful API routing, file storage handling, and secure session management. |
| **Database** | MongoDB Atlas, Mongoose ODM | Flexible, schema-driven NoSQL document storage with structured query indexes. |
| **Automation** | Python 3, `python-docx` | Generates fully styled Word documents and project summaries automatically. |
| **Libraries** | Multer, node-cron, bcryptjs, JWT | File uploads, scheduled background tasks, password hashing, and secure APIs. |

---

## 🚀 Setup & Installation Guide

Follow these step-by-step instructions to set up the EmpSphere development environment on your local system.

### Prerequisites
Before starting, ensure you have the following installed on your machine:
*   [Node.js](https://nodejs.org) (v14.x or higher recommended)
*   [Python 3.x](https://www.python.org/downloads/) (for document automation scripts)
*   [Git](https://git-scm.com/)

---

### Step 1: Clone the Repository
Open your terminal or command prompt, navigate to your projects folder, and run:
```bash
git clone <repository_url> "Employee Mgmt"
cd "Employee Mgmt"
```

---

### Step 2: Configure the Backend Environment
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install all required Node.js dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root of the `backend/` directory and configure it as shown below:
   ```env
   # Database Configuration
   MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/employeeDB?retryWrites=true&w=majority
   
   # JWT & Authentication Setup
   JWT_SECRET=emp_mgmt_super_secret_jwt_key_2024_antigravity
   JWT_EXPIRE=7d
   
   # Server Environment
   PORT=5000
   NODE_ENV=development
   CLIENT_URL=http://localhost:3000
   
   # Pre-configured Admin Credentials
   ADMIN_EMAIL=Admin@gmail.com
   ADMIN_PASSWORD=AdminPassword123
   ```

---

### Step 3: Run the Application Server
EmpSphere serves the responsive frontend static files **directly from the backend server**. This means you only need to run a single server!

Choose one of the following commands depending on your environment:

*   **Development Mode** (with automatic hot-reload via Nodemon):
    ```bash
    npm run dev
    ```
*   **Standard Production Mode**:
    ```bash
    npm start
    ```
*   **Reset & Clear Database Mode** (removes and recreates standard collections):
    ```bash
    npm run clean-dev
    ```

Once the terminal prints `✅ MongoDB Connected` and `🚀 Server running on http://localhost:5000`, your setup is complete!

---

### Step 4: Access the Dashboards
Open your browser and navigate to the following addresses:
*   👉 **Main Portal / Welcome Page**: [http://localhost:5000](http://localhost:5000)
*   👉 **Admin Dashboard**: [http://localhost:5000/admin.html](http://localhost:5000/admin.html)
*   👉 **Employee Portal**: [http://localhost:5000/employee.html](http://localhost:5000/employee.html)

---

## 🔑 Login Credentials & Workflow

### 👑 Pre-Configured Administrator Account
*   **Email**: `Admin@gmail.com`
*   **Password**: `AdminPassword123`

### 👤 New Employee Onboarding Workflow
1. Navigate to the main home page and click **Sign Up**.
2. Fill in your personal details, select a username, and upload at least one verification document (e.g., Aadhar Card/PAN).
3. Click **Submit**. Your account is created with a `Pending` status.
4. Log into the **Admin Dashboard** (`Admin@gmail.com`).
5. In the **Employee Approvals** section, click **Approve** on the new employee.
6. The account status shifts to `Approved`—the employee can now log in securely using their credentials!

---

## 📊 Database Schemas & Normalization

Although the application runs on **MongoDB (NoSQL)**, it is designed with highly consistent collections mapped using **Mongoose ODM**. Below are the schema mappings for both NoSQL and relational equivalent SQL tables:

### 🧩 NoSQL Collection Mappings & Indexes
We leverage database-level indexing for high performance:
- **`users` Collection**: Stores user profile details, roles, password hashes, and an embedded array of verification documents. Unique index set on `email` and `employeeId`.
- **`leaves` Collection**: Houses leave history. Indexed on `userId` to speed up employee retrieval queries.
- **`salaries` Collection**: Tracks salary slips. Indexed on `userId` for quick historic lookups.
- **`departments` Collection**: Contains company structural categories and aggregated headcounts.

### 📐 SQL Relational Equivalence & Normalization
If you wish to deploy or analyze this project within a SQL database (MySQL / PostgreSQL / SQL Server), the exact DDL schema can be found in `database_schema.sql`.

#### Normalization Alignment
1. **First Normal Form (1NF)**: Every field contains atomic, scalar values. Complex structures (like document uploads) are isolated into their own tables (`user_documents`) to prevent multi-value arrays in single records.
2. **Second Normal Form (2NF)**: All attributes are fully dependent on the primary key. Structural details like department descriptions and locations are separated into `departments` rather than being stored redundantly under each employee record.
3. **Third Normal Form (3NF)**: Eliminates transitive dependencies. Employee designations and designation-based salary grids are stored in dedicated collections, and computed fields (e.g., `netSalary = basic + bonus - deductions`) are calculated dynamically or controlled tightly at the service layer.

---

## 📄 Automated Report & Document Generators

EmpSphere features built-in **Python scripts** designed to automatically generate professional Microsoft Word reports and documentation detailing the system parameters.

### Setup python-docx Dependencies
First, ensure you have Python 3 installed. Then, install the required Microsoft Word processing module:
```bash
pip install python-docx
```

### Running the Generators
From the root of the project workspace, execute the following scripts:

*   **Generate System Documentation**:
    Generates a beautifully structured 170+ line system documentation document (`Employee_Management_System_Documentation.docx`) detailing requirements, normalization tables, and system design:
    ```bash
    python generate_docx.py
    ```

*   **Generate Project Summary Report**:
    Generates a comprehensive summary report (`Employee_Management_System_Report.docx`) with introduction, problem statements, limitations, advantages, and testing schedules:
    ```bash
    python generate_report.py
    ```

---

## 🔌 RESTful API Reference

All requests and responses communicate via JSON. Authenticated requests require the JWT header token.

### 🔑 Authentication API (`/api/auth`)
| HTTP Method | Route | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | Registers a new employee; handles multi-part form document uploads. | None |
| `POST` | `/api/auth/login` | Validates credentials, issues JWT token on success. | None |
| `GET` | `/api/auth/me` | Returns logged-in user profile parameters. | JWT |

### 👑 Admin API (`/api/admin`)
| HTTP Method | Route | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/stats` | Fetches corporate wide count analytics & leave aggregations. | JWT + Admin |
| `GET` | `/api/admin/employees` | Retrieves list of all registered employees. | JWT + Admin |
| `GET` | `/api/admin/employees/:id`| Fetches full employee profile by ID. | JWT + Admin |
| `PUT` | `/api/admin/employees/:id/status`| Approves, rejects, or suspends employee account. | JWT + Admin |
| `DELETE`| `/api/admin/employees/:id`| Deletes employee account and cascading records. | JWT + Admin |

### 📅 Leaves API (`/api/leaves`)
| HTTP Method | Route | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/leaves` | Submits a new leave request (Employee). | JWT |
| `GET` | `/api/leaves` | Fetches leave history (filters dynamically by role). | JWT |
| `PUT` | `/api/leaves/:id` | Approves or rejects a pending leave application. | JWT + Admin |

### 💵 Salaries API (`/api/salaries`)
| HTTP Method | Route | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/salaries` | Creates a new salary slip for an employee. | JWT + Admin |
| `GET` | `/api/salaries/:userId` | Retrieves history of all salary slips for an employee. | JWT |

---

## 🛠️ Troubleshooting & Support

#### 🛑 Error: `MongooseServerSelectionError: connection timed out`
*   **Cause**: Your network is blocking MongoDB Atlas port `27017` or your current IP is not whitelisted.
*   **Solution**: Log into the MongoDB Atlas dashboard, navigate to **Network Access**, and click **Allow Access from Anywhere (0.0.0.0/0)** for local development.

#### 🛑 Error: `MulterError: Unexpected field`
*   **Cause**: The input field name of the uploaded file on the frontend does not match the file routing configurations (`documents`).
*   **Solution**: Ensure your HTML forms use `<input type="file" name="documents" ... />`.

#### 🛑 Error: `ModuleNotFoundError: No module named 'docx'`
*   **Cause**: The python module `python-docx` is not installed or pointing to the wrong Python runtime path.
*   **Solution**: Run `pip install python-docx` or specify `python3 -m pip install python-docx`.

---

## 🔮 Future Enhancements
*   **Biometric & Face Auth**: AI-powered biometric authentication using webcams.
*   **Tax Engine integration**: Automatically deduct regional taxes and generate legal payroll outputs.
*   **Push Notifications**: Secure WebPush notifications for immediate updates on leaves or announcements.
*   **Mobile App Development**: Dedicated React Native/Flutter cross-platform wrappers.

---
*Developed with dedication to streamline modern enterprise resource management.* 🚀
