
# =========================================================
# LearnLens API  —  v4.0  (with authentication)
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
import secrets
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from urllib.parse import quote as url_quote

import pathlib
from contextlib import asynccontextmanager

import httpx
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError

from fastapi import APIRouter, FastAPI, UploadFile, File, HTTPException, Depends, Request, Response
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
    PayloadSchemaType,
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

BASE_DIR      = pathlib.Path(__file__).parent
PDF_STORE_PATH = BASE_DIR / "pdf_store.json"
UPLOADS_DIR   = BASE_DIR / "uploads"
STATIC_DIR    = BASE_DIR.parent / "frontend" / "dist"

COLLECTION_NAME = "learnlens_chunks"

# =========================================================
# AUTH CONFIG
# =========================================================

# SUPABASE_URL may end with /rest/v1/ — strip trailing slash for clean concat
SUPABASE_BASE = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY  = os.getenv("SUPABASE_KEY", "")
FRONTEND_URL  = os.getenv("FRONTEND_URL", "https://your-frontend.vercel.app")

SESSION_COOKIE_NAME = "ll_session"
SESSION_TTL_DAYS    = 30
COOKIE_SECURE       = os.getenv("COOKIE_SECURE", "false").lower() == "true"
COOKIE_SAMESITE     = os.getenv("COOKIE_SAMESITE", "lax")

ph = PasswordHasher()

if not SUPABASE_BASE or not SUPABASE_KEY:
    print("WARNING: SUPABASE_URL or SUPABASE_KEY not set — auth endpoints will fail")

# =========================================================
# LAZY GLOBALS  (initialised in lifespan)
# =========================================================

qdrant: QdrantClient             = None
embedding_model: SentenceTransformer = None
sb: httpx.AsyncClient            = None

# =========================================================
# PDF STORE  — persisted to pdf_store.json
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
# SUPABASE HELPERS  (thin PostgREST wrappers)
# =========================================================

async def sb_select(table: str, query: str = "") -> list:
    url = f"{SUPABASE_BASE}/{table}"
    if query:
        url += f"?{query}"
    r = await sb.get(url)
    r.raise_for_status()
    return r.json()


async def sb_insert(table: str, data: dict) -> dict:
    r = await sb.post(
        f"{SUPABASE_BASE}/{table}",
        json=data,
        headers={"Prefer": "return=representation"},
    )
    r.raise_for_status()
    result = r.json()
    return result[0] if isinstance(result, list) else result


async def sb_delete_where(table: str, query: str) -> None:
    await sb.delete(f"{SUPABASE_BASE}/{table}?{query}")


# =========================================================
# AUTH HELPERS
# =========================================================

def hash_password(plain: str) -> str:
    return ph.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        ph.verify(hashed, plain)
        return True
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite=COOKIE_SAMESITE,
        secure=COOKIE_SECURE,
        max_age=SESSION_TTL_DAYS * 86400,
        path="/",
    )


async def get_current_user(request: Request) -> dict:
    """FastAPI dependency — returns the authenticated user or raises 401."""
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        sessions = await sb_select("ll_sessions", f"token=eq.{url_quote(token)}")
    except Exception:
        raise HTTPException(status_code=401, detail="Session validation failed")

    if not sessions:
        raise HTTPException(status_code=401, detail="Invalid session")

    session = sessions[0]
    try:
        expires_at = datetime.fromisoformat(
            session.get("expires_at", "").replace("Z", "+00:00")
        )
    except ValueError:
        raise HTTPException(status_code=401, detail="Malformed session")

    if expires_at < datetime.now(timezone.utc):
        try:
            await sb_delete_where("ll_sessions", f"token=eq.{url_quote(token)}")
        except Exception:
            pass
        raise HTTPException(status_code=401, detail="Session expired")

    try:
        users = await sb_select(
            "ll_users",
            f"id=eq.{session['user_id']}&select=id,email,name",
        )
    except Exception:
        raise HTTPException(status_code=401, detail="User lookup failed")

    if not users:
        raise HTTPException(status_code=401, detail="User not found")

    return users[0]


# =========================================================
# LIFESPAN
# =========================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    global qdrant, embedding_model, sb

    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

    sb = httpx.AsyncClient(
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
        },
        timeout=15.0,
    )

    qdrant = QdrantClient(
        url=QDRANT_URL,
        api_key=QDRANT_API_KEY,
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
        print(f"Created Qdrant collection: {COLLECTION_NAME}")
    qdrant.create_payload_index(
        collection_name=COLLECTION_NAME,
        field_name="pdf_id",
        field_schema=PayloadSchemaType.KEYWORD,
    )

    print("Loading embedding model...")
    embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
    print("Embedding model loaded")

    yield
    await sb.aclose()
    qdrant.close()


# =========================================================
# FASTAPI APP
# =========================================================

app = FastAPI(title="LearnLens API", version="4.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", FRONTEND_URL],
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


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., min_length=5, max_length=200)
    password: str = Field(..., min_length=8, max_length=200)


class LoginRequest(BaseModel):
    email: str
    password: str


# =========================================================
# HELPERS  (unchanged from v3)
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
        chunk = " ".join(words[i : i + chunk_size])
        if chunk.strip():
            chunks.append(chunk)
    return chunks


def ask_llm(prompt: str) -> str:
    try:
        completion = groq_client.chat.completions.create(
            model=LLM_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=2048,
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
            with_payload=True,
        )[0]
        return [r.payload["text"] for r in results if "text" in r.payload]
    except Exception as e:
        print(f"Fetch error for {pdf_id}: {e}")
        return []


def get_context_from_pdfs(
    pdf_ids: List[str], max_chunks: int = 45, max_chars: int = 5500
) -> str:
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
        context = context[:max_chars].rsplit(".", 1)[0] + "."
    return context


def get_relevant_context_for_question(
    question: str,
    pdf_ids: List[str],
    max_chunks_per_pdf: int = 4,
    max_total_chars: int = 4000,
) -> str:
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
                ),
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
            context = context[:max_total_chars].rsplit(".", 1)[0] + "."
        return context
    except Exception as e:
        print(f"Context retrieval error: {e}")
        return ""


def _user_pdfs(user_id: str) -> List[str]:
    """Return pdf_ids owned by this user."""
    return [pid for pid, v in pdf_store.items() if v.get("user_id") == user_id]


# =========================================================
# AUTH ROUTES
# =========================================================

_EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$")


@router.post("/auth/register")
async def register(req: RegisterRequest, response: Response):
    email = req.email.strip().lower()
    name = req.name.strip()

    if not _EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Invalid email address")

    try:
        existing = await sb_select("ll_users", f"email=eq.{url_quote(email)}&select=id")
    except Exception:
        raise HTTPException(status_code=500, detail="Registration failed. Please try again.")

    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    try:
        user = await sb_insert("ll_users", {
            "email": email,
            "name": name,
            "password_hash": hash_password(req.password),
        })
    except Exception:
        raise HTTPException(status_code=500, detail="Registration failed. Please try again.")

    token = secrets.token_urlsafe(32)
    expires_at = (datetime.now(timezone.utc) + timedelta(days=SESSION_TTL_DAYS)).isoformat()

    try:
        await sb_insert("ll_sessions", {
            "user_id": user["id"],
            "token": token,
            "expires_at": expires_at,
        })
    except Exception:
        raise HTTPException(status_code=500, detail="Session creation failed")

    _set_session_cookie(response, token)
    return {"authenticated": True, "user": {"id": user["id"], "name": user["name"], "email": user["email"]}}


@router.post("/auth/login")
async def login(req: LoginRequest, response: Response):
    email = req.email.strip().lower()

    try:
        users = await sb_select(
            "ll_users",
            f"email=eq.{url_quote(email)}&select=id,name,email,password_hash",
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Login failed. Please try again.")

    if not users or not verify_password(req.password, users[0]["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user = users[0]
    token = secrets.token_urlsafe(32)
    expires_at = (datetime.now(timezone.utc) + timedelta(days=SESSION_TTL_DAYS)).isoformat()

    try:
        await sb_insert("ll_sessions", {
            "user_id": user["id"],
            "token": token,
            "expires_at": expires_at,
        })
    except Exception:
        raise HTTPException(status_code=500, detail="Session creation failed")

    _set_session_cookie(response, token)
    return {"authenticated": True, "user": {"id": user["id"], "name": user["name"], "email": user["email"]}}


@router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if token:
        try:
            await sb_delete_where("ll_sessions", f"token=eq.{url_quote(token)}")
        except Exception:
            pass
    response.delete_cookie(SESSION_COOKIE_NAME, path="/", samesite=COOKIE_SAMESITE)
    return {"ok": True}


@router.get("/auth/me")
async def me(request: Request):
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        return {"authenticated": False}

    try:
        sessions = await sb_select("ll_sessions", f"token=eq.{url_quote(token)}")
        if not sessions:
            return {"authenticated": False}

        session = sessions[0]
        try:
            expires_at = datetime.fromisoformat(
                session.get("expires_at", "").replace("Z", "+00:00")
            )
        except ValueError:
            return {"authenticated": False}

        if expires_at < datetime.now(timezone.utc):
            try:
                await sb_delete_where("ll_sessions", f"token=eq.{url_quote(token)}")
            except Exception:
                pass
            return {"authenticated": False}

        users = await sb_select(
            "ll_users", f"id=eq.{session['user_id']}&select=id,name,email"
        )
        if not users:
            return {"authenticated": False}

        u = users[0]
        return {"authenticated": True, "user": {"id": u["id"], "name": u["name"], "email": u["email"]}}
    except Exception:
        return {"authenticated": False}


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
async def upload(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    try:
        pdf_id = str(uuid.uuid4())
        path = str(UPLOADS_DIR / f"{pdf_id}_{file.filename}")
        content = await file.read()
        with open(path, "wb") as f:
            f.write(content)
        pdf_store[pdf_id] = {
            "name": file.filename,
            "path": path,
            "user_id": current_user["id"],
        }
        save_pdf_store()
        print(f"Uploaded: {file.filename} -> {pdf_id}")
        return {"pdf_id": pdf_id, "name": file.filename}
    except Exception as e:
        print(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.post("/ingest")
async def ingest(data: dict, current_user: dict = Depends(get_current_user)):
    pdf_id = data.get("pdf_id")
    if not pdf_id or pdf_id not in pdf_store:
        raise HTTPException(status_code=404, detail="Invalid or missing pdf_id")

    if pdf_store[pdf_id].get("user_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    file_info = pdf_store[pdf_id]
    print(f"Starting ingestion for: {file_info['name']} ({pdf_id})")

    try:
        pages = extract_pages(file_info["path"])
        if not pages:
            raise ValueError("No text content extracted from PDF")

        all_chunks, all_metadatas = [], []
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
                    "page": all_metadatas[i]["page"],
                },
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
async def ask(req: AskRequest, current_user: dict = Depends(get_current_user)):
    question = req.question.strip()
    user_id = current_user["id"]

    # Only allow PDFs this user owns
    requested = req.get_valid_ids()
    valid_ids = [pid for pid in requested if pid in pdf_store and pdf_store[pid].get("user_id") == user_id]

    try:
        if valid_ids:
            context = get_relevant_context_for_question(
                question=question,
                pdf_ids=valid_ids,
                max_chunks_per_pdf=4,
                max_total_chars=4000,
            )
            source_names = [pdf_store[pid]["name"] for pid in valid_ids]
        else:
            owned = _user_pdfs(user_id)
            if not owned:
                return {"answer": "No documents indexed yet. Upload and index a PDF first.", "sources_used": []}
            query_embedding = embedding_model.encode(question).tolist()
            results = qdrant.query_points(
                collection_name=COLLECTION_NAME,
                query=query_embedding,
                limit=6,
                query_filter=Filter(
                    should=[FieldCondition(key="pdf_id", match=MatchValue(value=pid)) for pid in owned]
                ),
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
async def summary(req: SummaryRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    requested = req.get_valid_ids()
    valid_ids = [pid for pid in requested if pid in pdf_store and pdf_store[pid].get("user_id") == user_id]

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
async def extract_text(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
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
async def quiz(req: QuizRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    requested = req.get_valid_ids()
    valid_ids = [pid for pid in requested if pid in pdf_store and pdf_store[pid].get("user_id") == user_id]

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
async def list_pdfs(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    return {
        "pdfs": [
            {"id": k, "name": v["name"], "chunks": v.get("chunks", 0)}
            for k, v in pdf_store.items()
            if v.get("user_id") == user_id
        ]
    }


@router.delete("/pdf/{pdf_id}")
async def delete_pdf(pdf_id: str, current_user: dict = Depends(get_current_user)):
    if pdf_id not in pdf_store:
        raise HTTPException(status_code=404, detail="PDF not found")

    if pdf_store[pdf_id].get("user_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        path = pdf_store[pdf_id]["path"]
        if os.path.exists(path):
            os.remove(path)
        qdrant.delete(
            collection_name=COLLECTION_NAME,
            points_selector=Filter(
                must=[FieldCondition(key="pdf_id", match=MatchValue(value=pdf_id))]
            ),
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
