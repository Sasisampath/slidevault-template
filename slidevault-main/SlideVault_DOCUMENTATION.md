# 📘 SlideVault Documentation

## 🧾 Overview
SlideVault is a full-stack web application for uploading, storing, and managing presentation files such as PPT, PPTX, and PDF.

### Tech Stack
- Backend: Node.js, Express
- Database: MongoDB (Mongoose)
- Frontend: HTML, CSS, JavaScript
- File Uploads: Multer

---

## 🏗️ Project Structure

slidevault/
│
├── models/
│   └── Presentation.js
│
├── public/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── uploads/
│
├── server.js
├── .env
├── package.json
└── package-lock.json

---

## ⚙️ Setup Instructions

### 1. Install Dependencies
npm install

### 2. Create Environment File

MONGO_URI=your_mongodb_connection_string  
PORT=3000

### 3. Start Server

Production:
npm start

Development:
npm run dev

---

## 🚀 Features

- Upload presentation files
- Store metadata in MongoDB
- Serve uploaded files
- View and download presentations
- Auto-seed sample data (if DB empty)

---

## 📤 File Upload

Supported Formats:
- .ppt
- .pptx
- .pdf
- .key

Max file size: 50MB

---

## 🧠 Database Schema

Presentation Model includes:
title, author, institution, category, description, tags, slideCount, downloads, views, likes, filePath

---

## 🔌 API Endpoints

Base URL:
http://localhost:3000

POST /upload  
GET /presentations  
GET /presentations/:id  
GET /uploads/:filename  

---

## 🧩 Middleware

- cors
- express.json()
- multer
- express.static()

---

## 📂 File Storage

- Files stored in /uploads
- Unique filenames generated automatically

---

## 🎨 Frontend

Located in /public:
- index.html
- style.css
- script.js

---

## 🔐 Error Handling

- Invalid file types rejected
- File size limits enforced
- Database errors handled

---

## 📦 Dependencies

Production:
express, mongoose, multer, cors, dotenv

Development:
nodemon

---

## 🔄 Future Enhancements

- Authentication (JWT)
- File preview
- Search and filtering
- Pagination
- Cloud storage
- Role-based access

---

## 🧪 Workflow

1. Upload file
2. Store in server
3. Save metadata in DB
4. Access anytime
