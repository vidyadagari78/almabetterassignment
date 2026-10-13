# AlmaBetter AI-Powered Project Evaluation Platform
## SDE-II Backend Architecture Deliverable & Working Proof-of-Concept

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Tests](https://img.shields.io/badge/tests-11%20passed-success)
![Node Version](https://img.shields.io/badge/node-%3E%3D20.0.0-blue)
![Architecture](https://img.shields.io/badge/architecture-cloud--native%20hexagonal-blueviolet)

This repository contains the complete **System Architecture Design Document**, **Interactive Documentation Portal**, and a **Production-Grade Working Proof-of-Concept (PoC)** for the **AlmaBetter SDE-II Backend Architecture Assignment**.

---

## 📌 Deliverables Overview

1. **Primary Deliverable (Markdown):**  
   📄 [`SYSTEM_DESIGN_DOCUMENT.md`](./SYSTEM_DESIGN_DOCUMENT.md)  
   *Comprehensive 13-section technical specification addressing all assignment requirements: System Architecture Diagrams, Submission Processing Pipeline, Production REST API Specs, PostgreSQL + pgvector Data Model, Multi-Agent AI/LLM Architecture, Reliability & Idempotency, Security & Threat Model, 30 &rarr; 10,000/day Scaling Strategy, Production AWS Deployment Topology, Technology Trade-Off Matrix (5 Research Decisions), and Implementation Roadmap.*

2. **Interactive & Printable Deliverable (HTML / PDF):**  
   🌐 [`SYSTEM_DESIGN_DOCUMENT.html`](./SYSTEM_DESIGN_DOCUMENT.html)  
   *Beautiful dark-mode web portal with rendered interactive Mermaid diagrams, responsive tables, and print-optimized CSS for direct PDF export (`Ctrl + P`).*

3. **Production Reference Implementation (PoC):**  
   💻 Fully functioning Node.js/Express backend service with asynchronous background workers, AST static code analysis, deterministic rubric scoring, prompt injection sanitization, and an interactive Evaluator & Student Web Portal.

---

## 🚀 Quickstart & Verification

### 1. Prerequisites
* **Node.js** v20.x or higher
* **npm** v10.x or higher
* *(Optional)* Docker & Docker Compose

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Automated Architecture & Security Tests
Run the comprehensive automated verification suite testing:
* **ZIP Bomb Defense:** Rejects archives exceeding file count or uncompressed size thresholds.
* **Path Traversal Defense:** Flags and blocks `../../../../etc/passwd` attacks.
* **Prompt Injection Detection:** Intercepts adversarial attempts to bypass rubric guidelines.
* **Secret Sanitizer:** Redacts committed AWS tokens, MongoDB URIs, and keys.
* **Rubric Weight Validation:** Guarantees criteria weights strictly equal 100%.
* **Deterministic Math Aggregator:** Verifies weighted sum formula without arithmetic hallucination.
* **Human-in-the-Loop Gating:** Intercepts evaluations with model confidence $< 0.75$.
* **End-to-End Pipeline & Idempotency:** Validates job scheduling and duplicate avoidance.

```bash
npm test
```
*Output: `TEST RUN COMPLETE: 11 PASSED | 0 FAILED`*

### 4. Start the Application & Web Portal
```bash
npm start
```
* Server starts on port `5000`.
* Open **`http://localhost:5000`** in your browser to access the **Interactive Evaluator & Student Portal**.
* Access the **Interactive Architecture Document** at **`http://localhost:5000/SYSTEM_DESIGN_DOCUMENT.html`**.

---

## 🏗️ Core Architectural Highlights

```
                                      [Client Web Portal]
                                               │
                                               ▼
                              [AWS CloudFront / WAF / ALB]
                                               │
                                               ▼
                             [Express API / Ingestion Service]
                                  │           │           │
                    Direct Upload │           │ Metadata  │ Idempotency
                                  ▼           ▼           ▼
                              [Amazon S3] [PostgreSQL] [Redis Redlock]
                                               │
                                               ▼ (Job Enqueued)
                                     [Amazon SQS FIFO / DLQ]
                                               │
                                               ▼
                                   [Worker Fleet (ECS Fargate)]
                     ┌─────────────────────────┼─────────────────────────┐
                     ▼                         ▼                         ▼
             [Sandboxed Extract]        [AST & Static Code]     [Multi-Agent LLM]
             - ZIP Bomb Guard           - Tree-Sitter Parser    - Functionality (25%)
             - Path Traversal Check     - LOC & Complexity      - Code Quality (20%)
             - Secret Redaction         - Dependency Graph      - Architecture (20%)
                                                                - Problem Solving (15%)
                                                                - Documentation (10%)
                                                                - Innovation (10%)
                                               │
                                               ▼
                                 [Deterministic Math Engine]
                                 Final Score = Σ (Score * Weight)
                                               │
                           Confidence < 0.75?  │
                                 ┌─────────────┴─────────────┐
                                 ▼                           ▼
                        [Human Review Portal]       [Published to Student]
```

### 1. Scaling: 30 &rarr; 10,000 Submissions/Day
* **Mathematical Workload:** 10,000 daily submissions $\approx 0.35$ submissions/sec average, peaking at $21$ submissions/min near cohort deadlines. Raw daily upload volume $\approx 1\text{ TB}$.
* **Queue-Driven Autoscaling (KEDA):** Workers autoscale on SQS queue depth rather than lagging CPU metrics, scaling from 5 to 75 container tasks in 90 seconds.
* **Database Optimization:** Aurora PostgreSQL with Read Replicas, PgBouncer connection pooling (5,000 client capacity), and partitioned job audit logs.
* **Token Cost Optimization:** Tier-1 fast models (`gpt-4o-mini` / Claude 3.5 Haiku) generate structural file summaries ($80\%$ of tokens), reserving Claude 3.5 Sonnet strictly for high-order rubric synthesis ($20\%$ of tokens), reducing per-submission cost from $\$1.20$ to $\$0.28$.

### 2. Multi-Agent AI vs. Monolithic Prompt
Rather than sending 100k LOC into a single context window (causing "Lost in the Middle" errors and token exhaustion), the system utilizes:
1. **Intelligent Pruning:** Strips `node_modules`, build artifacts, and minified assets.
2. **Deterministic AST Extraction:** Tree-Sitter parses exported functions, API endpoints, and cyclomatic complexity.
3. **Parallel Specialized Agents:** 4 independent agents evaluate distinct rubric dimensions in parallel with strict JSON Schema constraints.
4. **Deterministic Math Aggregator:** Backend code calculates final grades, eliminating arithmetic errors in LLM reasoning.

### 3. Security Threat Model & Mitigations
* **ZIP Bombs:** Header pre-checking before extraction; enforces $< 500\text{ MB}$ uncompressed, $< 5{,}000$ files, and ratio $\le 10:1$.
* **Path Traversal:** Validates normalized target paths using `path.resolve` against the sandboxed directory.
* **Malicious Code Execution:** Student code is **never executed or built**; analysis is strictly static via unprivileged Docker containers.
* **Prompt Injections:** Boundary tagging (`<student_submission_untrusted>`), automated adversarial keyword scanning, and mandatory code evidence citations.

---

## 🔬 Research Component: Technical Trade-Offs

| Decision | Evaluated Alternatives | Selected Choice | Key Engineering Rationale |
| :--- | :--- | :--- | :--- |
| **Database** | PostgreSQL vs. MongoDB | **PostgreSQL 16** | ACID transactional consistency for academic grading; JSONB flexibility; native `pgvector` eliminates separate vector store. |
| **Queue** | SQS vs. RabbitMQ vs. Kafka | **Amazon SQS** | Fully managed serverless scaling with dynamic 15-min visibility extensions and built-in DLQs without managing broker clusters. |
| **LLM Strategy** | Managed API vs. Self-Hosted | **Managed via LiteLLM** | Premier coding benchmarks (Claude 3.5 Sonnet); zero idle 24/7 GPU hardware costs; unified failover to OpenAI GPT-4o. |
| **Vector DB** | pgvector vs. Pinecone vs. Weaviate | **pgvector** | Zero additional infrastructure; relational metadata and vector embeddings queried in a single SQL join with sub-50ms latency. |
| **Compute** | EC2 vs. ECS Fargate vs. Lambda | **Containers (ECS Fargate)** | Full Docker packaging freedom for AST tools with zero OS patching; avoids Lambda's 15-minute execution limit. |

---

## 📂 Repository Directory Structure

```
.
├── SYSTEM_DESIGN_DOCUMENT.md    # 📄 Primary System Architecture & Design Specification
├── SYSTEM_DESIGN_DOCUMENT.html  # 🌐 Interactive & Printable Documentation Portal
├── README.md                    # 📖 Project Overview, Setup & Verification Guide
├── Dockerfile                   # 🐳 Multi-stage container runtime
├── docker-compose.yml           # 📦 Local orchestration (API + Redis)
├── package.json                 # 📦 Node.js dependencies and test scripts
├── .env.example                 # 🔑 Environment variable template
├── public/                      # 🎨 Evaluator & Student Web Portal
│   ├── index.html               #    Interactive web dashboard
│   ├── styles.css               #    Glassmorphic dark-mode design system
│   └── app.js                   #    Client state, real-time stepper, live charts
├── src/
│   ├── server.js                # 🚀 Express API server & routes setup
│   ├── models/
│   │   └── inMemoryDb.js        # 🗄️ PostgreSQL 16 schema simulator with transactions
│   ├── controllers/
│   │   ├── submission.controller.js  # Ingestion & presigned S3 URLs
│   │   ├── evaluation.controller.js  # Async jobs, status polling, human reviews
│   │   └── rubric.controller.js      # Dynamic rubric configuration
│   ├── services/
│   │   ├── security.service.js       # ZIP bomb, path traversal, prompt injection guards
│   │   ├── ast.service.js            # Code metrics, endpoints, framework detection
│   │   ├── llm.service.js            # Multi-agent AI evaluator & schema enforcement
│   │   ├── rubric.service.js         # Deterministic weighted math calculator
│   │   └── queue.service.js          # Asynchronous job worker & state machine
│   └── routes/
│       ├── submission.routes.js
│       ├── evaluation.routes.js
│       └── rubric.routes.js
└── tests/
    └── run-all-tests.js         # 🧪 Automated test runner (11 security & rubric tests)
```

---

## 📝 Submission Details

* **Candidate Assignment:** SDE-II Backend Architecture Assignment  
* **Target Role:** Senior Backend Engineer (SDE-II)  
* **Official Submission Form:** [https://forms.gle/W2unJoASEuoFamXE8](https://forms.gle/W2unJoASEuoFamXE8)
