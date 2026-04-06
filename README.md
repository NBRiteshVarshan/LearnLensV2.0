# 🚀 LearnLens v2.0 — Exam Intelligence Platform

LearnLens v2.0 is a complete rebuild of our original hackathon project — now faster, cleaner, and significantly more powerful.

Built after our experience at Sprint4Good (IIT Delhi), this version moves beyond a prototype into a structured AI-powered learning system with a proper frontend, better retrieval, and a more reliable LLM pipeline.

---

## 🧠 What is LearnLens?

Students often waste time searching for answers that are:
- Not aligned with their syllabus  
- Too generic  
- Or just plain wrong  

**LearnLens fixes that.**

You upload your notes → LearnLens understands them → and every answer, summary, or quiz comes strictly from *your content*.

No hallucinations. No irrelevant internet noise. Just **your syllabus, optimized.**

---

## ✨ What’s New in v2.0

### ⚡ Full Stack Upgrade
- Streamlit ➝ **React (Vite) frontend**
- Clean UI with real-time interactions
- Sidebar navigation + multi-feature workflow

### 🧩 Better Backend Architecture
- FastAPI backend
- Modular API endpoints (`/upload`, `/ask`, `/quiz`, etc.)
- Improved error handling + retry mechanisms

### 🧠 Smarter AI Pipeline
- Context-limited prompting (reduces hallucinations)
- Strict JSON enforcement for quiz generation
- Retry system for consistent outputs

### 🗂️ Database Upgrade
- MongoDB ➝ **ChromaDB (local vector DB)**
- Faster ingestion + simpler setup
- No external dependency required

### 🎯 Improved Quiz Engine
- Guaranteed **10 valid MCQs**
- Strict format validation
- Difficulty-aware generation
- PYQ-based pattern replication

---

## 🔥 Core Features

### 📄 Upload & Index Notes
- Upload PDF notes
- Automatically:
  - Extract text
  - Chunk content
  - Generate embeddings
  - Store in ChromaDB

---

### 💬 Ask Questions
- Ask anything from your notes
- Uses semantic search to retrieve relevant chunks
- LLM answers strictly from context

> If the answer isn’t in your notes → it won’t make it up.

---

### 📋 Smart Summary
Generates structured summaries:
- Title  
- Key Concepts  
- Important Points  
- Revision bullets  

Perfect for last-minute revision.

---

### 🎯 Quiz Generator
- Generates **10 MCQs**
- Difficulty levels:
  - Easy
  - Medium
  - Hard
- Live scoring + explanations

#### 🧠 PYQ Mode
Upload previous year questions → LearnLens mimics the pattern and generates similar questions from your notes.

---

## 🏗️ Tech Stack

| Layer        | Technology |
|--------------|------------|
| Frontend     | React (Vite) |
| Backend      | FastAPI |
| LLM          | Ollama (gemma3:4b) |
| Embeddings   | sentence-transformers (all-MiniLM-L6-v2) |
| Vector DB    | ChromaDB |
| PDF Parsing  | PyMuPDF |
| Language     | Python + JavaScript |

---
