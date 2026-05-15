
# =========================================================
# LearnLens API - Qdrant Version
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
from sentence_transformers import SentenceTransformer

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue
)

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

app = FastAPI(title="LearnLens API", version="3.0")

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
# QDRANT DB
# =========================================================

qdrant = QdrantClient(
    path="./qdrant_data"
)

COLLECTION_NAME = "learnlens_chunks"

# Create collection if not exists
existing_collections = [
    c.name for c in qdrant.get_collections().collections
]

if COLLECTION_NAME not in existing_collections:
    qdrant.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(
            size=384,
            distance=Distance.COSINE
        )
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
# PYDANTIC MODELS
# =========================================================

class PDFSelectionMixin(BaseModel):
    """
    Accepts either pdf_id (single string)
    or pdf_ids (list of strings).
    """

    pdf_id: Optional[str] = None
    pdf_ids: Optional[List[str]] = None

    def get_valid_ids(self) -> List[str]:
        ids = self.pdf_ids or ([self.pdf_id] if self.pdf_id else [])
        return list(dict.fromkeys(ids))


class QuizRequest(PDFSelectionMixin):
    difficulty: str = Field(
        default="Medium",
        description="Easy, Medium, Hard"
    )

    mode: str = Field(
        default="Notes Only",
        description="Notes Only or Notes + PYQ"
    )

    pyq_text: Optional[str] = Field(
        default="",
        description="Previous year question patterns"
    )


class SummaryRequest(PDFSelectionMixin):
    pass


class AskRequest(PDFSelectionMixin):
    question: str = Field(
        ...,
        min_length=3,
        description="Question to ask"
    )

# =========================================================
# HELPERS
# =========================================================


def clean_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()



def extract_pages(path: str) -> List[dict]:
    """Extract text from PDF pages."""

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
    """Split text into chunks."""

    words = text.split()
    chunks = []

    for i in range(0, len(words), chunk_size):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)

    return chunks



def ask_llm(prompt: str) -> str:
    """Send prompt to Groq."""

    completion = groq_client.chat.completions.create(
        model=LLM_MODEL,
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.3
    )

    return completion.choices[0].message.content



def extract_json(raw: str):
    """Safely extract JSON from LLM output."""

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
    """Validate generated quiz."""

    if not quiz or len(quiz) != 10:
        return False

    for q in quiz:

        if "question" not in q:
            return False

        if "options" not in q:
            return False

        if len(q["options"]) != 4:
            return False

        if q.get("answer") not in ["A", "B", "C", "D"]:
            return False

        explanation = q.get("explanation", "").strip()

        if not explanation:
            return False

        if len(explanation) < 30:
            return False

        if len(explanation) > 400:
            return False

    return True



def generate_quiz_with_retry(prompt: str) -> list:
    """Retry quiz generation up to 3 times."""

    for _ in range(3):

        try:
            raw = ask_llm(prompt)
            quiz = extract_json(raw)

            if validate_quiz(quiz):
                return quiz

        except Exception:
            pass

    return []



def fetch_docs_by_pdf_id(pdf_id: str, limit: int = 20):
    """Fetch chunks for a specific PDF."""

    results = qdrant.scroll(
        collection_name=COLLECTION_NAME,
        scroll_filter=Filter(
            must=[
                FieldCondition(
                    key="pdf_id",
                    match=MatchValue(value=pdf_id)
                )
            ]
        ),
        limit=limit,
        with_payload=True
    )[0]

    docs = [r.payload["text"] for r in results]

    return docs



def get_context_from_pdfs(
    pdf_ids: List[str],
    max_chunks: int = 45,
    max_chars: int = 5500
) -> str:
    """Aggregate content from multiple PDFs."""

    all_docs = []

    chunks_per_pdf = max(max_chunks // len(pdf_ids), 5)

    for pid in pdf_ids:

        if pid not in pdf_store:
            continue

        docs = fetch_docs_by_pdf_id(
            pdf_id=pid,
            limit=chunks_per_pdf + 5
        )

        pdf_name = pdf_store[pid]["name"]

        for doc in docs:
            labeled = f"[Source: {pdf_name}] {doc}"
            all_docs.append(labeled)

    random.shuffle(all_docs)

    context = "\n\n".join(all_docs[:max_chunks])

    if len(context) > max_chars:
        context = context[:max_chars].rsplit('.', 1)[0] + '.'

    return context

# =========================================================
# ROOT ROUTE
# =========================================================

@app.get("/")
async def root():
    return {
        "message": "LearnLens API Running with Qdrant"
    }

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
        raise HTTPException(
            status_code=404,
            detail="Invalid or missing pdf_id"
        )

    file = pdf_store[pdf_id]

    pages = extract_pages(file["path"])

    ids = []
    documents = []
    metadatas = []

    for p in pages:

        chunks = chunk_text(p["text"])

        for chunk in chunks:

            ids.append(str(uuid.uuid4()))

            documents.append(chunk)

            metadatas.append({
                "pdf_id": pdf_id,
                "page": p["page"]
            })

    # Batch embeddings for speed
    embeddings = embedding_model.encode(
        documents,
        batch_size=32,
        show_progress_bar=True
    ).tolist()

    points = []

    for idx in range(len(ids)):

        points.append(
            PointStruct(
                id=ids[idx],
                vector=embeddings[idx],
                payload={
                    "text": documents[idx],
                    "pdf_id": metadatas[idx]["pdf_id"],
                    "page": metadatas[idx]["page"]
                }
            )
        )

    if points:

        qdrant.upsert(
            collection_name=COLLECTION_NAME,
            points=points
        )

    return {
        "status": "success",
        "chunks_added": len(points)
    }

# =========================================================
# ASK QUESTIONS
# =========================================================

@app.post("/ask")
async def ask(req: AskRequest):

    question = req.question.strip()

    pdf_ids = req.get_valid_ids()

    valid_ids = [
        pid for pid in pdf_ids
        if pid in pdf_store
    ]

    query_embedding = embedding_model.encode(question).tolist()

    results = qdrant.search(
        collection_name=COLLECTION_NAME,
        query_vector=query_embedding,
        limit=6
    )

    if not results:
        return {
            "answer": "Answer not found in uploaded notes."
        }

    docs = [r.payload["text"] for r in results]
    metas = [r.payload for r in results]

    # Filter to selected PDFs
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

    return {
        "answer": answer
    }

# =========================================================
# SUMMARY
# =========================================================

@app.post("/summary")
async def summary(req: SummaryRequest):

    pdf_ids = req.get_valid_ids()

    valid_ids = [
        pid for pid in pdf_ids
        if pid in pdf_store
    ]

    if not valid_ids:
        raise HTTPException(
            status_code=404,
            detail="No valid PDFs found."
        )

    all_docs = []

    for pid in valid_ids:

        docs = fetch_docs_by_pdf_id(
            pdf_id=pid,
            limit=20
        )

        all_docs.extend(docs)

    if not all_docs:
        raise HTTPException(
            status_code=404,
            detail="No content found"
        )

    context = "\n".join(all_docs[:60])

    source_names = [
        pdf_store[pid]["name"]
        for pid in valid_ids
    ]

    prompt = f"""
Create a structured summary from MULTIPLE documents.

Include:
- Overall Title
- Key Concepts
- Important Points
- Revision Notes
- Important Definitions

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

    text = "\n".join([
        p["text"] for p in pages
    ])

    return {
        "text": text
    }

# =========================================================
# QUIZ GENERATION
# =========================================================

@app.post("/quiz")
async def quiz(req: QuizRequest):

    pdf_ids = req.get_valid_ids()

    valid_ids = [
        pid for pid in pdf_ids
        if pid in pdf_store
    ]

    if not valid_ids:
        raise HTTPException(
            status_code=404,
            detail="No valid PDFs found."
        )

    context = get_context_from_pdfs(
        valid_ids,
        max_chunks=45,
        max_chars=5500
    )

    source_names = [
        pdf_store[pid]["name"]
        for pid in valid_ids
    ]

    pyq_section = ""

    if req.mode == "Notes + PYQ" and req.pyq_text:

        pyq_section = f"""

PREVIOUS YEAR QUESTION PATTERNS:
{req.pyq_text[:1500]}
"""

    prompt = f"""
You are an expert educational content creator.

Generate EXACTLY 10 {req.difficulty} level MCQs.

RETURN ONLY VALID JSON ARRAY.

FORMAT:
[
  {{
    "question": "Question",
    "options": [
      "A. Option",
      "B. Option",
      "C. Option",
      "D. Option"
    ],
    "answer": "A",
    "explanation": "Explanation"
  }}
]

STRICT RULES:
- EXACTLY 10 questions
- EXACTLY 4 options
- NO markdown
- NO extra text

CONTENT:
{context}
{pyq_section}
"""

    quiz = generate_quiz_with_retry(prompt)

    if not quiz:

        return {
            "quiz": [],
            "error": "Quiz generation failed"
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
        raise HTTPException(
            status_code=404,
            detail="PDF not found"
        )

    # Delete local file
    path = pdf_store[pdf_id]["path"]

    if os.path.exists(path):
        os.remove(path)

    # Delete from Qdrant
    qdrant.delete(
        collection_name=COLLECTION_NAME,
        points_selector=Filter(
            must=[
                FieldCondition(
                    key="pdf_id",
                    match=MatchValue(value=pdf_id)
                )
            ]
        )
    )

    # Remove from memory store
    del pdf_store[pdf_id]

    return {
        "status": "success",
        "message": f"Deleted {pdf_id}"
    }

