# =========================================================
# LearnLens API - Complete Multi-PDF Ready Version
# =========================================================

import os
import re
import uuid
import json
import random
from typing import List, Optional

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import fitz
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

from groq import Groq
from dotenv import load_dotenv

# =========================================================
# LOAD ENV
# =========================================================

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# =========================================================
# FASTAPI APP
# =========================================================

app = FastAPI(title="LearnLens API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================
# GROQ CLIENT
# =========================================================

groq_client = Groq(api_key=GROQ_API_KEY)
LLM_MODEL = "llama-3.3-70b-versatile"

# =========================================================
# CHROMA DB
# =========================================================

client = chromadb.Client(
    Settings(
        persist_directory="./chroma_db"
    )
)

collection = client.get_or_create_collection(
    name="learnlens_chunks"
)

# =========================================================
# EMBEDDING MODEL
# =========================================================

embedding_model = SentenceTransformer(
    "all-MiniLM-L6-v2"
)

# =========================================================
# TEMP PDF STORE
# =========================================================

pdf_store = {}

# =========================================================
# PYDANTIC MODELS (STRICT INPUT VALIDATION)
# =========================================================

class PDFSelectionMixin(BaseModel):
    """
    Accepts either pdf_id (single string) or pdf_ids (list of strings).
    Automatically normalizes both formats into a clean list.
    """
    pdf_id: Optional[str] = None
    pdf_ids: Optional[List[str]] = None

    def get_valid_ids(self) -> List[str]:
        # Prefer pdf_ids, fallback to pdf_id, return empty if neither
        ids = self.pdf_ids or ([self.pdf_id] if self.pdf_id else [])
        # Remove duplicates while preserving order
        return list(dict.fromkeys(ids))


class QuizRequest(PDFSelectionMixin):
    difficulty: str = Field(default="Medium", description="Easy, Medium, Hard")
    mode: str = Field(default="Notes Only", description="Notes Only or Notes + PYQ")
    pyq_text: Optional[str] = Field(default="", description="Previous year question patterns")


class SummaryRequest(PDFSelectionMixin):
    pass


class AskRequest(PDFSelectionMixin):
    question: str = Field(..., min_length=3, description="The question to ask")


# =========================================================
# HELPERS
# =========================================================

def clean_text(text: str) -> str:
    """Remove excessive whitespace and strip leading/trailing spaces."""
    return re.sub(r"\s+", " ", text).strip()


def extract_pages(path: str) -> List[dict]:
    """Extract clean text from each page of a PDF."""
    doc = fitz.open(path)
    pages = []

    for i in range(len(doc)):
        text = clean_text(doc[i].get_text())
        if text:
            pages.append({
                "page": i + 1,
                "text": text
            })

    doc.close()
    return pages


def chunk_text(text: str, chunk_size: int = 220) -> List[str]:
    """Split text into word-based chunks."""
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
    return chunks


def ask_llm(prompt: str) -> str:
    """Send prompt to Groq LLM and return response."""
    completion = groq_client.chat.completions.create(
        model=LLM_MODEL,
        messages=[
            {"role": "user", "content": prompt}
        ],
        temperature=0.3,
    )
    return completion.choices[0].message.content


def extract_json(raw: str):
    """Safely extract JSON array from LLM response, stripping markdown."""
    try:
        raw = re.sub(r"```(?:json)?\s*", "", raw)
        raw = raw.replace("```", "").strip()
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if match:
            return json.loads(match.group(0))
    except Exception:
        pass
    return None


def validate_quiz(quiz: list) -> bool:
    """Validate quiz structure and explanation quality."""
    if not quiz or len(quiz) != 10:
        return False

    for q in quiz:
        if "question" not in q or "options" not in q:
            return False
        if len(q["options"]) != 4:
            return False
        if q.get("answer") not in ["A", "B", "C", "D"]:
            return False
        
        explanation = q.get("explanation", "").strip()
        if not explanation or len(explanation) < 30 or len(explanation) > 400:
            return False

    return True


def generate_quiz_with_retry(prompt: str) -> list:
    """Attempt quiz generation up to 3 times with validation."""
    for _ in range(3):
        try:
            raw = ask_llm(prompt)
            quiz = extract_json(raw)
            if validate_quiz(quiz):
                return quiz
        except Exception:
            pass
    return []


def get_context_from_pdfs(pdf_ids: List[str], max_chunks: int = 45, max_chars: int = 5500) -> str:
    """
    Fetch and aggregate content from multiple PDFs.
    Labels each chunk with its source filename for LLM attribution.
    Shuffles chunks to prevent bias toward the first PDF.
    """
    all_docs = []
    chunks_per_pdf = max(max_chunks // len(pdf_ids), 5)

    for pid in pdf_ids:
        if pid not in pdf_store:
            continue

        results = collection.get(
            where={"pdf_id": pid},
            limit=chunks_per_pdf + 5
        )

        docs = results.get("documents", [])
        pdf_name = pdf_store[pid]["name"]

        for doc in docs:
            labeled = f"[Source: {pdf_name}] {doc}"
            all_docs.append(labeled)

    # Interleave chunks to mix sources evenly
    random.shuffle(all_docs)

    context = "\n\n".join(all_docs[:max_chunks])

    # Smart truncation at sentence boundary
    if len(context) > max_chars:
        context = context[:max_chars].rsplit('.', 1)[0] + '.'

    return context


# =========================================================
# ROUTES
# =========================================================

@app.get("/")
async def root():
    return {"message": "LearnLens API Running"}

# =========================================================
# UPLOAD PDF
# =========================================================

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    os.makedirs("uploads", exist_ok=True)

    pdf_id = str(uuid.uuid4())
    path = f"uploads/{pdf_id}_{file.filename}"

    with open(path, "wb") as f:
        f.write(await file.read())

    pdf_store[pdf_id] = {
        "name": file.filename,
        "path": path
    }

    return {
        "pdf_id": pdf_id,
        "name": file.filename
    }

# =========================================================
# INGEST PDF
# =========================================================

@app.post("/ingest")
async def ingest(data: dict):
    pdf_id = data.get("pdf_id")

    if not pdf_id or pdf_id not in pdf_store:
        raise HTTPException(status_code=404, detail="Invalid or missing pdf_id")

    file = pdf_store[pdf_id]
    pages = extract_pages(file["path"])

    ids = []
    documents = []
    embeddings = []
    metadatas = []

    for p in pages:
        chunks = chunk_text(p["text"])
        for chunk in chunks:
            ids.append(str(uuid.uuid4()))
            documents.append(chunk)
            embeddings.append(
                embedding_model.encode(chunk).tolist()
            )
            metadatas.append({
                "pdf_id": pdf_id,
                "page": p["page"]
            })

    if ids:
        collection.add(
            ids=ids,
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas
        )

    return {
        "status": "success",
        "chunks_added": len(ids)
    }

# =========================================================
# ASK QUESTIONS (Multi-PDF Ready)
# =========================================================

@app.post("/ask")
async def ask(req: AskRequest):
    question = req.question.strip()
    pdf_ids = req.get_valid_ids()
    valid_ids = [pid for pid in pdf_ids if pid in pdf_store]

    query_embedding = embedding_model.encode(question).tolist()

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=6
    )

    if not results["documents"] or not results["documents"][0]:
        return {"answer": "Answer not found in uploaded notes."}

    docs = results["documents"][0]
    metas = results["metadatas"][0]

    # Filter to selected PDFs if provided
    if valid_ids:
        filtered = [
            doc for doc, meta in zip(docs, metas)
            if meta.get("pdf_id") in valid_ids
        ]
        docs = filtered[:4] if filtered else docs[:4]
    else:
        docs = docs[:4]

    context = "\n".join(docs)

    prompt = f"""
Answer ONLY from the provided notes.

If the answer is not present in the notes, say:
"Answer not found in uploaded notes."

NOTES:
{context}

QUESTION:
{question}
"""

    answer = ask_llm(prompt)

    return {"answer": answer}

# =========================================================
# SUMMARY (Multi-PDF Ready)
# =========================================================

@app.post("/summary")
async def summary(req: SummaryRequest):
    pdf_ids = req.get_valid_ids()
    valid_ids = [pid for pid in pdf_ids if pid in pdf_store]

    if not valid_ids:
        raise HTTPException(status_code=404, detail="No valid PDFs found. Upload & ingest them first.")

    all_docs = []
    for pid in valid_ids:
        results = collection.get(where={"pdf_id": pid}, limit=20)
        all_docs.extend(results.get("documents", []))

    if not all_docs:
        raise HTTPException(status_code=404, detail="No content found for specified PDFs")

    context = "\n".join(all_docs[:60])
    source_names = [pdf_store[pid]["name"] for pid in valid_ids]

    prompt = f"""
Create a structured, unified summary from MULTIPLE source documents:
{", ".join(source_names)}

Include:
- Overall Title (synthesizing all sources)
- Key Concepts (group related ideas across documents)
- Important Points (highlight unique insights from each source)
- Revision Notes (concise bullet points for quick review)
- Important Definitions (with source attribution if terms differ)

SOURCES:
{context}
"""

    summary_text = ask_llm(prompt)

    return {
        "summary": summary_text,
        "sources_used": source_names
    }

# =========================================================
# EXTRACT TEXT
# =========================================================

@app.post("/extract-text")
async def extract_text(file: UploadFile = File(...)):
    os.makedirs("uploads", exist_ok=True)

    path = f"uploads/{uuid.uuid4()}_{file.filename}"

    with open(path, "wb") as f:
        f.write(await file.read())

    pages = extract_pages(path)

    text = "\n".join([p["text"] for p in pages])

    return {"text": text}

# =========================================================
# QUIZ GENERATION (Multi-PDF Ready) ✨ UPDATED ✨
# =========================================================

@app.post("/quiz")
async def quiz(req: QuizRequest):
    pdf_ids = req.get_valid_ids()
    valid_ids = [pid for pid in pdf_ids if pid in pdf_store]

    if not valid_ids:
        raise HTTPException(status_code=404, detail="No valid PDFs found. Upload & ingest them first.")

    # Aggregate context from all selected PDFs
    context = get_context_from_pdfs(valid_ids, max_chunks=45, max_chars=5500)
    source_names = [pdf_store[pid]["name"] for pid in valid_ids]

    # Append PYQ text if mode requires it
    pyq_section = ""
    if req.mode == "Notes + PYQ" and req.pyq_text:
        pyq_section = f"\n\nPREVIOUS YEAR QUESTION PATTERNS:\n{req.pyq_text[:1500]}"

    prompt = f"""
You are an expert educational content creator and strict JSON generator.

Generate EXACTLY 10 {req.difficulty} level MCQs by synthesizing content from MULTIPLE source documents:
{", ".join(source_names)}

RETURN ONLY A VALID JSON ARRAY. NO MARKDOWN. NO INTRODUCTORY TEXT.

FORMAT REQUIREMENTS:
[
  {{
    "question": "Clear question that may integrate concepts across sources",
    "options": [
      "A. [plausible option]",
      "B. [plausible option]", 
      "C. [plausible option]",
      "D. [plausible option]"
    ],
    "answer": "A",
    "explanation": "2-3 sentences. Cite which source document(s) support the answer. Explain why correct answer is right AND why distractors are wrong."
  }}
]

EXPLANATION GUIDELINES (CRITICAL):
- Must reference specific source: "As stated in [filename]..." or "Both documents agree that..."
- If question combines concepts: "This integrates [concept A from Doc1] with [concept B from Doc2]"
- Keep explanations pedagogically useful (40-100 words)
- Clarify misconceptions behind wrong options

REFERENCE EXAMPLE:
[
  {{
    "question": "How do photosynthesis and cellular respiration relate?",
    "options": [
      "A. They are identical processes",
      "B. They are opposite processes that form a cycle",
      "C. Only plants perform both",
      "D. They occur in the same organelle"
    ],
    "answer": "B",
    "explanation": "As explained in Biology_Notes.pdf, photosynthesis produces glucose/O2 while respiration consumes them. Ecology_Chapter.pdf adds that this forms a global carbon cycle. Options A/C/D confuse organelle locations or organism capabilities."
  }}
]

STRICT RULES:
- EXACTLY 10 questions
- EXACTLY 4 options labeled A-D
- 'answer' must be exactly "A", "B", "C", or "D"
- NO markdown, NO code blocks, NO extra text
- Prioritize questions that test synthesis across documents when possible

CONTENT FROM SOURCES:
{context}
{pyq_section}
"""

    quiz = generate_quiz_with_retry(prompt)

    if not quiz:
        return {
            "quiz": [],
            "error": "Quiz generation failed after retries"
        }

    return {
        "quiz": quiz,
        "sources_used": source_names,
        "difficulty": req.difficulty
    }

# =========================================================
# LIST PDFS
# =========================================================

@app.get("/pdfs")
async def pdfs():
    return {
        "pdfs": [
            {
                "id": k,
                "name": v["name"]
            }
            for k, v in pdf_store.items()
        ]
    }

# =========================================================
# DELETE PDF
# =========================================================

@app.delete("/pdf/{pdf_id}")
async def delete_pdf(pdf_id: str):
    if pdf_id not in pdf_store:
        raise HTTPException(status_code=404, detail="PDF not found")

    # Delete file from disk
    path = pdf_store[pdf_id]["path"]
    if os.path.exists(path):
        os.remove(path)

    # Delete from ChromaDB
    collection.delete(where={"pdf_id": pdf_id})

    # Remove from store
    del pdf_store[pdf_id]

    return {
        "status": "success",
        "message": f"Deleted {pdf_id}"
    }
