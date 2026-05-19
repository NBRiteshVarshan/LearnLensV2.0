# LearnLens V2.0 — Concepts & Architecture Reference

A deep-dive into every concept, technology, and design decision in this codebase.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [RAG — Retrieval-Augmented Generation](#3-rag--retrieval-augmented-generation)
4. [Text Chunking](#4-text-chunking)
5. [Embeddings & Semantic Search](#5-embeddings--semantic-search)
6. [Vector Database — ChromaDB](#6-vector-database--chromadb)
7. [Large Language Models — Groq & LLaMA](#7-large-language-models--groq--llama)
8. [PDF Processing — PyMuPDF](#8-pdf-processing--pymupdf)
9. [Backend Framework — FastAPI](#9-backend-framework--fastapi)
10. [Pydantic — Data Validation](#10-pydantic--data-validation)
11. [CORS — Cross-Origin Resource Sharing](#11-cors--cross-origin-resource-sharing)
12. [Frontend Framework — React](#12-frontend-framework--react)
13. [Build Tool — Vite](#13-build-tool--vite)
14. [React Hooks](#14-react-hooks)
15. [Component Architecture](#15-component-architecture)
16. [Design System & CSS Variables](#16-design-system--css-variables)
17. [CSS Animations & Keyframes](#17-css-animations--keyframes)
18. [REST API Design](#18-rest-api-design)
19. [Multi-PDF Support](#19-multi-pdf-support)
20. [Quiz Generation & Validation Loop](#20-quiz-generation--validation-loop)
21. [Prompt Engineering](#21-prompt-engineering)
22. [PYQ (Previous Year Questions) Mode](#22-pyq-previous-year-questions-mode)
23. [In-Memory State Management](#23-in-memory-state-management)
24. [Environment Variables & Configuration](#24-environment-variables--configuration)
25. [UUID — Unique Identifiers](#25-uuid--unique-identifiers)
26. [Context Limiting & Hallucination Prevention](#26-context-limiting--hallucination-prevention)
27. [Dependency Injection Pattern](#27-dependency-injection-pattern)
28. [JSON Enforcement & Parsing Resilience](#28-json-enforcement--parsing-resilience)
29. [Typography & Google Fonts](#29-typography--google-fonts)
30. [Full-Stack Communication Pattern](#30-full-stack-communication-pattern)

---

## 1. Project Overview

**LearnLens V2.0** is an AI-powered study assistant that turns uploaded PDF documents into an interactive learning experience. Users can:

- Upload one or more PDF study materials
- Ask natural-language questions and get answers grounded in their notes
- Generate concise summaries that synthesize content across multiple documents
- Generate 10-question MCQ quizzes with difficulty control and optional Previous Year Question (PYQ) pattern learning

The system is built as a **decoupled full-stack application**: a Python backend exposes a REST API, and a React frontend consumes it. All AI logic lives in the backend; the frontend is purely presentational.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (React)                          │
│  Upload → Ingest → Chat / Summary / Quiz                        │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP (JSON)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend (Python)                      │
│                                                                 │
│  /upload  /ingest  /ask  /summary  /quiz  /pdfs  /pdf/{id}     │
│                                                                 │
│  ┌─────────────┐   ┌───────────────┐   ┌─────────────────────┐ │
│  │  PyMuPDF    │   │ sentence-     │   │     Groq API        │ │
│  │  (PDF text) │   │ transformers  │   │  llama-3.3-70b      │ │
│  └─────────────┘   │ (embeddings)  │   └─────────────────────┘ │
│                    └──────┬────────┘                            │
│                           │                                     │
│                    ┌──────▼────────┐                            │
│                    │   ChromaDB    │                            │
│                    │ (vector store)│                            │
│                    └───────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

The flow for every AI feature is the same three-step RAG pipeline: **retrieve relevant context → augment the prompt → generate a response**.

---

## 3. RAG — Retrieval-Augmented Generation

RAG is the core architectural pattern of this entire application. Without it, the LLM would answer questions from its general training knowledge and hallucinate content that may not be in the user's notes.

**The problem RAG solves**: LLMs have a fixed training cutoff and cannot "read" a specific document unless you give it the text. But you also cannot feed an entire 300-page textbook into every prompt — there are token limits, and it is expensive.

**RAG's solution**: Only retrieve the most relevant *excerpts* from the document for each query, and inject just those excerpts into the prompt. The LLM now has grounded context and is instructed to answer only from it.

### Step-by-step RAG pipeline in LearnLens

```
1. INGEST (done once per document)
   PDF file
     → extract raw text (PyMuPDF)
     → split into 220-word chunks
     → embed each chunk (all-MiniLM-L6-v2 → 384-dim vector)
     → store (vector, text, metadata) in ChromaDB

2. RETRIEVE (done at query time)
   User question
     → embed the question (same model → 384-dim vector)
     → cosine similarity search in ChromaDB
     → return top-K most similar text chunks

3. GENERATE (done at query time)
   Relevant chunks + User question
     → assemble a prompt ("Answer based only on the following context: ...")
     → send to Groq API (LLaMA 3.3 70B)
     → stream response back to user
```

Each feature (ask, summary, quiz) uses a variation of this pipeline with different retrieval counts and different prompt templates.

---

## 4. Text Chunking

Before text can be embedded and stored, it must be split into manageable pieces called **chunks**. This is a critical decision that affects retrieval quality.

**Why chunk at all?** Embedding an entire document produces a single vector that averages the meaning of everything. Searching it returns the whole document or nothing — it cannot pinpoint the paragraph that answers a specific question.

**LearnLens chunking strategy**: Fixed-size word-count windows of **220 words**.

```python
words = text.split()
chunks = []
for i in range(0, len(words), chunk_size):
    chunk = " ".join(words[i:i + chunk_size])
    if chunk.strip():
        chunks.append(chunk)
```

**Why 220 words?** It is a deliberate balance:
- Too small (< 50 words): Each chunk loses context; individual sentences are ambiguous out of context.
- Too large (> 500 words): The embedding averages too much meaning; a chunk might contain multiple unrelated topics, reducing retrieval precision.
- 220 words (~1 paragraph) captures a complete concept while staying semantically focused.

**Page tracking**: Each chunk is tagged with the page number it came from so the metadata can later reference the source.

---

## 5. Embeddings & Semantic Search

**Embeddings** are numerical representations of text as high-dimensional vectors. The key property is that *semantically similar text produces numerically similar vectors*.

### Model: all-MiniLM-L6-v2

This is a lightweight sentence-transformer model from Hugging Face. It converts any text into a **384-dimensional float vector**.

- "MiniLM" = a distilled (compressed) version of BERT, optimised for speed.
- "L6" = 6 transformer layers.
- "v2" = second iteration with improved training.

It was fine-tuned on millions of sentence pairs using contrastive learning — pairs of semantically similar sentences were pulled closer together in vector space, and dissimilar sentences were pushed apart.

### Why use an embedding model instead of keyword search?

| Keyword search | Semantic search |
|---|---|
| Requires exact word match | Understands meaning |
| "photosynthesis" ≠ "how plants make food" | "photosynthesis" ≈ "how plants make food" |
| Sensitive to synonyms and phrasing | Robust to rephrasing |
| No understanding of context | Context-aware |

A student asking *"why do plants look green?"* will retrieve chunks about chlorophyll and light absorption even if the word "green" never appears in the document — because the *meaning* is similar.

### Cosine Similarity

ChromaDB compares the query vector to stored chunk vectors using **cosine similarity**:

```
similarity = (A · B) / (|A| × |B|)
```

- Returns a value between -1 and 1.
- 1 = identical direction (semantically identical).
- 0 = orthogonal (unrelated).
- ChromaDB returns the top-K chunks with the highest similarity score.

---

## 6. Vector Database — ChromaDB

ChromaDB is an open-source, embedded vector database purpose-built for AI applications. "Embedded" means it runs inside the same Python process — no separate database server to manage.

### What it stores

Each entry in ChromaDB has three parts:

| Field | Type | Content |
|---|---|---|
| `id` | string | Unique UUID for this chunk |
| `documents` | string | The raw text of the chunk |
| `embeddings` | float[] | 384-dimensional vector |
| `metadatas` | dict | `{"pdf_id": "...", "page": 3}` |

### Collection

All chunks are stored in a single **collection** named `learnlens_chunks`. A collection is analogous to a table in a relational database, but instead of rows matched by exact values, rows are matched by vector similarity.

### Operations used

- **`collection.add()`** — ingest phase: store a new chunk.
- **`collection.query()`** — retrieval phase: find top-K similar chunks given a query embedding.
- **`collection.delete()`** — when a PDF is deleted, remove all its associated chunks using a metadata filter (`where={"pdf_id": id}`).

### Persistence

ChromaDB is configured with `PersistentClient`, which writes data to disk. This means the vector store survives backend restarts (unlike the in-memory `pdf_store` dict — more on that below).

---

## 7. Large Language Models — Groq & LLaMA

### LLaMA 3.3 70B Versatile

**LLaMA** (Large Language Model Meta AI) is a family of open-weight transformer-based language models developed by Meta. The model used here is `llama-3.3-70b-versatile`:

- **70B** = 70 billion parameters — a very large model capable of nuanced reasoning, structured JSON output, and multi-document synthesis.
- **Versatile** = a general-purpose instruction-following variant (as opposed to a coding-specialised or math-specialised variant).
- **3.3** = third generation, third iteration — significant improvements over LLaMA 2 in instruction following, reasoning, and multilingual capability.

Transformer architecture (self-attention, feed-forward layers, tokenization) is how these models work. They predict the next token given all previous tokens, iteratively building up a response.

### Groq

Groq is an inference provider that runs LLaMA models on custom **LPU (Language Processing Unit)** hardware. The key advantage is **extreme inference speed** — often 10-20x faster than GPU-based providers. For an interactive app where users wait for quiz generation, low latency matters.

LearnLens uses the Groq Python SDK:

```python
client = Groq(api_key=os.getenv("GROQ_API_KEY"))
response = client.chat.completions.create(
    model="llama-3.3-70b-versatile",
    messages=[...],
    temperature=0.3,
)
```

### Temperature

**Temperature** controls the randomness of the LLM's output.

- Temperature = 0: Always picks the single most probable next token. Completely deterministic. Good for tasks requiring precise, factual answers.
- Temperature = 1: Samples proportionally from the probability distribution. Creative and varied.
- Temperature = 0.3 (used here): Slightly above deterministic. Factual and focused, with a small amount of variation to avoid robotic repetition.

For an educational tool where accuracy is paramount, 0.3 is a good choice — it prevents the model from being wildly creative while avoiding the extreme rigidity of temperature 0.

---

## 8. PDF Processing — PyMuPDF

**PyMuPDF** (imported as `fitz`) is a Python binding for the MuPDF C library. MuPDF is a lightweight, high-performance PDF/XPS/ebook renderer.

### How text extraction works

```python
doc = fitz.open(pdf_path)
for page_num, page in enumerate(doc):
    raw_text = page.get_text()
    # raw_text includes all printed text from that page
```

`get_text()` extracts text while preserving reading order. For scanned PDFs (images), it would return empty strings — this codebase assumes digitally-created PDFs (not scanned).

### Text cleaning

Raw PDF text often contains artifacts: multiple consecutive spaces, stray newlines inside sentences, etc. The code normalises whitespace:

```python
text = " ".join(text.split())
```

This collapses all whitespace (spaces, tabs, newlines) into single spaces, giving clean prose for chunking.

---

## 9. Backend Framework — FastAPI

**FastAPI** is a modern Python web framework for building REST APIs. It is built on top of **Starlette** (ASGI server) and uses **Pydantic** for data validation.

### Key features used

**Automatic OpenAPI documentation**: FastAPI auto-generates `/docs` (Swagger UI) and `/redoc` just from the type annotations on endpoints. This is useful for testing without a frontend.

**Async support**: FastAPI is built for `async def` endpoint handlers, enabling high concurrency without threads. However, CPU-bound tasks (like embedding generation) still block the event loop — in production these would be offloaded to a worker pool.

**Dependency injection**: FastAPI's `Depends()` system allows shared resources (like a database connection) to be injected into endpoints cleanly. This project doesn't use it heavily but the pattern is available.

**File uploads**: The `UploadFile` type handles multipart form data for the `/upload` endpoint.

```python
@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    ...
```

---

## 10. Pydantic — Data Validation

**Pydantic** is a Python library for data validation using Python type annotations. FastAPI uses it automatically to parse and validate request bodies.

### Models in this codebase

```python
class AskRequest(BaseModel):
    question: str = Field(..., min_length=3)
    pdf_id: Optional[str] = None
    pdf_ids: Optional[List[str]] = None

class QuizRequest(BaseModel):
    pdf_id: Optional[str] = None
    pdf_ids: Optional[List[str]] = None
    difficulty: str = "Medium"
    mode: str = "Notes Only"
    pyq_text: Optional[str] = ""
```

When FastAPI receives a POST request, Pydantic automatically:
1. Parses the JSON body into the model.
2. Validates types (e.g., `question` must be a string).
3. Checks constraints (e.g., `min_length=3`).
4. Returns a **422 Unprocessable Entity** response with descriptive errors if validation fails — without any manual `if/else` checking in the handler.

**`Optional[T]`** means the field can be `None` or omitted. This is used to support both `pdf_id` (single) and `pdf_ids` (list) for backwards compatibility.

---

## 11. CORS — Cross-Origin Resource Sharing

By default, browsers block JavaScript from making requests to a different origin (domain + port) than the page itself. This is a security mechanism called the **Same-Origin Policy**.

In local development, the React frontend runs on `http://localhost:5173` and the FastAPI backend on `http://localhost:8000`. These are different origins, so the browser would block API calls.

**CORS headers** tell the browser that cross-origin requests are permitted:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],    # Allow any origin
    allow_methods=["*"],    # Allow GET, POST, DELETE, etc.
    allow_headers=["*"],    # Allow any headers
)
```

`allow_origins=["*"]` is permissive and appropriate for a local development tool. In a production deployment with real authentication, you would restrict this to the specific frontend domain.

---

## 12. Frontend Framework — React

**React** (v19.2.4) is a JavaScript library for building user interfaces through a **component-based** model. The entire UI is one `App.jsx` file with all components defined in it.

### Core concepts used

**JSX**: A syntax extension that allows writing HTML-like markup inside JavaScript. Babel/Vite transforms it into `React.createElement()` calls at build time.

**Virtual DOM**: React maintains a lightweight in-memory representation of the DOM. When state changes, React computes a diff between the old and new virtual DOM and surgically updates only the changed real DOM nodes. This makes updates efficient.

**Declarative rendering**: Instead of imperatively calling `document.getElementById(...).style.display = 'none'`, you express *what* the UI should look like for a given state: `{isLoading && <Spinner />}`. React handles the DOM changes.

**Unidirectional data flow**: Data flows down via props. Events flow up via callback functions. This makes state predictable and debuggable.

---

## 13. Build Tool — Vite

**Vite** (v8.0.1, pronounced "veet") is a next-generation JavaScript build tool with two modes:

**Development (`npm run dev`)**: Uses native ES modules in the browser. No bundling step. Each file is served as-is. Hot Module Replacement (HMR) instantly reflects code changes in the browser without a full reload. This makes the development feedback loop extremely fast.

**Production (`npm run build`)**: Uses **Rollup** under the hood to bundle, minify, and tree-shake the application into static files ready for deployment.

### vite.config.js

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

The `@vitejs/plugin-react` plugin adds Babel transforms for JSX and React Fast Refresh (HMR support for React components).

---

## 14. React Hooks

Hooks are functions that let you use React state and lifecycle features inside function components.

### `useState`

Declares a piece of state. Returns `[currentValue, setterFunction]`.

```jsx
const [messages, setMessages] = useState([]);
const [isLoading, setIsLoading] = useState(false);
```

Every `setState` call triggers a re-render of the component. React batches multiple state updates in event handlers for performance.

### `useRef`

Creates a mutable ref object whose `.current` property persists across renders without causing re-renders. Used in two ways here:

1. **DOM access**: `messagesEndRef.current.scrollIntoView()` — programmatically scrolls the chat to the latest message after state updates.
2. **Mutable values**: Storing values that should not trigger re-renders (e.g., previous scroll position).

### `useEffect`

Runs a side effect after renders. The dependency array controls when it re-runs:

```jsx
useEffect(() => {
  // Auto-scroll to bottom of chat when messages change
  messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
}, [messages]); // Only runs when messages array changes
```

```jsx
useEffect(() => {
  listPDFs(userId).then(setPdfs);
}, []); // Empty array = runs once on mount (like componentDidMount)
```

---

## 15. Component Architecture

All components are defined in a single `App.jsx` file. They are standard function components — functions that return JSX.

### Styled components pattern (CSS-in-JS via inline styles)

Rather than external CSS classes, many components use inline style objects:

```jsx
const Spinner = () => (
  <span style={{
    display: "inline-block",
    width: 18, height: 18,
    border: "2.5px solid rgba(255,255,255,0.15)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
  }} />
);
```

This co-locates the style with the component, making it self-contained and portable. The tradeoff is that inline styles cannot use pseudo-classes (`:hover`) or media queries — those are handled via a `<style>` tag injected into the `<head>`.

### Component props

Components receive props for customisation:

```jsx
const Tag = ({ children, color = "accent" }) => {
  const colors = {
    accent: { bg: "rgba(124,107,255,0.15)", text: "#9d8fff" },
    green: { bg: "rgba(77,217,172,0.15)", text: "#4dd9ac" },
    ...
  };
  return <span style={{ ...colors[color], ... }}>{children}</span>;
};
```

---

## 16. Design System & CSS Variables

The app uses **CSS Custom Properties** (CSS Variables) to build a consistent design system. Variables are defined on `:root` (the `<html>` element) and cascade to all descendants.

```css
:root {
  --bg: #0a0a0f;
  --bg-card: #111118;
  --accent: #7c6bff;
  --accent-bright: #9d8fff;
  --accent-2: #ff6b9d;
  --accent-3: #4dd9ac;
  --radius: 12px;
  --radius-lg: 18px;
}
```

**Benefits of CSS variables over hardcoded values**:
- Change a colour once and it propagates everywhere.
- Can be updated at runtime with JavaScript for dynamic theming.
- More readable than hex codes scattered throughout the file.
- Support dark/light mode toggling without class swapping.

The colour palette follows a **dark-mode-first** approach with a purple primary accent (`#7c6bff`), a pink secondary (`#ff6b9d`), and a teal tertiary (`#4dd9ac`) — a triadic harmony.

---

## 17. CSS Animations & Keyframes

CSS `@keyframes` defines animation sequences that can be reused on any element.

### Animations used

```css
@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes pulse-ring {
  0%   { transform: scale(0.8); opacity: 1; }
  100% { transform: scale(2); opacity: 0; }
}

@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-6px); }
}
```

These are applied with `animation: spin 0.7s linear infinite` on the relevant elements. Using CSS animations instead of JavaScript intervals is more performant — the browser optimises them on the compositor thread, separate from JavaScript execution.

---

## 18. REST API Design

The backend follows REST (Representational State Transfer) conventions.

### HTTP method semantics

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/upload` | Create: upload a new file |
| `POST` | `/ingest` | Action: process an uploaded file |
| `POST` | `/ask` | Action: query against documents |
| `POST` | `/summary` | Action: generate summary |
| `POST` | `/quiz` | Action: generate quiz |
| `GET` | `/pdfs` | Read: list all documents |
| `GET` | `/extract-text` | Read: get raw text from PDF |
| `DELETE` | `/pdf/{pdf_id}` | Delete: remove a document |
| `GET` | `/` | Health check |

### Path parameters vs query parameters vs request body

- **Path parameter** (`/pdf/{pdf_id}`): identifies the resource.
- **Request body** (JSON): used for complex inputs with multiple fields.
- **Query parameters**: not used here (all inputs are in the body for POST routes).

### Status codes

- `200 OK`: Successful request.
- `404 Not Found`: `pdf_id` does not exist.
- `400 Bad Request`: Invalid input (validation error).
- `500 Internal Server Error`: Unexpected failure (e.g., Groq API down).

---

## 19. Multi-PDF Support

A key V2.0 feature is the ability to select multiple PDFs and have the AI synthesise across all of them in a single response.

### ID normalisation pattern

The API accepts both a single ID and a list, handled by a helper:

```python
def get_valid_ids(pdf_id, pdf_ids, pdf_store):
    ids = []
    if pdf_ids:
        ids = [i for i in pdf_ids if i in pdf_store]
    elif pdf_id and pdf_id in pdf_store:
        ids = [pdf_id]
    return ids
```

This allows the same endpoints to be called by old single-PDF callers and new multi-PDF callers.

### Context aggregation

For multi-PDF retrieval, the backend queries ChromaDB with a `where` filter:

```python
results = collection.query(
    query_embeddings=[query_embedding],
    n_results=6,
    where={"pdf_id": {"$in": valid_ids}}
)
```

The ChromaDB `$in` operator filters results to only chunks belonging to the selected PDFs.

### Shuffle to prevent order bias

When aggregating chunks from multiple PDFs, the list is shuffled before truncation:

```python
random.shuffle(all_chunks)
```

Without shuffling, if you retrieved 4 chunks per PDF and truncated to 10 total, the first PDF would always dominate. Shuffling ensures the LLM sees a balanced mix regardless of which PDF was selected first.

---

## 20. Quiz Generation & Validation Loop

Quiz generation is the most complex feature. The LLM must return **valid, structured JSON** with exactly 10 questions, each with exactly 4 options — any deviation makes the quiz unusable.

### Why validation is hard

LLMs are probabilistic. Even with precise instructions, they may:
- Return markdown-wrapped JSON (```json ... ```)
- Return 9 or 11 questions instead of 10
- Write explanations that are too short
- Use incorrect option labels (1/2/3/4 instead of A/B/C/D)

### The retry loop

```python
for attempt in range(3):
    response = call_llm(prompt)
    questions = parse_and_validate(response)
    if questions and len(questions) == 10:
        return questions
    # If validation fails, retry with the same prompt
raise HTTPException(500, "Quiz generation failed after 3 attempts")
```

### JSON extraction with regex fallback

```python
def extract_json(text):
    # Try 1: strip markdown fences
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    # Try 2: find the JSON array boundary
    match = re.search(r'\[.*\]', text, re.DOTALL)
    if match:
        return json.loads(match.group())
    return json.loads(text)
```

This multi-stage extraction handles all common LLM formatting quirks.

### Validation checks

After parsing, each question is checked for:
- Has `question`, `options`, `correct_answer`, `explanation` fields.
- `options` is a dict with exactly keys `A`, `B`, `C`, `D`.
- `correct_answer` is one of `A/B/C/D`.
- `explanation` length is between 30 and 400 characters.

---

## 21. Prompt Engineering

**Prompt engineering** is the practice of crafting the text sent to an LLM to reliably produce the desired output format and quality.

### System prompt vs user prompt

The Groq API uses the `messages` array with roles:
- `"role": "system"`: Sets the LLM's persona and global instructions.
- `"role": "user"`: The actual request.

```python
messages = [
    {"role": "system", "content": "You are an expert educational AI..."},
    {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"}
]
```

### Techniques used

**Grounding**: *"Answer ONLY based on the provided context. Do not use outside knowledge."* This prevents hallucination.

**Format specification**: Providing an exact JSON schema example in the prompt tells the model precisely what structure to produce.

**Persona assignment**: *"You are an expert educational AI specialising in creating exam-quality MCQs."* Persona prompts improve output quality on specialised tasks.

**Chain-of-thought guidance**: Instructions like *"Explain the reasoning behind the correct answer AND clarify why each wrong option is incorrect"* encourage the model to reason through each question.

**Negative constraints**: *"Do not add any text before or after the JSON array"* prevents preamble like "Here are your quiz questions:".

**Difficulty scaling**: The difficulty level ("Easy", "Medium", "Hard") is interpolated directly into the prompt, letting the LLM adjust conceptual depth naturally.

---

## 22. PYQ (Previous Year Questions) Mode

PYQ mode allows users to upload or paste actual exam questions from previous years. The system extracts the *pattern* of those questions (question style, depth, format) and uses it to bias quiz generation.

```python
if mode == "Notes + PYQ" and pyq_text:
    prompt += f"""
    
PREVIOUS YEAR QUESTION PATTERNS (use these as style reference):
{pyq_text[:2000]}

Generate questions that match the depth, style, and format of these PYQs 
while covering content from the provided notes.
"""
```

This is a form of **few-shot prompting** — showing the model examples of the desired output style without explicitly listing rules. The model infers stylistic patterns (e.g., "PYQs ask application questions, not definitional ones") and applies them.

---

## 23. In-Memory State Management

The backend maintains a `pdf_store` Python dictionary in memory:

```python
pdf_store = {}
# Structure:
# {
#   "uuid-123": {"name": "notes.pdf", "path": "uploads/uuid-123_notes.pdf"},
#   ...
# }
```

**Advantage**: Simplicity. No database setup required.

**Disadvantage**: This dictionary is lost when the backend process restarts. All uploaded PDF metadata (names and paths) must be re-entered. The ChromaDB vector data persists (it writes to disk), but the mapping from UUID to filename does not.

This is an intentional trade-off for a local development tool where simplicity outweighs durability. A production version would persist `pdf_store` to SQLite or a similar lightweight database.

---

## 24. Environment Variables & Configuration

Sensitive credentials (like the Groq API key) must never be hardcoded in source code. They are read from environment variables via **python-dotenv**:

```python
from dotenv import load_dotenv
load_dotenv()  # Reads .env file in the current directory
api_key = os.getenv("GROQ_API_KEY")
```

The `.env` file contains:

```
GROQ_API_KEY=gsk_...
```

This file should be listed in `.gitignore` so it is never committed to version control. Anyone cloning the repo must create their own `.env` with their own API key.

---

## 25. UUID — Unique Identifiers

Every uploaded PDF is assigned a **UUID4** (Universally Unique Identifier, version 4):

```python
import uuid
pdf_id = str(uuid.uuid4())
# Example: "3a8f0b1c-4e2d-4f7a-9b6e-1c2d3e4f5a6b"
```

UUID4 generates a 128-bit random number formatted as a hex string. The probability of collision is astronomically low (1 in 2^122 for a random UUID4).

**Why UUID instead of sequential integers?**
- No coordination needed between processes (no shared counter).
- Filenames become unpredictable, reducing naming collisions.
- The same PDF uploaded twice gets different IDs, preventing accidental overwrites.

The UUID is also prepended to the stored filename to avoid filesystem collisions: `uploads/{uuid}_{original_filename}.pdf`.

---

## 26. Context Limiting & Hallucination Prevention

**Hallucination** refers to LLMs generating plausible-sounding but factually incorrect statements. For an educational tool, this is dangerous — a student studying from incorrect quiz explanations will learn wrong information.

### Strategies used

**Hard context cap**: Aggregated context is capped at 5500 characters (approximately 1000 words). Even if many relevant chunks are retrieved, only the most relevant portion is sent to the LLM.

```python
context = " ".join(chunks)
if len(context) > 5500:
    context = context[:5500]
```

**Instruction grounding**: Every prompt explicitly says *"Answer only from the provided notes. If the answer is not in the notes, say so."* This trains the model to admit uncertainty rather than confabulate.

**Source attribution in quizzes**: Quiz explanations are instructed to reference the source material: *"Reference specific content from the provided notes in your explanation."*

**Temperature 0.3**: Lower temperature = the model stays close to its highest-probability output, which is more likely to be factually accurate for the given context.

---

## 27. Dependency Injection Pattern

FastAPI's `Depends()` system is a form of **dependency injection** — a design pattern where dependencies are provided to a function rather than created inside it.

While this codebase initialises ChromaDB and the embedding model as module-level globals (a simpler approach), FastAPI's DI is available for more complex scenarios:

```python
# Example of how it could be extended:
def get_collection():
    return chroma_client.get_or_create_collection("learnlens_chunks")

@app.post("/ask")
async def ask(request: AskRequest, collection = Depends(get_collection)):
    ...
```

This makes components testable in isolation (you can inject a mock collection in tests) and handles resource lifecycle (connections, file handles) cleanly.

---

## 28. JSON Enforcement & Parsing Resilience

When the LLM is asked to return structured data, the response is plain text — the LLM does not have a "return JSON" mode. The backend must parse and recover from imperfect outputs.

### Multi-strategy extraction

```python
def extract_json_from_response(text):
    # Strategy 1: Remove markdown code fences
    text = re.sub(r'```json\s*|\s*```', '', text).strip()
    
    # Strategy 2: Find the outermost JSON array
    match = re.search(r'\[[\s\S]*\]', text)
    if match:
        return json.loads(match.group())
    
    # Strategy 3: Parse the whole response directly
    return json.loads(text)
```

This cascading fallback handles:
1. `````json\n[...]\n````` — markdown-wrapped output
2. `Here are your questions: [...]` — preamble before JSON
3. Clean JSON output — ideal case

**`re.DOTALL`**: The `[\s\S]*` pattern (or `re.DOTALL` flag) makes `.` match newlines, enabling matching of JSON arrays that span multiple lines.

---

## 29. Typography & Google Fonts

The app loads three font families from Google Fonts via a `<link>` tag in `index.html`:

```html
<link href="https://fonts.googleapis.com/css2?
  family=Playfair+Display:wght@400;600;700&
  family=DM+Sans:wght@300;400;500;600&
  family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
```

- **Playfair Display**: A high-contrast serif typeface with elegant letterforms. Used for headings, titles, and the logo — conveys academic authority and trustworthiness.
- **DM Sans**: A geometric sans-serif with excellent legibility at small sizes. Used for body text, labels, and UI chrome — modern and clean.
- **DM Mono**: A monospace variant of DM Sans. Used for code blocks or technical identifiers — clear distinction between prose and technical content.

`display=swap` in the URL is a `font-display` strategy: the browser shows fallback system fonts first, then swaps to the web font when it loads. This prevents invisible text during font loading (FOIT — Flash of Invisible Text).

---

## 30. Full-Stack Communication Pattern

The frontend communicates with the backend through a centralized set of async functions:

```javascript
const API_BASE = "http://localhost:8000";

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
```

**The Fetch API** is the browser's built-in HTTP client. It returns a `Promise`, enabling `async/await` syntax for clean asynchronous code.

### Error propagation

`if (!res.ok)` checks for HTTP error status codes (400, 404, 500, etc.). Throwing an `Error` causes the `await` call site's `try/catch` to handle it, allowing the UI to show a user-friendly error message.

### Two-step upload flow

Uploading a PDF is intentionally split into two API calls:

1. **`POST /upload`** — transfers the binary file data. Returns a `pdf_id`.
2. **`POST /ingest`** — triggers the CPU-intensive embedding + ChromaDB storage using the `pdf_id`. Returns chunk count.

This separation allows the frontend to give granular progress feedback ("Uploading..." then "Indexing...") and makes each step independently retryable.

---

## Summary Table

| Concept | Category | Where Used |
|---|---|---|
| RAG Pipeline | AI Architecture | All AI features |
| Text Chunking | NLP | `/ingest` endpoint |
| Sentence Transformers | ML / Embeddings | Ingest + Retrieval |
| Cosine Similarity | Math / ML | ChromaDB queries |
| ChromaDB | Vector Database | All retrieval operations |
| LLaMA 3.3 70B | LLM | All generation features |
| Groq API | Inference Provider | LLM calls |
| Temperature Control | LLM Tuning | All Groq calls |
| PyMuPDF | PDF Processing | `/upload`, `/extract-text` |
| FastAPI | Web Framework | Entire backend |
| Pydantic | Data Validation | All request bodies |
| CORS Middleware | HTTP Security | Backend middleware |
| React 19 | UI Framework | Entire frontend |
| Vite | Build Tool | Frontend dev + build |
| useState / useRef / useEffect | React Hooks | All components |
| CSS Variables | Design System | Global theming |
| CSS Keyframe Animations | UI Polish | Spinner, fadeUp, shimmer |
| REST API Design | API Design | All endpoints |
| Multi-PDF Aggregation | Feature Design | Ask, Summary, Quiz |
| Retry + Validation Loop | Reliability Pattern | Quiz generation |
| Prompt Engineering | AI Technique | All LLM calls |
| Few-Shot Prompting | AI Technique | PYQ mode |
| Hallucination Prevention | AI Safety | Context limiting |
| UUID4 | Identifier Design | PDF identification |
| Environment Variables | Configuration | API key management |
| JSON Parsing Resilience | Defensive Coding | Quiz response parsing |
| In-Memory State | Data Storage | pdf_store dict |
| Google Fonts | Typography | UI design |
| Fetch API + async/await | HTTP Client | Frontend API calls |
| Two-step Upload Flow | UX Pattern | Upload + Ingest split |
