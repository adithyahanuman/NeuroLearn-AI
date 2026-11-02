# NeuroLearn AI: Official 3-Minute Live Demo Script

**Purpose:** Comprehensive rehearsal guide and word-for-word script for live project evaluations, faculty reviews, and capstone presentations.  
**Target Duration:** Exactly 3 minutes (180 seconds).  
**Demo Account Credentials:**
- **Student Demo:** `demo1@neurolearn.ai` / password `demo` (Asha Demo — Arrays Bottleneck Story)
- **Faculty Demo:** `faculty@neurolearn.ai` / password `demo` (Cohort Lead)

---

## Word-for-Word Presentation Timeline

```
┌──────────┬─────────────────────────────┬────────────────────────────────────────────────────────┐
│ Time     │ Screen / Action             │ Spoken Narration (Word for Word)                       │
├──────────┼─────────────────────────────┼────────────────────────────────────────────────────────┤
│ 0:00     │ Slide: The Core Problem     │ "Good afternoon. In university computer science        │
│          │ (Slide 2)                   │ courses, high student failure rates in Data Structures │
│          │                             │ and Algorithms are rarely caused by the advanced topic │
│          │                             │ itself. When a student fails Binary Trees or Dynamic   │
│          │                             │ Programming, over eighty percent of the time, the real │
│          │                             │ cause is an unresolved, hidden gap in a foundational   │
│          │                             │ prerequisite—like memory contiguity or pointers—that   │
│          │                             │ went unnoticed weeks earlier. Traditional Learning     │
│          │                             │ Management Systems only discover this after the exam is│
│          │                             │ already failed. NeuroLearn AI solves this by building  │
│          │                             │ a real-time Digital Learning Twin that predicts        │
│          │                             │ struggles fourteen days in advance, traces the failure │
│          │                             │ upstream to its true root cause, and prescribes a      │
│          │                             │ personalized learning path."                           │
├──────────┼─────────────────────────────┼────────────────────────────────────────────────────────┤
│ 0:20     │ Browser: Student Dashboard  │ "Here is our live student dashboard, logged in as our  │
│          │ (`/student`)                │ demo student, Asha. At the top, the Digital Twin       │
│          │                             │ continuously updates her cognitive profile across all  │
│          │                             │ thirty-eight curricular concepts using Exponential     │
│          │                             │ Moving Averages, forgetting decay, and velocity. Notice│
│          │                             │ her mastery heatmap: Level 1 and 2 concepts are marked,│
│          │                             │ but her predictive risk list immediately flags both    │
│          │                             │ Singly Linked Lists and Binary Trees at critical risk  │
│          │                             │ of failure in the upcoming module."                    │
├──────────┼─────────────────────────────┼────────────────────────────────────────────────────────┤
│ 0:50     │ Browser: Concept Detail     │ "Most predictive systems are opaque black boxes.       │
│          │ (`/student/concept/12`)     │ NeuroLearn AI is strictly explainable. When we click   │
│          │                             │ into Linked Lists, our TreeSHAP explainability engine  │
│          │                             │ translates mathematical feature contributions into     │
│          │                             │ three plain English reasons: first, that a key         │
│          │                             │ prerequisite, Arrays and Memory Contiguity, is still   │
│          │                             │ weak at thirty-eight percent; second, that her recent  │
│          │                             │ score trend is falling; and third, that her attempt    │
│          │                             │ velocity is behind schedule."                          │
├──────────┼─────────────────────────────┼────────────────────────────────────────────────────────┤
│ 1:10     │ Browser: Root Gap Card      │ "Next, rather than telling the student to re-read the  │
│          │ & Graph View                │ entire Linked List chapter, our graph-traversal Root   │
│          │ (`/student/root-gaps`)      │ Gap algorithm traverses backwards through the          │
│          │                             │ curricular Directed Acyclic Graph. It pinpoints the    │
│          │                             │ exact root bottleneck: Arrays. She doesn't have a      │
│          │                             │ linked list conceptual deficiency; she has an unlinked │
│          │                             │ memory layout deficit."                                │
├──────────┼─────────────────────────────┼────────────────────────────────────────────────────────┤
│ 1:30     │ Browser: Learning Path      │ "Based on this diagnosis, the recommender engine       │
│          │ (`/student/path`)           │ synthesizes an ordered, multi-factor study path        │
│          │                             │ prioritizing the root gap first. Notice Step One:      │
│          │                             │ instead of trees, it prescribes a twelve-minute        │
│          │                             │ targeted video on contiguous memory pointers, followed │
│          │                             │ by a hands-on coding exercise, before re-approaching   │
│          │                             │ nodes and trees."                                      │
├──────────┼─────────────────────────────┼────────────────────────────────────────────────────────┤
│ 1:50     │ Live Action: Attempt Drawer │ "Let's demonstrate real-time closed-loop adaptation.   │
│          │ (Log 3 high scores on       │ Asha studies the foundational material and logs an     │
│          │ Arrays, Concept C07)        │ attempt with a score of ninety-five percent. Watch the │
│          │                             │ screen: the request is sent with an idempotent attempt │
│          │                             │ ID. Within 1.5 seconds, the Digital Twin recalculates. │
│          │                             │ Her Arrays mastery jumps from thirty-eight to seventy- │
│          │                             │ one percent, her predicted risk on Linked Lists        │
│          │                             │ plummets from high to low, and her learning path       │
│          │                             │ automatically regenerates to advance her forward."     │
├──────────┼─────────────────────────────┼────────────────────────────────────────────────────────┤
│ 2:15     │ Browser: Switch to Faculty  │ "Now let's switch to the faculty portal. An instructor │
│          │ Portal (`/faculty`)         │ overseeing hundreds of students cannot review each     │
│          │                             │ student individually. Our faculty dashboard aggregates │
│          │                             │ the entire cohort into an Early Warning quadrant. It   │
│          │                             │ flags students whose risk has risen by twenty percent  │
│          │                             │ or more over the past week. Even more powerfully, the  │
│          │                             │ Common Gaps chart aggregates root causes across the    │
│          │                             │ class, showing the professor that twenty-four students │
│          │                             │ are blocked by Arrays, allowing targeted recitation    │
│          │                             │ before the exam."                                      │
├──────────┼─────────────────────────────┼────────────────────────────────────────────────────────┤
│ 2:40     │ Slide: Empirical Results    │ "Empirically, our calibrated XGBoost model achieves an │
│          │ (Slide 8)                   │ ROC AUC of 0.841, a recall of 82.5%, and a root gap    │
│          │                             │ accuracy of 98.65% against ground truth. In synthetic  │
│          │                             │ classroom simulations across twenty random seeds,      │
│          │                             │ students following NeuroLearn's root-first paths       │
│          │                             │ achieved a 60.7% greater true mastery gain compared    │
│          │                             │ to traditional syllabus progression."                  │
├──────────┼─────────────────────────────┼────────────────────────────────────────────────────────┤
│ 2:55     │ Slide: Conclusion & Close   │ "In conclusion, NeuroLearn AI transforms educational   │
│          │ (Slide 10)                  │ technology from reactive post-mortems into proactive,  │
│          │                             │ explainable, and personalized cognitive guidance.      │
│          │                             │ Thank you, and we welcome your questions."             │
└──────────┴─────────────────────────────┴────────────────────────────────────────────────────────┘
```

---

## Backup Rehearsal Protocol: The "ML Service Offline" Stale Demo

If demonstrating resilience or if an examiner asks *"What happens if the ML microservice crashes or networks disconnect?"*:

1. **Simulate Service Interruption:**
   ```bash
   docker compose stop ml-service
   # or terminate the uvicorn process
   ```
2. **Reload the Student Dashboard:**
   - The Express.js backend detects the ML service timeout (5000 ms).
   - Rather than returning a blank screen or a 500 error, the gateway retrieves the latest stored snapshot from PostgreSQL and serves it with `stale: true`.
3. **Point Out UI Graceful Degradation:**
   - Point out the yellow **StaleBanner** at the top of the interface:  
     `"Notice that predictions are currently marked as cached due to offline synchronization. The student can still browse their curriculum, review past explanations, and study their recommended resources without disruption."`
4. **Restore Service:**
   ```bash
   docker compose start ml-service
   ```
   - Log an attempt, and demonstrate immediate automatic cache refreshment.

