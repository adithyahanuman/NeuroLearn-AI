import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
import os

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="{top}" w:type="dxa"/>'
        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'<w:left w:w="{left}" w:type="dxa"/>'
        f'<w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)

def add_styled_heading(doc, text, level):
    p = doc.add_paragraph()
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.bold = True
    
    if level == 1:
        p.paragraph_format.space_before = Pt(18)
        p.paragraph_format.space_after = Pt(6)
        run.font.size = Pt(16)
        run.font.color.rgb = RGBColor(15, 23, 42) # Slate 900
        # Add bottom border/rule under H1
        pBdr = parse_xml(f'<w:pBdr {nsdecls("w")}><w:bottom w:val="single" w:sz="12" w:space="4" w:color="2563EB"/></w:pBdr>')
        p._p.get_or_add_pPr().append(pBdr)
    elif level == 2:
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after = Pt(4)
        run.font.size = Pt(13)
        run.font.color.rgb = RGBColor(30, 58, 138) # Blue 900
    elif level == 3:
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(2)
        run.font.size = Pt(11)
        run.font.color.rgb = RGBColor(71, 85, 105) # Slate 600
    return p

def add_code_block(doc, code_text):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    
    cell = table.cell(0, 0)
    cell.width = Inches(6.5)
    set_cell_background(cell, "F8FAFC") # Slate 50
    set_cell_margins(cell, top=120, bottom=120, left=180, right=180)
    
    # Left border highlight
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'<w:top w:val="single" w:sz="4" w:color="CBD5E1"/>'
        f'<w:left w:val="single" w:sz="24" w:color="3B82F6"/>'
        f'<w:bottom w:val="single" w:sz="4" w:color="CBD5E1"/>'
        f'<w:right w:val="single" w:sz="4" w:color="CBD5E1"/>'
        f'</w:tcBorders>'
    )
    tcPr.append(tcBorders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.15
    run = p.add_run(code_text)
    run.font.name = "Consolas"
    run.font.size = Pt(9.5)
    run.font.color.rgb = RGBColor(30, 41, 59)
    doc.add_paragraph().paragraph_format.space_after = Pt(4)

def format_table_header(row, col_widths, titles):
    for i, cell in enumerate(row.cells):
        cell.width = col_widths[i]
        set_cell_background(cell, "1E3A8A") # Navy Blue
        set_cell_margins(cell, top=120, bottom=120, left=140, right=140)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        run = p.add_run(titles[i])
        run.bold = True
        run.font.name = "Segoe UI"
        run.font.size = Pt(9.5)
        run.font.color.rgb = RGBColor(255, 255, 255)

def format_table_row(row, col_widths, values, is_alt=False):
    bg_color = "F1F5F9" if is_alt else "FFFFFF"
    for i, cell in enumerate(row.cells):
        cell.width = col_widths[i]
        set_cell_background(cell, bg_color)
        set_cell_margins(cell, top=100, bottom=100, left=140, right=140)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        run = p.add_run(values[i])
        run.font.name = "Segoe UI"
        run.font.size = Pt(9)
        run.font.color.rgb = RGBColor(30, 41, 59)

def main():
    doc = Document()
    
    # Page setup - Margins
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.85)
        section.right_margin = Inches(0.85)
        
        # Header & Footer setup
        footer = section.footer
        f_p = footer.paragraphs[0]
        f_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        f_run = f_p.add_run("NeuroLearn AI — The Process of Execution | Technical Runbook")
        f_run.font.name = "Segoe UI"
        f_run.font.size = Pt(8.5)
        f_run.font.color.rgb = RGBColor(148, 163, 184)
        
    # Document Title Block
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(0)
    title_p.paragraph_format.space_after = Pt(4)
    run_title = title_p.add_run("NeuroLearn AI: The Process of Execution")
    run_title.bold = True
    run_title.font.name = "Segoe UI"
    run_title.font.size = Pt(24)
    run_title.font.color.rgb = RGBColor(15, 23, 42)

    sub_p = doc.add_paragraph()
    sub_p.paragraph_format.space_before = Pt(0)
    sub_p.paragraph_format.space_after = Pt(14)
    run_sub = sub_p.add_run("Comprehensive Operational Runbook, Multi-Service Deployment Guide & Verification Standard")
    run_sub.font.name = "Segoe UI"
    run_sub.font.size = Pt(12)
    run_sub.font.color.rgb = RGBColor(71, 85, 105)

    # Metadata callout box
    meta_table = doc.add_table(rows=1, cols=1)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_cell = meta_table.cell(0, 0)
    meta_cell.width = Inches(6.8)
    set_cell_background(meta_cell, "EFF6FF") # Soft Blue
    set_cell_margins(meta_cell, top=120, bottom=120, left=160, right=160)
    
    tcPr = meta_cell._tc.get_or_add_tcPr()
    tcBorders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'<w:top w:val="single" w:sz="6" w:color="93C5FD"/>'
        f'<w:left w:val="single" w:sz="20" w:color="2563EB"/>'
        f'<w:bottom w:val="single" w:sz="6" w:color="93C5FD"/>'
        f'<w:right w:val="single" w:sz="6" w:color="93C5FD"/>'
        f'</w:tcBorders>'
    )
    tcPr.append(tcBorders)
    
    mp = meta_cell.paragraphs[0]
    mp.paragraph_format.space_after = Pt(0)
    m_run = mp.add_run(
        "Project: NeuroLearn AI  |  OS: Cross-Platform (Windows/Linux/macOS)\n"
        "Stack: React 18 + Vite, Node.js + Express 5, FastAPI + XGBoost/SHAP, PostgreSQL 16\n"
        "Scope: Prerequisites, Database Migration & Seeding, Microservice Execution, Testing & Live Demos"
    )
    m_run.font.name = "Segoe UI"
    m_run.font.size = Pt(9.5)
    m_run.font.color.rgb = RGBColor(30, 58, 138)

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # ─────────────────────────────────────────────────────────────────────────
    # Section 1: Executive Overview & System Topology
    # ─────────────────────────────────────────────────────────────────────────
    add_styled_heading(doc, "1. Executive Overview & System Topology", 1)
    
    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.2
    p.add_run(
        "NeuroLearn AI is an intelligent learning operating system that integrates Machine Learning (XGBoost + TreeSHAP) "
        "and a 38-concept Directed Acyclic Knowledge Graph (DAG). It monitors student interaction latencies and test scores, "
        "predicts prospective failure risks, uncovers hidden prerequisite gaps, and synthesizes dynamic remedial learning paths."
    )
    
    add_styled_heading(doc, "1.1 Service Architecture & Responsibilities", 2)
    
    topo_table = doc.add_table(rows=1, cols=4)
    topo_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    widths = [Inches(1.3), Inches(1.8), Inches(0.9), Inches(2.8)]
    format_table_header(topo_table.rows[0], widths, ["Service", "Tech Stack", "Port", "Core Operational Role"])
    
    services_data = [
        ("Database", "PostgreSQL 16 Alpine", "5432", "System of record: Users, Cohorts, Graph relations, Attempts & Twin snapshots."),
        ("ML Service", "FastAPI, XGBoost, SHAP, NetworkX", "8000", "Stateless computation: Feature engineering, risk scoring, SHAP explainability, root gap detection."),
        ("Backend Gateway", "Node.js (LTS), Express 5, TypeScript", "3001", "API orchestration, JWT authentication, Zod validation, caching, stale fallback resilience."),
        ("Frontend Client", "React 18, Vite, Tailwind CSS, TanStack", "5173", "Interactive UI, Cytoscape.js DAG visualizer, Chart.js analytics, Student/Faculty portals.")
    ]
    
    for idx, row_data in enumerate(services_data):
        row = topo_table.add_row()
        format_table_row(row, widths, row_data, is_alt=(idx % 2 == 1))
        
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # ─────────────────────────────────────────────────────────────────────────
    # Section 2: Prerequisites & Tooling Requirements
    # ─────────────────────────────────────────────────────────────────────────
    add_styled_heading(doc, "2. Prerequisites & Environment Setup", 1)
    
    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.2
    p.add_run("Before beginning execution, verify that the following system binaries and runtimes are present on your host machine:")

    prereqs = [
        ("Python 3.11+", "Used for ML microservice, data generation, and graph validation scripts."),
        ("Node.js LTS (v18 - v24)", "Runtime for both Express backend gateway and Vite React frontend."),
        ("Docker Desktop / Docker Compose", "Provides containerized PostgreSQL 16 Alpine instance with health checking."),
        ("Git", "Repository version control and branch management.")
    ]
    for name, desc in prereqs:
        p_bullet = doc.add_paragraph(style='List Bullet')
        p_bullet.paragraph_format.space_after = Pt(2)
        r_b = p_bullet.add_run(f"{name}: ")
        r_b.bold = True
        p_bullet.add_run(desc)

    add_styled_heading(doc, "2.1 Environment Configuration File (.env)", 2)
    p = doc.add_paragraph()
    p.add_run("Create a root .env file by copying .env.example. Generate unique 32-byte cryptographic hex tokens for authentication:")
    
    add_code_block(doc,
        "# Database Credentials\n"
        "POSTGRES_USER=neurolearn\n"
        "POSTGRES_PASSWORD=changeme\n"
        "POSTGRES_DB=neurolearn\n"
        "POSTGRES_HOST=localhost\n"
        "POSTGRES_PORT=5432\n"
        "DATABASE_URL=postgresql://neurolearn:changeme@localhost:5432/neurolearn\n\n"
        "# Cryptographic Keys (generate with: python -c 'import secrets; print(secrets.token_hex(32))')\n"
        "JWT_SECRET=f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8\n"
        "JWT_EXPIRES_IN=8h\n"
        "ML_API_KEY=1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b\n\n"
        "# Service Endpoints & Configurations\n"
        "ML_SERVICE_URL=http://127.0.0.1:8000\n"
        "ML_SERVICE_TIMEOUT_MS=5000\n"
        "PORT=3001\n"
        "NODE_ENV=development\n"
        "CORS_ORIGIN=http://localhost:5173\n"
        "PREDICTION_CACHE_MINUTES=15\n"
        "VITE_API_URL=http://localhost:3001\n"
        "MODEL_PATH=models/model_v1.joblib\n"
        "GRAPH_PATH=data/graph.json"
    )

    # ─────────────────────────────────────────────────────────────────────────
    # Section 3: Step-by-Step Execution Sequence (End-to-End Runbook)
    # ─────────────────────────────────────────────────────────────────────────
    add_styled_heading(doc, "3. Step-by-Step Execution Sequence (Native Workflow)", 1)
    
    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.2
    p.add_run(
        "Execute each service sequentially in dedicated terminal sessions. Ensure each layer reaches an active, healthy state before launching subsequent tiers."
    )

    add_styled_heading(doc, "Phase 1: Database Startup, Migration & Seeding", 2)
    p = doc.add_paragraph()
    p.add_run("Start the PostgreSQL 16 container, apply relational schemas, and seed initial synthetic cohorts and attempts:")
    
    add_code_block(doc,
        "# 1. Start PostgreSQL via Docker Compose\n"
        "docker compose up -d db\n\n"
        "# 2. Confirm database connectivity and health\n"
        "docker compose exec db psql -U neurolearn -c \"SELECT version();\"\n\n"
        "# 3. Execute Schema Reset (Applies 001_init.sql and 002_indexes.sql)\n"
        ".\\scripts\\reset.ps1\n\n"
        "# 4. Seed Synthetic Knowledge Graph, 300 Students, and 27,000+ Attempts\n"
        ".\\scripts\\seed.ps1"
    )

    add_styled_heading(doc, "Phase 2: ML Microservice Launch (Port 8000)", 2)
    p = doc.add_paragraph()
    p.add_run("Activate Python environment and launch the FastAPI inference server with hot reload:")
    
    add_code_block(doc,
        "# In Terminal 2:\n"
        "cd ml-service\n"
        "python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload\n\n"
        "# Verification check in browser or curl:\n"
        "# URL: http://127.0.0.1:8000/ml/health\n"
        "# Response: {\"status\": \"ok\", \"modelVersion\": \"1.0.0\", \"graphNodes\": 38}"
    )

    add_styled_heading(doc, "Phase 3: Express Backend Gateway Launch (Port 3001)", 2)
    p = doc.add_paragraph()
    p.add_run("Initialize dependencies and spin up the Node.js Express API server:")
    
    add_code_block(doc,
        "# In Terminal 3:\n"
        "cd backend\n"
        "npm install\n"
        "npm run dev\n\n"
        "# Verification check:\n"
        "# URL: http://127.0.0.1:3001/health\n"
        "# Response: {\"status\": \"ok\", \"database\": \"connected\", \"ml\": \"healthy\"}"
    )

    add_styled_heading(doc, "Phase 4: Frontend Client Launch (Port 5173)", 2)
    p = doc.add_paragraph()
    p.add_run("Launch the Vite React client for student and faculty access:")
    
    add_code_block(doc,
        "# In Terminal 4:\n"
        "cd frontend\n"
        "npm install\n"
        "npm run dev\n\n"
        "# Client Dashboard URL: http://localhost:5173"
    )

    # ─────────────────────────────────────────────────────────────────────────
    # Section 4: Automated Verification & Testing Playbook
    # ─────────────────────────────────────────────────────────────────────────
    add_styled_heading(doc, "4. Automated Verification & Testing Playbook", 1)
    
    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.2
    p.add_run("To ensure complete system integrity and contract conformance, run the following automated test suites:")

    test_table = doc.add_table(rows=1, cols=3)
    test_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_widths = [Inches(1.8), Inches(2.3), Inches(2.7)]
    format_table_header(test_table.rows[0], t_widths, ["Testing Target", "Command", "Acceptance Criteria"])
    
    tests_data = [
        ("Unified Smoke Suite", "python scripts/smoke.py", "All 4 microservices respond with HTTP 200/PASS status."),
        ("Graph Topology & DAG", "python scripts/validate_graph.py", "No cycles detected, 0 orphan nodes, valid topological ordering."),
        ("ML Feature & Root Gaps", "pytest ml-service/tests", "8/8 root gap traversal tests pass; SHAP scores consistent."),
        ("Backend API & Auth", "npm --prefix backend test", "JWT token generation, Zod schemas, rate limiters pass."),
        ("Frontend & E2E Tests", "npm --prefix frontend test\nnpx playwright test", "React unit tests pass; Playwright student path completes.")
    ]
    
    for idx, row_data in enumerate(tests_data):
        row = test_table.add_row()
        format_table_row(row, t_widths, row_data, is_alt=(idx % 2 == 1))

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # ─────────────────────────────────────────────────────────────────────────
    # Section 5: Demonstration Accounts & Execution Path
    # ─────────────────────────────────────────────────────────────────────────
    add_styled_heading(doc, "5. Demonstration Personas & Live Evaluation Script", 1)
    
    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.2
    p.add_run("The database is pre-seeded with specialized persona accounts to showcase individual and institutional workflows:")

    demo_table = doc.add_table(rows=1, cols=4)
    demo_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    d_widths = [Inches(1.2), Inches(2.0), Inches(1.0), Inches(2.6)]
    format_table_header(demo_table.rows[0], d_widths, ["Role", "Email", "Password", "Evaluation Capabilities"])
    
    demo_users = [
        ("Student (Main)", "demo1@neurolearn.ai", "demo", "Knowledge graph visualizer, personalized risk scores, SHAP explanations, root gaps, study paths."),
        ("Student 2", "demo2@neurolearn.ai", "demo", "Alternative student trajectory with distinct concept mastery distribution."),
        ("Faculty Admin", "faculty@neurolearn.ai", "demo", "Cohort overview (A, B, C), early warning quadrant, concept failure heatmap, batch interventions.")
    ]
    for idx, row_data in enumerate(demo_users):
        row = demo_table.add_row()
        format_table_row(row, d_widths, row_data, is_alt=(idx % 2 == 1))

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    add_styled_heading(doc, "5.1 Standard 3-Minute Live Demo Flow", 2)
    demo_steps = [
        ("1. Student Authentication:", "Log in as demo1@neurolearn.ai. View the personalized digital twin mastery scores across 38 nodes."),
        ("2. Explainable AI (SHAP):", "Click on a high-risk node (e.g., Dynamic Programming). Inspect the contributing feature factors (e.g., Recursion deficiency, quiz latency)."),
        ("3. Prerequisite Root Gap Traversal:", "Notice that instead of advising more Dynamic Programming practice, the engine isolates the root missing concept (Recursion) and recommends targeted resources."),
        ("4. Real-time Model Inference:", "Submit a new quiz attempt on Recursion with a score of 95%. Observe the immediate recalculation of downstream risk."),
        ("5. Faculty Cohort Governance:", "Log in as faculty@neurolearn.ai. Review cohort-wide risk metrics, identifying at-risk students 3 weeks prior to midterm examinations."),
        ("6. System Fault Resilience:", "Stop the ML service (Terminal 2). Refresh student dashboard: observe the 'Cached / Stale Analysis' banner maintaining uptime with zero runtime 500 errors.")
    ]
    for step_title, step_desc in demo_steps:
        p_step = doc.add_paragraph(style='List Bullet')
        p_step.paragraph_format.space_after = Pt(2)
        r_st = p_step.add_run(f"{step_title} ")
        r_st.bold = True
        p_step.add_run(step_desc)

    # ─────────────────────────────────────────────────────────────────────────
    # Section 6: Operational Troubleshooting Matrix
    # ─────────────────────────────────────────────────────────────────────────
    add_styled_heading(doc, "6. Operational Troubleshooting & Incident Guide", 1)
    
    trouble_table = doc.add_table(rows=1, cols=3)
    trouble_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    tr_widths = [Inches(1.8), Inches(2.2), Inches(2.8)]
    format_table_header(trouble_table.rows[0], tr_widths, ["Error / Symptom", "Root Cause", "Resolution Procedure"])
    
    troubles = [
        ("ECONNREFUSED 127.0.0.1:5432", "PostgreSQL database daemon is stopped.", "Execute 'docker compose up -d db' and verify container status via docker ps."),
        ("401 Unauthorized on ML API", "Missing or mismatched ML_API_KEY in .env.", "Ensure ML_API_KEY is identical across root .env and ml-service environment."),
        ("CORS Policy Blocking UI", "Origin mismatch between Frontend & Backend.", "Verify CORS_ORIGIN=http://localhost:5173 with no trailing slash in .env."),
        ("Synthetic Data Missing", "Database seeded before dataset generation.", "Run python ml-service/training/generate_data.py followed by scripts/seed.ps1."),
        ("E2E Test Headless Failure", "Playwright browsers not installed.", "Run 'npx playwright install --with-deps' in the frontend directory.")
    ]
    for idx, row_data in enumerate(troubles):
        row = trouble_table.add_row()
        format_table_row(row, tr_widths, row_data, is_alt=(idx % 2 == 1))

    # Save to requested destination
    output_path = r"c:\Users\narne\Desktop\NeuroLearn AI\the process of excuetion.docx"
    doc.save(output_path)
    print(f"File successfully generated at: {output_path}")

if __name__ == "__main__":
    main()
