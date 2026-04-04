import os
import re
import uuid
import json
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import fitz

import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
import ollama

# ==========================
# APP
# ==========================
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================
# CONFIG
# ==========================
os.environ["OLLAMA_HOST"] = "http://localhost:11434"
OLLAMA_MODEL = "gemma3:4b"
ollama_client = ollama.Client(host="http://localhost:11434")

# ==========================
# INIT
# ==========================
client = chromadb.Client(Settings(persist_directory="./chroma_db"))
collection = client.get_or_create_collection(name="learnlens_chunks")
model = SentenceTransformer("all-MiniLM-L6-v2")

pdf_store = {}

# ==========================
# HELPERS
# ==========================
def clean_text(t):
    return re.sub(r"\s+", " ", t).strip()

def extract_pages(path):
    doc = fitz.open(path)
    pages = []
    for i in range(len(doc)):
        txt = clean_text(doc[i].get_text())
        if txt:
            pages.append({"page": i+1, "text": txt})
    doc.close()
    return pages

def chunk_text(text, size=200):
    words = text.split()
    return [" ".join(words[i:i+size]) for i in range(0, len(words), size)]

# ✅ FIX: lower temperature for consistency
def ask_llm(prompt):
    try:
        res = ollama_client.chat(
            model=OLLAMA_MODEL,
            messages=[{"role": "user", "content": prompt}],
            options={"temperature": 0.2}
        )
        return res["message"]["content"]
    except Exception as e:
        return str(e)

# ✅ FIX: better JSON extraction
def extract_json(raw):
    try:
        raw = raw.replace("```json", "").replace("```", "")
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if match:
            return json.loads(match.group(0))
    except:
        pass
    return None

# ✅ NEW: validation
def validate_quiz(quiz):
    if not quiz or len(quiz) != 10:
        return False

    for q in quiz:
        if "question" not in q or "options" not in q:
            return False
        if len(q["options"]) != 4:
            return False
        if q.get("answer") not in ["A", "B", "C", "D"]:
            return False

    return True

# ✅ NEW: retry mechanism
def generate_quiz_with_retry(prompt):
    for _ in range(3):
        raw = ask_llm(prompt)
        quiz = extract_json(raw)

        if validate_quiz(quiz):
            return quiz

    return []


# ==========================
# ROUTES
# ==========================

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    os.makedirs("uploads", exist_ok=True)
    pid = str(uuid.uuid4())
    path = f"uploads/{pid}_{file.filename}"

    with open(path, "wb") as f:
        f.write(await file.read())

    pdf_store[pid] = {"name": file.filename, "path": path}

    return {"pdf_id": pid, "name": file.filename}


@app.post("/ingest")
async def ingest(data: dict):
    pdf_id = data["pdf_id"]
    file = pdf_store[pdf_id]

    pages = extract_pages(file["path"])

    ids, docs, embeds, metas = [], [], [], []

    for p in pages:
        for chunk in chunk_text(p["text"]):
            ids.append(str(uuid.uuid4()))
            docs.append(chunk)
            embeds.append(model.encode(chunk).tolist())
            metas.append({"pdf_id": pdf_id, "page": p["page"]})

    collection.add(ids=ids, documents=docs, embeddings=embeds, metadatas=metas)

    return {"status": "ok"}


@app.post("/ask")
async def ask(data: dict):
    q = data["question"]

    emb = model.encode(q).tolist()
    res = collection.query(query_embeddings=[emb], n_results=4)

    context = "\n".join(res["documents"][0])
    answer = ask_llm(f"{context}\n\nQ: {q}")

    return {"answer": answer}


@app.post("/summary")
async def summary(data: dict):
    pdf_id = data["pdf_id"]

    res = collection.get(where={"pdf_id": pdf_id})
    docs = res["documents"][:40]

    prompt = f"""
Summarize into:
- Title
- Key Concepts
- Important Points
- Revision bullets

{'\n'.join(docs)}
"""
    return {"summary": ask_llm(prompt)}


@app.post("/extract-text")
async def extract_text(file: UploadFile = File(...)):
    path = f"uploads/{uuid.uuid4()}_{file.filename}"
    with open(path, "wb") as f:
        f.write(await file.read())

    pages = extract_pages(path)
    return {"text": "\n".join([p["text"] for p in pages])}


# ==========================
# 🚀 FIXED QUIZ ENDPOINT
# ==========================

@app.post("/quiz")
async def quiz(data: dict):
    pdf_id = data["pdf_id"]
    difficulty = data.get("difficulty", "Medium")
    mode = data["mode"]
    pyq = data.get("pyq_text", "")

    res = collection.get(where={"pdf_id": pdf_id})

    # ✅ FIX: limit context size (very important)
    context = "\n".join(res["documents"][:30])[:3000]

    if mode == "Notes + PYQ" and pyq:
        context += "\n\nPrevious Questions:\n" + pyq[:1500]

    # ✅ FIX: strict prompt
    prompt = f"""
You are a strict JSON generator.

Generate EXACTLY 10 {difficulty} level multiple choice questions.

Return ONLY valid JSON. No text before or after.

Format:
[
  {{
    "question": "string",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "answer": "A",
    "explanation": "string"
  }}
]

Rules:
- Exactly 10 questions
- Exactly 4 options
- Answer must be A/B/C/D
- No markdown
- No extra text

If you cannot follow the format EXACTLY, return: []

Content:
{context}
"""

    quiz = generate_quiz_with_retry(prompt)

    if not quiz:
        return {"quiz": [], "error": "Quiz generation failed"}

    return {"quiz": quiz}


@app.get("/pdfs")
async def pdfs():
    return {"pdfs": [{"id": k, "name": v["name"]} for k, v in pdf_store.items()]}