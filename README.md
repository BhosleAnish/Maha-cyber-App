Maha Cyber – Officer Portal

A web-based cybercrime investigation platform designed to assist law enforcement officers in managing cases, analyzing evidence, and navigating legal frameworks efficiently.

Overview

Maha Cyber – Officer Portal is a full-stack application built using React for the frontend and Python Flask for the backend. It provides a structured and efficient environment for handling cybercrime investigations, including FIR generation, legal mapping, and evidence analysis.

Features
Dashboard

Centralized interface for accessing all modules

Simplified navigation for officers

Smart FIR

Guided FIR generation system

Structured input for accurate legal documentation

Reduces manual errors and improves consistency

Evidence Graph

Visual representation of relationships between entities such as suspects, devices, and evidence

Helps investigators identify patterns and connections

IPC to BNS Mapper

Converts Indian Penal Code (IPC) sections to Bharatiya Nyaya Sanhita (BNS)

Assists during legal transitions and referencing

IT Act Search

Search functionality for provisions under the Information Technology Act

Quick access to relevant cyber laws

Tech Stack
Frontend

React.js

Tailwind CSS (or your styling framework)

Backend

Python Flask

RESTful APIs

Additional Tools

Graph visualization libraries (for Evidence Graph)

NLP integration (optional, for Smart FIR enhancements)

Authentication
Officers sign in with email + password, then confirm a 6-digit one-time code emailed to their registered address (MFA). Sessions last 8 hours.

Setup
backend/.env: GROQ_API_KEY, and for email delivery SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM. With no SMTP_HOST and OTP_CONSOLE_FALLBACK=true (development only) the code is printed in the backend log instead.
frontend/.env.local: NEXTAUTH_SECRET (long random string), NEXTAUTH_URL=http://localhost:3000, BACKEND_URL=http://localhost:8000

Database
MongoDB. Set MONGODB_URI in backend/.env (MongoDB Atlas free M0 cluster, mongodb+srv://...); optional MONGODB_DB (default maha_cyber).
To copy existing local SQLite data: python backend/scripts/migrate_sqlite_to_mongo.py path/to/maha_cyber.db

Deploying on Render
Create a free MongoDB Atlas M0 cluster (no card), add a database user, and under Network Access allow 0.0.0.0/0 (Render free has no fixed IPs). In Render use New > Blueprint on this repo and paste the connection string as MONGODB_URI with the other prompted secrets.
