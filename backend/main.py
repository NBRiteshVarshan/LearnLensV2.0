
# =========================================================
# LearnLens API - Local Qdrant Version
# =========================================================

import sys
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

import os
import re
import uuid
import json
import random
from typing import List, Optional

import pathlib
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

import fitz  # PyMuPDF
from sentence_transformers import SentenceTransformer

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
    PayloadSchemaType
)

from groq import Groq
from dotenv import load_dotenv

# =========================================================
# LOAD ENV
# =========================================================

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY not found in .env")

# =========================================================
# GROQ CLIENT
# =========================================================

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
groq_client = Groq(api_key=GROQ_API_KEY)
LLM_MODEL = "llama-3.3-70b-versatile"

# =========================================================
# PATHS
# =========================================================

BASE_DIR = pathlib.Path(__file__).parent
PDF_STORE_PATH = BASE_DIR / "pdf_store.json"
UPLOADS_DIR = BASE_DIR / "uploads"
STATIC_DIR = BASE_DIR.parent / "frontend" / "dist"

COLLECTION_NAME = "learnlens_chunks"

# =========================================================
# QDRANT DB + EMBEDDING MODEL (lazy — set in lifespan)
# =========================================================

qdrant: QdrantClient = None
embedding_model: SentenceTransformer = None

# =========================================================
# PDF STORE — persisted to pdf_store.json
# =========================================================

pdf_store: dict = {}


def load_pdf_store():
    global pdf_store
    if PDF_STORE_PATH.exists():
        try:
            with open(PDF_STORE_PATH, "r", encoding="utf-8") as f:
                pdf_store = json.load(f)
            print(f"Loaded {len(pdf_store)} PDF entries from pdf_store.json")
        except Exception as e:
            print(f"Could not load pdf_store.json: {e}")
            pdf_store = {}


def save_pdf_store():
    try:
        with open(PDF_STORE_PATH, "w", encoding="utf-8") as f:
            json.dump(pdf_store, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Could not save pdf_store.json: {e}")


# =========================================================
# LIFESPAN
# =========================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    global qdrant, embedding_model

    qdrant = QdrantClient(
        url= QDRANT_URL,
        api_key= QDRANT_API_KEY
    )

    existing = [c.name for c in qdrant.get_collections().collections]

    if COLLECTION_NAME not in existing:
        qdrant.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(
                size=384,
                distance=Distance.COSINE
            ),
        )

    print("Loading embedding model...")
    embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
    print("Embedding model loaded")

    yield
    qdrant.close()


# =========================================================
# FASTAPI APP
# =========================================================

app = FastAPI(title="LearnLens API", version="3.2", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://your-frontend.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter()

# =========================================================
# PYDANTIC MODELS
# =========================================================

class PDFSelectionMixin(BaseModel):
    pdf_id: Optional[str] = None
    pdf_ids: Optional[List[str]] = None

    def get_valid_ids(self) -> List[str]:
        ids = self.pdf_ids or ([self.pdf_id] if self.pdf_id else [])
        return list(dict.fromkeys(ids))


class QuizRequest(PDFSelectionMixin):
    difficulty: str = Field(default="Medium")
    mode: str = Field(default="Notes Only")
    pyq_text: Optional[str] = Field(default="")


class SummaryRequest(PDFSelectionMixin):
    pass


class AskRequest(PDFSelectionMixin):
    question: str = Field(..., min_length=3)

# =========================================================
# HELPERS
# =========================================================

def clean_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def extract_pages(path: str) -> List[dict]:
    try:
        doc = fitz.open(path)
        pages = []

        print("=" * 60)
        print(f"PDF opened successfully")
        print(f"Total pages: {len(doc)}")
        print("=" * 60)

        for i in range(len(doc)):
            page = doc[i]

            text = page.get_text("text")

            print(f"Page {i+1}: {len(text)} characters")

            if text.strip():
                print(f"First 100 chars: {text[:100]}")
                pages.append({
                    "page": i + 1,
                    "text": clean_text(text)
                })
            else:
                print(f"Page {i+1} contains NO extractable text")

        doc.close()

        print("=" * 60)
        print(f"Pages extracted: {len(pages)}")
        print("=" * 60)

        return pages

    except Exception as e:
        print(f"PDF extraction error: {e}")
        raise


def chunk_text(text: str, chunk_size: int = 220, overlap: int = 30) -> List[str]:
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size - overlap):
        chunk = " ".join(words[i:i + chunk_size])
        if chunk.strip():
            chunks.append(chunk)
    return chunks


def ask_llm(prompt: str) -> str:
    try:
        completion = groq_client.chat.completions.create(
            model=LLM_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=2048
        )
        return completion.choices[0].message.content.strip()
    except Exception as e:
        print(f"LLM error: {e}")
        raise


def extract_json(raw: str):
    try:
        raw = re.sub(r"```(?:json)?\s*", "", raw).replace("```", "").strip()
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if match:
            return json.loads(match.group(0))
    except Exception:
        pass
    return None


def validate_quiz(quiz: list) -> bool:
    if not quiz or len(quiz) != 10:
        return False
    for q in quiz:
        if not all(k in q for k in ["question", "options", "answer", "explanation"]):
            return False
        if len(q["options"]) != 4:
            return False
        if q["answer"] not in ["A", "B", "C", "D"]:
            return False
        if not q["explanation"] or len(q["explanation"]) < 30:
            return False
    return True


def generate_quiz_with_retry(prompt: str, max_retries: int = 3) -> list:
    for attempt in range(max_retries):
        try:
            raw = ask_llm(prompt)
            quiz = extract_json(raw)
            if validate_quiz(quiz):
                return quiz
            print(f"Quiz validation failed (attempt {attempt + 1})")
        except Exception as e:
            print(f"Quiz generation error (attempt {attempt + 1}): {e}")
    return []


def fetch_docs_by_pdf_id(pdf_id: str, limit: int = 20) -> List[str]:
    try:
        results = qdrant.scroll(
            collection_name=COLLECTION_NAME,
            scroll_filter=Filter(
                must=[FieldCondition(key="pdf_id", match=MatchValue(value=pdf_id))]
            ),
            limit=limit,
            with_payload=True
        )[0]
        return [r.payload["text"] for r in results if "text" in r.payload]
    except Exception as e:
        print(f"Fetch error for {pdf_id}: {e}")
        return []


def get_context_from_pdfs(pdf_ids: List[str], max_chunks: int = 45, max_chars: int = 5500) -> str:
    all_docs = []
    chunks_per_pdf = max(max_chunks // len(pdf_ids), 5) if pdf_ids else 10
    for pid in pdf_ids:
        if pid not in pdf_store:
            continue
        docs = fetch_docs_by_pdf_id(pdf_id=pid, limit=chunks_per_pdf + 5)
        pdf_name = pdf_store[pid]["name"]
        for doc in docs:
            all_docs.append(f"[Source: {pdf_name}] {doc}")
    random.shuffle(all_docs)
    context = "\n\n".join(all_docs[:max_chunks])
    if len(context) > max_chars:
        context = context[:max_chars].rsplit('.', 1)[0] + '.'
    return context


def get_relevant_context_for_question(question: str, pdf_ids: List[str],
    max_chunks_per_pdf: int = 4,
    max_total_chars: int = 4000) -> str:
    try:
        query_embedding = embedding_model.encode(question).tolist()
        all_relevant_docs = []
        for pid in pdf_ids:
            if pid not in pdf_store:
                continue
            results = qdrant.query_points(
                collection_name=COLLECTION_NAME,
                query=query_embedding,
                limit=max_chunks_per_pdf,
                query_filter=Filter(
                    must=[FieldCondition(key="pdf_id", match=MatchValue(value=pid))]
                )
            ).points
            pdf_name = pdf_store[pid]["name"]
            for r in results:
                if "text" in r.payload:
                    page = r.payload.get("page", "?")
                    labeled = f"[Source: {pdf_name}, Page {page}] {r.payload['text']}"
                    all_relevant_docs.append(labeled)
        random.shuffle(all_relevant_docs)
        context = "\n\n".join(all_relevant_docs)
        if len(context) > max_total_chars:
            context = context[:max_total_chars].rsplit('.', 1)[0] + '.'
        return context
    except Exception as e:
        print(f"Context retrieval error: {e}")
        return ""


# =========================================================
# API ROUTES
# =========================================================

@router.get("/health")
async def health_check():
    try:
        collections = qdrant.get_collections()
        return {
            "status": "healthy",
            "qdrant": "connected",
            "collections": len(collections.collections),
            "indexed_pdfs": len(pdf_store),
        }
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


@router.post("/upload")
async def upload(file: UploadFile = File(...)):
    try:
        pdf_id = str(uuid.uuid4())
        path = str(UPLOADS_DIR / f"{pdf_id}_{file.filename}")
        content = await file.read()
        with open(path, "wb") as f:
            f.write(content)
        pdf_store[pdf_id] = {"name": file.filename, "path": path}
        save_pdf_store()
        print(f"Uploaded: {file.filename} -> {pdf_id}")
        return {"pdf_id": pdf_id, "name": file.filename}
    except Exception as e:
        print(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.post("/ingest")
async def ingest(data: dict):
    pdf_id = data.get("pdf_id")
    if not pdf_id or pdf_id not in pdf_store:
        raise HTTPException(status_code=404, detail="Invalid or missing pdf_id")

    file_info = pdf_store[pdf_id]
    print(f"Starting ingestion for: {file_info['name']} ({pdf_id})")

    try:
        pages = extract_pages(file_info["path"])
        if not pages:
            raise ValueError("No text content extracted from PDF")

        all_chunks = []
        all_metadatas = []
        for page in pages:
            chunks = chunk_text(page["text"])
            for chunk in chunks:
                all_chunks.append(chunk)
                all_metadatas.append({"pdf_id": pdf_id, "page": page["page"]})

        print(f"Created {len(all_chunks)} chunks")
        if not all_chunks:
            raise ValueError("No chunks generated from PDF")

        print("Generating embeddings...")
        embeddings = embedding_model.encode(
            all_chunks, batch_size=32, show_progress_bar=False
        ).tolist()

        points = [
            PointStruct(
                id=str(uuid.uuid4()),
                vector=embeddings[i],
                payload={
                    "text": all_chunks[i],
                    "pdf_id": all_metadatas[i]["pdf_id"],
                    "page": all_metadatas[i]["page"]
                }
            )
            for i in range(len(all_chunks))
        ]

        print("Indexing in Qdrant...")
        qdrant.upsert(collection_name=COLLECTION_NAME, points=points)

        pdf_store[pdf_id]["chunks"] = len(points)
        save_pdf_store()

        print(f"Ingestion complete: {len(points)} chunks indexed")
        return {"status": "success", "chunks_added": len(points), "pdf_id": pdf_id}
    except Exception as e:
        print(f"Ingestion failed: {e}")
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")


@router.post("/ask")
async def ask(req: AskRequest):
    question = req.question.strip()
    pdf_ids = req.get_valid_ids()
    valid_ids = [pid for pid in pdf_ids if pid in pdf_store]

    try:
        if valid_ids:
            context = get_relevant_context_for_question(
                question=question,
                pdf_ids=valid_ids,
                max_chunks_per_pdf=4,
                max_total_chars=4000
            )
            source_names = [pdf_store[pid]["name"] for pid in valid_ids]
        else:
            query_embedding = embedding_model.encode(question).tolist()
            results = qdrant.query_points(
                collection_name=COLLECTION_NAME,
                query=query_embedding,
                limit=6
            ).points
            if not results:
                return {"answer": "Answer not found in uploaded notes.", "sources_used": []}
            context = "\n".join([r.payload["text"] for r in results[:4] if "text" in r.payload])
            source_names = list(set(
                pdf_store[r.payload["pdf_id"]]["name"]
                for r in results
                if r.payload.get("pdf_id") in pdf_store
            ))

        if not context.strip():
            return {"answer": "No relevant content found in selected documents.", "sources_used": source_names}

        prompt = f"""You are a helpful study assistant. Answer using ONLY the provided notes.

RULES:
1. If the answer is not in the notes, say: "Answer not found in uploaded notes."
2. Cite which document(s) your answer comes from when possible.
3. Be concise but thorough.

NOTES:
{context}

QUESTION:
{question}

ANSWER:"""

        answer = ask_llm(prompt)
        return {"answer": answer, "sources_used": source_names}
    except Exception as e:
        print(f"Ask error: {e}")
        raise HTTPException(status_code=500, detail=f"Question answering failed: {str(e)}")


@router.post("/summary")
async def summary(req: SummaryRequest):
    pdf_ids = req.get_valid_ids()
    valid_ids = [pid for pid in pdf_ids if pid in pdf_store]

    if not valid_ids:
        raise HTTPException(status_code=404, detail="No valid PDFs found.")

    try:
        all_docs = []
        for pid in valid_ids:
            docs = fetch_docs_by_pdf_id(pdf_id=pid, limit=20)
            all_docs.extend(docs)

        if not all_docs:
            raise HTTPException(status_code=404, detail="No content found")

        context = "\n".join(all_docs[:60])
        source_names = [pdf_store[pid]["name"] for pid in valid_ids]

        prompt = f"""Create a structured summary from these study notes.

Include:
- Overall Title
- Key Concepts
- Important Points
- Revision Notes
- Important Definitions

SOURCES:
{context}"""

        summary_text = ask_llm(prompt)
        return {"summary": summary_text, "sources_used": source_names}
    except Exception as e:
        print(f"Summary error: {e}")
        raise HTTPException(status_code=500, detail=f"Summary generation failed: {str(e)}")


@router.post("/extract-text")
async def extract_text(file: UploadFile = File(...)):
    try:
        path = str(UPLOADS_DIR / f"{uuid.uuid4()}_{file.filename}")
        with open(path, "wb") as f:
            f.write(await file.read())
        pages = extract_pages(path)
        text = "\n".join([p["text"] for p in pages])
        if os.path.exists(path):
            os.remove(path)
        return {"text": text}
    except Exception as e:
        print(f"Text extraction error: {e}")
        raise HTTPException(status_code=500, detail=f"Text extraction failed: {str(e)}")


@router.post("/quiz")
async def quiz(req: QuizRequest):
    pdf_ids = req.get_valid_ids()
    valid_ids = [pid for pid in pdf_ids if pid in pdf_store]

    if not valid_ids:
        raise HTTPException(status_code=404, detail="No valid PDFs found.")

    try:
        context = get_context_from_pdfs(valid_ids, max_chunks=45, max_chars=5500)
        source_names = [pdf_store[pid]["name"] for pid in valid_ids]

        pyq_section = ""
        if req.mode == "Notes + PYQ" and req.pyq_text:
            pyq_section = f"\n\nPREVIOUS YEAR QUESTION PATTERNS:\n{req.pyq_text[:1500]}"

        prompt = f"""You are an expert educational content creator.

Generate EXACTLY 10 {req.difficulty} level MCQs.

RETURN ONLY VALID JSON ARRAY. NO MARKDOWN. NO EXTRA TEXT.

FORMAT:
[
  {{
    "question": "Question text",
    "options": ["A. Option", "B. Option", "C. Option", "D. Option"],
    "answer": "A",
    "explanation": "Brief explanation (200-400 chars)"
  }}
]

STRICT RULES:
- EXACTLY 10 questions
- EXACTLY 4 options per question
- Answer must be A, B, C, or D
- Explanation must be 200-400 characters

CONTENT:
{context}
{pyq_section}"""

        quiz_data = generate_quiz_with_retry(prompt)

        if not quiz_data:
            return {"quiz": [], "error": "Quiz generation failed after retries", "sources_used": source_names}

        return {"quiz": quiz_data, "sources_used": source_names, "difficulty": req.difficulty}
    except Exception as e:
        print(f"Quiz error: {e}")
        raise HTTPException(status_code=500, detail=f"Quiz generation failed: {str(e)}")


@router.get("/pdfs")
async def list_pdfs():
    return {
        "pdfs": [
            {"id": k, "name": v["name"], "chunks": v.get("chunks", 0)}
            for k, v in pdf_store.items()
        ]
    }


@router.delete("/pdf/{pdf_id}")
async def delete_pdf(pdf_id: str):
    if pdf_id not in pdf_store:
        raise HTTPException(status_code=404, detail="PDF not found")
    try:
        path = pdf_store[pdf_id]["path"]
        if os.path.exists(path):
            os.remove(path)
        qdrant.delete(
            collection_name=COLLECTION_NAME,
            points_selector=Filter(
                must=[FieldCondition(key="pdf_id", match=MatchValue(value=pdf_id))]
            )
        )
        del pdf_store[pdf_id]
        save_pdf_store()
        return {"status": "success", "message": f"Deleted {pdf_id}"}
    except Exception as e:
        print(f"Delete error: {e}")
        raise HTTPException(status_code=500, detail=f"Deletion failed: {str(e)}")


# =========================================================
# MOUNT ROUTER + SERVE FRONTEND
# =========================================================

app.include_router(router, prefix="/api")

if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="assets")


@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    index = STATIC_DIR / "index.html"
    if not index.exists():
        return {"message": "Frontend not built. Run: cd frontend && npm run build"}
    candidate = STATIC_DIR / full_path
    if candidate.exists() and candidate.is_file():
        return FileResponse(str(candidate))
    return FileResponse(str(index))
