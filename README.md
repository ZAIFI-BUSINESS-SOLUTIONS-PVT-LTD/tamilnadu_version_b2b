# 🧠 Inzighted - AI-Powered Deep Insights for Education

## 🚀 Project Overview
**Inzighted** is an AI-driven **Hierarchical Retrieval-Augmented Generation (HRAG)** system that provides **deep insights into student learning**. It leverages **Neo4j graph databases** and **Gemini LLM** to analyze test data, uncover learning gaps, and enhance personalized education.

## 🎯 Project Mission
> "Empowering educators with deep, AI-driven insights to optimize student learning and assessment."

## 🏰 Tech Stack
| Component      | Technology Used |
|---------------|----------------|
| Backend       | Django, Django REST Framework (DRF) |
| Frontend      | React.js, Tailwind CSS |
| Database      | PostgreSQL, Neo4j (Graph DB) |
| AI Model      | Google Gemini LLM |
| Graph Engine  | Neo4j|
| Authentication | JWT Authentication |

---

## 👅 Installation Guide

### **🔹 1. Prerequisites**
Ensure you have the following installed:
- **Python 3.11+**
- **PostgreSQL**
- **Neo4j (for Graph Database)**
- **npm** (for frontend)
- **Git**

### **🔹 2. Clone the Repository**
```bash
git clone https://github.com/techy-zai-fi/Inzighted_V1.git
cd Inzighted_V1
```

### **🔹 3. Backend Setup**
#### **📌 Step 1: Run the Installation Script**
```bash
cd backend
python install.py
```
🔹 This script will:
- Check if Python 3.11 is installed.
- Install PostgreSQL and system dependencies.
- Create and activate a **virtual environment** (`venv`).
- Install all required Python packages (`requirements.txt`).

#### **📌 Step 2: Set Up Database**
```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```
🔹 This creates all required tables in PostgreSQL.

#### **📌 Step 3: Create a Superuser**
```bash
python manage.py createsuperuser
```
🔹 Follow the prompts to set up an **admin user**.

#### **📌 Step 4: Run the Backend Server**
```bash
python manage.py runserver
```
🔹 The API will be available at: `http://127.0.0.1:8000/`

---

### **🔹 4. Frontend Setup**
```bash
cd frontend
npm install
npm run dev
```
🔹 The frontend will be available at: `http://localhost:5173/`

---

## 📂 API Endpoints (Backend)
| Endpoint                     | Method | Description |
|------------------------------|--------|-------------|
| `/api/auth/login`            | POST   | Authenticate a user (admin, educator, student) |
| `/api/auth/signup`           | POST   | First-time educator signup |
| `/api/upload_students`       | POST   | Upload student details via CSV |
| `/api/upload_test`           | POST   | Upload test papers, responses, and answer keys |
| `/api/get_student_insights`  | GET    | Retrieve AI-powered insights for a student |

> **📌 Detailed API documentation is available in the `docs/` folder.**

---

## 🔐 Authentication Flow
1. **Educators & Students login using email & password.**
2. **First-time login educators are redirected to the signup page.**
3. **Authenticated users receive a JWT token.**
4. **Admins can create teachers via the dashboard.**
5. **Educators upload test papers, answer keys, and responses.**
6. **Neo4j + Gemini LLM generates deep learning insights.**

---

## 🌀 Folder Structure
```
I📁 Inzighted_V1/  # Root folder for the entire project
│
├── 📄 .env  # Environment variables (DO NOT COMMIT TO GIT)
├── 📄 .gitignore  # Ignore unnecessary files (node_modules, __pycache__, .env, etc.)
│
├── 📁 backend/  # Django Backend (Server-side)
│   ├── 📁 exam/  # Core application for exams and results
│   │   ├── 📄 admin.py  # Django admin configurations
│   │   ├── 📄 forms.py  # Django forms (if applicable)
│   │   ├── 📁 models/  # Database models
│   │   │   ├── 📄 analysis.py
│   │   │   ├── 📄 question_paper.py
│   │   │   ├── 📄 results.py
│   │   │   ├── 📄 student.py
│   │   │   ├── 📄 teacher.py
│   │   │   ├── 📄 test.py
│   │   ├── 📁 tasks/  # Celery or background tasks (if applicable)
│   │   ├── 📁 tests/  # Unit tests for the backend
│   │   │   ├── 📄 test_models.py
│   │   ├── 📁 utils/  # Helper functions
│   │   │   ├── 📄 analysis_generator.py
│   │   │   ├── 📄 csv_processing.py
│   │   │   ├── 📄 pdf_processing.py
│   │   ├── 📁 views/  # Views for API endpoints
│   │   │   ├── 📄 admin_views.py  # Admin-specific views
│   │   │   ├── 📄 auth_views.py  # Authentication (Login, Signup, JWT, etc.)
│   │   │   ├── 📄 results_views.py  # Results management
│   │   │   ├── 📄 student_views.py  # Student-specific views
│   │   │   ├── 📄 teacher_views.py  # Teacher-specific views
│   │   │   ├── 📄 test_views.py  # Test-related views
│   │   │   ├── 📄 upload_views.py  # Upload-related views (CSV, PDF, etc.)
│   │
│   ├── 📄 generate_requirements.py  # Script to auto-generate requirements.txt
│   ├── 📄 install.py  # Setup script to install dependencies & PostgreSQL
│   ├── 📁 inzighted/  # Django project settings
│   │   ├── 📄 asgi.py  # ASGI entry point for async support
│   │   ├── 📄 settings.py  # Django settings (configure database, middleware, etc.)
│   │   ├── 📄 urls.py  # Root URL routes
│   │   ├── 📄 wsgi.py  # WSGI entry point for production deployment
│   │
│   ├── 📄 manage.py  # Django's CLI manager
│   ├── 📁 pdf_images/  # Stores extracted images from PDFs (if applicable)
│   ├── 📄 requirements.txt  # Python dependencies
│   ├── 📁 uploads/  # Stores uploaded files (CSV, PDF, etc.)
│   ├── 📄 file_struct.py  # Script to generate the file structure
│
├── 📁 frontend/  # React Frontend (Client-side)
│   ├── 📄 Model_001.jsx  # 3D model rendering (if applicable)
│   ├── 📄 README.md  # Documentation file
│   ├── 📄 eslint.config.js  # ESLint configuration for code quality
│   ├── 📄 index.html  # Main HTML file for React app
│   ├── 📄 package-lock.json  # Lock file for npm dependencies
│   ├── 📄 package.json  # Frontend package dependencies
│   ├── 📄 postcss.config.js  # PostCSS configuration (Tailwind support)
│   │
│   ├── 📁 public/  # Static assets (accessible without authentication)
│   │   ├── 📄 model_001.glb  # 3D Model file (if applicable)
│   │
│   ├── 📁 src/  # Source code
│   │   ├── 📄 App.css  # Global styles
│   │   ├── 📄 App.jsx  # Main React component
│   │   ├── 📁 assets/  # Images & static files
│   │   │   ├── 📁 images/  # Image assets
│   │   │   │   ├── 📄 bg_001.png
│   │   │   │   ├── 📄 bg_002.png
│   │   │   │   ├── 📄 bg_003.svg
│   │   │   │   ├── 📄 educatorlogin.svg
│   │   │   │   ├── 📄 leftimage.jpg
│   │   │   │   ├── 📄 loginoptions.svg
│   │   │   │   ├── 📄 logo.svg
│   │   │   │   ├── 📄 mainimage.jpg
│   │   │   │   ├── 📄 rightimage.jpg
│   │   │   │   ├── 📄 studentlogin.svg
│   │   │
│   │   ├── 📄 index.css  # Main CSS file
│   │   ├── 📄 main.jsx  # React entry file
│   │   ├── 📁 pages/  # React pages
│   │   │   ├── 📁 auth/  # Authentication pages
│   │   │   │   ├── 📄 Unauthorized.jsx  # Unauthorized access page
│   │   │   │   ├── 📁 admin/
│   │   │   │   │   ├── 📄 adminlogin.jsx  # Admin login page
│   │   │   │   ├── 📁 educator/
│   │   │   │   │   ├── 📄 educatorlogin.jsx  # Educator login page
│   │   │   │   │   ├── 📄 educatorregister.jsx  # Educator signup (only for first-time login)
│   │   │   │   ├── 📄 loginoptions.jsx  # Auth selection (student, teacher, admin)
│   │   │   │   ├── 📁 student/
│   │   │   │   │   ├── 📄 studentlogin.jsx  # Student login page
│   │   │
│   │   │   ├── 📁 dashboard/  # User Dashboards
│   │   │   │   ├── 📁 educatordashboard/
│   │   │   │   │   ├── 📄 e_dashboard.jsx  # Educator dashboard
│   │   │   │   │   ├── 📄 e_header.jsx  # Header component
│   │   │   │   │   ├── 📄 e_layout.jsx  # Layout for educator pages
│   │   │   │   │   ├── 📄 e_upload.jsx  # Upload content page
│   │   │
│   │   │   ├── 📁 landingpage/  # Landing Page Components
│   │   │   │   ├── 📄 GradientOverlay.jsx
│   │   │   │   ├── 📄 features.jsx
│   │   │   │   ├── 📄 footer.jsx
│   │   │   │   ├── 📄 header.jsx
│   │   │   │   ├── 📄 hero.jsx
│   │   │   │   ├── 📄 landingpage.jsx
│   │   │   │   ├── 📄 layout.jsx
│   │   │
│   │   ├── 📁 utils/
│   │   │   ├── 📄 api.js  # API integration for frontend
│   │
│   ├── 📄 tailwind.config.js  # Tailwind CSS configuration
│   ├── 📄 vite.config.js  # Vite (build tool) configuration
│
└── 📄 README.md  # Project documentation

```

---

## 🔥 Key Features
✅ **Graph-Based Knowledge Representation:**  
- Uses **Neo4j** to model student performance & test questions.

✅ **AI-Powered Insights:**  
- **Gemini LLM** analyzes responses & recommends improvement strategies.

✅ **HRAG (Hierarchical Retrieval-Augmented Generation):**  
- Creates a hierarchy-based graph on student data to provide **personalized, granular and longitudinal insights**.

✅ **Secure Multi-Role Authentication:**  
- Supports **Admins, Educators, and Students** with role-based access.

✅ **CSV-Based Bulk Student Upload:**  
- Allows **educators to upload entire class rosters.**

✅ **Automated Test Upload & Processing:**  
- Extracts questions from PDFs and **matches answers** from answer keys.

✅ **Frontend-Backend Integration:**  
- **React UI seamlessly interacts with Django APIs.**

---

## 🏆 Contribution Guide
We welcome contributions to improve **Inzighted**! To contribute:
1. **Fork** the repo and create a new branch.
2. Make your changes and **commit** them.
3. Submit a **pull request** with a detailed description.

---

## 🌟 Credits & Acknowledgments
- Developed by **ZAI-FI**
- Powered by **Neo4j, Django, React, and Google Gemini LLM**
- let's have fun coding! 🚀

---

## 📩 Support & Contact
If you need help:
- **Issues?** Open a GitHub issue.
- **Email:** techsupport@zai-fi.com
- **Website:** www.zai-fi.com

🚀 **Inzighted - Unlocking Deep Educational Insights!** 🚀

