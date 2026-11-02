import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, CheckCircle, Loader2, Video, ExternalLink, History, Clock, PlayCircle, Award, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { GRAPH } from '@/api/mocks/mockDb';
import { api } from '@/api/client';
import { AttemptPayload, AttemptResponse, AttemptHistoryItem } from '@/api/types';
import { getRecommendedVideos } from '@/lib/videoRecommender';

interface AttemptDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  defaultConceptId?: number;
  initialTab?: 'log' | 'marks' | 'history';
}

export const AttemptDrawer: React.FC<AttemptDrawerProps> = ({
  isOpen,
  onClose,
  defaultConceptId = 7,
  initialTab = 'log',
}) => {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'log' | 'marks' | 'history'>(initialTab);
  const [conceptId, setConceptId] = useState<number>(defaultConceptId);
  const [score, setScore] = useState<number>(85);
  const [timeSpentMinutes, setTimeSpentMinutes] = useState<number>(15);
  const [hintsUsed, setHintsUsed] = useState<number>(1);
  const [attemptType, setAttemptType] = useState<'quiz' | 'practice' | 'homework'>('practice');
  const [clientAttemptId, setClientAttemptId] = useState<string>('');
  const [lastResult, setLastResult] = useState<AttemptResponse | null>(null);

  // Load attempt history when drawer is open
  const attemptsQuery = useQuery({
    queryKey: ['student-attempts'],
    queryFn: () => api.getStudentAttempts(),
    enabled: isOpen,
  });

  const attempts = attemptsQuery.data || [];

  // Generate clientAttemptId when drawer opens and reuse on retry
  useEffect(() => {
    if (isOpen) {
      setClientAttemptId(crypto.randomUUID());
      setLastResult(null);
      if (initialTab) {
        setActiveTab(initialTab);
        if (initialTab === 'marks') {
          setAttemptType('quiz');
        }
      }
    }
  }, [isOpen, initialTab]);

  const attemptMutation = useMutation({
    mutationFn: async (payload: AttemptPayload) => {
      // Cancel in-flight queries as specified
      await queryClient.cancelQueries({ queryKey: ['student-twin'] });
      await queryClient.cancelQueries({ queryKey: ['student-twin-history'] });
      await queryClient.cancelQueries({ queryKey: ['student-attempts'] });
      await queryClient.cancelQueries({ queryKey: ['student-risks'] });
      await queryClient.cancelQueries({ queryKey: ['student-root-gaps'] });
      await queryClient.cancelQueries({ queryKey: ['student-path'] });

      return api.submitAttempt(payload);
    },
    onSuccess: (data: AttemptResponse) => {
      setLastResult(data);
      // Invalidate and refetch queries so TanStack Query updates live
      queryClient.invalidateQueries({ queryKey: ['student-twin'] });
      queryClient.invalidateQueries({ queryKey: ['student-twin-history'] });
      queryClient.invalidateQueries({ queryKey: ['student-attempts'] });
      queryClient.invalidateQueries({ queryKey: ['student-risks'] });
      queryClient.invalidateQueries({ queryKey: ['student-root-gaps'] });
      queryClient.invalidateQueries({ queryKey: ['student-path'] });
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedScore = score > 1 ? Number((score / 100).toFixed(4)) : score;
    attemptMutation.mutate({
      clientAttemptId,
      conceptId,
      score: normalizedScore,
      timeSpentSeconds: timeSpentMinutes * 60,
      hintsUsed,
      attemptType,
    });
  };

  const handleReset = () => {
    setClientAttemptId(crypto.randomUUID());
    setLastResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-ink/30 backdrop-blur-sm transition-opacity">
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md bg-surface p-6 shadow-2xl flex flex-col justify-between border-l border-line overflow-y-auto">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-4 rule-line">
              <div>
                <span className="text-xs uppercase tracking-wider text-muted font-mono-numbers">
                  Digital Twin Feedback
                </span>
                <h3 className="font-display text-2xl text-ink">
                  {lastResult ? 'Attempt Feedback' : 'Log Exercise Attempt'}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-muted hover:bg-paper-2 hover:text-ink transition-colors"
                aria-label="Close drawer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation Tabs (Log vs Subject Marks vs History) */}
            {!lastResult && (
              <div className="flex items-center gap-1.5 mt-4 p-1 bg-paper-2 rounded-xl border border-line text-xs font-medium">
                <button
                  type="button"
                  id="tab-log-exercise"
                  onClick={() => setActiveTab('log')}
                  className={`flex-1 py-1.5 px-2 rounded-lg transition-all ${
                    activeTab === 'log'
                      ? 'bg-surface text-ink shadow-sm font-semibold'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  Log Exercise
                </button>
                <button
                  type="button"
                  id="tab-subject-marks"
                  onClick={() => {
                    setActiveTab('marks');
                    setAttemptType('quiz');
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all ${
                    activeTab === 'marks'
                      ? 'bg-surface text-ink shadow-sm font-semibold text-lagoon'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  <Award className="h-3.5 w-3.5" />
                  <span>Subject Marks</span>
                </button>
                <button
                  type="button"
                  id="tab-attempts-history"
                  onClick={() => setActiveTab('history')}
                  className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all ${
                    activeTab === 'history'
                      ? 'bg-surface text-ink shadow-sm font-semibold'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  <History className="h-3.5 w-3.5" />
                  <span>History ({attempts.length})</span>
                </button>
              </div>
            )}

            {lastResult ? (
              /* Success & Adaptive Video Recommendation Screen */
              <div className="mt-6 space-y-5">
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-lagoon/10 border border-lagoon/20 text-lagoon">
                  <CheckCircle className="h-6 w-6 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-sm text-ink">Attempt Recorded & Analyzed</h4>
                    <p className="text-xs text-muted">Digital Twin mastery & risks updated in real-time.</p>
                  </div>
                </div>

                {/* Adaptive Video Recommendation Cards */}
                {(lastResult.recommendedVideos || (lastResult.recommendedVideo ? [lastResult.recommendedVideo] : [])).length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono-numbers uppercase tracking-wider text-muted">
                        Adaptive Video Recommendations ({lastResult.recommendedVideos?.length || 1})
                      </span>
                      <span
                        className={`text-[10px] font-mono-numbers uppercase tracking-wider px-2 py-0.5 rounded-full font-medium ${
                          lastResult.score < 0.7
                            ? 'bg-amber/20 text-amber'
                            : 'bg-lagoon/20 text-lagoon'
                        }`}
                      >
                        {lastResult.score < 0.7 ? 'Low Score (< 70%) → In-Depth Multi-Video Set' : 'High Score (≥ 70%) → Fast 5-Min Summary'}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {(lastResult.recommendedVideos || [lastResult.recommendedVideo!]).map((vid, idx) => (
                        <div
                          key={idx}
                          className={`p-4 rounded-xl border space-y-2.5 transition-all ${
                            lastResult.score < 0.7
                              ? 'bg-amber-subtle/50 border-amber/30 text-ink'
                              : 'bg-lagoon-subtle/50 border-lagoon/30 text-ink'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-[10px] font-mono-numbers uppercase tracking-wider px-2 py-0.5 rounded-full font-medium ${
                                lastResult.score < 0.7
                                  ? 'bg-amber/20 text-amber'
                                  : 'bg-lagoon/20 text-lagoon'
                              }`}
                            >
                              {vid.badge}
                            </span>
                            <span className="text-xs font-mono-numbers text-muted">
                              {vid.durationMinutes} mins
                            </span>
                          </div>

                          <div>
                            <h5 className="font-display text-base text-ink leading-snug">
                              {vid.title}
                            </h5>
                            <p className="text-xs text-muted mt-1 leading-relaxed">
                              {vid.reason}
                            </p>
                          </div>

                          <a
                            href={vid.url}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-primary w-full text-xs py-2 flex items-center justify-center gap-2"
                          >
                            <PlayCircle className="h-4 w-4" />
                            <span>Watch on YouTube</span>
                            <ExternalLink className="h-3 w-3 opacity-80" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="btn-secondary flex-1 text-xs py-2"
                  >
                    Log Another Attempt
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-primary flex-1 text-xs py-2"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : activeTab === 'history' ? (
              /* Attempt History List inside Drawer */
              <div className="mt-5 space-y-3">
                {attempts.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted">No past attempts logged yet.</div>
                ) : (
                  attempts.map((att) => {
                    const scorePct = Math.round(att.score > 1 ? att.score : att.score * 100);
                    const isLow = scorePct < 70;
                    return (
                      <div key={att.id} className="p-3 rounded-xl border border-line bg-paper-2/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-ink truncate max-w-[200px]">
                            {att.conceptCode} – {att.conceptName}
                          </span>
                          <span
                            className={`text-[11px] font-mono-numbers px-2 py-0.5 rounded-full ${
                              isLow
                                ? 'bg-terracotta/10 text-terracotta'
                                : 'bg-lagoon/10 text-lagoon'
                            }`}
                          >
                            {scorePct}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted font-mono-numbers">
                          <span>{new Date(att.attemptedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="capitalize">{att.attemptType}</span>
                        </div>
                        {att.recommendedVideo && (
                          <a
                            href={att.recommendedVideo.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between text-[11px] text-lagoon hover:underline pt-1 border-t border-line/50"
                          >
                            <span className="truncate">{att.recommendedVideo.title}</span>
                            <ExternalLink className="h-3 w-3 shrink-0 ml-1" />
                          </a>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* Exercise or Subject Marks Form */
              <form id="attempt-form" onSubmit={handleSubmit} className="mt-5 space-y-5">
                {activeTab === 'marks' && (
                  <div className="p-3.5 rounded-xl bg-amber-subtle/70 border border-amber/30 space-y-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-mono-numbers font-semibold text-amber">
                      <Sparkles className="h-4 w-4" />
                      <span>Subject Marks & Diagnostic Calibrator</span>
                    </div>
                    <p className="text-[11px] text-ink leading-snug">
                      Enter your marks from previous exams, tests, or assignments for each subject. NeuroLearn AI recalculates your learning twin and prescribes <strong>1 concise recap video</strong> for high scores (&ge;70%) and <strong>2–3 in-depth masterclass lectures</strong> for low scores (&lt;70%).
                    </p>

                    {/* Quick Subject Presets */}
                    <div>
                      <span className="text-[10px] uppercase font-mono-numbers text-muted block mb-1">
                        Quick Subject Fills:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: 'Arrays: 35%', id: 7, sc: 35, type: 'quiz' as const },
                          { label: 'Loops: 88%', id: 4, sc: 88, type: 'quiz' as const },
                          { label: 'Linked Lists: 50%', id: 12, sc: 50, type: 'quiz' as const },
                          { label: 'Binary Trees: 45%', id: 21, sc: 45, type: 'quiz' as const },
                          { label: 'Recursion: 62%', id: 9, sc: 62, type: 'quiz' as const },
                          { label: 'DP: 30%', id: 31, sc: 30, type: 'quiz' as const },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              setConceptId(preset.id);
                              setScore(preset.sc);
                              setAttemptType(preset.type);
                            }}
                            className="px-2 py-0.5 rounded text-[10px] font-mono-numbers bg-surface border border-line hover:border-lagoon hover:text-lagoon transition-colors"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="attempt-concept" className="block text-xs font-medium uppercase tracking-wider text-muted font-mono-numbers mb-1.5">
                    {activeTab === 'marks' ? 'Select Subject / Concept' : 'Curriculum Concept'}
                  </label>
                  <select
                    id="attempt-concept"
                    value={conceptId}
                    onChange={(e) => setConceptId(Number(e.target.value))}
                    className="input-standard font-sans text-sm"
                  >
                    {GRAPH.nodes.map((node) => (
                      <option key={node.id} value={node.id}>
                        {node.code} – {node.name} (Level {node.level})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="attempt-score" className="block text-xs font-medium uppercase tracking-wider text-muted font-mono-numbers mb-1.5">
                      {activeTab === 'marks' ? `Marks Obtained (${score}%)` : `Score (${score}%)`}
                    </label>
                    <input
                      id="attempt-score"
                      type="range"
                      min="0"
                      max="100"
                      value={score}
                      onChange={(e) => setScore(Number(e.target.value))}
                      className="w-full accent-lagoon cursor-pointer"
                    />
                  </div>

                  <div>
                    <label htmlFor="attempt-score-num" className="block text-xs font-medium uppercase tracking-wider text-muted font-mono-numbers mb-1.5">
                      Marks Input (%)
                    </label>
                    <input
                      id="attempt-score-num"
                      type="number"
                      min="0"
                      max="100"
                      value={score}
                      onChange={(e) => setScore(Math.min(100, Math.max(0, Number(e.target.value))))}
                      className="input-standard font-mono-numbers"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="attempt-type" className="block text-xs font-medium uppercase tracking-wider text-muted font-mono-numbers mb-1.5">
                      Assessment Type
                    </label>
                    <select
                      id="attempt-type"
                      value={attemptType}
                      onChange={(e) => setAttemptType(e.target.value as 'quiz' | 'practice' | 'homework')}
                      className="input-standard font-sans text-xs"
                    >
                      <option value="quiz">Diagnostic Quiz / Test</option>
                      <option value="homework">Past Exam / Assignment</option>
                      <option value="practice">Practice Exercise</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="attempt-time" className="block text-xs font-medium uppercase tracking-wider text-muted font-mono-numbers mb-1.5">
                      Test Duration (Mins)
                    </label>
                    <input
                      id="attempt-time"
                      type="number"
                      min="1"
                      max="180"
                      value={timeSpentMinutes}
                      onChange={(e) => setTimeSpentMinutes(Number(e.target.value))}
                      className="input-standard font-mono-numbers text-xs"
                    />
                  </div>
                </div>

                {/* Live YouTube Adaptive Recommendation Preview */}
                {(() => {
                  const node = GRAPH.nodes.find((n) => n.id === conceptId);
                  const isLow = score < 70;
                  const vids = getRecommendedVideos(conceptId, node?.name || 'Topic', score / 100);

                  return (
                    <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                      isLow ? 'bg-amber-subtle/50 border-amber/30 text-ink' : 'bg-lagoon-subtle/50 border-lagoon/30 text-ink'
                    }`}>
                      <div className="flex items-center justify-between font-mono-numbers">
                        <span className="font-semibold flex items-center gap-1">
                          {isLow ? <AlertCircle className="h-3.5 w-3.5 text-amber" /> : <CheckCircle2 className="h-3.5 w-3.5 text-lagoon" />}
                          <span>{isLow ? `Low Score: ${vids.length} Detailed Videos Prescribed` : `High Score: 1 Summary Video Prescribed`}</span>
                        </span>
                        <span className="text-[10px] text-muted">{score}%</span>
                      </div>
                      <p className="text-[11px] text-muted">
                        {isLow
                          ? 'Comprehensive masterclass lectures, prerequisite repair, and edge-case tutorials will be queued.'
                          : 'A concise 5-minute refresher video will be queued to maintain speed and invariant retention.'}
                      </p>
                    </div>
                  );
                })()}

                <div className="rounded-xl border border-line bg-paper-2/40 p-2.5 text-[11px] text-muted font-mono-numbers">
                  <div>Idempotent Key: {clientAttemptId.slice(0, 8)}...</div>
                </div>
              </form>
            )}
          </div>

          {!lastResult && activeTab !== 'history' && (
            <div className="pt-6 rule-line flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
              <button
                id="attempt-submit-btn"
                type="submit"
                form="attempt-form"
                disabled={attemptMutation.isPending}
                className="btn-primary"
              >
                {attemptMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating Model...
                  </>
                ) : activeTab === 'marks' ? (
                  'Record Marks & Train Twin'
                ) : (
                  'Submit Attempt'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
