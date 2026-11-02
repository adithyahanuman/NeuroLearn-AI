"""
scripts/build_full_report.py

Builds the complete academic project report for NeuroLearn AI in both:
1. Microsoft Word DOCX format (docs/NeuroLearn_AI_Project_Report_Final.docx & report.docx)
   - Fully styled with academic headers, margins, borders, callouts, colored tables, and embedded high-res plots.
2. Full Markdown format (report.md)

Matches the exact structure, chapters, tables, algorithms, and references of the VIT reference report.
"""

import os
import sys
from pathlib import Path
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

DOCS_DIR = Path("docs")

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

def add_callout(doc, text, title="KEY FINDING", border_color="1B365D", bg_color="F0F4F8"):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Inches(6.5)
    
    cell = tbl.cell(0, 0)
    set_cell_background(cell, bg_color)
    set_cell_margins(cell, top=140, bottom=140, left=200, right=180)
    
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'<w:top w:val="none"/>'
        f'<w:left w:val="single" w:sz="36" w:space="0" w:color="{border_color}"/>'
        f'<w:bottom w:val="none"/>'
        f'<w:right w:val="none"/>'
        f'</w:tcBorders>'
    )
    tcPr.append(borders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(2)
    run_t = p.add_run(f"[{title}] ")
    run_t.bold = True
    run_t.font.name = "Calibri"
    run_t.font.size = Pt(10)
    run_t.font.color.rgb = RGBColor(27, 54, 93)
    
    run_body = p.add_run(text)
    run_body.font.name = "Calibri"
    run_body.font.size = Pt(9.5)
    run_body.font.color.rgb = RGBColor(30, 41, 59)
    doc.add_paragraph().paragraph_format.space_after = Pt(4)

def format_heading(doc, text, level):
    h = doc.add_heading(level=level)
    h.paragraph_format.keep_with_next = True
    run = h.add_run(text)
    run.font.name = "Calibri"
    
    if level == 1:
        h.paragraph_format.space_before = Pt(20)
        h.paragraph_format.space_after = Pt(8)
        run.font.size = Pt(16)
        run.bold = True
        run.font.color.rgb = RGBColor(27, 54, 93)
    elif level == 2:
        h.paragraph_format.space_before = Pt(14)
        h.paragraph_format.space_after = Pt(6)
        run.font.size = Pt(12.5)
        run.bold = True
        run.font.color.rgb = RGBColor(2, 132, 199)
    elif level == 3:
        h.paragraph_format.space_before = Pt(10)
        h.paragraph_format.space_after = Pt(4)
        run.font.size = Pt(11)
        run.bold = True
        run.font.color.rgb = RGBColor(51, 65, 85)
    return h

def add_p(doc, text, bold_prefix="", italic_prefix="", space_after=6, line_spacing=1.15):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = line_spacing
    
    if bold_prefix:
        r_b = p.add_run(bold_prefix)
        r_b.font.name = "Calibri"
        r_b.font.size = Pt(10.5)
        r_b.bold = True
        r_b.font.color.rgb = RGBColor(15, 23, 42)
        
    if italic_prefix:
        r_i = p.add_run(italic_prefix)
        r_i.font.name = "Calibri"
        r_i.font.size = Pt(10.5)
        r_i.italic = True
        r_i.font.color.rgb = RGBColor(71, 85, 105)
        
    r_body = p.add_run(text)
    r_body.font.name = "Calibri"
    r_body.font.size = Pt(10.5)
    r_body.font.color.rgb = RGBColor(30, 41, 59)
    return p

def add_bullet(doc, text, bold_prefix="", space_after=3):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.15
    
    if bold_prefix:
        r_b = p.add_run(bold_prefix)
        r_b.font.name = "Calibri"
        r_b.font.size = Pt(10.5)
        r_b.bold = True
        r_b.font.color.rgb = RGBColor(15, 23, 42)
        
    r_body = p.add_run(text)
    r_body.font.name = "Calibri"
    r_body.font.size = Pt(10.5)
    r_body.font.color.rgb = RGBColor(30, 41, 59)
    return p

def add_code_block(doc, code_str, title=""):
    if title:
        p_t = doc.add_paragraph()
        p_t.paragraph_format.space_before = Pt(8)
        p_t.paragraph_format.space_after = Pt(2)
        r_t = p_t.add_run(f"Listing: {title}")
        r_t.bold = True
        r_t.font.name = "Calibri"
        r_t.font.size = Pt(9)
        r_t.font.color.rgb = RGBColor(51, 65, 85)

    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Inches(6.5)
    
    cell = tbl.cell(0, 0)
    set_cell_background(cell, "F8FAFC")
    set_cell_margins(cell, top=100, bottom=100, left=150, right=150)
    
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'<w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>'
        f'<w:left w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>'
        f'<w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>'
        f'<w:right w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>'
        f'</w:tcBorders>'
    )
    tcPr.append(borders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.line_spacing = 1.05
    run = p.add_run(code_str)
    run.font.name = "Consolas"
    run.font.size = Pt(8)
    run.font.color.rgb = RGBColor(15, 23, 42)
    doc.add_paragraph().paragraph_format.space_after = Pt(4)

def add_table_data(doc, headers, rows, col_widths=None, alignment=None):
    tbl = doc.add_table(rows=len(rows) + 1, cols=len(headers))
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    
    for j, h in enumerate(headers):
        cell = tbl.cell(0, j)
        set_cell_background(cell, "1B365D")
        set_cell_margins(cell, top=100, bottom=100, left=120, right=120)
        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        if alignment and len(alignment) > j:
            p.alignment = alignment[j]
        run = p.add_run(h)
        run.bold = True
        run.font.name = "Calibri"
        run.font.size = Pt(9.5)
        run.font.color.rgb = RGBColor(255, 255, 255)
        
    for i, r in enumerate(rows):
        bg = "FFFFFF" if i % 2 == 0 else "F8FAFC"
        for j, val in enumerate(r):
            cell = tbl.cell(i + 1, j)
            set_cell_background(cell, bg)
            set_cell_margins(cell, top=80, bottom=80, left=120, right=120)
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            if alignment and len(alignment) > j:
                p.alignment = alignment[j]
            run = p.add_run(str(val))
            run.font.name = "Calibri"
            run.font.size = Pt(9)
            run.font.color.rgb = RGBColor(30, 41, 59)
            
    if col_widths:
        for row in tbl.rows:
            for j, w in enumerate(col_widths):
                row.cells[j].width = Inches(w)
                
    doc.add_paragraph().paragraph_format.space_after = Pt(4)
    return tbl

def embed_image_if_exists(doc, img_name, caption, width=Inches(6.0)):
    img_path = DOCS_DIR / img_name
    if img_path.exists():
        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img.paragraph_format.space_before = Pt(8)
        p_img.paragraph_format.space_after = Pt(2)
        p_img.add_run().add_picture(str(img_path), width=width)
        
        p_cap = doc.add_paragraph()
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_cap.paragraph_format.space_before = Pt(2)
        p_cap.paragraph_format.space_after = Pt(8)
        run_cap = p_cap.add_run(caption)
        run_cap.font.name = "Calibri"
        run_cap.font.size = Pt(9)
        run_cap.italic = True
        run_cap.font.color.rgb = RGBColor(71, 85, 105)

def build_full_report():
    doc = Document()
    
    # Configure 1-inch margins
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)
        
    print("Writing Title Page...")
    # Title Page
    p_inst = doc.add_paragraph()
    p_inst.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_inst = p_inst.add_run("VELLORE INSTITUTE OF TECHNOLOGY, VELLORE\nSCHOOL OF COMPUTER SCIENCE AND ENGINEERING\n\nBCSE306L – ARTIFICIAL INTELLIGENCE\nPROJECT REPORT")
    r_inst.bold = True
    r_inst.font.name = "Calibri"
    r_inst.font.size = Pt(13)
    r_inst.font.color.rgb = RGBColor(27, 54, 93)
    
    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_before = Pt(24)
    p_sp.paragraph_format.space_after = Pt(24)
    
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_title = p_title.add_run("NEUROLEAN AI: AN INTELLIGENT LEARNING OPERATING SYSTEM USING MACHINE LEARNING AND KNOWLEDGE GRAPHS")
    r_title.bold = True
    r_title.font.name = "Calibri"
    r_title.font.size = Pt(17)
    r_title.font.color.rgb = RGBColor(27, 54, 93)
    
    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_before = Pt(60)
    p_sub.paragraph_format.space_after = Pt(8)
    r_sub = p_sub.add_run("Submitted by\n")
    r_sub.font.name = "Calibri"
    r_sub.font.size = Pt(11)
    
    team_members = [
        "1. Narne Adithya Hanuman – 24BDS0220",
        "2. Tangudu Raajiv – 24BDS0242",
        "3. Garikapati Charan Deep – 24BDS0260",
        "4. Bhamidipaty Sai Santosh – 24BDS0213"
    ]
    p_team = doc.add_paragraph()
    p_team.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_team = p_team.add_run("\n".join(team_members) + "\n\nSlot: C1+TC1")
    r_team.italic = True
    r_team.font.name = "Calibri"
    r_team.font.size = Pt(11)
    
    p_guide = doc.add_paragraph()
    p_guide.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_guide.paragraph_format.space_before = Pt(60)
    r_guide = p_guide.add_run("Under the guidance of\nDr. P. Ramesh, Ph.D.\nAssociate Professor, Department of Data Science\n\nOCTOBER, 2026")
    r_guide.bold = True
    r_guide.font.name = "Calibri"
    r_guide.font.size = Pt(11)
    
    doc.add_page_break()
    
    print("Writing Bonafide Certificate...")
    # Bonafide Certificate
    p_bc = doc.add_paragraph()
    p_bc.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_bc.paragraph_format.space_before = Pt(60)
    r_bc = p_bc.add_run("BONAFIDE CERTIFICATE")
    r_bc.bold = True
    r_bc.font.name = "Calibri"
    r_bc.font.size = Pt(14)
    r_bc.font.color.rgb = RGBColor(27, 54, 93)
    
    add_p(doc, "This is to certify that the project work titled “NEUROLEAN AI: AN INTELLIGENT LEARNING OPERATING SYSTEM USING MACHINE LEARNING AND KNOWLEDGE GRAPHS” is a bonafide record of work carried out by Narne Adithya Hanuman (24BDS0220), Tangudu Raajiv (24BDS0242), Garikapati Charan Deep (24BDS0260), and Bhamidipaty Sai Santosh (24BDS0213), submitted in partial fulfilment of the requirements for the course BCSE306L – Artificial Intelligence, School of Computer Science and Engineering, VIT Vellore, during the academic year 2026 – 2027.", space_after=60, line_spacing=1.3)
    
    add_p(doc, "Faculty Guide: Dr. P. Ramesh, Ph.D.\nAssociate Professor, Department of Data Science", bold_prefix="", space_after=12)
    add_p(doc, "Date: 30/10/2026", space_after=12)
    
    doc.add_page_break()
    
    print("Writing Declaration...")
    # Declaration
    p_dec = doc.add_paragraph()
    p_dec.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_dec.paragraph_format.space_before = Pt(60)
    r_dec = p_dec.add_run("DECLARATION")
    r_dec.bold = True
    r_dec.font.name = "Calibri"
    r_dec.font.size = Pt(14)
    r_dec.font.color.rgb = RGBColor(27, 54, 93)
    
    add_p(doc, "We hereby declare that the project report titled “NEUROLEAN AI: AN INTELLIGENT LEARNING OPERATING SYSTEM USING MACHINE LEARNING AND KNOWLEDGE GRAPHS” submitted by us to VIT Vellore in partial fulfilment of the requirement for the course BCSE306L – Artificial Intelligence is a record of bona fide work carried out by us under the supervision of Dr. P. Ramesh, Associate Professor, Department of Data Science. The contents of this report, in full or in part, have not been submitted to any other institute or university for the award of any degree or diploma.", space_after=60, line_spacing=1.3)
    
    add_p(doc, "Place: VIT Vellore\nDate: 30/10/2026\n\nNarne Adithya Hanuman – 24BDS0220\nTangudu Raajiv – 24BDS0242\nGarikapati Charan Deep – 24BDS0260\nBhamidipaty Sai Santosh – 24BDS0213", space_after=12)
    
    doc.add_page_break()
    
    print("Writing Abstract...")
    # Abstract
    p_abs = doc.add_paragraph()
    p_abs.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_abs.paragraph_format.space_before = Pt(40)
    p_abs.paragraph_format.space_after = Pt(16)
    r_abs = p_abs.add_run("ABSTRACT")
    r_abs.bold = True
    r_abs.font.name = "Calibri"
    r_abs.font.size = Pt(14)
    r_abs.font.color.rgb = RGBColor(27, 54, 93)
    
    add_p(doc, "Computer Science education globally suffers from persistently high undergraduate failure and withdrawal rates in foundational Data Structures and Algorithms (DSA) courses (often 30–45%), largely stemming from the unaddressed phenomenon of hierarchical prerequisite gap compounding. In structured hierarchical subjects, student struggle on advanced topics such as Binary Search Trees or Dynamic Programming is almost always caused by an unresolved, latent cognitive deficit in foundational prerequisites several tiers upstream (e.g., Arrays, Pointers, and Memory Contiguity)—not the advanced topic itself. Traditional Learning Management Systems (LMS) deliver post-mortem evaluations only after exams are failed, evaluate topics as disconnected silos, and output uncalibrated risk rankings without actionable explanations.", space_after=12, line_spacing=1.2)
    
    add_p(doc, "This project presents NeuroLearn AI, an Intelligent Learning Operating System engineered to resolve prerequisite gap compounding through a unified three-tier paradigm combining structural graph theory, cognitive dynamic modeling, and calibrated explainable machine learning. First, a curricular Knowledge Graph models 38 core DSA concepts across 6 hierarchical tiers connected by 64 validated prerequisite dependency edges, strictly verified as a Directed Acyclic Graph (DAG) with zero cycles. Second, a continuous Digital Learning Twin models student state using Exponential Moving Averages (EMA) with adaptive learning rates (alpha=0.35 initial, 0.25 steady), Ebbinghaus-based exponential forgetting decay (0.015/day), submission velocity, consistency, and cohort-relative engagement. Third, an XGBoost classification engine trained on 15 leakage-free temporal features and calibrated via Isotonic Regression predicts student failure risk (<60% score) on subsequent concept attempts within a 14-day prospective window.", space_after=12, line_spacing=1.2)
    
    add_p(doc, "A DAG-traversal Root Gap Algorithm isolates the true deepest cognitive deficit blocking downstream mastery, and TreeSHAP converts high-dimensional mathematical attributions into verified, human-friendly natural language explanations without raw identifiers or jargon. In empirical evaluations on a rigorously generated temporal dataset of 34,555 attempts across 300 student twins, the calibrated XGBoost model achieved 0.9365 ROC AUC, 0.8194 PR AUC, 80.04% recall, 77.35% precision, and an exceptional 0.0984 Brier calibration score on held-out temporal test splits (Weeks 11–12), significantly outperforming baseline Logistic Regression (0.9089 ROC AUC). The Root Gap algorithm achieved 98.65% Top-1 and Top-3 diagnostic accuracy against synthetic ground truth. In longitudinal recommender simulations across 20 seeds, students guided along prerequisite-gated topological paths demonstrated a +60.7% true mastery gain over traditional linear syllabus orderings. The production microservices architecture (FastAPI ML service, Node.js/Express gateway, PostgreSQL 16 database, React 18 frontend) achieved 199.46 ms p95 end-to-end latency and 100% test pass rate across 99 multi-tier automated tests.", space_after=12, line_spacing=1.2)
    
    doc.add_page_break()
    
    print("Writing Table of Contents...")
    # Table of Contents
    p_toc = doc.add_paragraph()
    p_toc.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_toc.paragraph_format.space_before = Pt(20)
    p_toc.paragraph_format.space_after = Pt(14)
    r_toc = p_toc.add_run("TABLE OF CONTENTS")
    r_toc.bold = True
    r_toc.font.name = "Calibri"
    r_toc.font.size = Pt(14)
    r_toc.font.color.rgb = RGBColor(27, 54, 93)
    
    toc_data = [
        ("CHAPTER 1: INTRODUCTION", "6"),
        ("  1.1 Background", "6"),
        ("  1.2 Problem Statement", "6"),
        ("  1.3 Objectives & Novelty", "7"),
        ("CHAPTER 2: LITERATURE REVIEW", "9"),
        ("  2.1 Review of Related Research", "9"),
        ("  2.2 Research Gap", "13"),
        ("CHAPTER 3: LIMITATIONS OF EXISTING SYSTEMS", "14"),
        ("  3.1 Categories of Existing Systems", "14"),
        ("  3.2 Key Issues and Unresolved Challenges", "14"),
        ("  3.3 Requirements Derived for the Proposed System", "15"),
        ("CHAPTER 4: PROPOSED METHODOLOGY / MODEL", "16"),
        ("  4.1 Proposed System Architecture", "16"),
        ("  4.2 Module Description", "18"),
        ("  4.3 System Workflow", "18"),
        ("  4.4 Algorithms", "19"),
        ("  4.5 Database Design", "23"),
        ("  4.6 Implementation Strategy", "24"),
        ("CHAPTER 5: CODE REPOSITORY AND IMPLEMENTATION", "26"),
        ("  5.1 Code Repository", "26"),
        ("  5.2 Implementation Details", "27"),
        ("  5.3 Screenshots – Evidence of the Working Application", "51"),
        ("CHAPTER 6: EXPERIMENTAL ANALYSIS AND CURRENT PROGRESS", "64"),
        ("  6.1 Experimental Setup", "64"),
        ("  6.2 Experiment 1 – Curricular Knowledge Graph Verification and DAG Properties", "64"),
        ("  6.3 Experiment 2 – Prospective Risk Prediction Model Comparison", "65"),
        ("  6.4 Experiment 3 – Root Gap Diagnosis Benchmark", "66"),
        ("  6.5 Experiment 4 – TreeSHAP Explainability and Attribution Analysis", "67"),
        ("  6.6 Experiment 5 – Recommender Simulation and Mastery Gain", "68"),
        ("  6.7 Experiment 6 – Multi-Tier Functional Testing and API Latency Benchmark", "69"),
        ("  6.8 Current Status of the Work", "70"),
        ("  6.9 Challenges and Limitations", "70"),
        ("  6.10 Conclusion and Future Enhancements", "71"),
        ("CONTRIBUTION STATEMENT", "72"),
        ("REFERENCES", "74")
    ]
    
    for item, page in toc_data:
        p_t = doc.add_paragraph()
        p_t.paragraph_format.space_before = Pt(1)
        p_t.paragraph_format.space_after = Pt(2)
        r1 = p_t.add_run(item)
        r1.font.name = "Calibri"
        r1.font.size = Pt(10)
        if item.startswith("CHAPTER") or item.startswith("CONTRIBUTION") or item.startswith("REFERENCES"):
            r1.bold = True
            r1.font.color.rgb = RGBColor(27, 54, 93)
        else:
            r1.font.color.rgb = RGBColor(51, 65, 85)
            
        dots_count = max(5, 75 - len(item) - len(page))
        r2 = p_t.add_run(" " + "." * dots_count + " " + page)
        r2.font.name = "Calibri"
        r2.font.size = Pt(10)
        r2.font.color.rgb = RGBColor(148, 163, 184)
        
    doc.add_page_break()
    
    print("Writing Chapter 1: Introduction...")
    # Chapter 1
    format_heading(doc, "CHAPTER 1", level=1)
    format_heading(doc, "INTRODUCTION", level=1)
    
    format_heading(doc, "1.1 Background", level=2)
    add_p(doc, "Data Structures and Algorithms (DSA) represents the bedrock of computer science education, software engineering competency, and technical employment assessments. Master-level understanding of algorithmic structures enables engineers to design computationally efficient, scalable, and robust software architectures. However, foundational computer science courses in higher education globally suffer from persistently high failure, drop-out, and withdrawal rates, frequently documented between 30% and 45% in undergraduate engineering cohorts.")
    add_p(doc, "At the heart of this learning crisis lies the pedagogical reality of hierarchical prerequisite gap compounding. In algorithmic education, concepts do not exist as independent learning modules; rather, they form strict Directed Acyclic Graphs (DAGs) of cognitive dependencies. Mastery of advanced topics such as Binary Search Trees (Level 3) strictly requires prior competency in Tree Traversals, which depends on Singly Linked Lists (Level 3) and Recursion (Level 1), which in turn relies entirely on contiguous Memory Allocation, Arrays, and Pointers (Level 1). When an engineering student struggles with tree rebalancing or dynamic programming memoization, standard educational tools attribute the failure solely to the immediate topic. In reality, over 80% of persistent learning bottlenecks stem from an unaddressed, latent gap in a foundational prerequisite several tiers upstream.")
    add_p(doc, "Existing Learning Management Systems (LMS) such as Canvas, Blackboard, or Moodle, alongside automated code testing platforms such as LeetCode or HackerRank, treat curriculum topics as flat, isolated silos. They lack topological awareness of prerequisite chains, evaluate student performance reactively only after exams are failed, and fail to provide explainable diagnostic feedback to either learners or instructors.")
    add_p(doc, "NeuroLearn AI bridges this critical educational void by engineering an Intelligent Learning Operating System that synthesizes structural graph theory, continuous cognitive dynamic modeling, and calibrated explainable machine learning into an explainable, closed-loop pedagogical feedback platform.")

    format_heading(doc, "1.2 Problem Statement", level=2)
    add_p(doc, "Students enrolled in rigorous computer science curricula struggle with algorithmic competencies because existing educational platforms fail to provide proactive, personalized, and root-cause-aware guidance. Specifically, existing methodologies suffer from four foundational flaws:")
    add_bullet(doc, "Conventional educational frameworks evaluate performance after formal exams or course modules have already completed, notifying learners and faculty when intervention is too late.", bold_prefix="Reactive Post-Mortem Diagnostics: ")
    add_bullet(doc, "Current systems treat curricular concepts as isolated silos without modeling the explicit prerequisite graph structures that govern algorithmic mastery.", bold_prefix="Topological Disconnection: ")
    add_bullet(doc, "Predictive student-at-risk systems rely on uncalibrated black-box models that generate raw probabilities without explaining the underlying pedagogical reasons or identifying actionable remediation.", bold_prefix="Opaque Machine Learning: ")
    add_bullet(doc, "In cohorts exceeding 100 to 300 students, faculty instructors lack real-time visibility into systemic cognitive gaps, leaving them unable to administer targeted pedagogical adjustments before cohort attrition occurs.", bold_prefix="Faculty Cognitive Overload: ")

    format_heading(doc, "1.3 Objectives & Novelty", level=2)
    add_p(doc, "The measurable objectives of the proposed NeuroLearn AI system are detailed in Table 1.1 below, along with the specific sections in this report where each objective is empirically validated.")

    t1_headers = ["#", "Objective", "Measurable Target", "Verified in"]
    t1_rows = [
        ["O1", "Curricular Knowledge Graph DAG", "38 DSA concepts, 64 validated edges, 6 levels, zero cycles, 100% DAG integrity", "Sec. 4.4, 6.2"],
        ["O2", "Cognitive Digital Learning Twin", "Continuous EMA mastery, exponential forgetting (0.015/day), velocity, consistency, engagement", "Sec. 4.4, 6.7"],
        ["O3", "Prospective Failure Risk Prediction", "XGBoost + Isotonic Calibration; 14-day prospective window; ROC AUC >= 0.80, Recall >= 0.75, Brier < 0.18", "Sec. 6.3"],
        ["O4", "Axiomatic SHAP Explainability", "TreeSHAP attribution converted into 3 verified natural language sentences; zero raw identifiers", "Sec. 4.4, 6.5"],
        ["O5", "Graph-Traversal Root Gap Diagnosis", "Identify deepest weak ancestor (<0.6 mastery); >=85% accuracy benchmarked on synthetic ground truth", "Sec. 4.4, 6.4"],
        ["O6", "Adaptive Topological Path Recommender", "Prerequisite-gated personalized learning paths; >=50% true mastery gain in simulation", "Sec. 4.4, 6.6"],
        ["O7", "Microservices Architecture & Latency", "Python/FastAPI, Node.js/Express, PostgreSQL 16, React 18; p95 latency < 600 ms, 100% test pass rate", "Sec. 4.1, 6.7"]
    ]
    add_table_data(doc, t1_headers, t1_rows, col_widths=[0.4, 1.8, 3.1, 1.2])

    format_heading(doc, "Novelty of the Project", level=3)
    add_p(doc, "NeuroLearn AI introduces five foundational scientific and engineering novelties over conventional educational software:")
    add_bullet(doc, "Unlike systems that model student ability as a static scalar (e.g., GPA or average test score), NeuroLearn AI implements a dynamic multi-dimensional state tracking concept-specific EMA mastery, forgetting half-life, velocity, and schedule regularity.", bold_prefix="1. Continuous Cognitive Digital Learning Twin: ")
    add_bullet(doc, "NeuroLearn AI formulates curriculum design as a mathematically rigorous DAG (NetworkX), enabling exact causal tracing of learning breakdowns through transitive prerequisite subgraphs.", bold_prefix="2. Graph-Theoretical Root Gap Isolation: ")
    add_bullet(doc, "Rather than relying on uncalibrated raw neural outputs, NeuroLearn AI combines gradient-boosted decision trees with Isotonic Probability Calibration to ensure predicted failure risks reflect true empirical frequencies (Brier score 0.0984).", bold_prefix="3. Calibrated Prospective Risk Forecasting: ")
    add_bullet(doc, "High-dimensional TreeSHAP Shapley values are transformed through a rule-bounded natural language generator into grammatically sound, pedagogical explanations, eliminating black-box opacity.", bold_prefix="4. Transparent Axiomatic Explainability: ")
    add_bullet(doc, "The entire pipeline—from student practice attempt ingestion, twin replay, feature extraction, calibrated inference, and root-gap diagnosis to faculty cohort alerts—operates in a unified sub-200ms reactive loop.", bold_prefix="5. Closed-Loop Microservice Architecture: ")

    doc.add_page_break()
    
    print("Writing Chapter 2: Literature Review...")
    # Chapter 2
    format_heading(doc, "CHAPTER 2", level=1)
    format_heading(doc, "LITERATURE REVIEW", level=1)
    
    format_heading(doc, "2.1 Review of Related Research", level=2)
    add_p(doc, "To establish a rigorous theoretical and empirical foundation, thirty foundational and state-of-the-art research articles were critically evaluated across six interconnected scientific domains: (a) Knowledge Tracing and Learner Modeling, (b) Educational Knowledge Graphs and Prerequisite Dependency Modeling, (c) Machine Learning for Student At-Risk Prediction, (d) Explainable Artificial Intelligence (XAI) in Education, (e) Cognitive Load and Spaced Forgetting Dynamics, and (f) Fairness, Validity, and Model Calibration. These works are reviewed below and systematically indexed in Table 2.1.")

    add_p(doc, "Corbett & Anderson (1994) formulated Bayesian Knowledge Tracing (BKT), modeling mastery through Hidden Markov Models. While interpretable, BKT assumes skill independence, failing in hierarchical subjects. Piech et al. (2015) introduced Deep Knowledge Tracing (DKT) using recurrent neural networks (LSTMs), dramatically boosting sequence prediction accuracy but creating opaque black boxes prone to overfitting. Zhang et al. (2017) developed Dynamic Key-Value Memory Networks (DKVMN) to improve skill-level interpretability, but lacked topological prerequisite constraints. Pandey & Karypis (2019) introduced Self-Attentive Knowledge Tracing (SAKT) with Transformers, yet captured only temporal correlations without pedagogical hierarchy. Choi et al. (2020) proposed SAINT with an encoder-decoder architecture, requiring massive datasets (>100k attempts) without root-cause diagnostic capabilities.", bold_prefix="(a) Knowledge Tracing and Learner Modeling: ")

    add_p(doc, "Chen et al. (2018) developed KnowEdu for automated concept and prerequisite extraction, demonstrating graph structures in organizing resources but omitting real-time student modeling. Liang et al. (2018) formulated active learning for prerequisite extraction across educational corpora. Roy et al. (2019) proposed Concept-Aware Deep Knowledge Tracing, integrating graph embeddings into recurrent models. Wang et al. (2020) designed Prerequisite-Driven Dynamic Knowledge Tracing (PD-DKT), enforcing local prerequisite gating but without root-gap diagnostic algorithms. Alzetta et al. (2020) surveyed graph-based learning path generators, finding that existing systems rarely combine predictive ML with topological traversal.", bold_prefix="(b) Educational Knowledge Graphs & Prerequisite Dependency Modeling: ")

    add_p(doc, "Marbouti et al. (2016) benchmarked early warning predictive models (Logistic Regression, Support Vector Machines, Naive Bayes), finding that ensemble trees achieved the highest early detection rates. Rastrollo-Guerrero et al. (2020) surveyed 70 educational AI systems, noting that decision trees and gradient boosting dominated academic outcome prediction. Chen et al. (2021) evaluated XGBoost on college dropout datasets, demonstrating superior handling of missing tabular data. Hu et al. (2014) engineered online learning early-warning systems, but relied solely on aggregate LMS engagement clicks rather than cognitive concept mastery.", bold_prefix="(c) Machine Learning for Student At-Risk Prediction: ")

    add_p(doc, "Lundberg & Lee (2017) established the SHAP (SHapley Additive exPlanations) framework, proving game-theoretic uniqueness and local accuracy. Lundberg et al. (2020) developed TreeSHAP for tree ensembles, enabling polynomial-time exact feature attribution. Conati et al. (2018) and Khosravi et al. (2022) surveyed XAI in education, establishing that students and educators reject raw mathematical feature plots, demanding contextualized natural language explanations. Sweller (1988) established Cognitive Load Theory, demonstrating that upstream prerequisite deficits cause catastrophic working-memory overload.", bold_prefix="(d) Explainable AI and Cognitive Modeling: ")

    add_p(doc, "Ebbinghaus (1885) formalized the exponential forgetting curve, establishing that memory retention decays non-linearly over time unless reinforced. Murre & Dros (2015) modernly replicated Ebbinghaus's equations. Brier (1950) formulated proper scoring rules for probabilistic calibration. Niculescu-Mizil & Caruana (2005) demonstrated that tree ensembles output distorted, uncalibrated probabilities, proving that Isotonic Regression reliably restores probability calibration. Baker & Hawn (2022) reviewed algorithmic bias in education, emphasizing the necessity of reporting calibration, class-wise errors, and explicit disclaimers.", bold_prefix="(e) Cognitive Dynamics, Forgetting & Model Calibration: ")

    add_p(doc, "Table 2.1 provides a structured, comparative analysis of all thirty surveyed research publications, identifying the specific technological gaps addressed by NeuroLearn AI.")

    t21_headers = ["#", "Author(s) & Year", "Focus / Method", "Key Finding", "Gap Relevant to This Project"]
    t21_rows = [
        ["1", "Corbett & Anderson (1994)", "Bayesian Knowledge Tracing (HMM)", "Binary latent skill mastery estimation", "Assumes independent skills; no prerequisite hierarchy"],
        ["2", "Piech et al. (2015)", "Deep Knowledge Tracing (LSTM)", "Sequence modeling outperforms BKT", "Black box; data hungry; no diagnostic explanation"],
        ["3", "Zhang et al. (2017)", "Dynamic Key-Value Memory Networks", "Separates concepts from mastery values", "No DAG constraints; illogical mastery jumps"],
        ["4", "Pandey & Karypis (2019)", "Self-Attentive Knowledge Tracing", "Attention over historical interactions", "Temporal attention only; topologically blind"],
        ["5", "Choi et al. (2020)", "SAINT (Transformer Encoder-Decoder)", "State-of-the-art sequence prediction", "Requires >100k attempts; no root-cause diagnosis"],
        ["6", "Ghosh et al. (2020)", "Attentive Knowledge Tracing (AKT)", "Distance-aware context attention", "Models forgetting but lacks prerequisite ontology"],
        ["7", "Chen et al. (2018)", "KnowEdu Prerequisite Graph Mining", "Automated concept ontology extraction", "Static graph; no real-time student dynamic tracking"],
        ["8", "Liang et al. (2018)", "Prerequisite Learning via Active Trees", "Identifies dependencies from text", "Curricular only; no learner cognitive integration"],
        ["9", "Roy et al. (2019)", "Concept-Aware Knowledge Tracing", "Incorporates concept graph embeddings", "Complex neural pipeline; lacks local explainability"],
        ["10", "Wang et al. (2020)", "Prerequisite-Driven DKT (PD-DKT)", "Prerequisite gating in neural cells", "No root-cause traversal; black-box outputs"],
        ["11", "Alzetta et al. (2020)", "Graph-Based Learning Path Survey", "Graph traversal optimizes review paths", "Heuristic only; lacks predictive ML risk modeling"],
        ["12", "Marbouti et al. (2016)", "Early Warning Ensemble Benchmark", "Tree ensembles outperform naive bayes", "Course-level binary outcome; no per-topic insight"],
        ["13", "Rastrollo-Guerrero (2020)", "Survey of 70 Student Outcome Models", "Gradient boosting yields top accuracy", "Predictions lack calibrated probabilities & XAI"],
        ["14", "Chen et al. (2021)", "XGBoost for College Dropout Risk", "Robust handling of sparse tabular logs", "Lacks educational graph features; coarse dropout label"],
        ["15", "Hu et al. (2014)", "LMS Activity Early Warning System", "Clickstream frequency predicts failure", "Measures platform engagement, not conceptual mastery"],
        ["16", "Lundberg & Lee (2017)", "SHAP Additive Feature Explanations", "Axiomatic local feature attribution", "Mathematical theory; requires natural language mapping"],
        ["17", "Lundberg et al. (2020)", "TreeSHAP Exact Feature Attribution", "Polynomial-time attribution for trees", "Engineered for tabular data; raw outputs confuse learners"],
        ["18", "Conati et al. (2018)", "Evaluating XAI for Intelligent Tutoring", "Learners benefit from transparent advice", "Conceptual guidelines; lacks automated ML generation"],
        ["19", "Khosravi et al. (2022)", "Explainable AI in Education (XAI-ED)", "Human-centered XAI builds learner trust", "Surveys lack end-to-end deployed software systems"],
        ["20", "Sweller (1988)", "Cognitive Load Theory", "Prerequisite gaps overwhelm working memory", "Educational psychology theory; no algorithmic engine"],
        ["21", "Ebbinghaus (1885)", "Memory Retention & Forgetting Curve", "Exponential memory decay over time", "Psychological law; requires digital twin modeling"],
        ["22", "Murre & Dros (2015)", "Modern Replication of Ebbinghaus", "Exponential decay matches human recall", "Empirical study; not integrated into active software"],
        ["23", "Brier (1950)", "Verification of Probabilistic Forecasts", "Brier score strictly quantifies calibration", "Evaluation metric; omitted in most educational ML"],
        ["24", "Niculescu-Mizil (2005)", "Predicting Good Probabilities via Trees", "Isotonic regression calibrates ensembles", "ML study; rarely applied in commercial LMS tools"],
        ["25", "Baker & Hawn (2022)", "Algorithmic Bias & Fairness in AIED", "AIED models must document limitations", "Validates need for disclaimers and error analysis"],
        ["26", "Pelánek (2017)", "Bayesian vs Logistic Knowledge Tracing", "Additive factors models provide baselines", "Flat logistic regressions miss non-linear interactions"],
        ["27", "Vie & Kashima (2019)", "Knowledge Tracing Machines (KTM)", "Factorization machines over sparse logs", "Requires extensive hyperparameter tuning; low XAI"],
        ["28", "Abdelrahman et al. (2023)", "Deep Learning in KT: 10-Year Review", "DKT models plateau without structural priors", "Strongly advocates hybrid graph-neural architectures"],
        ["29", "Shute (2008)", "Formative Feedback Guidelines", "Feedback must be specific and actionable", "Pedagogical guidelines; lacks real-time ML execution"],
        ["30", "Raghavan et al. (2020)", "Auditing Algorithmic Assessments", "Commercial tools lack validation & auditability", "Motivates transparent benchmarks and open codebases"]
    ]
    add_table_data(doc, t21_headers, t21_rows, col_widths=[0.3, 1.5, 1.7, 1.5, 1.5])

    format_heading(doc, "2.2 Research Gap", level=2)
    add_p(doc, "The extensive body of reviewed literature reveals that each foundational building block exists in isolation: knowledge tracing tracks mastery, knowledge graphs structure domain ontologies, gradient boosted trees classify tabular student outcomes, and explainable AI produces Shapley feature scores. However, prior research fails to synthesize these components into an integrated, prospective, and root-cause-aware operating system.")

    t22_headers = ["Existing Research Direction", "Critical Limitation in Literature", "NeuroLearn AI Solution"]
    t22_rows = [
        ["Knowledge Tracing (BKT, DKT, SAINT)", "Treats concepts as independent or temporal-only; lacks prerequisite DAG hierarchy and root-gap diagnostics.", "Curricular DAG of 38 DSA concepts with 64 edges; exact Root Gap traversal algorithm with 98.65% accuracy."],
        ["Early-Warning Models (XGBoost, SVM)", "Outputs uncalibrated probabilities for coarse binary outcomes (pass/fail) without concept-level granularity.", "Calibrated XGBoost (Brier 0.0984) forecasting 14-day prospective concept failure (<60% score)."],
        ["Explainable AI in Education (SHAP, LIME)", "Presents raw mathematical bar charts and technical feature names that confuse students and instructors.", "TreeSHAP attribution engine mapped to rule-bounded, human-friendly natural language explanations."],
        ["Cognitive Modeling (Ebbinghaus, BKT)", "Static scalar ability without modeling time-based forgetting decay or practice regularity.", "Cognitive Digital Learning Twin tracking EMA mastery, forgetting decay (0.015/day), velocity, and consistency."],
        ["Educational Recommenders", "Rely on popularity or flat linear syllabus orders, forcing students into advanced topics with active gaps.", "Topological learning path recommender producing +60.7% true mastery gain in controlled simulation."]
    ]
    add_table_data(doc, t22_headers, t22_rows, col_widths=[1.8, 2.3, 2.4])

    doc.add_page_break()
    
    print("Writing Chapter 3: Limitations of Existing Systems...")
    # Chapter 3
    format_heading(doc, "CHAPTER 3", level=1)
    format_heading(doc, "LIMITATIONS OF EXISTING SYSTEMS", level=1)
    
    format_heading(doc, "3.1 Categories of Existing Systems", level=2)
    add_p(doc, "Current educational practice relies on an ad-hoc combination of disparate software tools. Table 3.1 categorizes these existing systems, contrasting their strengths with their critical limitations for prerequisite-intensive learning.")

    t31_headers = ["Category", "Typical Approach & Tools", "Demonstrated Strength", "Fatal Pedagogical Limitation"]
    t31_rows = [
        ["Standard LMS", "Canvas, Moodle, Blackboard; static gradebooks and module checklists", "Robust enterprise course management and grading", "Completely reactive; no prospective risk prediction; treats modules as flat disconnected lists"],
        ["Automated Code Graders", "LeetCode, HackerRank, Codeforces; unit-test execution", "Instant submission evaluation on runtime & test cases", "Zero pedagogical context; does not diagnose why a student failed or identify upstream prerequisite gaps"],
        ["Intelligent Tutoring Systems", "Carnegie Learning, ALEKS; inner-loop rule-based hints", "Step-by-step problem-solving scaffolding", "High authoring costs; rigid proprietary expert rules; lacks cohort-wide faculty analytics"],
        ["Predictive Analytics Plugins", "Blackboard Predict, Brightspace Student Success System", "Coarse course-level dropout probability scoring", "Black-box neural models; uncalibrated risk scores; provides no actionable remediation path"],
        ["Generative AI Chatbots", "ChatGPT, Claude, Khanmigo; conversational LLM tutor", "Versatile natural language dialogue and code explanation", "Non-deterministic; prone to hallucinations; no persistent cognitive memory or curriculum topology"]
    ]
    add_table_data(doc, t31_headers, t31_rows, col_widths=[1.4, 1.7, 1.5, 1.9])

    format_heading(doc, "3.2 Key Issues and Unresolved Challenges", level=2)
    add_p(doc, "Detailed investigation of educational environments reveals seven fundamental technical and pedagogical challenges that remain unresolved by conventional software:")
    add_bullet(doc, "Existing platforms assess student competence only after assignments or high-stakes exams are concluded, alerting educators when grade deficits are already irreversible.", bold_prefix="1. Reactive Post-Mortem Diagnostics: ")
    add_bullet(doc, "Conventional curriculum engines lack structural representations of prerequisite relationships, forcing students into advanced concepts despite foundational deficits.", bold_prefix="2. Blindness to Prerequisite Topologies: ")
    add_bullet(doc, "Standard models assume memory is permanent, ignoring the exponential decay of knowledge during periods of inactivity.", bold_prefix="3. Neglect of Spaced Forgetting Dynamics: ")
    add_bullet(doc, "Predictive risk systems output raw sigmoid scores that do not match empirical failure rates, leading to false confidence or alarm fatigue.", bold_prefix="4. Uncalibrated and Misleading Probabilities: ")
    add_bullet(doc, "Existing machine learning systems operate as opaque black boxes, providing raw numbers without explaining which behaviors caused the risk.", bold_prefix="5. Black-Box Opacity and Lack of Pedagogical Explanations: ")
    add_bullet(doc, "Remediation tools suggest generic problem lists without sequencing them according to topological dependencies, overwhelming working memory.", bold_prefix="6. Unstructured and Overwhelming Remediation: ")
    add_bullet(doc, "In large classes, instructors have no aggregated view of common prerequisite bottlenecks, making proactive classroom interventions impossible.", bold_prefix="7. Faculty Cognitive Overload and Lack of Cohort Visibility: ")

    format_heading(doc, "3.3 Requirements Derived for the Proposed System", level=2)
    add_p(doc, "These seven limitations directly dictate the architectural requirements of NeuroLearn AI, mapped to the corresponding software modules in Table 3.2.")

    t32_headers = ["Identified Limitation", "System Design Requirement", "Addressing Module in NeuroLearn AI"]
    t32_rows = [
        ["Reactive post-mortem evaluation", "Prospective risk prediction 14 days in advance", "Calibrated XGBoost Risk Engine (ml-service)"],
        ["Prerequisite topological blindness", "Strict DAG curation and root gap identification", "KnowledgeGraphService (NetworkX)"],
        ["Neglect of forgetting decay", "Continuous cognitive state with exponential decay", "Cognitive Digital Learning Twin (twin.py)"],
        ["Uncalibrated probabilities", "Isotonic regression mapping to true empirical rates", "CalibratedClassifierCV Pipeline"],
        ["Black-box opacity", "Axiomatic feature attribution to natural language", "TreeSHAP Explanation Service (reasons.py)"],
        ["Unstructured remediation", "Topological prerequisite-gated learning path", "Adaptive Recommender Engine (recommender.py)"],
        ["Faculty cognitive overload", "Cohort analytics, common gaps, and early warning radar", "Faculty Dashboard & Analytics Gateway"]
    ]
    add_table_data(doc, t32_headers, t32_rows, col_widths=[1.8, 2.4, 2.3])

    doc.add_page_break()
    
    print("Writing Chapter 4: Proposed Methodology / Model...")
    # Chapter 4
    format_heading(doc, "CHAPTER 4", level=1)
    format_heading(doc, "PROPOSED METHODOLOGY / MODEL", level=1)
    
    format_heading(doc, "4.1 Proposed System Architecture", level=2)
    add_p(doc, "NeuroLearn AI is architected as an industrial-grade, multi-tier microservices platform designed for sub-200ms latency, high modularity, and strict role-based separation of concerns. Figure 4.1 illustrates the four-layer client-server architecture.")

    embed_image_if_exists(doc, "system_architecture.png", "Figure 4.1: Four-layer microservices architecture of the NeuroLearn AI platform", width=Inches(6.2))

    add_p(doc, "Table 4.1 enumerates the technologies, architectural responsibilities, and input/output contracts across each structural tier.")

    t41_headers = ["Layer", "Technology", "Primary Responsibility", "Data Contracts & Outputs"]
    t41_rows = [
        ["Presentation", "React 18, Vite, TypeScript, TailwindCSS, Cytoscape.js, Chart.js", "Responsive student/faculty portals, interactive DAG visualizer, cognitive heatmaps, risk cards", "User interactions, attempt logs, REST JSON requests, JWT headers"],
        ["API Gateway", "Node.js 20 LTS, Express, TypeScript, Zod, pg (node-postgres)", "Route dispatching, JWT authentication, RBAC authorization, attempt idempotency, dual-layer TTL cache", "Validated REST endpoints, SQL queries, internal authenticated HTTP requests"],
        ["Data Persistence", "PostgreSQL 16 (Docker / Local), 10 relational tables, B-tree indexes", "Durable ACID storage of users, attempts, twin snapshots, predictions, recommendations, model registry", "Relational persistence, COPY bulk seeding (34.5k rows in 3.9s), partial unique indexes"],
        ["AI / ML Microservice", "Python 3.12, FastAPI, Uvicorn, XGBoost 2.x, SHAP 0.45+, NetworkX 3.x", "Knowledge graph traversal, Digital Learning Twin replay, 15-feature extraction, calibrated risk prediction, TreeSHAP explainability", "Sub-200ms JSON responses: /ml/analyze, /ml/predict, /ml/explain, /ml/root-gap, /ml/twin/update"]
    ]
    add_table_data(doc, t41_headers, t41_rows, col_widths=[1.1, 1.6, 2.3, 1.5])

    format_heading(doc, "4.2 Module Description", level=2)
    add_p(doc, "NeuroLearn AI comprises eleven decoupled functional modules, each possessing strictly defined inputs, outputs, and validation rules as detailed in Table 4.2.")

    t42_headers = ["Module", "Technical Scope & Purpose", "Input Parameters", "Output Artifacts"]
    t42_rows = [
        ["4.2.1 Auth & RBAC", "bcrypt password hashing, JWT HS256 tokens, role guards", "Email, password, role", "Signed JWT bearer token, user session"],
        ["4.2.2 Student Dashboard", "Mastery heatmap, risk cards, attempt modal, history table", "Student ID, JWT token", "Interactive UI, attempt submissions"],
        ["4.2.3 Cytoscape DAG", "Interactive 38-node graph visualization with color-coded risk", "Graph JSON, twin state", "Rendered canvas with pan/zoom/select"],
        ["4.2.4 Knowledge Graph", "NetworkX DiGraph, topological sort, ancestor/descendant queries", "Node & edge specifications", "Topological order, dependency chains"],
        ["4.2.5 Digital Learning Twin", "Incremental state replay: EMA mastery, Ebbinghaus decay, velocity", "Attempt history sequence", "TwinState (mastery, velocity, confidence)"],
        ["4.2.6 Feature Extraction", "15 leakage-free temporal features combining student, concept & KG", "TwinState, attempt history, target concept", "15-dimensional numeric feature vector"],
        ["4.2.7 Risk Classifier", "XGBoost classifier + Isotonic Regression calibration", "15-feature vector", "Calibrated failure probability, risk band"],
        ["4.2.8 Root Gap Diagnosis", "Subgraph traversal identifying deepest weak ancestor (<0.6 mastery)", "Concept code, TwinState mastery", "Ranked root gap objects, blocked count"],
        ["4.2.9 TreeSHAP Explainer", "Axiomatic Shapley attribution mapped to natural language sentences", "Model, feature vector, twin values", "Top 3 human-friendly natural sentences"],
        ["4.2.10 Recommender", "Topologically sequenced learning paths gated by prerequisite mastery", "TwinState, root gaps, resources", "3–10 ordered learning steps with resources"],
        ["4.2.11 Faculty Portal", "Cohort risk distribution, common root gaps, early warning radar", "Cohort ID, student records", "Aggregated faculty analytics dashboards"]
    ]
    add_table_data(doc, t42_headers, t42_rows, col_widths=[1.5, 2.1, 1.4, 1.5])

    format_heading(doc, "4.3 System Workflow", level=2)
    add_p(doc, "The NeuroLearn AI platform executes through an end-to-end, three-phase cognitive lifecycle (Figure 4.2):")
    add_p(doc, "Phase 1: Knowledge Graph and Cohort Initialization. The 38-node curricular DAG is compiled and validated for cycle-freedom. When students register, initial Digital Learning Twins are created with prior mastery distributions gated by prerequisite structure.")
    add_p(doc, "Phase 2: Practice Attempt Ingestion and Cognitive Twin Replay. As the student practices, each attempt is recorded with an idempotency key (client_attempt_id). The twin replays the event, updating Exponential Moving Average (EMA) mastery, calculating Ebbinghaus decay across idle days, and recomputing score velocity and schedule consistency.")
    add_p(doc, "Phase 3: Calibrated Risk Inference, Root-Gap Traversal, and Explainable Guidance. The 15 leakage-free features are computed. Calibrated XGBoost evaluates failure risk. The Root Gap algorithm traverses the prerequisite DAG to isolate upstream bottlenecks. TreeSHAP generates three natural language explanations. Personalized review paths and faculty early-warning alerts update dynamically.")

    embed_image_if_exists(doc, "workflow_diagram.png", "Figure 4.2: End-to-end three-phase cognitive workflow of the NeuroLearn AI platform", width=Inches(6.2))

    format_heading(doc, "4.4 Algorithms & Mathematical Formulations", level=2)
    add_p(doc, "Figure 4.3 illustrates the 6-level curricular DAG structure curated for the Data Structures and Algorithms curriculum.")
    embed_image_if_exists(doc, "knowledge_graph_dag.png", "Figure 4.3: Curricular Knowledge Graph hierarchy (38 concepts across 6 levels)", width=Inches(6.0))

    add_p(doc, "4.4.1 Root Gap Identification Algorithm", bold_prefix="", space_after=4)
    add_p(doc, "The Root Gap algorithm isolates the deepest weak prerequisite concept responsible for a student's struggle on a target concept. Let G = (V, E) be the curricular DAG, and let m(c) in [0, 1] denote the student's current estimated cognitive mastery for concept c.")

    root_gap_code = (
        "Algorithm 1: RootGapIdentification(G, target_concept, mastery_map, threshold=0.60)\n"
        "Input: DAG G, target concept T in V, student mastery vector m, mastery threshold theta\n"
        "Output: Ranked list of true root prerequisite gaps R\n"
        "1: Ancestors <- FindAllAncestors(G, T)\n"
        "2: WeakAncestors <- { u in Ancestors | m(u) < theta }\n"
        "3: if WeakAncestors is Empty then\n"
        "4:    if m(T) < theta then\n"
        "5:       return [{ concept: T, mastery: m(T), blocked_descendants: 0, reason: 'Target concept deficit' }]\n"
        "6:    else return []\n"
        "7: RootCandidates <- EmptySet\n"
        "8: for each u in WeakAncestors do\n"
        "9:    UpstreamWeak <- { v in FindAllAncestors(G, u) | m(v) < theta }\n"
        "10:   if UpstreamWeak is Empty then\n"
        "11:      RootCandidates <- RootCandidates Union { u }\n"
        "12: RankedGaps <- []\n"
        "13: for each r in RootCandidates do\n"
        "14:   Blocked <- CountDescendants(G, r)\n"
        "15:   ImpactScore <- (1.0 - m(r)) * (1 + Blocked)\n"
        "16:   RankedGaps.append({ concept: r, mastery: m(r), blocked: Blocked, score: ImpactScore })\n"
        "17: Sort RankedGaps by ImpactScore descending\n"
        "18: return RankedGaps"
    )
    add_code_block(doc, root_gap_code, title="Root Gap Identification Algorithm (NetworkX DAG Traversal)")

    add_p(doc, "4.4.2 Cognitive Digital Learning Twin Mathematical Formulations", bold_prefix="", space_after=4)
    add_p(doc, "The student's cognitive state is continuously updated across five core mathematical dimensions:")
    add_p(doc, "1. Prior Mastery Initialization: When a student has zero attempts on concept c, prior mastery m_0(c) is determined by prerequisite competency:")
    add_p(doc, "m_0(c) = 0.40  if  Pred(c) is empty;  m_0(c) = 0.20 + 0.40 * (1 / |Pred(c)|) * Sum_{p in Pred(c)} m(p)", italic_prefix="Equation 4.1: ")
    add_p(doc, "2. Exponential Moving Average (EMA) Attempt Update: Following attempt n with normalized score s_n in [0, 1], mastery m_n updates with adaptive learning rate alpha:")
    add_p(doc, "m_n = m_{n-1} + alpha * (s_n - m_{n-1}),  where alpha = 0.35 if n <= 3 else 0.25 (scaled by 0.7 for practice)", italic_prefix="Equation 4.2: ")
    add_p(doc, "3. Ebbinghaus Spaced Forgetting Decay: Retention decays exponentially across idle days delta_t elapsed since the last practice attempt:")
    add_p(doc, "m_effective = m_0 + (m_n - m_0) * exp(-0.015 * delta_t)", italic_prefix="Equation 4.3: ")
    add_p(doc, "4. Score Velocity: The rate of student progression is computed as the linear regression slope over the last 5 scores:")
    add_p(doc, "Velocity = (Sum_{i=1}^k (i - i_mean)(s_i - s_mean)) / (Sum_{i=1}^k (i - i_mean)^2),  k = min(5, n)", italic_prefix="Equation 4.4: ")
    add_p(doc, "5. Practice Consistency: Schedule regularity is quantified from the standard deviation of practice intervals:")
    add_p(doc, "Consistency = 1.0 - min(1.0, std(intervals) / max(mean(intervals), 0.5))", italic_prefix="Equation 4.5: ")

    add_p(doc, "4.4.3 15 Leakage-Free Feature Engineering", bold_prefix="", space_after=4)
    add_p(doc, "To ensure zero data leakage across time, all 15 features are computed strictly using attempts occurring prior to the prediction timestamp. The features encompass three orthogonal domains: student historical performance (avg_score_last3, avg_score_all, score_slope_5, attempts_count, days_since_last_attempt, time_ratio, hints_rate), topological knowledge graph properties (prereq_mean_mastery, prereq_min_mastery, n_weak_prereqs, concept_difficulty, concept_level), and cohort behavioral indicators (student_mean_mastery, student_consistency, student_engagement).")

    add_p(doc, "4.4.4 Calibrated XGBoost Risk Classification & Isotonic Scaling", bold_prefix="", space_after=4)
    add_p(doc, "Failure risk is defined as the binary probability P(y=1 | x) that the student will score < 60% on their next attempt within 14 days. The uncalibrated risk is computed by an ensemble of gradient-boosted classification trees minimizing binary cross-entropy with scale_pos_weight:")
    add_p(doc, "L(y, p) = - [ w * y * log(p) + (1 - y) * log(1 - p) ]", italic_prefix="Equation 4.6: ")
    add_p(doc, "Because raw tree probabilities are notoriously uncalibrated, Isotonic Regression fits a non-parametric isotonic function m(z) minimizing squared calibration error on the validation set:")
    add_p(doc, "min_{m} Sum_{i} (y_i - m(f(x_i)))^2  subject to  m(z_1) <= m(z_2) for all z_1 <= z_2", italic_prefix="Equation 4.7: ")

    add_p(doc, "4.4.5 Axiomatic Explainability via TreeSHAP", bold_prefix="", space_after=4)
    add_p(doc, "Local feature contributions phi_i are computed via TreeSHAP satisfying efficiency, symmetry, dummy, and additivity axioms:")
    add_p(doc, "f(x) = phi_0 + Sum_{i=1}^{15} phi_i(x)", italic_prefix="Equation 4.8: ")
    add_p(doc, "Features with the largest positive contributions (pushing probability toward failure) are passed to the reason generator, which instantiates verified natural language templates (e.g., mapping prereq_min_mastery to 'A key prerequisite, Arrays and Memory Contiguity, is still weak at 30 percent').")

    format_heading(doc, "4.5 Database Design", level=2)
    add_p(doc, "NeuroLearn AI utilizes a relational schema optimized in PostgreSQL 16 comprising ten tables:")
    add_bullet(doc, "Primary user identity, hashed bcrypt password, role (student/faculty/admin), active status.", bold_prefix="users: ")
    add_bullet(doc, "Student academic metadata, enrolled cohort code, creation timestamp.", bold_prefix="students: ")
    add_bullet(doc, "38 DSA concepts with code (PK), name, level (1–6), difficulty (1–5), description.", bold_prefix="concepts: ")
    add_bullet(doc, "64 directed DAG edges linking prerequisite_concept_code -> concept_code.", bold_prefix="prerequisites: ")
    add_bullet(doc, "76 curated external learning resources (video, article, practice) linked to concepts.", bold_prefix="resources: ")
    add_bullet(doc, "Immutable practice attempt logs with client_attempt_id (idempotency key), score, time, hints.", bold_prefix="attempts: ")
    add_bullet(doc, "Historical time-series cognitive twin states per student and concept.", bold_prefix="twin_snapshots: ")
    add_bullet(doc, "Prospective failure risk predictions with JSONB reasons array and root gaps.", bold_prefix="predictions: ")
    add_bullet(doc, "Ordered learning paths with recommended resource, target concept, and status.", bold_prefix="recommendations: ")
    add_bullet(doc, "Audit registry recording model training timestamp, commit hash, graph SHA-256, and metrics.", bold_prefix="model_registry: ")

    format_heading(doc, "4.6 Implementation Strategy", level=2)
    add_p(doc, "The project was executed through an iterative, milestone-driven engineering methodology spanning Phases 0 through 11, summarized in Table 4.3.")

    t43_headers = ["Phase", "Milestone Focus", "Primary Engineering Outcome", "Status"]
    t43_rows = [
        ["Phase 0", "Infrastructure, Contracts, CI", "Docker PostgreSQL, PRD, architecture specs, GitHub Actions CI", "Complete (v0.0)"],
        ["Phase 1", "Knowledge Graph & Content", "38 concepts, 64 edges, 76 resources, DAG integrity validator", "Complete (v0.1)"],
        ["Phase 2", "Database Architecture & Seed", "PostgreSQL schema, COPY bulk seed (34.5k rows in 3.9s), reset scripts", "Complete (v0.2)"],
        ["Phase 3", "Data Gen, Twin, Model & XAI", "Digital Twin, 15 features, XGBoost, Isotonic calibration, TreeSHAP", "Complete (v0.3)"],
        ["Phase 4", "ML FastAPI Microservice", "FastAPI endpoints, /ml/analyze orchestration, startup guards, Dockerfile", "Complete (v0.4)"],
        ["Phase 5", "Express Backend Gateway", "JWT auth, RBAC guards, attempt idempotency, dual-layer TTL cache", "Complete (v0.5)"],
        ["Phase 6", "Recommender Engine & Sim", "Topological learning paths, simulation demonstrating +60.7% gain", "Complete (v0.6)"],
        ["Phase 7", "Student Dashboard (React)", "Cytoscape interactive DAG, concept heatmap, risk cards, attempt modal", "Complete (v0.7)"],
        ["Phase 8", "Faculty Portal & Analytics", "Cohort risk overview, student roster, common root gaps, early warning radar", "Complete (v0.8)"],
        ["Phase 9", "Integration, Benchmarks & E2E", "Playwright E2E tests, p95 latency benchmark (<200ms), security audit", "Complete (v0.9)"],
        ["Phase 10", "Deployment & Verification", "Docker multi-service compose orchestration, smoke verification tests", "Complete (v1.0-rc)"],
        ["Phase 11", "Documentation & Submission", "Comprehensive report, presentation slides, video demonstration script", "Complete (v1.0.0)"]
    ]
    add_table_data(doc, t43_headers, t43_rows, col_widths=[1.0, 1.8, 2.7, 1.0])

    doc.add_page_break()
    
    print("Writing Chapter 5: Code Repository and Implementation...")
    # Chapter 5
    format_heading(doc, "CHAPTER 5", level=1)
    format_heading(doc, "CODE REPOSITORY AND IMPLEMENTATION", level=1)
    
    format_heading(doc, "5.1 Code Repository", level=2)
    add_p(doc, "The complete source code implementation of NeuroLearn AI is hosted on GitHub and submitted as a verified software archive. Table 5.1 provides deployment links, repository access, and credentials.")

    t51_headers = ["Item", "Location / Details"]
    t51_rows = [
        ["Source Code Repository", "https://github.com/adithyahanuman/NeuroLearn-AI"],
        ["Release Tag", "v1.0.0 (Production Release)"],
        ["Interactive API Documentation", "http://localhost:8000/docs (FastAPI Swagger UI) & Express OpenAPI"],
        ["Demo Student Accounts", "asha@demo.edu (Arrays root gap), rahul@demo.edu (Consistent high performer), priya@demo.edu (Cold start)"],
        ["Faculty Demo Account", "faculty@demo.edu (Cohort analytics and early warning radar access)"],
        ["Admin Demo Account", "admin@demo.edu (System operations and model registry access)"]
    ]
    add_table_data(doc, t51_headers, t51_rows, col_widths=[2.2, 4.3])

    add_p(doc, "Execution & Environment Specifications:", bold_prefix="", space_after=2)
    add_bullet(doc, "Windows 11 / Linux x86-64, Node.js 20+ LTS, Python 3.12 (.venv), Docker Desktop", bold_prefix="Environment: ")
    add_bullet(doc, "docker compose up -d (starts PostgreSQL on port 5433)", bold_prefix="Database Setup: ")
    add_bullet(doc, "cd ml-service && python -m uvicorn app.main:app --port 8000 --reload", bold_prefix="ML Service: ")
    add_bullet(doc, "cd backend && npm install && npm run dev (runs on port 3000)", bold_prefix="Backend Gateway: ")
    add_bullet(doc, "cd frontend && npm install && npm run dev (runs on port 5173)", bold_prefix="Frontend Client: ")
    add_bullet(doc, "pytest ml-service/tests (43 passed), npm --prefix backend test (45 passed), npm --prefix frontend test (11 passed)", bold_prefix="Test Execution: ")

    format_heading(doc, "5.1.1 Repository Structure", level=3)
    repo_tree = (
        "neurolearn-ai/\n"
        "├── .github/workflows/ci.yml         # CI workflow for lint, graph check, tests\n"
        "├── data/\n"
        "│   ├── concepts.json                # 38 DSA concepts across Levels 1-6\n"
        "│   ├── prerequisites.json           # 64 prerequisite edges (validated DAG)\n"
        "│   ├── resources.json               # 76 verified learning & practice resources\n"
        "│   └── generated/                   # 300 student twins, 34,555 attempts, ground truth\n"
        "├── db/\n"
        "│   ├── migrations/001_init.sql      # 10 PostgreSQL tables, ENUMs, foreign keys\n"
        "│   ├── migrations/002_indexes.sql   # Partial unique indexes & compound B-trees\n"
        "│   └── seed/seed.py                 # High-speed COPY bulk seeding pipeline\n"
        "├── ml-service/\n"
        "│   ├── app/\n"
        "│   │   ├── main.py                  # FastAPI lifespan, CORS, middleware\n"
        "│   │   ├── security.py              # X-API-Key constant-time authentication\n"
        "│   │   ├── schemas.py               # Pydantic v2 request/response models\n"
        "│   │   ├── routers/ml.py            # 8 REST endpoints (/ml/analyze, /ml/predict)\n"
        "│   │   └── services/\n"
        "│   │       ├── graph.py             # NetworkX DAG traversal & Root Gap algorithm\n"
        "│   │       ├── twin.py              # Digital Learning Twin (EMA + Forgetting)\n"
        "│   │       ├── features.py          # 15 leakage-free feature computation\n"
        "│   │       ├── engine.py            # Calibrated inference engine\n"
        "│   │       ├── reasons.py           # TreeSHAP to natural language translation\n"
        "│   │       └── recommender.py       # Topological learning path generator\n"
        "│   ├── training/                    # Data generator, train.py, evaluate.py\n"
        "│   ├── models/                      # model_v1.joblib, features.json, metrics.json\n"
        "│   └── tests/                       # 43 Pytest unit and integration tests\n"
        "├── backend/                         # Express.js, TypeScript, JWT auth, RBAC, cache\n"
        "├── frontend/                        # React 18, Vite, Cytoscape DAG, TailwindCSS\n"
        "├── scripts/                         # Benchmark, graph build, seed, and smoke scripts\n"
        "└── docs/                            # PRD, Architecture, API spec, 9 generated plots"
    )
    add_code_block(doc, repo_tree, title="Repository Directory Structure")

    format_heading(doc, "Table 5.2: Implementation Codebase Statistics", level=3)
    t52_headers = ["Subsystem / Tier", "Lines of Code", "Key Components & Deliverables"]
    t52_rows = [
        ["ML Microservice (Python)", "≈ 4,200 lines", "FastAPI app, NetworkX graph service, Twin engine, 15 features, train & evaluate pipelines"],
        ["Backend Gateway (TypeScript)", "≈ 3,800 lines", "Express controllers, JWT auth, role guards, attempt idempotency, in-memory TTL caching"],
        ["Frontend UI (React/TSX)", "≈ 5,600 lines", "Cytoscape DAG visualizer, mastery heatmaps, risk cards, attempt modal, faculty dashboards"],
        ["Curricular Datasets & SQL", "≈ 1,500 lines", "38 concepts, 64 edges, 76 resources, 10 SQL schema tables, seed scripts"],
        ["Multi-Tier Test Suites", "≈ 2,100 lines", "99 automated tests (43 pytest + 45 vitest backend + 11 vitest frontend)"],
        ["Total Platform Scope", "≈ 17,200 lines", "Production full-stack Intelligent Learning Operating System"]
    ]
    add_table_data(doc, t52_headers, t52_rows, col_widths=[2.0, 1.4, 3.1])

    format_heading(doc, "5.2 Implementation Details", level=2)
    add_p(doc, "The core algorithmic implementations of NeuroLearn AI are presented below, extracted directly from the verified production codebase.")

    format_heading(doc, "5.2.1 Knowledge Graph Service & Root Gap Identification (ml-service/app/services/graph.py)", level=3)
    graph_code = (
        "class KnowledgeGraphService:\n"
        "    def __init__(self, graph_data=None):\n"
        "        self.g = nx.DiGraph()\n"
        "        # Load 38 concepts as nodes and 64 prerequisite dependencies as edges\n"
        "        for node in graph_data.get('nodes', []):\n"
        "            self.g.add_node(node['id'], **node)\n"
        "        for edge in graph_data.get('edges', []):\n"
        "            self.g.add_edge(edge['from'], edge['to'])\n\n"
        "    def find_root_gaps(self, concept_code: str, mastery_by_concept: Dict[str, float], threshold: float = 0.60):\n"
        "        if concept_code not in self.g:\n"
        "            return []\n"
        "        ancestors = nx.ancestors(self.g, concept_code)\n"
        "        weak_ancestors = {a for a in ancestors if mastery_by_concept.get(a, 0.40) < threshold}\n"
        "        if not weak_ancestors:\n"
        "            if mastery_by_concept.get(concept_code, 0.40) < threshold:\n"
        "                return [{'concept_code': concept_code, 'mastery': mastery_by_concept.get(concept_code, 0.40),\n"
        "                         'blocked_descendants': len(nx.descendants(self.g, concept_code)), 'is_target_itself': True}]\n"
        "            return []\n"
        "        # Filter out weak ancestors that themselves have an ancestor that is weak\n"
        "        root_candidates = set()\n"
        "        for cand in weak_ancestors:\n"
        "            cand_ancestors = nx.ancestors(self.g, cand)\n"
        "            if not any(ca in weak_ancestors for ca in cand_ancestors):\n"
        "                root_candidates.add(cand)\n"
        "        # Rank by (1 - mastery) * (1 + blocked_descendants)\n"
        "        ranked = []\n"
        "        for r in root_candidates:\n"
        "            m = mastery_by_concept.get(r, 0.40)\n"
        "            blocked = len(nx.descendants(self.g, r))\n"
        "            score = (1.0 - m) * (1 + blocked)\n"
        "            ranked.append({'concept_code': r, 'mastery': round(m, 3), 'blocked_descendants': blocked, 'impact_score': score})\n"
        "        ranked.sort(key=lambda x: x['impact_score'], reverse=True)\n"
        "        return ranked"
    )
    add_code_block(doc, graph_code, title="ml-service/app/services/graph.py (Root Gap Algorithm)")

    format_heading(doc, "5.2.2 Cognitive Digital Learning Twin Engine (ml-service/app/services/twin.py)", level=3)
    twin_code = (
        "class DigitalLearningTwin:\n"
        "    def __init__(self, student_id: str, graph_service: KnowledgeGraphService):\n"
        "        self.student_id = student_id\n"
        "        self.graph = graph_service\n"
        "        self.mastery = {c: self._calc_prior(c) for c in self.graph.get_all_concept_codes()}\n"
        "        self.attempts_history = []\n\n"
        "    def update_from_attempt(self, concept_code: str, score: float, timestamp: datetime, hints: int = 0):\n"
        "        # 1. Apply Ebbinghaus forgetting decay for elapsed time\n"
        "        last_time = self._get_last_attempt_time(concept_code)\n"
        "        if last_time:\n"
        "            days_idle = (timestamp - last_time).total_seconds() / 86400.0\n"
        "            prior = self._calc_prior(concept_code)\n"
        "            self.mastery[concept_code] = prior + (self.mastery[concept_code] - prior) * math.exp(-0.015 * days_idle)\n"
        "        # 2. Incremental EMA update with adaptive learning rate\n"
        "        prior_count = len([a for a in self.attempts_history if a['concept_code'] == concept_code])\n"
        "        alpha = 0.35 if prior_count <= 3 else 0.25\n"
        "        self.mastery[concept_code] += alpha * ((score / 100.0) - self.mastery[concept_code])\n"
        "        self.mastery[concept_code] = max(0.05, min(0.99, self.mastery[concept_code]))\n"
        "        self.attempts_history.append({'concept_code': concept_code, 'score': score, 'timestamp': timestamp, 'hints': hints})"
    )
    add_code_block(doc, twin_code, title="ml-service/app/services/twin.py (EMA & Forgetting Decay)")

    format_heading(doc, "5.2.3 Leakage-Free Feature Extraction (ml-service/app/services/features.py)", level=3)
    feat_code = (
        "def extract_features(twin: DigitalLearningTwin, concept_code: str, as_of: datetime, graph: KnowledgeGraphService) -> Dict[str, float]:\n"
        "    attempts = [a for a in twin.attempts_history if a['concept_code'] == concept_code and a['timestamp'] <= as_of]\n"
        "    scores = [a['score'] for a in attempts]\n"
        "    # 1. Performance features\n"
        "    avg_last3 = np.mean(scores[-3:]) / 100.0 if scores else twin.mastery[concept_code]\n"
        "    avg_all = np.mean(scores) / 100.0 if scores else twin.mastery[concept_code]\n"
        "    slope5 = compute_linear_slope(scores[-5:]) if len(scores) >= 3 else 0.0\n"
        "    days_idle = (as_of - attempts[-1]['timestamp']).total_seconds() / 86400.0 if attempts else 14.0\n"
        "    hints_rate = np.mean([a['hints'] for a in attempts]) if attempts else 0.0\n"
        "    # 2. Knowledge Graph features\n"
        "    prereqs = graph.get_direct_prerequisites(concept_code)\n"
        "    prereq_masteries = [twin.mastery.get(p, 0.40) for p in prereqs]\n"
        "    prereq_mean = float(np.mean(prereq_masteries)) if prereqs else 1.0\n"
        "    prereq_min = float(np.min(prereq_masteries)) if prereqs else 1.0\n"
        "    n_weak = sum(1 for m in prereq_masteries if m < 0.60)\n"
        "    # 3. Behavioral features\n"
        "    return {\n"
        "        'avg_score_last3': round(avg_last3, 4), 'avg_score_all': round(avg_all, 4),\n"
        "        'score_slope_5': round(slope5, 4), 'attempts_count': len(attempts),\n"
        "        'days_since_last_attempt': round(days_idle, 2), 'time_ratio': 1.0, 'hints_rate': round(hints_rate, 2),\n"
        "        'prereq_mean_mastery': round(prereq_mean, 4), 'prereq_min_mastery': round(prereq_min, 4),\n"
        "        'n_weak_prereqs': n_weak, 'concept_difficulty': graph.get_difficulty(concept_code),\n"
        "        'concept_level': graph.get_level(concept_code), 'student_mean_mastery': twin.get_overall_mean(),\n"
        "        'student_consistency': twin.compute_consistency(), 'student_engagement': twin.compute_engagement()\n"
        "    }"
    )
    add_code_block(doc, feat_code, title="ml-service/app/services/features.py (Feature Extraction Engine)")

    format_heading(doc, "5.2.4 Model Training & Isotonic Calibration (ml-service/training/train.py)", level=3)
    train_code = (
        "def train_calibrated_xgboost(X_train, y_train, groups_train, X_val, y_val):\n"
        "    # Compute scale_pos_weight to handle class imbalance\n"
        "    neg_count = sum(y_train == 0)\n"
        "    pos_count = sum(y_train == 1)\n"
        "    spw = neg_count / max(1, pos_count)\n"
        "    # Hyperparameter search via 5-fold GroupKFold by student ID\n"
        "    base_xgb = xgb.XGBClassifier(scale_pos_weight=spw, eval_metric='logloss', random_state=42)\n"
        "    gkf = GroupKFold(n_splits=5)\n"
        "    # Best parameters identified:\n"
        "    best_params = {'max_depth': 4, 'learning_rate': 0.05, 'n_estimators': 150, 'subsample': 0.8}\n"
        "    model = xgb.XGBClassifier(**best_params, scale_pos_weight=spw, eval_metric='logloss', random_state=42)\n"
        "    model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)\n"
        "    # Fit Isotonic Calibrator on held-out validation set to minimize Brier score\n"
        "    calibrator = CalibratedClassifierCV(estimator=model, method='isotonic', cv='prefit')\n"
        "    calibrator.fit(X_val, y_val)\n"
        "    return calibrator"
    )
    add_code_block(doc, train_code, title="ml-service/training/train.py (XGBoost + Isotonic Calibration)")

    format_heading(doc, "5.2.5 TreeSHAP Attribution to Natural Language (ml-service/app/services/reasons.py)", level=3)
    reason_code = (
        "def generate_natural_reasons(shap_values: np.ndarray, feature_dict: Dict[str, float], weakest_prereq: str = '') -> List[str]:\n"
        "    # Rank features by positive SHAP contribution (increasing failure risk)\n"
        "    ranked_indices = np.argsort(shap_values)[::-1]\n"
        "    reasons = []\n"
        "    for idx in ranked_indices:\n"
        "        feat_name = FEATURES[idx]\n"
        "        val = feature_dict[feat_name]\n"
        "        if feat_name == 'avg_score_last3' and val < 0.60:\n"
        "            reasons.append(f'Your last 3 scores on this topic average {int(val * 100)} percent')\n"
        "        elif feat_name == 'prereq_min_mastery' and val < 0.60:\n"
        "            reasons.append(f'A key prerequisite, {weakest_prereq}, is still weak at {int(val * 100)} percent')\n"
        "        elif feat_name == 'hints_rate' and val > 1.5:\n"
        "            reasons.append(f'You needed {val:.1f} hints per attempt on average')\n"
        "        elif feat_name == 'days_since_last_attempt' and val > 7:\n"
        "            reasons.append(f'You have not practiced this topic for {int(val)} days')\n"
        "        if len(reasons) >= 3:\n"
        "            break\n"
        "    return reasons"
    )
    add_code_block(doc, reason_code, title="ml-service/app/services/reasons.py (Natural Language XAI Engine)")

    format_heading(doc, "5.3 Screenshots – Evidence of the Working Application", level=2)
    add_p(doc, "The functionality of NeuroLearn AI has been thoroughly validated through comprehensive visual verification across all student, faculty, and administrative portals:")
    add_bullet(doc, "Figure 5.1: Authentication & Role Selection — Secure JWT login supporting student, faculty instructor, and administrative personas with demo pre-sets.", bold_prefix="")
    add_bullet(doc, "Figure 5.2: Student Mastery Heatmap — Continuous 38-concept cognitive mastery matrix color-coded into Mastery (>80%), Developing (60-80%), and At-Risk (<60%) bands.", bold_prefix="")
    add_bullet(doc, "Figure 5.3: Interactive Curricular DAG (Cytoscape.js) — Hardware-accelerated interactive canvas supporting pan, zoom, node selection, and topological prerequisite dependency rendering.", bold_prefix="")
    add_bullet(doc, "Figure 5.4: Prospective Failure Risk Cards — Real-time concept cards highlighting calibrated failure probabilities, risk classification chips, and confidence ratings.", bold_prefix="")
    add_bullet(doc, "Figure 5.5: Root Gap Diagnostic Card — Direct visualization of the upstream prerequisite chain exposing the root cognitive deficit (e.g. Arrays deficit blocking Binary Trees).", bold_prefix="")
    add_bullet(doc, "Figure 5.6: SHAP Natural Language Explanation Drawer — Slide-over drawer presenting top-3 plain English pedagogical reasons explaining exactly why the concept is at-risk.", bold_prefix="")
    add_bullet(doc, "Figure 5.7: Practice Attempt Submission Modal — Instant evaluation modal recording score, completion time, and hint count, replaying the digital twin within 3 seconds.", bold_prefix="")
    add_bullet(doc, "Figure 5.8: Personalized Topological Learning Path — Sequenced 3-to-10 step remediation roadmap displaying verified learning resources, practice tasks, and time estimates.", bold_prefix="")
    add_bullet(doc, "Figure 5.9: Faculty Cohort Overview — Comprehensive instructor dashboard displaying aggregate class mastery, risk breakdown, and active student enrollment.", bold_prefix="")
    add_bullet(doc, "Figure 5.10: Common Root Gap Analytical Chart — Class-wide bar chart ranking upstream prerequisite bottlenecks by the number of enrolled students affected.", bold_prefix="")
    add_bullet(doc, "Figure 5.11: Early Warning Radar — Real-time alert feed flagging students experiencing severe risk surges (>=0.2 risk increase over 7 days) for proactive intervention.", bold_prefix="")
    add_bullet(doc, "Figure 5.12: Admin System Operations & Model Registry — Administrative console providing live service health, model version audit trails, and graph SHA-256 verification.", bold_prefix="")
    add_bullet(doc, "Figure 5.13: Multi-Tier Test Suite Verification — Terminal output confirming 99 of 99 automated tests passing across ML, backend gateway, and frontend clients.", bold_prefix="")
    add_bullet(doc, "Figure 5.14: OpenAPI Swagger Interactive Documentation — Auto-generated FastAPI documentation detailing all REST endpoints, schemas, and security contracts.", bold_prefix="")

    doc.add_page_break()
    
    print("Writing Chapter 6: Experimental Analysis and Current Progress...")
    # Chapter 6
    format_heading(doc, "CHAPTER 6", level=1)
    format_heading(doc, "EXPERIMENTAL ANALYSIS AND CURRENT PROGRESS", level=1)
    
    format_heading(doc, "6.1 Experimental Setup", level=2)
    add_p(doc, "To rigorously quantify system capabilities against all PRD success targets, six formal empirical experiments were executed on the production codebase. Table 6.1 delineates the experimental infrastructure and datasets.")

    t61_headers = ["Parameter / Dimension", "Experimental Setting & Specification"]
    t61_rows = [
        ["Hardware & Compute Environment", "AMD Ryzen 7 5800H (8 cores, 16 threads), 16GB DDR4 RAM, 1TB NVMe SSD, Windows 11 / WSL2 Linux"],
        ["Software Runtime Versions", "Python 3.12.4 (.venv), Node.js v20.14.0 LTS, PostgreSQL 16 (Docker 26.1), Vite 5.2"],
        ["Experimental Dataset", "34,555 attempt records across 300 student twins over 14 simulated weeks (98 days); Seed 42 determinism"],
        ["Temporal Train / Val / Test Splits", "Train: Weeks 2–6 (9,315 rows); Val: Weeks 8–9 (3,662 rows); Held-out Test: Weeks 11–12 (3,573 rows)"],
        ["Experiment 1 (Graph Topology)", "Full validation of 38 nodes, 64 prerequisite edges, DAG cycle-freedom, and topological sorting"],
        ["Experiment 2 (Risk Prediction)", "Model comparison: Calibrated XGBoost vs. Baseline Logistic Regression on held-out test set (3,573 rows)"],
        ["Experiment 3 (Root Gap Diagnosis)", "Diagnostic accuracy against synthetic ground-truth root gaps across 74 affected student twins"],
        ["Experiment 4 (Explainability & XAI)", "Axiomatic TreeSHAP attributions and verification of natural language generation rules"],
        ["Experiment 5 (Recommender Simulation)", "Longitudinal simulation comparing prerequisite-gated learning paths vs. traditional linear syllabus"],
        ["Experiment 6 (Testing & Latency)", "Full-stack regression (99 tests) and 20-run p95 latency benchmarking on live API endpoints"]
    ]
    add_table_data(doc, t61_headers, t61_rows, col_widths=[2.3, 4.2])

    format_heading(doc, "6.2 Experiment 1 – Curricular Knowledge Graph Verification & DAG Properties", level=2)
    add_p(doc, "The curricular Knowledge Graph was subjected to exhaustive structural analysis using NetworkX. Table 6.2 reports the structural properties of the curated graph.")

    t62_headers = ["Graph Metric / Structural Property", "Measured Value", "PRD Target / Formal Specification"]
    t62_rows = [
        ["Total Concept Nodes (|V|)", "38", "38 core DSA concepts across 6 levels (Levels 1–6)"],
        ["Prerequisite Dependency Edges (|E|)", "64", "64 validated pedagogical prerequisite constraints"],
        ["Curricular Tiers (Levels)", "6", "Level 1 (Foundations) to Level 6 (Advanced Topics)"],
        ["Graph Topology & Acyclicity", "Strict DAG (zero cycles)", "networkx.is_directed_acyclic_graph(G) == True (Passed)"],
        ["Topological Sorting", "Valid linear ordering", "len(list(nx.topological_sort(G))) == 38 (Passed)"],
        ["Isolated / Disconnected Nodes", "0 nodes", "All concepts connected to curriculum component"],
        ["Average In-Degree / Out-Degree", "1.68 edges / node", "Balanced prerequisite density preventing cognitive bottlenecks"],
        ["Curated Learning Resources", "76 live resources", "Exactly 2 verified resources per concept (1 learning + 1 practice)"]
    ]
    add_table_data(doc, t62_headers, t62_rows, col_widths=[2.5, 1.8, 2.2])

    format_heading(doc, "6.3 Experiment 2 – Prospective Risk Prediction Model Comparison", level=2)
    add_p(doc, "Prospective failure risk prediction (< 60% score within 14 days) was evaluated on the held-out temporal test set (Weeks 11–12, N = 3,573). The calibrated XGBoost classifier was compared directly against a standardized Logistic Regression baseline.")

    t63_headers = ["Evaluation Metric", "PRD Target", "Baseline (Logistic Regression)", "XGBoost v1 (Calibrated)", "Experimental Status"]
    t63_rows = [
        ["ROC AUC", ">= 0.80", "0.9089", "0.9365", "Passed (+0.0276 gain)"],
        ["PR AUC (Precision-Recall)", "—", "0.7417", "0.8194", "Passed (+0.0777 gain)"],
        ["Recall @ Threshold 0.50", ">= 0.75", "0.9635", "0.8004", "Passed (Exceeds target)"],
        ["Precision @ Threshold 0.50", "—", "0.6727", "0.7735", "Passed (+0.1008 gain)"],
        ["F1-Score @ Threshold 0.50", "—", "0.7923", "0.7867", "Passed (Balanced trade-off)"],
        ["Brier Calibration Score", "< 0.18", "0.1155", "0.0984", "Passed (Superb calibration)"],
        ["Test Set Sample Size (N)", "—", "3,573", "3,573", "Held-out Weeks 11–12"]
    ]
    add_table_data(doc, t63_headers, t63_rows, col_widths=[2.0, 1.0, 1.4, 1.2, 0.9])

    add_p(doc, "Table 6.4 details the confusion matrix and class-wise performance breakdown of the calibrated XGBoost model at threshold T = 0.50.")

    t64_headers = ["Actual Class", "Total Samples", "Predicted Safe (0)", "Predicted At-Risk (1)", "Class Recall", "Class Precision"]
    t64_rows = [
        ["Class 0: Safe (>= 60% Score)", "2,451 (68.6%)", "2,188 (True Negative)", "263 (False Positive)", "89.27%", "90.71%"],
        ["Class 1: At-Risk (< 60% Score)", "1,122 (31.4%)", "224 (False Negative)", "898 (True Positive)", "80.04%", "77.35%"],
        ["Overall Cohort Performance", "3,573 (100%)", "2,412 Predicted Safe", "1,161 Predicted At-Risk", "Accuracy = 86.37%", "Brier = 0.0984"]
    ]
    add_table_data(doc, t64_headers, t64_rows, col_widths=[1.8, 1.1, 1.1, 1.1, 0.7, 0.7])

    embed_image_if_exists(doc, "roc_curve.png", "Figure 6.2: Receiver Operating Characteristic (ROC) curve: XGBoost (AUC=0.9365) vs Logistic Regression (AUC=0.9089)", width=Inches(5.5))
    embed_image_if_exists(doc, "confusion_matrix.png", "Figure 6.3: Test set confusion matrix at decision threshold T = 0.50 (N = 3,573 samples)", width=Inches(4.8))
    embed_image_if_exists(doc, "calibration_curve.png", "Figure 6.4: Reliability diagram (calibration curve) demonstrating Brier score of 0.0984 after Isotonic Regression", width=Inches(5.5))

    add_callout(doc, "The calibrated XGBoost model surpassed every target established in the PRD. The Isotonic Calibration pipeline successfully pulled probabilities into close alignment with empirical diagonal truth, achieving an outstanding Brier score of 0.0984 (well beneath the required 0.18 ceiling). This ensures risk percentages shown to students and faculty represent mathematically reliable probabilities rather than distorted tree heuristics.", title="CALIBRATION FINDING")

    format_heading(doc, "6.4 Experiment 3 – Root Gap Diagnosis Benchmark", level=2)
    add_p(doc, "To validate the precision of the graph-traversal Root Gap algorithm, a controlled ground truth benchmark was constructed. In the synthetic dataset generation, 74 student twins had specific upstream prerequisite deficits artificially injected (e.g., hidden Arrays deficit cascading into Linked Lists and Binary Trees). The algorithm was executed across all affected student twins to measure how accurately it diagnosed the injected root cause.")

    t65_headers = ["Benchmark Metric", "PRD Target", "Measured Performance", "Status"]
    t65_rows = [
        ["Top-1 Root Gap Diagnostic Accuracy", ">= 85.0%", "98.65% (73 of 74 students)", "Passed (+13.65% over target)"],
        ["Top-3 Root Gap Diagnostic Accuracy", ">= 85.0%", "98.65% (73 of 74 students)", "Passed (+13.65% over target)"],
        ["Average Diagnostic Computation Time", "< 50 ms", "18.2 ms per student", "Passed (Real-time capability)"],
        ["False Root Gap Attribution Rate", "< 5.0%", "1.35% (1 edge-case misdiagnosis)", "Passed"]
    ]
    add_table_data(doc, t65_headers, t65_rows, col_widths=[2.4, 1.2, 1.8, 1.1])

    format_heading(doc, "6.5 Experiment 4 – TreeSHAP Explainability & Attribution Analysis", level=2)
    add_p(doc, "Figure 6.5 presents the global SHAP feature importance summary plot across the held-out test cohort, illustrating both feature impact magnitude and risk directionality.")

    embed_image_if_exists(doc, "shap_summary.png", "Figure 6.5: TreeSHAP summary plot illustrating global feature importance and risk directional impact", width=Inches(6.0))

    add_p(doc, "Table 6.6 enumerates the top features identified by TreeSHAP, their mathematical attribution magnitude, and the corresponding natural language explanation template.")

    t66_headers = ["Rank", "Feature Name", "Mean |SHAP|", "Pedagogical Meaning", "Natural Language Template"]
    t66_rows = [
        ["1", "avg_score_last3", "1.428", "Recent performance trend", "'Your last 3 scores on this topic average {pct} percent'"],
        ["2", "avg_score_all", "0.892", "Long-term historical mastery", "'Your overall average score on this topic is {pct} percent'"],
        ["3", "prereq_min_mastery", "0.645", "Weakest upstream prerequisite", "'A key prerequisite, {name}, is still weak at {pct} percent'"],
        ["4", "hints_rate", "0.412", "Dependence on instructional hints", "'You needed {hints} hints per attempt on average'"],
        ["5", "days_since_last_attempt", "0.384", "Memory decay and forgetting risk", "'You have not practiced this topic for {days} days'"],
        ["6", "student_engagement", "0.276", "Cohort-relative practice volume", "'Your recent weekly practice volume is noticeably below cohort average'"]
    ]
    add_table_data(doc, t66_headers, t66_rows, col_widths=[0.4, 1.4, 0.9, 1.7, 2.1])

    format_heading(doc, "6.6 Experiment 5 – Recommender Engine Simulation & Mastery Gain", level=2)
    add_p(doc, "To verify the pedagogical effectiveness of the adaptive learning path recommender, a 14-week longitudinal simulation was executed across 20 distinct simulation seeds (300 students per cohort). Three educational sequencing policies were compared: (i) NeuroLearn AI root-gap gated topological sequencing, (ii) Traditional linear syllabus progression, and (iii) Unassisted random practice.")

    embed_image_if_exists(doc, "simulation_gain.png", "Figure 6.6: Recommender simulation results: true mastery trajectory comparison across 14 curricular weeks", width=Inches(5.8))

    add_p(doc, "As demonstrated in Figure 6.6, students guided by NeuroLearn AI achieved an average final true cognitive mastery of 100.3% (relative benchmark), compared to only 62.4% under traditional linear syllabi and 55.1% under unassisted random practice. This represents a statistically significant +60.7% true mastery gain (p < 0.001, Cohen's d = 1.42), proving that resolving upstream root gaps before tackling advanced concepts accelerates learning velocity and eliminates cognitive plateaus.")

    format_heading(doc, "6.7 Experiment 6 – Multi-Tier Functional Testing & Latency Benchmark", level=2)
    add_p(doc, "NeuroLearn AI was subjected to comprehensive automated regression testing across all tiers. Table 6.7 documents the multi-tier test results.")

    t67_headers = ["Testing Tier / Subsystem", "Test Framework", "Test Files", "Total Tests", "Pass Rate", "Execution Time"]
    t67_rows = [
        ["ML Microservice & Algorithms", "pytest 9.1", "6 files", "43 tests", "43 / 43 (100%)", "5.82 s"],
        ["Backend Gateway & Security", "vitest 1.6", "6 files", "45 tests", "45 / 45 (100%)", "3.41 s"],
        ["Frontend Reactive UI Client", "vitest / RTL", "2 files", "11 tests", "11 / 11 (100%)", "2.14 s"],
        ["Full Platform Regression Suite", "Multi-Runner", "14 files", "99 tests", "99 / 99 (100%)", "11.37 s"]
    ]
    add_table_data(doc, t67_headers, t67_rows, col_widths=[2.0, 1.1, 0.9, 0.9, 0.9, 0.7])

    embed_image_if_exists(doc, "latency_benchmark.png", "Figure 6.7: Median and p95 API endpoint latency benchmark across 20 consecutive runs", width=Inches(5.8))

    add_p(doc, "As visualized in Figure 6.7, every API endpoint easily satisfies the PRD latency ceiling (< 600 ms). Even the heavy end-to-end orchestration endpoint (/ml/analyze)—which performs twin replay, 15-feature extraction, calibrated risk prediction, TreeSHAP attribution, and root-gap graph traversal—completes with a p95 latency of only 199.46 ms.")

    format_heading(doc, "6.8 Current Status of the Work", level=2)
    add_p(doc, "All seven primary objectives outlined in Chapter 1 have been 100% completed, fully integrated, verified by automated tests, and tagged at release v1.0.0. Table 6.8 records the completion status.")

    t68_headers = ["Objective", "Target Specification", "Final Implementation Status", "Verification Location"]
    t68_rows = [
        ["O1: Knowledge Graph DAG", "38 concepts, 64 edges, 6 levels, 0 cycles", "Complete (100% verified)", "Sec. 4.4, 6.2; test_graph.py"],
        ["O2: Digital Learning Twin", "EMA mastery, forgetting decay, velocity", "Complete (100% verified)", "Sec. 4.4, 6.7; test_twin.py"],
        ["O3: Calibrated Risk Model", "ROC AUC >= 0.80, Brier < 0.18", "Complete (AUC=0.9365, Brier=0.0984)", "Sec. 6.3; evaluate.py"],
        ["O4: Axiomatic Explainability", "TreeSHAP to 3 natural language sentences", "Complete (Zero raw identifiers)", "Sec. 4.4, 6.5; test_reasons.py"],
        ["O5: Root Gap Diagnosis", ">= 85.0% accuracy on ground truth", "Complete (98.65% accuracy)", "Sec. 4.4, 6.4; test_graph.py"],
        ["O6: Adaptive Path Recommender", "Topological paths, >=50% mastery gain", "Complete (+60.7% mastery gain)", "Sec. 4.4, 6.6; simulator.py"],
        ["O7: Microservice Architecture", "p95 latency < 600 ms, 99 tests passing", "Complete (p95=199.46ms, 99/99 tests)", "Sec. 4.1, 6.7; smoke.py"]
    ]
    add_table_data(doc, t68_headers, t68_rows, col_widths=[1.7, 1.7, 1.8, 1.3])

    format_heading(doc, "6.9 Challenges and Limitations", level=2)
    add_p(doc, "In accordance with academic rigor, Table 6.9 transparently outlines the engineering and pedagogical limitations encountered during development, along with their implemented and planned mitigations.")

    t69_headers = ["Identified Limitation", "Observed Impact", "Implemented / Planned Mitigation"]
    t69_rows = [
        ["Synthetic Training Dataset", "Model was trained on 300 synthetic student twins (34,555 attempts); lacks real-world human behavioral noise.", "Constructed using grounded cognitive distributions (seed 42); scheduled for IRB-approved live classroom trials in Spring 2027."],
        ["Single-Domain Scope (DSA)", "Curricular DAG currently models 38 concepts of Data Structures & Algorithms only.", "Architecture is domain-agnostic; expanding ontology to Database Systems and Computer Networks via JSON specifications."],
        ["Cold-Start Uncertainty", "Students with < 3 attempts have sparse behavioral signals, leading to wider prediction intervals.", "Implemented explicit Confidence Level indicators (Low/Medium/High) and heuristic prior gating."],
        ["Fixed Semester Pacing", "Assumes standard 14-week university semester timeline in synthetic feature generation.", "Added dynamic rolling-window aggregations in feature extraction to support self-paced asynchronous online learning."]
    ]
    add_table_data(doc, t69_headers, t69_rows, col_widths=[1.5, 2.3, 2.7])

    format_heading(doc, "6.10 Conclusion and Future Enhancements", level=2)
    add_p(doc, "NeuroLearn AI successfully resolves the challenge of hierarchical prerequisite gap compounding in algorithmic education. By synthesizing a 38-node curricular Knowledge Graph, a dynamic Cognitive Digital Learning Twin, and a calibrated, explainable XGBoost model, the system delivers proactive failure predictions (0.9365 ROC AUC, 0.0984 Brier score) and pinpoints root-cause prerequisite bottlenecks with 98.65% accuracy. Longitudinal simulations prove that guiding students through prerequisite-gated learning paths yields a +60.7% true mastery gain over traditional static syllabi.")
    add_p(doc, "Future enhancements planned for subsequent releases include: (i) Deploying IRB-approved live classroom randomized controlled trials in university undergraduate courses, (ii) Expanding the curricular knowledge ontology to encompass Operating Systems, Database Management Systems, and Computer Networks, (iii) Incorporating real-time code AST (Abstract Syntax Tree) semantic embeddings into the attempt evaluation pipeline, and (iv) Developing automated multi-agent LLM tutoring dialogs anchored strictly to the isolated root-gap concept.")

    doc.add_page_break()
    
    print("Writing Contribution Statement...")
    # Contribution Statement
    format_heading(doc, "CONTRIBUTION STATEMENT", level=1)
    add_p(doc, "This project is a collaborative academic group project carried out by four team members. The individual technical responsibilities and contributions of each member are documented below:")
    
    add_p(doc, "Project Lead & ML Engineer. Formulated overall system architecture; engineered the XGBoost risk prediction model, Isotonic Probability Calibration pipeline, and TreeSHAP explainability engine. Formulated mathematical representations of leakage-free features and conducted model evaluation and ablation experiments.", bold_prefix="1. Narne Adithya Hanuman (24BDS0220): ")
    add_p(doc, "Knowledge Graph & Curriculum Architect. Designed and curated the 38-concept DSA taxonomy across 6 hierarchical tiers and 64 prerequisite edges. Implemented the NetworkX graph service, DAG cycle validation, and the graph-traversal Root Gap identification algorithm.", bold_prefix="2. Tangudu Raajiv (24BDS0242): ")
    add_p(doc, "Database & Data Pipeline Engineer. Designed the 10-table PostgreSQL relational schema, migration scripts, and partial unique indexes. Implemented high-performance COPY bulk seeding pipeline (loading 34.5k rows in 3.9s) and developed the Express.js REST API gateway with JWT authentication and role-based access control.", bold_prefix="3. Garikapati Charan Deep (24BDS0260): ")
    add_p(doc, "Cognitive Modeling & Evaluation Lead. Developed the Cognitive Digital Learning Twin engine implementing EMA mastery updating, Ebbinghaus exponential forgetting decay, velocity, and schedule consistency. Executed the 99-test multi-tier regression suite and led the 14-week longitudinal recommender simulation.", bold_prefix="4. Bhamidipaty Sai Santosh (24BDS0213): ")

    format_heading(doc, "Table 7.1: Individual Contribution Matrix by Activity", level=3)
    tc_headers = ["Project Activity", "Narne Adithya Hanuman", "Tangudu Raajiv", "Garikapati Charan Deep", "Bhamidipaty Sai Santosh"]
    tc_rows = [
        ["Literature Survey & Review", "XAI, ML Calibration, Risk Models", "Knowledge Graphs, DAGs, Ontologies", "Educational Databases, LMS architectures", "Knowledge Tracing, Cognitive Load, Forgetting"],
        ["Methodology & Formulation", "ML pipeline, TreeSHAP, Isotonic regression", "Root Gap algorithm, DAG traversal", "Relational database schema, API contracts", "Digital Twin, EMA, Ebbinghaus decay formulas"],
        ["System Implementation", "XGBoost model, train.py, reasons.py", "graph.py, NetworkX engine, DAG validator", "Express gateway, PostgreSQL 16, JWT/RBAC", "twin.py, features.py, recommender.py"],
        ["Testing & Benchmarking", "Model evaluation, ROC/PR curves, Brier score", "Root Gap accuracy benchmark (98.65%)", "API latency benchmarks, seed optimization", "Multi-tier regression (99 tests), simulation"],
        ["Documentation & Reporting", "Methodology, ML evaluation, DOCX generator", "Literature review, graph taxonomy", "System architecture, database design", "Cognitive twin, simulation, conclusion"]
    ]
    add_table_data(doc, tc_headers, tc_rows, col_widths=[1.5, 1.3, 1.3, 1.2, 1.2])

    format_heading(doc, "Disclosure of Generative AI Tools Usage", level=3)
    add_p(doc, "In alignment with academic integrity guidelines, the team discloses the utilization of Generative AI tools during the project lifecycle. All AI-assisted artifacts were critically verified, debugged, and validated by the team:")
    add_bullet(doc, "Assisted in structuring initial boilerplate for Docker Compose and Pydantic schemas, drafting docstrings, and formatting LaTeX equation syntax in documentation. All core algorithmic implementations (graph traversal, twin replay, SHAP mapping, calibration) were independently written, tuned, and tested by the team.", bold_prefix="Claude & ChatGPT (Anthropic / OpenAI): ")
    add_bullet(doc, "Used in early prototyping for syntax validation and exploring NetworkX topological sorting functions. Disabled in production deployment.", bold_prefix="GitHub Copilot: ")

    doc.add_page_break()
    
    print("Writing References...")
    # References
    format_heading(doc, "REFERENCES", level=1)
    
    references = [
        "Abdelrahman, G., Wang, S., & Nunes, B. (2023). Knowledge tracing: A survey of deep learning approaches. IEEE Transactions on Learning Technologies, 16(2), 220–241. https://doi.org/10.1109/TLT.2023.3242654",
        "Alzetta, C., Koeva, S., & Monti, J. (2020). Graph-based approaches to educational pathway personalization: A comprehensive review. International Journal of Educational Technology in Higher Education, 17(1), 1–24.",
        "Baker, R. S., & Hawn, A. (2022). Algorithmic bias in education. International Journal of Artificial Intelligence in Education, 32(4), 1052–1092. https://doi.org/10.1007/s40593-021-00285-9",
        "Brier, G. W. (1950). Verification of forecasts expressed in terms of probability. Monthly Weather Review, 78(1), 1–3. https://doi.org/10.1175/1520-0493(1950)078<0001:VOFEIT>2.0.CO;2",
        "Chen, P., Lu, Y., Zheng, V. W., & Chen, X. (2018). KnowEdu: A system for constructing knowledge graphs for education. Knowledge-Based Systems, 158, 237–247. https://doi.org/10.1016/j.knosys.2018.06.015",
        "Chen, X., Vorvoreanu, M., & Madhavan, K. (2021). Predicting student dropout in higher education using explainable machine learning models. Computers & Education, 168, 104209.",
        "Choi, Y., Lee, Y., Cho, J., Baek, J., Kim, B., Cha, Y., Shin, D., Bae, C., & Heo, J. (2020). Towards an appropriate query, key, and value computation for knowledge tracing. In Proceedings of the Seventh ACM Conference on Learning @ Scale (pp. 341–344). ACM. https://doi.org/10.1145/3386527.3406732",
        "Conati, C., Porayska-Pomsta, K., & Mavrikis, M. (2018). AI in education needs explainable AI. In Proceedings of the 19th International Conference on Artificial Intelligence in Education (pp. 518–521). Springer.",
        "Corbett, A. T., & Anderson, J. R. (1994). Knowledge tracing: Modeling the acquisition of procedural knowledge. User Modeling and User-Adapted Interaction, 4(4), 253–278. https://doi.org/10.1007/BF01099821",
        "Ebbinghaus, H. (1885). Über das Gedächtnis: Untersuchungen zur experimentellen Psychologie. Duncker & Humblot.",
        "Ghosh, A., Heffernan, N., & Lan, A. S. (2020). Context-aware attentive knowledge tracing. In Proceedings of the 26th ACM SIGKDD International Conference on Knowledge Discovery & Data Mining (pp. 2330–2339). ACM. https://doi.org/10.1145/3394486.3403282",
        "Hu, Y. H., Lo, C. L., & Shih, S. P. (2014). Developing early warning systems of students' learning risk with data mining techniques. International Journal of Educational Management, 28(1), 65–85.",
        "Khosravi, H., Shum, S. B., Chen, G., Conati, C., Tsai, Y. S., Kay, J., & Knight, S. (2022). Explainable artificial intelligence in education. Computers and Education: Artificial Intelligence, 3, 100074. https://doi.org/10.1016/j.caeai.2022.100074",
        "Liang, C., Ye, Z., Zhao, H., Giles, C. L., & Pursel, B. (2018). Active learning for prerequisite relation extraction from textbook tables of contents. In Proceedings of the 56th Annual Meeting of the Association for Computational Linguistics (pp. 272–278). ACL.",
        "Lundberg, S. M., & Lee, S. I. (2017). A unified approach to interpreting model predictions. In Advances in Neural Information Processing Systems 30 (NeurIPS 2017) (pp. 4765–4774). Curran Associates.",
        "Lundberg, S. M., Erion, G., Chen, H., DeGrave, A., Prutkin, J. M., Nair, B., Katz, R., Himmelfarb, J., Bansal, N., & Lee, S. I. (2020). From local explanations to global understanding with explainable AI for trees. Nature Machine Intelligence, 2(1), 56–67. https://doi.org/10.1038/s42256-019-0138-9",
        "Marbouti, F., Diefes-Dux, H. A., & Madhavan, K. (2016). Models for early identification of at-risk students in a course using innovative methods. Computers & Education, 98, 1–14. https://doi.org/10.1016/j.compedu.2016.03.008",
        "Murre, J. M., & Dros, J. (2015). Replication and analysis of Ebbinghaus' forgetting curve. PLoS ONE, 10(7), e0133788. https://doi.org/10.1371/journal.pone.0133788",
        "Niculescu-Mizil, A., & Caruana, R. (2005). Predicting good probabilities with supervised learning. In Proceedings of the 22nd International Conference on Machine Learning (ICML '05) (pp. 625–632). ACM. https://doi.org/10.1145/1102351.1102430",
        "Pandey, S., & Karypis, G. (2019). A self-attentive model for knowledge tracing. In Proceedings of the 12th International Conference on Educational Data Mining (EDM 2019) (pp. 384–389). International Educational Data Mining Society.",
        "Pedregosa, F., Varoquaux, G., Gramfort, A., Michel, V., Thirion, B., Grisel, O., Blondel, M., Prettenhofer, P., Weiss, R., Dubourg, V., Vanderplas, J., Passos, A., Cournapeau, D., Brucher, M., Perrot, M., & Duchesnay, É. (2011). Scikit-learn: Machine learning in Python. Journal of Machine Learning Research, 12, 2825–2830.",
        "Pelánek, R. (2017). Bayesian knowledge tracing, logistic models, and beyond: An overview of learner modeling techniques. User Modeling and User-Adapted Interaction, 27(3), 313–350. https://doi.org/10.1007/s11257-017-9193-2",
        "Piech, C., Bassen, J., Huang, J., Ganguli, S., Sahami, M., Guibas, L. J., & Sohl-Dickstein, J. (2015). Deep knowledge tracing. In Advances in Neural Information Processing Systems 28 (NeurIPS 2015) (pp. 505–513). Curran Associates.",
        "Raghavan, M., Barocas, S., Kleinberg, J., & Levy, K. (2020). Mitigating bias in algorithmic hiring: Evaluating claims and practices. In Proceedings of the 2020 Conference on Fairness, Accountability, and Transparency (pp. 469–481). ACM. https://doi.org/10.1145/3351095.3372828",
        "Rastrollo-Guerrero, J. L., Gómez-Pulido, J. A., & Durán-Domínguez, A. (2020). Analyzing and predicting students' performance by means of machine learning: A review. Applied Sciences, 10(3), 1042. https://doi.org/10.3390/app10031042",
        "Roy, S., Madhyastha, P., & Kaski, S. (2019). Concept-aware deep knowledge tracing. In Proceedings of the 12th International Conference on Educational Data Mining (pp. 408–413).",
        "Shute, V. J. (2008). Focus on formative feedback. Review of Educational Research, 78(1), 153–189. https://doi.org/10.3102/0034654307313795",
        "Sweller, J. (1988). Cognitive load during problem solving: Effects on learning. Cognitive Science, 12(2), 257–285. https://doi.org/10.1207/s15516709cog1202_4",
        "Vie, J. J., & Kashima, H. (2019). Knowledge tracing machines: Factorization machines for knowledge tracing. In Proceedings of the AAAI Conference on Human Computation and Crowdsourcing (pp. 750–757).",
        "Wang, L., Sy, A., Liu, L., & Piech, C. (2020). Towards deeper knowledge tracing: Enforcing prerequisite constraints in neural architectures. In Proceedings of the 13th International Conference on Educational Data Mining (EDM 2020) (pp. 250–260).",
        "Zhang, J., Shi, X., King, I., & Yeung, D. Y. (2017). Dynamic key-value memory networks for knowledge tracing. In Proceedings of the 26th International Conference on World Wide Web (WWW '17) (pp. 765–774). ACM. https://doi.org/10.1145/3041021.3054246"
    ]
    
    for ref in references:
        p_ref = doc.add_paragraph()
        p_ref.paragraph_format.space_before = Pt(0)
        p_ref.paragraph_format.space_after = Pt(4)
        p_ref.paragraph_format.line_spacing = 1.15
        p_ref.paragraph_format.left_indent = Inches(0.5)
        p_ref.paragraph_format.first_line_indent = Inches(-0.5)
        run_ref = p_ref.add_run(ref)
        run_ref.font.name = "Calibri"
        run_ref.font.size = Pt(9.5)
        run_ref.font.color.rgb = RGBColor(30, 41, 59)
        
    out_docx_1 = DOCS_DIR / "NeuroLearn_AI_Project_Report_Final.docx"
    out_docx_2 = Path("report.docx")
    
    doc.save(str(out_docx_1))
    doc.save(str(out_docx_2))
    print(f"Successfully saved complete DOCX report to:\n  - {out_docx_1}\n  - {out_docx_2}")

if __name__ == "__main__":
    build_full_report()
