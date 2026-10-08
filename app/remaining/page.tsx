'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { SchoolData } from '@/lib/types';
import RecordVisitModal from '@/components/RecordVisitModal';
import { subscribeToDataChanges } from '@/lib/realtimeSync';

export default function RemainingSchoolsPage() {
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedArea, setSelectedArea] = useState('ALL');
  const [selectedBoard, setSelectedBoard] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [areas, setAreas] = useState<string[]>([]);
  const [selectedSchoolForVisit, setSelectedSchoolForVisit] = useState<SchoolData | null>(null);

  const fetchRemainingSchools = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('personallyVisited', 'false'); // Only unvisited by Kalyan
      if (search) params.append('search', search);
      if (selectedArea !== 'ALL') params.append('area', selectedArea);
      if (selectedBoard !== 'ALL') params.append('board', selectedBoard);
      if (selectedPriority !== 'ALL') params.append('priority', selectedPriority);

      const res = await fetch(`/api/schools?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      setSchools(data.schools || []);
      if (data.areas) setAreas(data.areas);
    } catch (err) {
      console.error('Failed to load remaining schools:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRemainingSchools();
  }, [search, selectedArea, selectedBoard, selectedPriority]);

  useEffect(() => {
    const unsubscribe = subscribeToDataChanges((changeType) => {
      if (changeType === 'visit' || changeType === 'route' || changeType === 'all') {
        fetchRemainingSchools();
      }
    });
    return () => unsubscribe();
  }, [search, selectedArea, selectedBoard, selectedPriority]);

  const handleExportCSV = () => {
    if (schools.length === 0) return;
    const headers = ['S.No', 'School ID', 'School Name', 'Board', 'Area', 'Category', 'Phone', 'Principal', 'Priority', 'Programme', 'Previous Rep Visited'];
    const rows = schools.map(s => [
      s.s_no,
      s.school_id,
      `"${(s.school_name || '').replace(/"/g, '""')}"`,
      s.board,
      `"${(s.area || '').replace(/"/g, '""')}"`,
      s.category || '',
      s.phone || '',
      `"${(s.principal_name || '').replace(/"/g, '""')}"`,
      s.priority,
      s.recommended_programme,
      s.visited_by_previous_rep ? 'YES' : 'NO'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Mittsure_Remaining_Schools_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const prevRepCount = schools.filter(s => s.visited_by_previous_rep).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/40 text-amber-100 border border-amber-300/30">
                FIELD OUTREACH BACKLOG
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white">
                Master List: 487 Total
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Remaining Schools Database</h1>
            <p className="text-amber-100 text-sm mt-1 max-w-2xl">
              Institutions pending first personal visit by <strong>Nichhenametla Kalyan Ashrith</strong>. Master allocation strictly tracks 487 schools.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 rounded-xl bg-white text-amber-900 font-semibold text-sm hover:bg-amber-50 transition shadow-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Remaining ({schools.length})
            </button>
            <Link
              href="/route-planner"
              className="px-4 py-2 rounded-xl bg-amber-950/40 border border-amber-300/40 text-white font-semibold text-sm hover:bg-amber-950/60 transition flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Plan 5-School Route
            </Link>
          </div>
        </div>

        {/* Dynamic Metric Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/20">
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-amber-200 text-xs font-medium uppercase tracking-wider">Remaining Schools</p>
            <p className="text-2xl font-black">{schools.length}</p>
            <p className="text-xs text-amber-200/80 mt-0.5">{((schools.length / 487) * 100).toFixed(1)}% of total allotment</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-amber-200 text-xs font-medium uppercase tracking-wider">Personally Completed</p>
            <p className="text-2xl font-black">{487 - schools.length}</p>
            <p className="text-xs text-amber-200/80 mt-0.5">Unique institutions covered</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-amber-200 text-xs font-medium uppercase tracking-wider">Previous Rep Visited</p>
            <p className="text-2xl font-black">{prevRepCount}</p>
            <p className="text-xs text-amber-200/80 mt-0.5">Requires Kalyan's 1st visit</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-amber-200 text-xs font-medium uppercase tracking-wider">Est. Days at 5/Day</p>
            <p className="text-2xl font-black">{Math.ceil(schools.length / 5)}</p>
            <p className="text-xs text-amber-200/80 mt-0.5">Mon-Sat working days</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search S.No, School name, area..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="ALL">All Areas ({areas.length})</option>
            {areas.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <select
            value={selectedBoard}
            onChange={(e) => setSelectedBoard(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="ALL">All Boards</option>
            <option value="CBSE">CBSE</option>
            <option value="ICSE">ICSE</option>
            <option value="STATE BOARD">State Board</option>
            <option value="OTHER">Other</option>
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>
        </div>
      </div>

      {/* Schools Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 text-sm">Remaining Institutions</span>
            <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full text-xs">
              {schools.length}
            </span>
          </div>
          <span className="text-xs text-slate-500">
            Sorted by Original Allotted S.No (1..487)
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            Loading remaining schools...
          </div>
        ) : schools.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="font-medium text-slate-700">No schools match your search filters.</p>
            <p className="text-xs text-slate-400 mt-1">Try clearing some filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4 w-16">S.No</th>
                  <th className="py-3 px-4">School Name & ID</th>
                  <th className="py-3 px-4">Area & District</th>
                  <th className="py-3 px-4">Board / Type</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4">Programme Pitch</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schools.map((school) => (
                  <tr key={school.id} className="hover:bg-amber-50/30 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                      #{school.s_no}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">
                        <Link href={`/schools/${school.id}`} className="hover:text-amber-600 hover:underline">
                          {school.school_name}
                        </Link>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-400 font-mono">{school.school_id}</span>
                        <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-rose-300 inline-flex items-center gap-1 shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                          NOT VISITED
                        </span>
                        {school.visited_by_previous_rep && (
                          <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-purple-200">
                            PREV REP VISITED • 1ST VISIT REQ
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-700">{school.area}</div>
                      <div className="text-xs text-slate-400">{school.district}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                        {school.board}
                      </span>
                      <div className="text-xs text-slate-500 mt-0.5">{school.school_type}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800">{school.principal_name || 'Principal'}</div>
                      <div className="text-xs text-slate-400">{school.phone || 'Phone not listed'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        school.recommended_programme === 'MOM' ? 'bg-blue-100 text-blue-800' :
                        school.recommended_programme === 'Junior Power Quest' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {school.recommended_programme}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedSchoolForVisit(school)}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition shadow-sm"
                      >
                        Record Visit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Visit Modal */}
      {selectedSchoolForVisit && (
        <RecordVisitModal
          school={selectedSchoolForVisit}
          isOpen={Boolean(selectedSchoolForVisit)}
          onClose={() => setSelectedSchoolForVisit(null)}
          onVisitSaved={() => {
            setSelectedSchoolForVisit(null);
            fetchRemainingSchools();
          }}
        />
      )}
    </div>
  );
}
