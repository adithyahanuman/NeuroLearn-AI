import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, ArrowRight, Info } from 'lucide-react';
import { api } from '@/api/client';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { RiskBadge } from '@/components/common/RiskBadge';
import { StudentSummary } from '@/api/types';

export const FacultyStudents: React.FC = () => {
  const navigate = useNavigate();

  const cohortsQuery = useQuery({
    queryKey: ['faculty-cohorts'],
    queryFn: () => api.getFacultyCohorts(),
  });

  const cohorts = cohortsQuery.data || [];
  const [selectedCohortId, setSelectedCohortId] = useState<string>('cohort-a');
  const [searchTerm, setSearchTerm] = useState('');
  const [bandFilter, setBandFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [sortField, setSortField] = useState<'name' | 'riskScore' | 'averageMastery'>('riskScore');
  const [sortAsc, setSortAsc] = useState(false);

  const studentsQuery = useQuery({
    queryKey: ['cohort-students', selectedCohortId],
    queryFn: () => api.getCohortStudents(selectedCohortId),
    enabled: !!selectedCohortId,
  });

  const rawStudents = studentsQuery.data || [];

  // Filter and sort
  const filteredStudents = rawStudents
    .filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.topRootGap.toLowerCase().includes(searchTerm.toLowerCase());
      const matchBand = bandFilter === 'all' || s.band === bandFilter;
      return matchSearch && matchBand;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'riskScore') cmp = a.riskScore - b.riskScore;
      else if (sortField === 'averageMastery') cmp = a.averageMastery - b.averageMastery;
      return sortAsc ? cmp : -cmp;
    });

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <DashboardShell
      title="Cohort Students Roster"
      selectedCohort={selectedCohortId}
      onCohortChange={(cid) => setSelectedCohortId(cid)}
      availableCohorts={cohorts.map((c) => ({ id: c.id, name: c.name }))}
    >
      <QueryBoundary
        isLoading={cohortsQuery.isLoading || studentsQuery.isLoading}
        isError={cohortsQuery.isError || studentsQuery.isError}
        skeletonType="table"
        onRetry={() => {
          cohortsQuery.refetch();
          studentsQuery.refetch();
        }}
      >
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs uppercase font-mono-numbers tracking-wider text-muted">
                Student Risk Index & Profiling
              </span>
              <h2 className="font-display text-3xl text-ink mt-1">
                Enrolled Students
              </h2>
              {/* Mandatory Section 6.5 Rule explicit statement */}
              <div className="mt-2 flex items-center gap-2 text-xs text-muted max-w-[68ch]">
                <Info className="h-4 w-4 shrink-0 text-lagoon" />
                <span>
                  <strong>Student risk score rule:</strong> Calculated as the mean of each student’s 5 highest predicted concept risks.
                </span>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[260px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by student name or gap..."
                className="input-standard pl-9 text-xs"
              />
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-2 pb-4 rule-line">
            <span className="text-xs font-mono-numbers text-muted uppercase">Risk Filter:</span>
            <div className="flex items-center gap-1 rounded-full border border-line bg-paper-2 p-1 text-xs">
              {(['all', 'high', 'medium', 'low'] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBandFilter(b)}
                  className={`rounded-full px-3 py-1 font-medium capitalize transition-colors ${
                    bandFilter === b
                      ? 'bg-ink text-paper shadow-sm'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Roster Table */}
          <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-card">
            <table className="w-full text-left text-sm" aria-label="Cohort Students Table">
              <thead>
                <tr className="rule-line text-xs uppercase font-mono-numbers text-muted bg-paper-2/40">
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-ink"
                    onClick={() => toggleSort('name')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Student</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-ink"
                    onClick={() => toggleSort('riskScore')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Mean Top-5 Risk</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Risk Trend</th>
                  <th className="py-3 px-4">Primary Root Gap</th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-ink text-right"
                    onClick={() => toggleSort('averageMastery')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Curriculum Mastery</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-muted italic">
                      No students match the current filter or search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr
                      key={student.id}
                      onClick={() => navigate(`/faculty/students/${student.id}`)}
                      className="hover:bg-paper-2/40 cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-ink group-hover:text-lagoon transition-colors">
                          {student.name}
                        </div>
                        <div className="text-xs font-mono-numbers text-muted">
                          {student.email}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <RiskBadge band={student.band} />
                          <span className="font-mono-numbers font-semibold text-xs text-ink">
                            {Math.round(student.riskScore * 100)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono-numbers text-xs">
                        <span
                          className={`inline-flex items-center gap-1 font-medium ${
                            student.riskTrend === 'rising'
                              ? 'text-terracotta'
                              : student.riskTrend === 'falling'
                              ? 'text-lagoon'
                              : 'text-muted'
                          }`}
                        >
                          {student.riskTrend === 'rising' ? (
                            <ArrowUp className="h-3.5 w-3.5" />
                          ) : student.riskTrend === 'falling' ? (
                            <ArrowDown className="h-3.5 w-3.5" />
                          ) : (
                            <span className="h-1.5 w-1.5 rounded-full bg-muted" />
                          )}
                          <span className="capitalize">{student.riskTrend}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-ink">
                        {student.topRootGap}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-numbers font-semibold text-xs">
                        {Math.round(student.averageMastery * 100)}%
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="text-xs font-medium text-lagoon group-hover:underline inline-flex items-center gap-1">
                          Inspect <ArrowRight className="h-3 w-3" />
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </QueryBoundary>
    </DashboardShell>
  );
};
