# AVME Prototype (Autonomous Vendor Management Ecosystem)

This repository contains a full‑stack prototype for an AI‑assisted procurement platform. It includes a React frontend and a FastAPI backend with supplier, contract, and document workflows plus optional integrations (Groq LLM, SAP S/4HANA OData, Azure AI Search, Dataverse, Power Automate, and Azure Document Intelligence).

## What the prototype covers
- Supplier, contract, and document management
- AI-powered risk assessment and negotiation drafts (Groq)
- Document processing pipeline (upload → OCR → NLP → validation)
- Integration stubs for SAP, Azure AI Search, Dataverse, and Power Platform

## Project overview
AVME is a prototype of an autonomous vendor management platform that streamlines the procurement lifecycle: onboarding suppliers, validating documentation, monitoring compliance, and accelerating negotiation workflows with AI assistance. The backend consolidates supplier, contract, and document data into a single API, while the frontend provides a role‑friendly dashboard for procurement teams.

The platform is designed to be integration‑first. Core flows (suppliers, contracts, documents) run locally, and external services (SAP, Dataverse, Azure AI Search, Azure Cognitive Services, Power Automate) can be connected by filling configuration in `.env`. This keeps the prototype productive for demos while staying ready for enterprise data sources.

## Future development ideas
1. **Historical contract indexing**  
   Automate bulk ingestion from legacy repositories into Azure AI Search, add field mapping and scheduled reindexing.
2. **Advanced supplier onboarding**  
   Build multi‑step onboarding with approval gates, automated document requests, and audit trails.
3. **Risk intelligence**  
   Add geopolitical scoring feeds, financial health signals, and dynamic risk dashboards.
4. **Compliance automation**  
   Expand validation rules, add policy libraries, and include anomaly detection for document patterns.
5. **Real‑time AI workflows**  
   Enable streaming negotiation drafts and decision support timelines.
6. **Identity & access**  
   Turn on Entra ID, enforce role‑based permissions, and support multi‑tenant access.
7. **Production data layer**  
   Swap SQLite for PostgreSQL and introduce migrations, backups, and observability.

## Quick start (from scratch)

### Prerequisites
- **Node.js** (18+ recommended)
- **Python** (3.13 recommended)
- **Git** (optional)

### 1) Install dependencies
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
npm install
```

### 2) Configure environment
Edit `.env` in the project root and fill in the values you need. Minimal for the prototype:
```
GROQ_API_KEY=your_key
LLM_PROVIDER=groq
```

Optional integrations (fill when ready):
- **Azure Blob Storage** (document file storage)
- **Azure Document Intelligence** (OCR)
- **Azure AI Language** (NLP)
- **Azure AI Search** (contract search/indexing)
- **SAP S/4HANA OData** (supplier sync)
- **Dataverse** (supplier sync)
- **Power Automate** (flow triggers)

### 3) Run the backend
```powershell
uvicorn backend.app.main:app --reload --port 8000
```
API docs: `http://127.0.0.1:8000/docs`

### 4) Run the frontend
```powershell
npm run dev
```
App: `http://localhost:5173`

## Key endpoints
- `/suppliers`, `/contracts`, `/documents` – core entities
- `/risk/assess`, `/negotiation/draft` – AI features
- `/documents/upload`, `/documents/{id}/validate` – document pipeline
- `/sap/*`, `/azure-search/*`, `/dataverse/*`, `/power-platform/*` – integration endpoints

## Notes
- If you don’t configure external services, the app still runs with local DB and Groq LLM.
- Document processing requires Azure services + Blob Storage credentials to work end‑to‑end.

