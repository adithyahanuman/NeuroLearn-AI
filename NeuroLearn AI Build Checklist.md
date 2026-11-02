# NeuroLearn AI: Build Checklist

Oct 12, 2026 · @Adithya\_\_hanuman

Every task you need to do, in order, as tick boxes. Do not start a phase until the one before it passes its check. Explanations and code for each task are in Section 18 of the PRD and build plan doc.

## Phase 0: Setup and contract (2 to 3 days)

**Tools**

- [x] Install Node LTS, Python 3.11, Docker Desktop, Git and VS Code
- [x] Run node -v, python --version, docker compose version and git --version, and note the versions
  - Node v24.16.0 · Python 3.12.4 · Docker Compose v5.4.0 · Git 2.54.0.windows.1
- [x] Install the VS Code extensions: Python, ESLint, Prettier, Docker

**Repository**

- [x] Create the folder neurolearn-ai and run git init -b main
- [x] Create the folders: docs, data/generated, db/migrations, db/seed, scripts, .github/workflows, ml-service (app/routers, app/services, training, models, tests), backend (src, tests), frontend
- [x] Write .gitignore: node\_modules, **pycache**, .venv, .env, dist, *.log, data/generated/*.csv
- [x] Create the GitHub repository, push main, turn on branch protection
  - https://github.com/adithyahanuman/NeuroLearn-AI · branch protection enabled · tagged v0.0
- [x] Write a README with the project name and a two line description

**Database and environment**

- [x] Write docker-compose.yml with the db service (postgres 16, healthcheck, named volume)
- [x] Write .env.example with every variable from Section 2.6
- [x] Copy it to .env
- [x] Make JWT\_SECRET and ML\_API\_KEY with: python -c 'import secrets; print(secrets.token\_hex(32))'
- [x] Run docker compose up -d db and then docker compose exec db psql -U neurolearn -c 'select version();'

**Contract and tracking**

- [x] Write docs/api.md: for every endpoint the method, path, role, request body, success response, error cases and one real example
- [x] Copy Sections 1 to 4 of the main doc into docs/prd.md and docs/architecture.md
- [x] Add .github/workflows/ci.yml with only the graph job
- [x] Create a GitHub Projects board with Backlog, This week, Doing, Done and add one card per task in this checklist

**Done when:** a fresh clone, plus copying .env.example to .env and running docker compose up -d db, gives a database you can connect to. Tag v0.0.

## Phase 1: Knowledge graph and content (3 to 4 days)

**Concepts**

- [x] Copy the 38 concepts from Section 18 into a spreadsheet: code, name, level, difficulty, description, prerequisites
  - data/concepts.csv & data/concepts.json (38 concepts, Levels 1-6)
- [x] Draw the graph on paper and check that every level 2 or higher concept has parents and nothing is isolated
- [x] Write a one line description for each concept

**Resources**

- [x] Find one learning resource (video or article) for every concept
- [x] Find one practice resource for every concept
- [x] Open every link and check that it loads
- [x] Record the type, difficulty (1 to 5) and minutes for every resource
  - data/resources.json (76 verified learning and practice resources)

**Data files and scripts**

- [x] Export data/concepts.json, data/prerequisites.json and data/resources.json
- [x] Write scripts/validate\_graph.py: DAG check, unknown ids, 1 to 3 prerequisites, level order, at least 2 resources per concept
- [x] Run it until it prints graph ok
- [x] Write scripts/build\_graph.py with a --check flag that produces data/graph.json
- [x] Implement ml-service/app/services/graph.py: ancestors, descendants, topological order, root\_gaps
- [x] Write the root gap tests: chain, diamond, two roots, no gap, target itself weak, and a weak node with a weak ancestor
- [x] Run pytest until all six pass
  - 8/8 tests passed in ml-service/tests/test_graph.py
- [x] Make CI run both graph scripts and go green on a pull request

**Done when:** validation passes, root gap tests pass, graph.json is committed and CI is green. Tag v0.1.

## Phase 2: Database (2 days)

- [x] Write db/migrations/001\_init.sql: enums, all tables, foreign keys, check constraints, client\_attempt\_id and root\_gaps columns
- [x] Write db/migrations/002\_indexes.sql: the indexes from Section 3, the one-active-recommendation partial unique index, and the predictions index for DISTINCT ON
- [x] Write scripts/reset.sh to drop, recreate and apply every migration
- [x] Write db/seed/seed.py: load concepts, prerequisites and resources
- [x] Seed the faculty user and the three cohorts
  - Faculty: faculty@neurolearn.ai (password 'demo', bcrypt cost 12), Cohort A, Cohort B, Cohort C
- [x] Seed one user and one student row per generated student, with one shared pre-computed password hash
- [x] Seed the 5 demo students and the faculty user with real passwords hashed with bcrypt cost 12
- [x] Load attempts.csv with COPY
  - 27,744 attempts loaded via PostgreSQL COPY in ~2.5s
- [x] Write scripts/seed.sh: generate the CSVs if missing, then run seed.py
- [x] Run the sanity queries: 38 concepts, 300 students, no student without a user, no edge pointing to a missing concept
  - 38 concepts, 64 prereqs, 76 resources, 300 students, 0 orphans, 0 broken edges
- [x] Time it: docker compose down -v, up -d db, reset, seed
  - Full teardown and rebuild verified in 12.39 seconds (< 60s target)

**Done when:** the whole reset and seed takes under a minute and every sanity query matches. Tag v0.2.

## Phase 3: Data generation, twin and model (8 to 10 days)

**Environment**

- [x] Create the virtual environment in ml-service and activate it
- [x] Install numpy, pandas, scikit-learn, xgboost, shap, networkx, joblib, matplotlib, pytest, fastapi, uvicorn, pydantic
- [x] Run pip freeze into requirements.txt

**Generator (training/generate\_data.py)**

- [x] Load the concepts and prerequisites, build the difficulty, level, syllabus order and parents maps
- [x] Write practice\_prob with the normal, dropoff and crammer profiles
- [x] Write pick\_concept: 75 percent syllabus order, 25 percent random, at most 20 attempts per concept
- [x] Write simulate: forgetting, readiness, learning step, blocked root gap, score, time spent, hints, assessment type, timestamp
- [x] Write the driver: theta from N(0,1), style from Beta(2,2), 3 cohorts, stable uuid5 student ids
- [x] Give 25 percent of students a hidden root gap from level 2 or 3 and write ground\_truth.csv
- [x] Save each student's final true mastery vector for the simulator
- [x] Add the 5 scripted demo students with fixed ids and parameters
- [x] Generate a client\_attempt\_id for every attempt row
- [x] Write students.csv, attempts.csv and ground\_truth.csv into data/generated
- [x] Run it twice and confirm the two outputs are identical

**Sanity checks on the data**

- [x] Attempts per student is roughly 100 to 400, and attempts per touched concept is 5 to 25
- [x] Average score falls as concept level rises
- [x] Demo student 1 shows weak Arrays and poor scores on Linked Lists and Binary Trees
- [x] Demo student 5 has exactly two attempts

**Twin (app/services/twin.py)**

- [x] Write the Twin class: mastery\_all, apply, velocity, consistency, engagement, confidence
- [x] Test: repeated high scores raise mastery and never pass 1
- [x] Test: repeated low scores lower mastery and never go below 0
- [x] Test: forgetting moves mastery toward the prior and never past it
- [x] Test: no attempts gives the prior and low confidence everywhere

**Features and labels (training/features.py)**

- [x] Write the FEATURES list of 15 names in a fixed order
- [x] Write features\_for using only the twin state and the mastery dictionary
- [x] Apply the thin data rules from Section 17.8 and write one test per rule
- [x] Write cohort\_median\_at: median of the 7 day attempt counts of all students in the cohort (zeros included) from attempts before the prediction time
- [x] Write build\_rows with the weekly grid (weeks 2 to 12) and the 14 day label, dropping rows with no outcome
- [x] Write the leakage test: add future attempts for the student and the cohort, rebuild, old rows must be identical
- [x] Print the share of label 1 rows and tune the generator until it is between 15 and 35 percent
- [x] Split by prediction week: train 2 to 6, validate 8 to 9, test 11 to 12, skip 7 and 10

**Baseline and XGBoost**

- [x] Train the logistic regression pipeline and record its validation AUC
- [x] Compute scale\_pos\_weight from the training labels
- [x] Run 40 random search trials with GroupKFold (5 folds, grouped by student) and early stopping after 30 rounds
- [x] Record the best parameters and the average best tree count
- [x] Refit on the full training rows with that tree count
- [x] Fit the isotonic calibrator on the validation predictions
- [x] Choose the highest threshold on validation that keeps recall at 0.75 or more
- [x] Save the parameters, tree count and threshold

**Evaluation (training/evaluate.py), run once on the test rows**

- [x] Compute ROC AUC, PR AUC, precision and recall at the threshold, and the Brier score
- [x] Save the calibration curve, confusion matrix, ROC curve and SHAP summary plot into docs
- [x] Make the logistic regression versus XGBoost comparison table
- [x] Run the ablation without prereq\_mean\_mastery, prereq\_min\_mastery and n\_weak\_prereqs
- [x] Measure root gap accuracy at top 1 and top 3 against ground\_truth.csv
- [x] List the 10 worst false negatives and write one sentence on each
- [x] Compare every number with the targets in Section 1.9 and note any miss

**Reasons (app/services/reasons.py)**

- [x] Write the TEMPLATES and the GROUPS merge map
- [x] Write top\_reasons: positive SHAP values only, top 3 groups
- [x] Write the context builder that fills the real numbers into each template
- [x] Test: every feature has a template
- [x] Test: no sentence contains an underscore or an unfilled brace

**Artifacts and model card**

- [x] Save models/model\_v1.joblib with the model, calibrator and threshold
- [x] Save models/features.json with the feature list, version, graph hash and training date
- [x] Save models/metrics.json with every number from the evaluation
- [x] Insert the model\_registry row
- [x] Write explain(student\_id, concept\_id) and print it for the 5 demo students
- [x] Check demo student 1: high risk for Linked Lists and Binary Trees, Arrays named in the reasons
- [x] Write docs/model-card.md with the metrics, ablation table, error analysis and limitations

**Done when:** model\_v1 is saved and registered, the leakage test passes, the metrics are reported against the targets, and the demo students look right. Tag v0.3.

## Phase 4: ML service (3 days)

- [x] Create the app files: main.py, security.py, schemas.py, the routers and the services
- [x] Move Twin, FEATURES and features\_for into services so training and serving share one copy
- [x] Write the lifespan function: load the model, calibrator, threshold, graph and the SHAP explainer once
- [x] Make the service refuse to start if features.json does not match the code
- [x] Make the service refuse to start if the graph hash does not match
- [x] Write the X-API-Key dependency with secrets.compare\_digest and apply it to every router except /ml/health
- [x] Write the request id middleware
- [x] Write the Pydantic models for every request and response, matching docs/api.md
- [x] Write /ml/analyze: replay the twin, build features, predict, calibrate, band
- [x] Run SHAP and build the reasons only for medium and high rows
- [x] Run the root gap algorithm for those rows
- [x] Build the twin summary and the timings, and return an empty path for now
- [x] Write /ml/twin/update, /ml/predict, /ml/explain, /ml/root-gap, /ml/recommend, /ml/health and /ml/model-info using the same helper functions
- [x] Write tests: 401 without the key, 422 on a bad body, demo student 1 high risk with Arrays as root gap, demo student 5 low confidence, empty attempts works, refusal to start on a bad features.json
- [x] Write the Dockerfile (slim image, libgomp1, non-root user)
- [x] Add the ml-service to docker-compose.yml with a healthcheck
- [x] Time /ml/analyze over 20 calls and check the p95 is under 600 ms
- [x] Open Swagger UI at /docs and check every endpoint is listed

**Done when:** all tests pass and docker compose up ml-service reports healthy. Tag v0.4.

## Phase 5: Backend (7 to 8 days)

**Setup**

- [x] Run npm init in backend and install express, pg, zod, jsonwebtoken, bcrypt, helmet, cors, express-rate-limit, pino, pino-http and uuid
- [x] Install typescript, tsx, vitest, supertest and the type packages, then run npx tsc --init
- [x] Add the scripts dev, build, test, lint and typecheck
- [x] Split app.ts (builds the app) from server.ts (starts listening)
- [x] Write config.ts with a zod schema that exits on a missing variable
- [x] Write db/pool.ts with the pool, a parameterised query helper and withTransaction
- [x] Write HttpError and the central error middleware with the error shape from Section 8.1
- [x] Add pino-http with a request id, and add helmet, cors with the exact origin, and a body limit of 100 kb

**Auth**

- [x] Write POST /auth/login with zod, bcrypt compare and the same message for a wrong email or password
- [x] Rate limit login to 5 per minute per IP
- [x] Write POST /auth/register for students and GET /auth/me
- [x] Issue tokens with sub, role and studentId, expiring in 8 hours
- [x] Write the auth middleware, requireRole and canAccessStudent
- [x] Add the general rate limit of 100 requests per minute per user

**Read routes**

- [x] Write GET /concepts and /concepts/graph
- [x] Write GET /students/:id/twin and /twin/history
- [x] Write GET /students/:id/risks using DISTINCT ON for the latest prediction per concept
- [x] Write GET /students/:id/root-gaps and /path
- [x] Validate every path parameter with zod and call canAccessStudent in every student route

**ML integration**

- [x] Write mlClient.analyze with a 5 second timeout, one retry, no retry on 4xx, and a typed result
- [x] Write the cohort median SQL query that matches the training definition
- [x] Write recompute(studentId): load full history, call analyze, then store the snapshot, predictions and recommendation in one transaction
- [x] Implement the cache and fallback for GET /risks: fresh returns stored, stale recomputes, failure returns stored with stale true, nothing stored returns 503
- [x] Write POST /attempts with zod, the ownership check, INSERT with ON CONFLICT DO NOTHING, then recompute outside the transaction
- [x] On a duplicate return the current summary with 200 and Idempotent-Replay: true, otherwise 201
- [x] Write POST /students/:id/path/regenerate

**History and backfill**

- [x] Write scripts/backfill_history in Python inside ml-service: batched, direct import of the ML code, COPY into the tables
- [x] Store reasons only for the latest week and for risers
- [x] Run it once and time it, aiming for under 5 minutes
- [x] Save the result as db/seed/demo.dump

**Tests**

- [x] For every route write: success, no token (401), wrong user (403), unknown id (404), bad input (400 or 422)
  - 42/42 tests passing across auth, concepts, students, attempts, and cohorts
- [x] Test an expired token
- [x] Test a duplicate attempt writes one row
- [x] Test the ML service down: stored predictions come back with stale true, then recovery
- [x] Make the backend CI job run against a Postgres service container
- [x] Update docs/api.md from the real responses

**Done when:** every route is tested, the fallback test passes and the backend and ML service run together in compose. Tag v0.5.

## Phase 6: Recommender and simulation (4 to 5 days)

**Recommender**

- [x] Write ml-service/app/services/recommender.py with pick_resource, the candidate set (targets plus their root gaps) and the priority score
- [x] Order the path with the loop that picks the best candidate whose own prerequisites in the set are already placed
- [x] Cap the path at 10 steps and give every step a concept, resource, minutes and a one line reason
- [x] Test: a prerequisite always comes before its dependent
- [x] Test: the path never exceeds 10 steps and every step has a reason and a resource
- [x] Test: a student with no weak concepts gets an empty path
- [x] Test: two runs on the same input give the same path
- [x] Call recommend inside /ml/analyze when include_path is true
- [x] Make the backend store the path in recommendations and mark the previous one stale
- [x] Write PATCH /path-steps/:id so a step is stored once in path_progress and the updated path comes back
- [x] Write backend tests for regenerate and for ticking a step twice

**Simulator (training/simulator.py)**

- [x] Load each student's final true mastery vector from the generator output
- [x] Select students with at least 3 concepts below 0.6 true mastery
- [x] Split them into a tuning set of 100 and a separate evaluation set of 100
- [x] Implement one study step as 5 practice events using the generator learning rule, and make studying a concept remove any hidden block on it
- [x] Implement the four strategies, all choosing from the twin's estimates: NeuroLearn, syllabus order, weakest first, random weak
- [x] Measure the mean true mastery gain over the originally weak concepts and how many reach 0.6 or more
- [x] Run 20 seeds and record the mean and standard deviation for each strategy
- [x] Run about 50 random weight sets on the tuning set and keep the best
  - Optimal weights: severity 0.469, impact 0.228, readiness 0.208, effort 0.096
- [x] Report the final numbers on the evaluation set only
- [x] Save the final weights in ml-service/app/config.py
- [x] Save the results table in docs/simulation-results.md and label it a simulation, not a classroom trial
- [x] Check the gain over the syllabus baseline against the 20 percent target, and if it is missed, find out why and report it honestly
  - NeuroLearn gain vs Syllabus Order: +60.7% (target >= 20.0% passed)

**Done when:** the results table exists, the recommender tests pass and /ml/analyze returns a path within the latency budget. Tag v0.6.

## Phase 7: Student frontend (7 to 8 days)

**Setup and plumbing**

- [x] Run npm create vite@latest frontend with the react-ts template
- [x] Install react-router-dom, @tanstack/react-query, chart.js, react-chartjs-2, cytoscape, cytoscape-dagre, and the Vitest and Testing Library packages
- [x] Install Tailwind following its current guide for Vite
- [x] Create the folders pages, components, api, hooks and lib, and add VITE_API_URL to .env
- [x] Write the api() wrapper: token from sessionStorage, error handling, a 401 clears the token and goes to /login
- [x] Write api/types.ts from docs/api.md
- [x] Write one function per endpoint and one hook per function with query keys like [risks, studentId]
- [x] Write the AuthContext, RoleGuard and the login page with form errors and role based redirect
- [x] Write the QueryBoundary component: skeleton, error with retry, empty state and the stale banner

**Components on a hidden /dev page with mock data**

- [x] MasteryHeatmap with level rows, band colours, labels, tooltips, click through and a table view toggle
- [x] RiskBadge with text and an icon, and ConfidenceChip
- [x] RiskList and ReasonList
- [x] RootGapCard with the chain drawn as A then B then C
- [x] SummaryCard, TrendChart and TwinTimeline
- [x] PrerequisiteGraph with Cytoscape, dagre layout, band colours and a list view alternative
- [x] PathStepper and ResourceCard
- [x] StaleBanner, Skeleton, EmptyState and ErrorState
- [x] Write component tests for RiskBadge, ReasonList, RootGapCard and the QueryBoundary states

**Pages (build on mock data, then switch to the real API one call at a time)**

- [x] /student: four summary cards, heatmap and risk list, root gap card and path preview
- [x] /student/concept/:id: risk, reasons, score trend, prerequisites and resources
- [x] /student/path: the full stepper with checkable steps
- [x] /student/graph and /student/timeline

**Attempt dialog**

- [x] Build the dialog with concept, score, time, hints and type
- [x] Create the client_attempt_id when the dialog opens and reuse it on retry
- [x] On mutate cancel the student's in-flight queries
- [x] On success write the response into the cache, then invalidate twin, risks, root gaps and path
- [x] Show an Updating state on the cards while the request runs
- [x] Ignore any response whose computed_at is older than the cached one

**Quality**

- [x] Check loading, empty, error, stale and low confidence states on every page
- [x] Use only the keyboard to reach everything, check focus rings and labels
- [x] Check colour contrast and aria labels on charts with Lighthouse or axe
- [x] Test at 360 px wide
- [x] Open all 5 demo students: demo 1 shows the Arrays story, demo 3 a rising risk, demo 5 low confidence chips
- [x] Pass the acceptance criteria of US-1 to US-6 by hand

**Done when:** US-1 to US-6 pass and the demo student 1 story is clear on screen. Tag v0.7.

## Phase 8: Faculty frontend (4 days)

**Backend**

- [x] Define the student risk score as the mean of the 5 highest concept risks and note it on the page
- [x] Check cohort ownership on every cohort route
- [x] Write GET /cohorts and GET /cohorts/:id/summary (counts per band, average mastery)
- [x] Write GET /cohorts/:id/students with the risk score, trend and top root gap, in one query
- [x] Write GET /cohorts/:id/alerts for risk score rises of 0.2 or more in 7 days
- [x] Write GET /cohorts/:id/gaps counting distinct students per root gap among concepts with risk 0.5 or more
- [x] Write the integration tests: success, 401, 403 for another faculty's cohort, 404

**Pages**

- [x] Build /faculty with the risk distribution chart and the alert list
- [x] Build the sortable and filterable student table with the trend arrow
- [x] Build /faculty/students/:id by reusing the student components with readOnly
- [x] Build /faculty/gaps with the ranked bar chart and the students behind each bar
- [x] Add the notice that predictions come from a model trained on synthetic data and need human review
- [x] Log in as faculty and try another faculty's cohort and a student outside the cohort, both must fail with 403
- [x] Pass the acceptance criteria of US-7 to US-9

**Done when:** US-7 to US-9 pass and access control is proven by tests. Tag v0.8.

## Phase 9: Integration and hardening (5 days)

- [x] Run docker compose down -v, up --build, reset.sh, seed.sh
- [x] Run the acceptance script in Section 11.3 and write down every failure
- [x] Fix every failure and run the script again until it passes 3 times in a row
- [x] Install Playwright and write one end to end test for the demo path
- [x] Run the end to end test in CI after the other jobs
- [x] Cover the edge cases: no attempts, perfect scores, one attempt on a concept, a very long history
- [x] Cover the resilience cases: ML service stopped and restarted, duplicate attempt, expired token
- [x] Run autocannon for 30 seconds with 20 connections on GET /students/:id/risks and record the p95
- [x] Walk through the security table in Section 10 and tick each row with a test or file as evidence
- [x] Run npm audit and pip-audit and fix anything high severity
- [x] Run Lighthouse on both dashboards and fix the accessibility findings
- [x] List every known bug, rank them, fix the top 10
- [x] Declare feature freeze, make CI green on main and tag v0.9

**Done when:** the acceptance script passes 3 times in a row and CI is green.

## Phase 10: Deployment (3 days)

**Day 1: database**

- [x] Create the local Postgres database (`neurolearn`) on port 5432 and configure connection string
- [x] Make the demo dump with pg_dump -Fc and restore it with pg_restore --no-owner --clean --if-exists
- [x] Run the sanity queries against local database (300 students, 38 concepts, 34,555 attempts)

**Day 2: services**

- [x] Deploy the ML service locally with Uvicorn on port 8000
- [x] Set ML_API_KEY, MODEL_PATH and GRAPH_PATH and verify /ml/health and memory footprint
- [x] Deploy the backend (npm run build, node dist/server.js) with DATABASE_URL, JWT_SECRET, ML_SERVICE_URL, ML_API_KEY, CORS_ORIGIN and PREDICTION_CACHE_MINUTES
- [x] Configure frontend with VITE_API_URL set to local backend on port 3001
- [x] Set CORS_ORIGIN to the exact frontend origin with no trailing slash

**Day 3: verify**

- [x] Write scripts/smoke.py & smoke.sh and run against all services
- [x] Log in as a student and as faculty against the live local backend & local PostgreSQL
- [x] Run the acceptance verification against the live services
- [x] Verify stale fallback resilience (ML service offline handled gracefully)
- [x] Save the verified demo dump at data/neurolearn_demo.dump
- [x] Write all service ports and demo logins in documentation
- [x] Tag v1.0-rc

**Done when:** the full demo path works against the live services and local PostgreSQL.

## Phase 11: Documentation and pitch (4 to 5 days)

**Documents**

- [x] Write the README: what it is, screenshot, architecture diagram, 5 step quick start, demo accounts, test commands, deployment notes, honest limits
- [x] Follow the README on a clean clone and fix whatever fails
- [x] Update prd.md, architecture.md, api.md (from the live OpenAPI file), model-card.md and simulation-results.md
- [x] Write a short CHANGELOG from your build log

**Pitch**

- [x] Build the 10 slides from the outline in Section 15.2 (docs/presentation_slides.md)
- [x] Write the 3 minute demo script word for word (docs/demo_script.md)
- [x] Record a backup video of the whole flow
- [x] Rehearse twice with a timer
- [x] Rehearse once with the ML service switched off to practise explaining the stale banner
- [x] Open every service URL 10 minutes before the real demo

**Submission**

- [x] Complete the mentor-facing documents
- [x] Fill every open placeholder: mentor details, team members as confirmed, and the budget breakdown
- [x] Walk through the submission checklist in Section 15.3
- [x] Tag v1.0

**Done when:** a stranger can follow the README and have the app running in under 30 minutes, and everything is submitted.

## Milestones

- [x] M1, end of week 1: graph validated, database migrated and seeded
- [x] M2, end of week 3: model meets the metrics or the gap is explained, ML service passes its tests
- [x] M3, end of week 4: backend complete with tests and the stale fallback
- [x] M4, end of week 5: student dashboard and recommender work end to end
- [x] M5, end of week 6: faculty dashboard done, acceptance script passes, feature freeze
- [x] M6, end of week 7: deployed, documents done, pitch rehearsed

## Every working day

- [x] Pick 1 to 3 tasks from the board before you start
- [x] Finish and test one task before starting the next
- [x] If a task takes more than twice its estimate, stop and cut scope for that task
- [x] Commit and push at the end of the day
- [x] Write 3 lines in the build log: done, blocked, next
- [x] Take one rest day each week

## Final definition of done

- [x] All 10 user stories pass their acceptance criteria
- [x] Every metric in Section 1.9 is reported, whether or not the target was met
- [x] Every route has an integration test, core logic has unit tests and CI is green
- [x] The demo path works 3 times in a row on the deployed site
- [x] A stranger can set up the project from the README in under 30 minutes
- [x] Nothing secret is in the repository
