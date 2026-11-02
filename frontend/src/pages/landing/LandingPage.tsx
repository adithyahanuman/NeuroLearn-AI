import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Sparkles,
  GitBranch,
  ShieldCheck,
  Brain,
  CheckCircle2,
  Users,
  Compass,
  Layers,
  ChevronDown,
} from 'lucide-react';
import InkBackground from '@/components/kokonutui/ink-background';
import { HeroAtmosphere } from '@/components/landing/HeroAtmosphere';
import { ConstellationGraph } from '@/components/3d/ConstellationGraph';
import { CountUp } from '@/components/motion/CountUp';
import { Reveal } from '@/components/motion/Reveal';
import { SplitHeading } from '@/components/motion/SplitHeading';
import { RootGapChain } from '@/components/common/RootGapChain';
import { METRICS } from '@/api/mocks/mockDb';
import { initSmoothScroll } from '@/lib/motion';

export const LandingPage: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [howStep, setHowStep] = useState(0);

  // Initialize Lenis smooth scroll
  useEffect(() => {
    const lenis = initSmoothScroll();

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Team roster from README
  const teamMembers = [
    { name: 'NARNE ADITHYA HANUMAN', reg: '24BDS0220' },
    { name: 'TANGUDU RAAJIV', reg: '24BDS0242' },
    { name: 'GARIKAPATI CHARAN DEEP', reg: '24BDS0260' },
    { name: 'BHAMIDIPATY SAI SANTOSH', reg: '24BDS0213' },
  ];

  return (
    <div className="min-h-screen bg-paper text-ink selection:bg-lagoon-light/30">
      {/* Public Nav Bar (becomes sticky compact on scroll) */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'h-14 bg-paper/90 backdrop-blur-md border-b border-line py-2 shadow-card'
            : 'h-20 bg-transparent py-5'
        }`}
      >
        <div className="max-w-[1280px] mx-auto px-6 h-full flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="h-8 w-8 rounded-full bg-lagoon flex items-center justify-center text-paper font-semibold text-sm shadow-sm">
              N
            </span>
            <span className="font-display text-2xl tracking-tight text-ink group-hover:text-lagoon transition-colors">
              NeuroLearn
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-ink/80">
            <button
              type="button"
              onClick={() => scrollToSection('problem')}
              className="hover:text-ink transition-colors"
            >
              The Problem
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-ink transition-colors"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('root-gap')}
              className="hover:text-ink transition-colors"
            >
              Root Gap Story
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('roles')}
              className="hover:text-ink transition-colors"
            >
              Roles
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('metrics')}
              className="hover:text-ink transition-colors"
            >
              Metrics
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-primary text-xs py-2 px-5 shadow-sm">
              Log in
            </Link>
          </div>
        </div>
      </header>

      {/* Section 1: Hero (full screen) */}
      <section className="relative min-h-screen pt-28 pb-16 flex flex-col justify-center overflow-hidden border-b border-line">
        {/* Ambient Ink Dissolve Fluid (text removed) and Dynamic Atmosphere Layer */}
        <div className="absolute inset-0 z-0 opacity-70">
          <InkBackground
            text=""
            accent="#E2674A"
            className="h-full min-h-full bg-paper"
          />
        </div>
        <HeroAtmosphere />

        <div className="relative z-10 max-w-[1280px] mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Hero Headline & Actions */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3.5 py-1 text-xs font-mono-numbers text-muted backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-sunrise-to animate-pulse" />
              <span>Machine Learning & Knowledge Graph OS</span>
            </div>

            <SplitHeading
              as="h1"
              className="text-5xl sm:text-7xl lg:text-8xl tracking-tight text-ink leading-[0.98]"
            >
              <div className="overflow-hidden">
                <span className="split-line-inner block">
                  Know where you'll
                </span>
              </div>
              <div className="overflow-hidden">
                <span className="split-line-inner block">
                  <em className="italic font-normal">struggle</em> before you do.
                </span>
              </div>
            </SplitHeading>

            <p className="text-base sm:text-lg text-muted max-w-[58ch] leading-relaxed">
              NeuroLearn anticipates DSA concept bottlenecks, explains why in plain language, traces the missing prerequisite in your knowledge graph, and builds an adaptive path to fix it.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Link to="/login" className="btn-primary text-sm py-3 px-8 shadow-card">
                Log in to Dashboard
              </Link>
              <button
                type="button"
                onClick={() => scrollToSection('problem')}
                className="btn-secondary text-sm"
              >
                See how it works
              </button>
            </div>
          </div>

          {/* Right Floating 3D Knowledge Graph Constellation */}
          <div className="lg:col-span-5 relative h-[420px] sm:h-[480px] rounded-card border border-line bg-surface/40 backdrop-blur-sm overflow-hidden shadow-card">
            <div className="absolute top-3 left-4 z-20 text-[11px] font-mono-numbers text-muted uppercase tracking-wider">
              Live Constellation Topology · 38 Nodes
            </div>
            <ConstellationGraph height="100%" interactive={true} />
          </div>
        </div>

        {/* Scroll down prompt */}
        <div className="relative z-10 max-w-[1280px] mx-auto px-6 w-full pt-8 flex items-center justify-between text-xs font-mono-numbers text-muted">
          <span>Scroll to explore</span>
          <ChevronDown className="h-4 w-4 animate-bounce" />
        </div>
      </section>

      {/* Section 2: The Problem (Pinned / Scrubbed Storytelling) */}
      <section id="problem" className="py-28 border-b border-line bg-paper-2/40">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-xs font-mono-numbers uppercase tracking-wider text-muted mb-2">
            The Structural Failure of Modern Computer Science Education
          </div>
          <h2 className="font-display text-4xl sm:text-5xl text-ink max-w-[30ch] leading-tight">
            Why Traditional Practice Platforms Leave Students Stranded
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            {/* Problem Statement 1 */}
            <div className="p-8 rounded-card border border-line bg-surface flex flex-col justify-between">
              <div>
                <span className="font-display text-5xl text-muted/60 block mb-4">
                  01
                </span>
                <h3 className="font-display text-2xl text-ink mb-3">
                  “Everyone gets the same lessons.”
                </h3>
                <p className="text-sm text-muted leading-relaxed">
                  Linear syllabi assume uniform prerequisite retention. When students struggle with Tree Traversals, generic platforms prescribe more tree problems instead of diagnosing the broken pointer reference.
                </p>
              </div>
            </div>

            {/* Problem Statement 2 */}
            <div className="p-8 rounded-card border border-line bg-surface flex flex-col justify-between">
              <div>
                <span className="font-display text-5xl text-muted/60 block mb-4">
                  02
                </span>
                <h3 className="font-display text-2xl text-ink mb-3">
                  “Teachers find out after the exam.”
                </h3>
                <p className="text-sm text-muted leading-relaxed">
                  Faculty only see grades after midterms or finals, when it is already too late to intervene. Traditional courseware lacks longitudinal early warning signals.
                </p>
              </div>
            </div>

            {/* Problem Statement 3 */}
            <div className="p-8 rounded-card border border-line bg-surface flex flex-col justify-between">
              <div>
                <span className="font-display text-5xl text-muted/60 block mb-4">
                  03
                </span>
                <h3 className="font-display text-2xl text-ink mb-3">
                  “Chatbots answer questions, they don't see patterns.”
                </h3>
                <p className="text-sm text-muted leading-relaxed">
                  Generative assistants provide point-in-time answers but lack a persistent, graph-aware Digital Learning Twin to track decay, hints, and prerequisite health over weeks.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: How It Works (Four-Step Sequence with Connecting Line) */}
      <section id="how-it-works" className="py-28 border-b border-line bg-paper">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div>
              <span className="text-xs font-mono-numbers uppercase tracking-wider text-muted">
                System Workflow
              </span>
              <h2 className="font-display text-4xl sm:text-5xl text-ink mt-1">
                How NeuroLearn Anticipates & Resolves Struggle
              </h2>
            </div>
            {/* Step Selector Tabs */}
            <div className="flex items-center gap-1 rounded-full border border-line bg-paper-2 p-1 text-xs font-mono-numbers">
              {['Track', 'Predict', 'Explain', 'Fix'].map((st, i) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setHowStep(i)}
                  className={`rounded-full px-3.5 py-1.5 font-medium transition-colors ${
                    howStep === i ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
                  }`}
                >
                  {i + 1}. {st}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Steps Visual & Content */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Step Left: Narrative */}
            <div className="lg:col-span-5 space-y-6">
              {howStep === 0 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="text-xs uppercase font-mono-numbers text-lagoon font-semibold">
                    Step 1 · Digital Learning Twin
                  </div>
                  <h3 className="font-display text-3xl text-ink">
                    Continuous Behavioral Tracking
                  </h3>
                  <p className="text-sm text-muted leading-relaxed">
                    Every quiz attempt, exercise duration, and hint request updates your personal Digital Learning Twin. It measures your velocity index, study regularity, and concept retention without relying on manual self-reporting.
                  </p>
                </div>
              )}

              {howStep === 1 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="text-xs uppercase font-mono-numbers text-amber font-semibold">
                    Step 2 · Machine Learning Engine
                  </div>
                  <h3 className="font-display text-3xl text-ink">
                    Calibrated Struggle Prediction
                  </h3>
                  <p className="text-sm text-muted leading-relaxed">
                    An XGBoost classifier evaluated at 93.7% ROC AUC computes the probability you will encounter difficulty on upcoming concepts 7 to 14 days before you take an assessment.
                  </p>
                </div>
              )}

              {howStep === 2 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="text-xs uppercase font-mono-numbers text-lagoon font-semibold">
                    Step 3 · Human-Auditable Explainability
                  </div>
                  <h3 className="font-display text-3xl text-ink">
                    Plain-Language Rationale
                  </h3>
                  <p className="text-sm text-muted leading-relaxed">
                    Never raw numbers or opaque weights. Every prediction delivers numbered, human-readable explanations: score decay, time relative to benchmark, and prerequisite health.
                  </p>
                </div>
              )}

              {howStep === 3 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="text-xs uppercase font-mono-numbers text-terracotta font-semibold">
                    Step 4 · Root Gap Remediation
                  </div>
                  <h3 className="font-display text-3xl text-ink">
                    Targeted Curricular Path
                  </h3>
                  <p className="text-sm text-muted leading-relaxed">
                    The engine generates a 3-to-10 step remediation path that starts at the fundamental root gap rather than repeating failed high-level exercises.
                  </p>
                </div>
              )}
            </div>

            {/* Step Right: Live Interactive Micro-Visual (Section 6.1 spec) */}
            <div className="lg:col-span-7 p-8 rounded-card border border-line bg-surface shadow-card min-h-[320px] flex flex-col justify-center">
              {howStep === 0 && (
                <div className="space-y-4">
                  <div className="text-xs font-mono-numbers uppercase text-muted">
                    Digital Twin Telemetry
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs font-mono-numbers mb-1">
                        <span>Learning Velocity</span>
                        <span className="font-semibold text-lagoon">84%</span>
                      </div>
                      <div className="h-2 rounded-full bg-paper-2 overflow-hidden">
                        <div className="h-full bg-lagoon w-[84%]" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-mono-numbers mb-1">
                        <span>Study Interval Regularity</span>
                        <span className="font-semibold text-amber">62%</span>
                      </div>
                      <div className="h-2 rounded-full bg-paper-2 overflow-hidden">
                        <div className="h-full bg-amber w-[62%]" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-mono-numbers mb-1">
                        <span>Prerequisite Health Index</span>
                        <span className="font-semibold text-terracotta">38%</span>
                      </div>
                      <div className="h-2 rounded-full bg-paper-2 overflow-hidden">
                        <div className="h-full bg-terracotta w-[38%]" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {howStep === 1 && (
                <div className="text-center py-6">
                  <span className="text-xs font-mono-numbers uppercase text-muted block mb-2">
                    Predicted Probability of Struggle
                  </span>
                  <div className="font-display text-7xl text-terracotta">
                    <CountUp value={89} suffix="%" />
                  </div>
                  <p className="text-xs text-muted mt-3">
                    Flagged for Concept C12 (Singly Linked Lists)
                  </p>
                </div>
              )}

              {howStep === 2 && (
                <div className="space-y-3">
                  <span className="text-xs font-mono-numbers uppercase text-muted block mb-2">
                    Human-Readable Rationale
                  </span>
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded bg-paper-2/60 border border-line">
                      1. Your last 3 scores on this topic average 34 percent
                    </div>
                    <div className="p-2.5 rounded bg-paper-2/60 border border-line">
                      2. A key prerequisite, Arrays and Memory Contiguity, is still weak at 29 percent
                    </div>
                    <div className="p-2.5 rounded bg-paper-2/60 border border-line">
                      3. You needed 2.0 hints per attempt on average
                    </div>
                  </div>
                </div>
              )}

              {howStep === 3 && (
                <div className="space-y-2.5">
                  <span className="text-xs font-mono-numbers uppercase text-muted block mb-2">
                    Sequenced Remediation Path
                  </span>
                  <div className="p-2.5 rounded border border-terracotta/30 bg-terracotta/5 text-xs flex justify-between items-center">
                    <span>1. Root Gap: Arrays Data Structure & Memory Contiguity</span>
                    <span className="font-mono-numbers font-medium text-terracotta">30 mins</span>
                  </div>
                  <div className="p-2.5 rounded border border-line bg-paper-2/40 text-xs flex justify-between items-center">
                    <span>2. Singly Linked List Implementation & Pointer Setup</span>
                    <span className="font-mono-numbers font-medium text-muted">35 mins</span>
                  </div>
                  <div className="p-2.5 rounded border border-line bg-paper-2/40 text-xs flex justify-between items-center">
                    <span>3. Binary Tree Traversals Practice</span>
                    <span className="font-mono-numbers font-medium text-muted">20 mins</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Root Gap Story (Signature Moment on Arrays Example) */}
      <section id="root-gap" className="py-28 border-b border-line bg-paper-2/30">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-mono-numbers uppercase tracking-wider text-muted">
              Signature Diagnosis
            </span>
            <h2 className="font-display text-4xl sm:text-5xl text-ink mt-2">
              “The weak spot is rarely where it hurts.”
            </h2>
            <p className="mt-3 text-sm text-muted">
              Consider Asha Demo (Demo 1): struggling with Binary Trees and Linked Lists, while the true root cause is continuous array index arithmetic.
            </p>
          </div>

          <RootGapChain
            rootGapName="Arrays and Memory Contiguity"
            blockedConceptName="Binary Trees & Linked Lists"
            chainDetails={[
              { id: 7, name: 'Arrays and Memory Contiguity (Root Gap)', mastery: 0.29 },
              { id: 6, name: 'Memory and Pointers Basics', mastery: 0.52 },
              { id: 12, name: 'Singly Linked Lists (Symptom)', mastery: 0.34 },
              { id: 21, name: 'Binary Trees and Traversals (Symptom)', mastery: 0.33 },
            ]}
          />
        </div>
      </section>

      {/* Section 5: For Students / For Faculty (Two Columns with Vertical Rule) */}
      <section id="roles" className="py-28 border-b border-line bg-paper">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-line gap-12 lg:gap-0">
            {/* Students Column */}
            <div className="lg:pr-12 space-y-6">
              <span className="text-xs font-mono-numbers uppercase tracking-wider text-muted">
                Student Experience
              </span>
              <h3 className="font-display text-3xl sm:text-4xl text-ink">
                For Students
              </h3>
              <p className="text-sm text-muted leading-relaxed">
                Gain clarity on where your foundation is leaking. Study with confidence knowing every recommended exercise targets the precise conceptual gap blocking your progress.
              </p>
              <ul className="space-y-3 text-sm text-ink">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-lagoon shrink-0" />
                  <span>38-concept mastery matrix with confidence calibration</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-lagoon shrink-0" />
                  <span>Prerequisite root gap graph-walks</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-lagoon shrink-0" />
                  <span>3D constellation knowledge graph visualization</span>
                </li>
              </ul>
              <div className="pt-2">
                <Link to="/login" className="btn-primary text-xs py-2.5 px-6">
                  Log in as Student →
                </Link>
              </div>
            </div>

            {/* Faculty Column */}
            <div className="lg:pl-12 pt-10 lg:pt-0 space-y-6">
              <span className="text-xs font-mono-numbers uppercase tracking-wider text-muted">
                Faculty Experience
              </span>
              <h3 className="font-display text-3xl sm:text-4xl text-ink">
                For Faculty
              </h3>
              <p className="text-sm text-muted leading-relaxed">
                Pinpoint cohort-wide bottlenecks before assignment deadlines. Intervene with targeted class review modules instead of reteaching entire units after poor exam scores.
              </p>
              <ul className="space-y-3 text-sm text-ink">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-lagoon shrink-0" />
                  <span>Early surge alerts for students spiking ≥20% risk</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-lagoon shrink-0" />
                  <span>Ranked common root gaps across student cohorts</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-lagoon shrink-0" />
                  <span>Cross-cohort concept comparison benchmark</span>
                </li>
              </ul>
              <div className="pt-2">
                <Link to="/login" className="btn-primary text-xs py-2.5 px-6">
                  Log in as Faculty →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 6: Product Preview (Real Framed Components, Not an Image) */}
      <section className="py-28 border-b border-line bg-paper-2/40">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="text-xs font-mono-numbers uppercase tracking-wider text-muted">
              Interface Blueprint
            </span>
            <h2 className="font-display text-4xl text-ink mt-1">
              Engineered for Cognitive Clarity
            </h2>
            <p className="text-xs text-muted mt-2">
              Clean typography, generous whitespace, and restrained palettes replace cluttered dashboards.
            </p>
          </div>

          {/* Framed live mockup preview */}
          <div className="rounded-card border border-line bg-surface shadow-2xl p-6 sm:p-8 overflow-hidden max-w-4xl mx-auto">
            <div className="flex items-center justify-between pb-4 rule-line mb-6">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-line" />
                <span className="h-3 w-3 rounded-full bg-line" />
                <span className="h-3 w-3 rounded-full bg-line" />
                <span className="text-xs font-mono-numbers text-muted ml-2">neurolearn.ai/student</span>
              </div>
              <span className="text-[11px] font-mono-numbers text-lagoon font-medium">
                Live Twin Connected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl border border-line bg-paper-2/30">
                <span className="text-[11px] uppercase font-mono-numbers text-muted">Overall Mastery</span>
                <div className="text-3xl font-display text-ink mt-1">68%</div>
              </div>
              <div className="p-4 rounded-xl border border-line bg-paper-2/30">
                <span className="text-[11px] uppercase font-mono-numbers text-muted">High Risk Count</span>
                <div className="text-3xl font-display text-terracotta mt-1">3</div>
              </div>
              <div className="p-4 rounded-xl border border-line bg-paper-2/30">
                <span className="text-[11px] uppercase font-mono-numbers text-muted">Velocity Index</span>
                <div className="text-3xl font-display text-lagoon mt-1">8.4x</div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-line bg-paper-2/20 text-xs font-mono-numbers flex items-center justify-between">
              <span>Primary Root Bottleneck: Arrays & Memory Contiguity</span>
              <span className="text-terracotta font-medium">3 concepts blocked</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 7: Numbers Strip (Read from metrics.json directly at build time) */}
      <section id="metrics" className="py-24 border-b border-line bg-paper">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-16">
            <span className="text-xs font-mono-numbers uppercase tracking-wider text-muted">
              Model Performance Proof
            </span>
            <h2 className="font-display text-4xl text-ink mt-1">
              Rigorous Evaluation Benchmarks
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div>
              <div className="font-display text-6xl sm:text-7xl text-lagoon">
                <CountUp value={METRICS.test_metrics.roc_auc * 100} decimals={1} suffix="%" />
              </div>
              <div className="text-xs uppercase font-mono-numbers text-muted mt-2">
                ROC AUC Score
              </div>
              <div className="text-[11px] text-muted font-mono-numbers mt-0.5">
                Target ≥ 85%
              </div>
            </div>

            <div>
              <div className="font-display text-6xl sm:text-7xl text-lagoon">
                <CountUp value={METRICS.test_metrics.recall * 100} decimals={1} suffix="%" />
              </div>
              <div className="text-xs uppercase font-mono-numbers text-muted mt-2">
                Recall (Sensitivity)
              </div>
              <div className="text-[11px] text-muted font-mono-numbers mt-0.5">
                Target ≥ 80%
              </div>
            </div>

            <div>
              <div className="font-display text-6xl sm:text-7xl text-ink">
                <CountUp value={METRICS.test_metrics.brier_score} decimals={3} />
              </div>
              <div className="text-xs uppercase font-mono-numbers text-muted mt-2">
                Brier Calibration
              </div>
              <div className="text-[11px] text-muted font-mono-numbers mt-0.5">
                Target ≤ 0.15
              </div>
            </div>

            <div>
              <div className="font-display text-6xl sm:text-7xl text-lagoon">
                <CountUp value={METRICS.root_gap_accuracy.top1_accuracy * 100} decimals={1} suffix="%" />
              </div>
              <div className="text-xs uppercase font-mono-numbers text-muted mt-2">
                Root Gap Accuracy
              </div>
              <div className="text-[11px] text-muted font-mono-numbers mt-0.5">
                Top-1 Accuracy on 74 cases
              </div>
            </div>
          </div>

          {/* Honest Footnote required by Section 6.1 */}
          <div className="mt-14 text-center">
            <p className="text-xs font-mono-numbers text-muted italic max-w-xl mx-auto">
              “Trained and evaluated on synthetic data; a method demonstration, not a classroom trial.”
            </p>
          </div>
        </div>
      </section>

      {/* Section 8: Closing CTA & Footer */}
      <section className="py-28 bg-paper">
        <div className="max-w-[1280px] mx-auto px-6 text-center">
          <SplitHeading as="h2" className="text-5xl sm:text-7xl text-ink max-w-[20ch] mx-auto leading-tight">
            Stop guessing where you will struggle.
          </SplitHeading>
          <p className="mt-4 text-base text-muted max-w-[45ch] mx-auto leading-relaxed">
            Access your calibrated Digital Learning Twin and inspect the prerequisite root gaps holding you back.
          </p>
          <div className="mt-8 flex justify-center">
            <Link to="/login" className="btn-primary text-base py-3.5 px-10 shadow-card">
              Log in to NeuroLearn AI
            </Link>
          </div>
        </div>
      </section>

      {/* Footer with Team Names and Reg. Numbers from README */}
      <footer className="border-t border-line bg-paper-2/60 py-12 text-xs">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 rule-line">
            <div className="md:col-span-5 space-y-2">
              <div className="font-display text-xl text-ink">NeuroLearn AI</div>
              <p className="text-muted leading-relaxed max-w-sm">
                An Intelligent Learning Operating System using Machine Learning and Knowledge Graphs to anticipate DSA concept struggle.
              </p>
            </div>

            <div className="md:col-span-4 space-y-2">
              <span className="font-mono-numbers uppercase text-muted font-medium block">
                Engineering Team
              </span>
              <ul className="space-y-1 font-mono-numbers text-ink">
                {teamMembers.map((m) => (
                  <li key={m.reg} className="flex justify-between max-w-xs">
                    <span>{m.name}</span>
                    <span className="text-muted font-semibold">{m.reg}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:col-span-3 space-y-2">
              <span className="font-mono-numbers uppercase text-muted font-medium block">
                Quick Navigation
              </span>
              <ul className="space-y-1 text-muted">
                <li><Link to="/login" className="hover:text-ink">Sign In</Link></li>
                <li><Link to="/student" className="hover:text-ink">Student Workspace</Link></li>
                <li><Link to="/faculty" className="hover:text-ink">Faculty Cohorts</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-muted font-mono-numbers text-[11px] gap-2">
            <div>© 2026 NeuroLearn AI. MIT License. All rights reserved.</div>
            <div>Built for academic method demonstration.</div>
          </div>
        </div>
      </footer>
    </div>
  );
};
