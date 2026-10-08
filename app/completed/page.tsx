'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { SchoolData } from '@/lib/types';
import RecordVisitModal from '@/components/RecordVisitModal';
import RescheduleModal from '@/components/RescheduleModal';
import { subscribeToDataChanges } from '@/lib/realtimeSync';

export default function CompletedSchoolsPage() {
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedOutcome, setSelectedOutcome] = useState('ALL');
  const [selectedSchoolForRevisit, setSelectedSchoolForRevisit] = useState<SchoolData | null>(null);
  const [selectedSchoolForRoute, setSelectedSchoolForRoute] = useState<SchoolData | null>(null);

  const fetchCompletedSchools = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('personallyVisited', 'true'); // Only personally visited by Kalyan
      if (search) params.append('search', search);

      const res = await fetch(`/api/schools?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      setSchools(data.schools || []);
    } catch (err) {
      console.error('Failed to load completed schools:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompletedSchools();
  }, [search]);

  useEffect(() => {
    const unsubscribe = subscribeToDataChanges((changeType) => {
      if (changeType === 'visit' || changeType === 'route' || changeType === 'all') {
        fetchCompletedSchools();
      }
    });
    return () => unsubscribe();
  }, [search]);

  // Total visits by Kalyan (counting revisits)
  const totalVisitEvents = schools.reduce((acc, s) => {
    const personalVisits = (s.visits || []).filter((v: any) => v.is_current_representative);
    return acc + (personalVisits.length > 0 ? personalVisits.length : 1);
  }, 0);

  const revisitsCount = totalVisitEvents - schools.length;

  const filteredSchools = selectedOutcome === 'ALL'
    ? schools
    : schools.filter(s => {
        const latestOutcome = s.visits?.[0]?.outcome;
        return latestOutcome === selectedOutcome;
      });

  const handleExportCSV = () => {
    if (schools.length === 0) return;
    const headers = ['S.No', 'School ID', 'School Name', 'Area', 'Board', 'Latest Visit Date', 'Representative', 'Total Visits', 'Latest Outcome', 'Programme'];
    const rows = schools.map(s => {
      const latestVisit = s.visits?.[0];
      const visitCount = (s.visits || []).filter((v: any) => v.is_current_representative).length || 1;
      return [
        s.s_no,
        s.school_id,
        `"${(s.school_name || '').replace(/"/g, '""')}"`,
        `"${(s.area || '').replace(/"/g, '""')}"`,
        s.board,
        latestVisit ? new Date(latestVisit.visit_date).toISOString().split('T')[0] : '',
        'Nichhenametla Kalyan Ashrith',
        visitCount,
        `"${(latestVisit?.outcome || s.visit_status).replace(/"/g, '""')}"`,
        s.recommended_programme
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Mittsure_Completed_Schools_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/40 text-emerald-100 border border-emerald-300/30">
                FIELD OUTREACH VERIFIED
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white">
                Representative: Kalyan Ashrith (KA-REP-01)
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Personally Completed Schools</h1>
            <p className="text-emerald-100 text-sm mt-1 max-w-2xl">
              Institutions with verified physical visits conducted personally by <strong>Nichhenametla Kalyan Ashrith</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 rounded-xl bg-white text-emerald-900 font-semibold text-sm hover:bg-emerald-50 transition shadow-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Completed ({schools.length})
            </button>
            <Link
              href="/reconciliation"
              className="px-4 py-2 rounded-xl bg-emerald-950/40 border border-emerald-300/40 text-white font-semibold text-sm hover:bg-emerald-950/60 transition flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Reconcile Data
            </Link>
          </div>
        </div>

        {/* Dynamic Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/20">
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-emerald-200 text-xs font-medium uppercase tracking-wider">Personally Completed</p>
            <p className="text-2xl font-black">{schools.length}</p>
            <p className="text-xs text-emerald-200/80 mt-0.5">Unique institutions covered</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-emerald-200 text-xs font-medium uppercase tracking-wider">Completion Percentage</p>
            <p className="text-2xl font-black">{((schools.length / 487) * 100).toFixed(2)}%</p>
            <p className="text-xs text-emerald-200/80 mt-0.5">of 487 total master allotment</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-emerald-200 text-xs font-medium uppercase tracking-wider">Total Visit Events</p>
            <p className="text-2xl font-black">{totalVisitEvents}</p>
            <p className="text-xs text-emerald-200/80 mt-0.5">Includes {revisitsCount} revisit event(s)</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-emerald-200 text-xs font-medium uppercase tracking-wider">Target Goal Progress</p>
            <p className="text-2xl font-black">{((schools.length / 300) * 100).toFixed(2)}%</p>
            <p className="text-xs text-emerald-200/80 mt-0.5">{300 - schools.length} left to 300 target</p>
          </div>
        </div>
      </div>

      {/* S.No Visual Matrix Pills */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Completed S.No Master Matrix ({schools.length} Covered)
          </span>
          <span className="text-xs text-slate-500">
            Click any tag to inspect institution
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {schools.map(s => (
            <Link
              key={s.id}
              href={`/schools/${s.id}`}
              className="inline-flex items-center px-2 py-1 rounded-md text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 transition"
              title={`${s.school_name} (${s.area})`}
            >
              #{s.s_no}
            </Link>
          ))}
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search completed schools..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-medium text-slate-600">Filter Outcome:</span>
          <select
            value={selectedOutcome}
            onChange={(e) => setSelectedOutcome(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Visits</option>
            <option value="Visited">Initial Visit</option>
            <option value="Revisit">Revisit</option>
            <option value="Registered">Registered (When Confirmed by You)</option>
            <option value="Follow-up Required">Follow-up Required</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="font-semibold text-slate-800 text-sm">Personally Completed Directory ({filteredSchools.length})</span>
          <span className="text-xs text-slate-500">Representative: Nichhenametla Kalyan Ashrith</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            Loading completed schools...
          </div>
        ) : filteredSchools.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="font-medium text-slate-700">No completed schools found matching criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4 w-16">S.No</th>
                  <th className="py-3 px-4">School Name & Area</th>
                  <th className="py-3 px-4">Board / Type</th>
                  <th className="py-3 px-4">Latest Visit Date</th>
                  <th className="py-3 px-4">Visits Count</th>
                  <th className="py-3 px-4">Latest Outcome</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSchools.map((school) => {
                  const personalVisits = (school.visits || []).filter((v: any) => v.is_current_representative);
                  const visitCount = personalVisits.length > 0 ? personalVisits.length : 1;
                  const latestVisit = personalVisits[0];

                  return (
                    <tr key={school.id} className="hover:bg-emerald-50/30 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                        #{school.s_no}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">
                          <Link href={`/schools/${school.id}`} className="hover:text-emerald-600 hover:underline">
                            {school.school_name}
                          </Link>
                        </div>
                        <div className="text-xs text-slate-500">{school.area} • {school.school_id}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                          {school.board}
                        </span>
                        <div className="text-xs text-slate-500 mt-0.5">{school.school_type}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-slate-800 font-medium">
                          {school.last_visit_date ? new Date(school.last_visit_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}
                        </div>
                        <div className="text-xs text-slate-400">By Kalyan Ashrith</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                          visitCount > 1 ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {visitCount} {visitCount > 1 ? 'Visits (Revisit)' : 'Visit'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-400 shadow-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>VISITED</span>
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            {latestVisit?.outcome || school.visit_status}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedSchoolForRoute(school)}
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-xs font-bold hover:from-teal-700 hover:to-emerald-700 active:scale-95 transition shadow-sm flex items-center gap-1.5"
                            title="Reschedule this school and add to a future route plan"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>Add to Route</span>
                          </button>
                          <button
                            onClick={() => setSelectedSchoolForRevisit(school)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 active:scale-95 transition"
                            title="Record manual field revisit notes"
                          >
                            Log Revisit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Revisit Modal */}
      {selectedSchoolForRevisit && (
        <RecordVisitModal
          school={selectedSchoolForRevisit}
          isOpen={Boolean(selectedSchoolForRevisit)}
          onClose={() => setSelectedSchoolForRevisit(null)}
          onVisitSaved={() => {
            setSelectedSchoolForRevisit(null);
            fetchCompletedSchools();
          }}
        />
      )}

      {/* Reschedule & Add to Route Modal */}
      {selectedSchoolForRoute && (
        <RescheduleModal
          school={selectedSchoolForRoute}
          isOpen={Boolean(selectedSchoolForRoute)}
          onClose={() => setSelectedSchoolForRoute(null)}
          onSuccess={() => {
            setSelectedSchoolForRoute(null);
            fetchCompletedSchools();
          }}
        />
      )}
    </div>
  );
}
