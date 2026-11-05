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

Deploying on Render
Create a free Postgres project at neon.com (no card needed), copy its connection string (ends with ?sslmode=require), then in Render use New > Blueprint on this repo and paste it as DATABASE_URL along with the other prompted secrets. Neon's free database suspends after 5 minutes idle and wakes on the next request.
