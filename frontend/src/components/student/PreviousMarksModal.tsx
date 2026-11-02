import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, CheckCircle2, PlayCircle, ExternalLink, Sparkles, AlertCircle, BookOpen, Video, Plus } from 'lucide-react';
import { GRAPH } from '@/api/mocks/mockDb';
import { api } from '@/api/client';
import { AttemptPayload, AttemptResponse } from '@/api/types';
import { getRecommendedVideos } from '@/lib/videoRecommender';

interface PreviousMarksModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultConceptId?: number;
}

export const PreviousMarksModal: React.FC<PreviousMarksModalProps> = ({
  isOpen,
  onClose,
  defaultConceptId = 7,
}) => {
  const queryClient = useQueryClient();

  const [conceptId, setConceptId] = useState<number>(defaultConceptId);
  const [score, setScore] = useState<number>(45);
  const [assessmentName, setAssessmentName] = useState<string>('Midterm Exam');
  const [timeSpentMinutes, setTimeSpentMinutes] = useState<number>(45);
  const [lastResult, setLastResult] = useState<AttemptResponse | null>(null);

  const marksMutation = useMutation({
    mutationFn: async (payload: AttemptPayload) => {
      await queryClient.cancelQueries({ queryKey: ['student-twin'] });
      await queryClient.cancelQueries({ queryKey: ['student-twin-history'] });
      await queryClient.cancelQueries({ queryKey: ['student-attempts'] });
      await queryClient.cancelQueries({ queryKey: ['student-risks'] });
      await queryClient.cancelQueries({ queryKey: ['student-root-gaps'] });
      await queryClient.cancelQueries({ queryKey: ['student-path'] });

      return api.submitAttempt(payload);
    },
    onSuccess: (data: AttemptResponse) => {
      // Ensure recommendedVideos array is present
      const conceptObj = GRAPH.nodes.find((n) => n.id === data.conceptId);
      const conceptName = conceptObj?.name || `Concept ${data.conceptId}`;
      if (!data.recommendedVideos) {
        data.recommendedVideos = getRecommendedVideos(data.conceptId, conceptName, data.score);
      }
      setLastResult(data);

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
    marksMutation.mutate({
      clientAttemptId: crypto.randomUUID(),
      conceptId,
      score: normalizedScore,
      timeSpentSeconds: timeSpentMinutes * 60,
      hintsUsed: 0,
      attemptType: 'quiz',
    });
  };

  const handleApplyPreset = (cId: number, presetScore: number, name: string) => {
    setConceptId(cId);
    setScore(presetScore);
    setAssessmentName(name);
    setLastResult(null);
  };

  const selectedConcept = GRAPH.nodes.find((n) => n.id === conceptId);
  const isLowScore = score < 70;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-2xl bg-surface rounded-2xl shadow-2xl border border-line flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-line bg-paper-2/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-mono-numbers tracking-wider text-muted">
                Diagnostic Marks Analysis
              </span>
              <span className="h-1 w-1 rounded-full bg-lagoon" />
              <span className="text-xs font-mono-numbers text-lagoon font-medium">Model Calibration</span>
            </div>
            <h3 className="font-display text-2xl text-ink mt-0.5">
              Add Previous Test Results
            </h3>
            <p className="text-xs text-muted mt-1">
              Input your historical marks in each subject. The cognitive engine recalibrates your twin in PostgreSQL and prescribes adaptive YouTube videos based on performance.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-muted hover:text-ink hover:bg-paper transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {lastResult ? (
            /* Analysis & Prescribed Videos Result */
            <div className="space-y-6">
              <div className="p-4 rounded-xl border bg-lagoon/10 border-lagoon/20 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-lagoon shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm text-ink">
                    Marks Analyzed & Twin Model Recalibrated
                  </h4>
                  <p className="text-xs text-muted mt-0.5 leading-relaxed">
                    Test score of {Math.round(lastResult.score * 100)}% has been recorded in the database. Concept mastery and prerequisite graph dependencies have been updated.
                  </p>
                </div>
              </div>

              {/* Adaptive Recommendation Header */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono-numbers uppercase tracking-wider text-muted">
                    Prescribed YouTube Video Plan ({lastResult.recommendedVideos?.length || 1} video{(lastResult.recommendedVideos?.length || 1) > 1 ? 's' : ''})
                  </span>
                  <span
                    className={`text-xs font-mono-numbers px-2.5 py-0.5 rounded-full font-medium ${
                      lastResult.score < 0.7
                        ? 'bg-amber/15 text-amber border border-amber/30'
                        : 'bg-lagoon/15 text-lagoon border border-lagoon/30'
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
                          ? 'bg-amber-subtle/40 border-amber/30 hover:border-amber/50'
                          : 'bg-lagoon-subtle/40 border-lagoon/30 hover:border-lagoon/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[10px] font-mono-numbers uppercase tracking-wider px-2 py-0.5 rounded-full font-medium ${
                            lastResult.score < 0.7 ? 'bg-amber/20 text-amber' : 'bg-lagoon/20 text-lagoon'
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
                        className="btn-primary w-full text-xs py-2 flex items-center justify-center gap-2 mt-2"
                      >
                        <PlayCircle className="h-4 w-4" />
                        <span>Watch Video on YouTube</span>
                        <ExternalLink className="h-3 w-3 opacity-80" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setLastResult(null)}
                  className="btn-secondary flex-1 text-xs py-2.5"
                >
                  Add Another Subject Test Mark
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-primary flex-1 text-xs py-2.5"
                >
                  Done & View Trajectory
                </button>
              </div>
            </div>
          ) : (
            /* Input Form */
            <form onSubmit={handleSubmit} className="space-y-5" id="previous-marks-form">
              {/* Presets Chips */}
              <div className="p-3.5 rounded-xl border border-line bg-paper-2/40 space-y-2">
                <div className="flex items-center gap-1.5 text-xs uppercase font-mono-numbers text-muted">
                  <Sparkles className="h-3.5 w-3.5 text-amber" />
                  <span>Quick-fill Test Result Presets</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(7, 35, 'Arrays Midterm Exam')}
                    className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-ink hover:border-ink transition-colors"
                  >
                    Arrays Midterm (35% · Low Score)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(6, 45, 'Pointers Lab Exam')}
                    className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-ink hover:border-ink transition-colors"
                  >
                    Pointers Lab (45% · Low Score)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(4, 88, 'Loops Quiz 1')}
                    className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-ink hover:border-ink transition-colors"
                  >
                    Loops Quiz 1 (88% · High Score)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(21, 30, 'Trees Assessment')}
                    className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-ink hover:border-ink transition-colors"
                  >
                    Trees Exam (30% · Low Score)
                  </button>
                </div>
              </div>

              {/* Subject Selection */}
              <div>
                <label
                  htmlFor="marks-concept"
                  className="block text-xs font-medium uppercase tracking-wider text-muted font-mono-numbers mb-1.5"
                >
                  Curriculum Subject / Concept
                </label>
                <select
                  id="marks-concept"
                  value={conceptId}
                  onChange={(e) => setConceptId(Number(e.target.value))}
                  className="input-standard font-sans text-sm bg-surface cursor-pointer"
                >
                  {GRAPH.nodes.map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.code} · {node.name} (Level {node.level})
                    </option>
                  ))}
                </select>
                {selectedConcept && (
                  <p className="text-xs text-muted mt-1 leading-snug">
                    {selectedConcept.description}
                  </p>
                )}
              </div>

              {/* Assessment Title & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="marks-assessment-name"
                    className="block text-xs font-medium uppercase tracking-wider text-muted font-mono-numbers mb-1.5"
                  >
                    Test / Assessment Name
                  </label>
                  <input
                    id="marks-assessment-name"
                    type="text"
                    required
                    value={assessmentName}
                    onChange={(e) => setAssessmentName(e.target.value)}
                    placeholder="e.g. Midterm 1, Quiz 2"
                    className="input-standard font-sans text-sm"
                  />
                </div>

                <div>
                  <label
                    htmlFor="marks-duration"
                    className="block text-xs font-medium uppercase tracking-wider text-muted font-mono-numbers mb-1.5"
                  >
                    Test Duration (Mins)
                  </label>
                  <input
                    id="marks-duration"
                    type="number"
                    min="5"
                    max="300"
                    value={timeSpentMinutes}
                    onChange={(e) => setTimeSpentMinutes(Number(e.target.value))}
                    className="input-standard font-mono-numbers text-sm"
                  />
                </div>
              </div>

              {/* Score / Marks Slider & Input */}
              <div className="space-y-2 p-4 rounded-xl border border-line bg-paper-2/30">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="marks-score-num"
                    className="text-xs font-medium uppercase tracking-wider text-muted font-mono-numbers"
                  >
                    Previous Marks / Score (%)
                  </label>
                  <span
                    className={`text-xs font-mono-numbers px-2.5 py-0.5 rounded-full font-semibold ${
                      isLowScore
                        ? 'bg-terracotta/10 text-terracotta border border-terracotta/20'
                        : 'bg-lagoon/10 text-lagoon border border-lagoon/20'
                    }`}
                  >
                    {score}% · {isLowScore ? 'Struggle (< 70%)' : 'Strong Mastery (≥ 70%)'}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <input
                    id="marks-score-slider"
                    type="range"
                    min="0"
                    max="100"
                    value={score}
                    onChange={(e) => setScore(Number(e.target.value))}
                    className="w-full accent-lagoon cursor-pointer h-2"
                  />
                  <input
                    id="marks-score-num"
                    type="number"
                    min="0"
                    max="100"
                    value={score}
                    onChange={(e) => setScore(Math.max(0, Math.min(100, Number(e.target.value))))}
                    className="w-20 input-standard font-mono-numbers text-center font-bold"
                  />
                </div>

                {/* Adaptive Explanation preview */}
                <div className="text-[11px] text-muted font-mono-numbers pt-1">
                  {isLowScore ? (
                    <span className="text-amber flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      Model Rule: Score &lt; 70% will prescribe 2 to 3 detailed in-depth masterclass lectures to rebuild foundation.
                    </span>
                  ) : (
                    <span className="text-lagoon flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      Model Rule: Score &ge; 70% will prescribe 1 fast 5-minute summary video to refresh key invariants.
                    </span>
                  )}
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer Actions */}
        {!lastResult && (
          <div className="p-4 border-t border-line bg-paper-2/40 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
            <button
              id="submit-marks-btn"
              type="submit"
              form="previous-marks-form"
              disabled={marksMutation.isPending}
              className="btn-primary text-sm flex items-center gap-2"
            >
              {marksMutation.isPending ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-surface border-t-transparent animate-spin" />
                  <span>Analyzing Marks & Training Model...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Analyze Marks & Recalibrate Model</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

