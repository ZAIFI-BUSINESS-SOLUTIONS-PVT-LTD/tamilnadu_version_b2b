# ⚛️ Inzighted Frontend - React.js Application

# 📌 File Naming Convention Note:

Files prefixed with e_ are specific to Educator functionality.

Files prefixed with s_ are specific to Student functionality.

Files prefixed with z_ are General files used by both Educators and Students, or are not role-specific.

# 🚀 Project Overview

This is the frontend repository for Inzighted, an AI-powered Hierarchical Retrieval-Augmented Generation (HRAG) system for deep educational insights. Built with React.js and styled using Tailwind CSS, this application provides the user interface for educators and students to interact with the Inzighted platform, including user authentication, data uploads, and viewing AI-driven insights.

# 🎯 Project Mission (Frontend Perspective)

"To provide a seamless, intuitive, and responsive user interface for educators and students to access and utilize Inzighted's powerful learning insights."

# 🏰 Tech Stack

- Frontend Framework: React.js
- Styling: Tailwind CSS
- Package Manager: npm
- Build Tool: Vite

# 👨‍💻 Development Installation Guide

## 1. Prerequisites

Ensure you have the following installed:

- [Node.js & npm](https://nodejs.org/) (Node.js 18+ recommended)
- [Git](https://git-scm.com/)

## 2. Clone the Repository

Clone the main Inzighted repository and navigate to the frontend directory:

```bash
git clone https://github.com/ZAIFI-BUSINESS-SOLUTIONS-PVT-LTD/Inzighted_frontend.git
cd Inzighted_frontend
```

## 3. Environment Variables

Copy the example environment file and update it with your local development settings:

```bash
cp .env.example .env.development
```

Open `.env.development` in a text editor and fill in the required values. For example:

```
VITE_API_URL=http://localhost:8000/api
# VITE_AUTH_CLIENT_ID=your-client-id-here
# VITE_AUTH_DOMAIN=your-auth-domain-here
# VITE_CUSTOM_KEY=your-value-here
```

- `VITE_API_URL` should point to your backend API endpoint for development.
- Uncomment and fill in any other variables as needed for your setup.
- **Never commit real secrets to the repository.**

## 4. Install Dependencies

Install the required Node.js packages:

```bash
npm install
```

## 5. Run the Development Server

Start the frontend development server:

```bash
npm run dev
```

The frontend application will typically be available at: [http://localhost:5173/](http://localhost:5173/)

---

# 📂 Key Frontend Pages & Components

The frontend application is structured into various pages and components to handle different user flows and features.

- **Authentication Pages** (`src/auth/`): Handles user login (Admin, Educator, Student), educator registration, and unauthorized access.
- **Dashboard Pages** (`src/dashboards/`): Contains the main user dashboards, specifically the Educator Dashboard for managing uploads and viewing insights.
- **Landing Page** (`src/landing page/`): The public-facing entry point of the application.
- **API Utility** (`src/utils/api.js`): Manages communication and API calls to the backend.
- **Main Application** (`src/App.jsx`): Defines the main application structure and routing.

# 🔐 Authentication Flow (Frontend):

1. Users (Educators, Students, Admins) select their role and log in via dedicated pages.
2. First-time educators are guided to a registration page.
3. Upon successful authentication via the backend API, the frontend receives and stores a JWT token (typically in local storage or context).
4. This JWT token is then included in subsequent API requests to access protected resources.
5. Role-based access is managed by the frontend based on the user's role obtained during login, rendering appropriate dashboards and features.

# 🔥 Key Features (Frontend):

- ✅ React UI: A dynamic and responsive user interface built with React.js.
- ✅ Tailwind CSS Styling: Utilizes Tailwind CSS for efficient and maintainable styling.
- ✅ Multi-Role Authentication UI: Provides distinct login interfaces for Admins, Educators, and Students.
- ✅ Educator Workflow: Includes pages for uploading student data (CSV) and test materials (PDFs, answer keys).
- ✅ API Integration: Seamlessly communicates with the Django backend API to send data and retrieve insights.
- ✅ Responsive Design: Designed to be usable across various devices and screen sizes.

# 🏆 Contribution Guide (Frontend):

We welcome contributions to improve the Inzighted frontend! To contribute:

1. Fork the main Inzighted repo and create a new branch for your frontend changes.
2. Navigate to the `frontend/` directory.
3. Make your changes, ensuring they adhere to the existing code style and use Tailwind CSS for styling.
4. Commit your changes with clear messages.
5. Submit a pull request to the main Inzighted repository with a detailed description of your changes.

# 🌟 Credits & Acknowledgments:

Frontend developed as part of the ZAI-FI project.

Built using React.js and Tailwind CSS.

# 📩 Support & Contact:

If you need help with the frontend:

- Issues? Open a GitHub issue in the main Inzighted repository.
- Email: techsupport@zai-fi.com
- Website: www.zai-fi.com

🚀 Inzighted Frontend - Powering Educational Insights! 🚀