
# =========================================================
# LearnLens API - Qdrant Version (Fixed)
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

import fitz  # PyMuPDF
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
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY not found in environment variables")

# =========================================================
# FASTAPI APP
# =========================================================

app = FastAPI(title="LearnLens API", version="3.1")

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

# Use local storage for development
qdrant = QdrantClient(path="./qdrant_data")

COLLECTION_NAME = "learnlens_chunks"

def init_qdrant_collection():
    """Initialize Qdrant collection if it doesn't exist."""
    try:
        existing_collections = [c.name for c in qdrant.get_collections().collections]
        
        if COLLECTION_NAME not in existing_collections:
            qdrant.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(
                    size=384,  # all-MiniLM-L6-v2 embedding dimension
                    distance=Distance.COSINE
                )
            )
            print(f"✅ Created Qdrant collection: {COLLECTION_NAME}")
    except Exception as e:
        print(f"⚠️ Qdrant init warning: {e}")

# Initialize on startup
init_qdrant_collection()

# =========================================================
# EMBEDDING MODEL
# =========================================================

print("🔄 Loading embedding model...")
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
print("✅ Embedding model loaded")

# =========================================================
# TEMP PDF STORE (in-memory)
# =========================================================

pdf_store = {}

# =========================================================
# PYDANTIC MODELS
# =========================================================

class PDFSelectionMixin(BaseModel):
    """Accepts either pdf_id (single) or pdf_ids (list)."""
    pdf_id: Optional[str] = None
    pdf_ids: Optional[List[str]] = None

    def get_valid_ids(self) -> List[str]:
        ids = self.pdf_ids or ([self.pdf_id] if self.pdf_id else [])
        return list(dict.fromkeys(ids))  # Remove duplicates, preserve order


class QuizRequest(PDFSelectionMixin):
    difficulty: str = Field(default="Medium", description="Easy, Medium, Hard")
    mode: str = Field(default="Notes Only", description="Notes Only or Notes + PYQ")
    pyq_text: Optional[str] = Field(default="", description="Previous year question patterns")


class SummaryRequest(PDFSelectionMixin):
    pass


class AskRequest(PDFSelectionMixin):
    question: str = Field(..., min_length=3, description="Question to ask")

# =========================================================
# HELPERS
# =========================================================

def clean_text(text: str) -> str:
    """Normalize whitespace in text."""
    return re.sub(r"\s+", " ", text).strip()


def extract_pages(path: str) -> List[dict]:
    """Extract text from PDF pages with error handling."""
    try:
        doc = fitz.open(path)
        pages = []
        
        for i in range(len(doc)):
            text = clean_text(doc[i].get_text())
            if text and len(text.strip()) > 50:  # Skip very short pages
                pages.append({"page": i + 1, "text": text})
        
        doc.close()
        print(f"📄 Extracted {len(pages)} pages from PDF")
        return pages
    except Exception as e:
        print(f"❌ PDF extraction error: {e}")
        raise


def chunk_text(text: str, chunk_size: int = 220, overlap: int = 30) -> List[str]:
    """Split text into overlapping chunks for better context."""
    words = text.split()
    chunks = []
    
    for i in range(0, len(words), chunk_size - overlap):
        chunk = " ".join(words[i:i + chunk_size])
        if chunk.strip():
            chunks.append(chunk)
    
    return chunks


def ask_llm(prompt: str) -> str:
    """Send prompt to Groq LLM with error handling."""
    try:
        completion = groq_client.chat.completions.create(
            model=LLM_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=2048
        )
        return completion.choices[0].message.content.strip()
    except Exception as e:
        print(f"❌ LLM error: {e}")
        raise


def extract_json(raw: str):
    """Safely extract JSON array from LLM output."""
    try:
        raw = re.sub(r"```(?:json)?\s*", "", raw).replace("```", "").strip()
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if match:
            return json.loads(match.group(0))
    except Exception:
        pass
    return None


def validate_quiz(quiz: list) -> bool:
    """Validate generated quiz structure."""
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
    """Retry quiz generation with exponential backoff."""
    for attempt in range(max_retries):
        try:
            raw = ask_llm(prompt)
            quiz = extract_json(raw)
            if validate_quiz(quiz):
                return quiz
            print(f"⚠️ Quiz validation failed (attempt {attempt + 1})")
        except Exception as e:
            print(f"⚠️ Quiz generation error (attempt {attempt + 1}): {e}")
    return []


def fetch_docs_by_pdf_id(pdf_id: str, limit: int = 20) -> List[str]:
    """Fetch text chunks for a specific PDF from Qdrant."""
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
        print(f"⚠️ Fetch error for {pdf_id}: {e}")
        return []


def get_context_from_pdfs(pdf_ids: List[str], max_chunks: int = 45, max_chars: int = 5500) -> str:
    """Aggregate content from multiple PDFs with source labeling."""
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
    """Semantic search for question within selected PDFs."""
    try:
        query_embedding = embedding_model.encode(question).tolist()
        all_relevant_docs = []
        
        for pid in pdf_ids:
            if pid not in pdf_store:
                continue
            results = qdrant.search(
                collection_name=COLLECTION_NAME,
                query_vector=query_embedding,
                limit=max_chunks_per_pdf,
                scroll_filter=Filter(
                    must=[FieldCondition(key="pdf_id", match=MatchValue(value=pid))]
                )
            )
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
        print(f"⚠️ Context retrieval error: {e}")
        return ""


# =========================================================
# API ROUTES
# =========================================================

@app.get("/")
async def root():
    return {"message": "LearnLens API Running with Qdrant", "version": "3.1"}


@app.get("/health")
async def health_check():
    """Health check endpoint for debugging."""
    try:
        collections = qdrant.get_collections()
        return {
            "status": "healthy",
            "qdrant": "connected",
            "collections": len(collections.collections),
            "indexed_pdfs": len(pdf_store),
            "collection_name": COLLECTION_NAME
        }
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    """Upload a PDF file and store metadata."""
    try:
        os.makedirs("uploads", exist_ok=True)
        pdf_id = str(uuid.uuid4())
        path = f"uploads/{pdf_id}_{file.filename}"
        
        content = await file.read()
        with open(path, "wb") as f:
            f.write(content)
        
        pdf_store[pdf_id] = {"name": file.filename, "path": path}
        print(f"✅ Uploaded: {file.filename} → {pdf_id}")
        
        return {"pdf_id": pdf_id, "name": file.filename}
    except Exception as e:
        print(f"❌ Upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@app.post("/ingest")
async def ingest(data: dict):
    """Extract, chunk, embed, and index PDF content in Qdrant."""
    pdf_id = data.get("pdf_id")
    
    if not pdf_id or pdf_id not in pdf_store:
        raise HTTPException(status_code=404, detail="Invalid or missing pdf_id")
    
    file_info = pdf_store[pdf_id]
    print(f"🔄 Starting ingestion for: {file_info['name']} ({pdf_id})")
    
    try:
        # Step 1: Extract pages
        pages = extract_pages(file_info["path"])
        if not pages:
            raise ValueError("No text content extracted from PDF")
        
        # Step 2: Chunk text
        all_chunks = []
        all_metadatas = []
        
        for page in pages:
            chunks = chunk_text(page["text"])
            for chunk in chunks:
                all_chunks.append(chunk)
                all_metadatas.append({"pdf_id": pdf_id, "page": page["page"]})
        
        print(f"📦 Created {len(all_chunks)} chunks")
        
        if not all_chunks:
            raise ValueError("No chunks generated from PDF")
        
        # Step 3: Generate embeddings (batched)
        print("🧮 Generating embeddings...")
        embeddings = embedding_model.encode(
            all_chunks, 
            batch_size=32, 
            show_progress_bar=False
        ).tolist()
        
        # Step 4: Prepare Qdrant points
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
        
        # Step 5: Upsert to Qdrant
        print("💾 Indexing in Qdrant...")
        qdrant.upsert(collection_name=COLLECTION_NAME, points=points)
        
        print(f"✅ Ingestion complete: {len(points)} chunks indexed")
        return {"status": "success", "chunks_added": len(points), "pdf_id": pdf_id}
        
    except Exception as e:
        print(f"❌ Ingestion failed: {e}")
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")


@app.post("/ask")
async def ask(req: AskRequest):
    """Answer questions using RAG from selected PDFs."""
    question = req.question.strip()
    pdf_ids = req.get_valid_ids()
    valid_ids = [pid for pid in pdf_ids if pid in pdf_store]
    
    try:
        # Get relevant context
        if valid_ids:
            context = get_relevant_context_for_question(
                question=question,
                pdf_ids=valid_ids,
                max_chunks_per_pdf=4,
                max_total_chars=4000
            )
            source_names = [pdf_store[pid]["name"] for pid in valid_ids]
        else:
            # Global search fallback
            query_embedding = embedding_model.encode(question).tolist()
            results = qdrant.search(
                collection_name=COLLECTION_NAME,
                query_vector=query_embedding,
                limit=6
            )
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
        
        # Build prompt
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
        print(f"❌ Ask error: {e}")
        raise HTTPException(status_code=500, detail=f"Question answering failed: {str(e)}")


@app.post("/summary")
async def summary(req: SummaryRequest):
    """Generate structured summary from selected PDFs."""
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
        
        prompt = f"""Create a structured summary from these documents.

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
        print(f"❌ Summary error: {e}")
        raise HTTPException(status_code=500, detail=f"Summary generation failed: {str(e)}")


@app.post("/extract-text")
async def extract_text(file: UploadFile = File(...)):
    """Extract raw text from a PDF (for PYQ processing)."""
    try:
        os.makedirs("uploads", exist_ok=True)
        path = f"uploads/{uuid.uuid4()}_{file.filename}"
        
        with open(path, "wb") as f:
            f.write(await file.read())
        
        pages = extract_pages(path)
        text = "\n".join([p["text"] for p in pages])
        
        # Clean up temporary file
        if os.path.exists(path):
            os.remove(path)
        
        return {"text": text}
    except Exception as e:
        print(f"❌ Text extraction error: {e}")
        raise HTTPException(status_code=500, detail=f"Text extraction failed: {str(e)}")


@app.post("/quiz")
async def quiz(req: QuizRequest):
    """Generate MCQ quiz from selected PDFs."""
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
    "explanation": "Brief explanation (30-400 chars)"
  }}
]

STRICT RULES:
- EXACTLY 10 questions
- EXACTLY 4 options per question
- Answer must be A, B, C, or D
- Explanation must be 30-400 characters

CONTENT:
{context}
{pyq_section}"""
        
        quiz = generate_quiz_with_retry(prompt)
        
        if not quiz:
            return {"quiz": [], "error": "Quiz generation failed after retries", "sources_used": source_names}
        
        return {"quiz": quiz, "sources_used": source_names, "difficulty": req.difficulty}
        
    except Exception as e:
        print(f"❌ Quiz error: {e}")
        raise HTTPException(status_code=500, detail=f"Quiz generation failed: {str(e)}")


@app.get("/pdfs")
async def list_pdfs():
    """List all indexed PDFs."""
    return {
        "pdfs": [
            {"id": k, "name": v["name"]}
            for k, v in pdf_store.items()
        ]
    }


@app.delete("/pdf/{pdf_id}")
async def delete_pdf(pdf_id: str):
    """Delete a PDF and its indexed content."""
    if pdf_id not in pdf_store:
        raise HTTPException(status_code=404, detail="PDF not found")
    
    try:
        # Delete local file
        path = pdf_store[pdf_id]["path"]
        if os.path.exists(path):
            os.remove(path)
            print(f"🗑️ Deleted file: {path}")
        
        # Delete from Qdrant
        qdrant.delete(
            collection_name=COLLECTION_NAME,
            points_selector=Filter(
                must=[FieldCondition(key="pdf_id", match=MatchValue(value=pdf_id))]
            )
        )
        print(f"🗑️ Deleted from Qdrant: {pdf_id}")
        
        # Remove from memory
        del pdf_store[pdf_id]
        
        return {"status": "success", "message": f"Deleted {pdf_id}"}
        
    except Exception as e:
        print(f"❌ Delete error: {e}")
        raise HTTPException(status_code=500, detail=f"Deletion failed: {str(e)}")
