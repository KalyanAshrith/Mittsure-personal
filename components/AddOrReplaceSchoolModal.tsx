'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Plus,
  ArrowRightLeft,
  Building,
  MapPin,
  Check,
  AlertCircle,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { notifyDataChange } from '@/lib/realtimeSync';

interface AddOrReplaceSchoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'ADD' | 'REPLACE';
  date: string;
  dayLabel: string;
  oldSchool?: { id: string; s_no: number; school_name: string; area: string; board: string } | null;
  currentRouteStops: Array<{ school: { id: string; s_no: number; school_name: string; area: string } }>;
  onSuccess: () => void;
}

export default function AddOrReplaceSchoolModal({
  isOpen,
  onClose,
  mode,
  date,
  dayLabel,
  oldSchool,
  currentRouteStops,
  onSuccess,
}: AddOrReplaceSchoolModalProps) {
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CLUSTER' | 'STATE_PRE' | 'CBSE_ICSE'>('CLUSTER');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    async function loadSchools() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/schools', { cache: 'no-store' });
        const data = await res.json();
        setSchools(data.schools || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadSchools();
  }, [isOpen]);

  // Determine current day's primary areas/clusters from existing stops
  const dayAreas = useMemo(() => {
    const areas = new Set<string>();
    currentRouteStops.forEach((st) => {
      if (st.school?.area) areas.add(st.school.area.toLowerCase());
    });
    return Array.from(areas);
  }, [currentRouteStops]);

  // Set of school IDs already in this day's route
  const existingSchoolIds = useMemo(() => {
    return new Set(currentRouteStops.map((st) => st.school.id));
  }, [currentRouteStops]);

  const filteredSchools = useMemo(() => {
    let list = schools.filter((s) => !existingSchoolIds.has(s.id));

    // Exclude old school in replace mode
    if (mode === 'REPLACE' && oldSchool) {
      list = list.filter((s) => s.id !== oldSchool.id);
    }

    // Category / Filter tab
    if (activeFilter === 'CLUSTER' && dayAreas.length > 0) {
      list = list.filter((s) =>
        dayAreas.some((a) => (s.area || '').toLowerCase().includes(a))
      );
    } else if (activeFilter === 'STATE_PRE') {
      list = list.filter((s) => {
        const b = (s.board || '').toUpperCase();
        const t = (s.school_type || '').toUpperCase();
        return (
          b === 'STATE BOARD' ||
          b === 'STATE' ||
          t === 'PLAY SCHOOL' ||
          t === 'PRE-SCHOOL' ||
          t === 'NURSERY' ||
          t === 'MONTESSORI'
        );
      });
    } else if (activeFilter === 'CBSE_ICSE') {
      list = list.filter((s) => {
        const b = (s.board || '').toUpperCase();
        return b === 'CBSE' || b === 'ICSE';
      });
    }

    // Search query
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (s) =>
          (s.school_name || '').toLowerCase().includes(q) ||
          String(s.s_no).includes(q) ||
          (s.school_id || '').toLowerCase().includes(q) ||
          (s.area || '').toLowerCase().includes(q) ||
          (s.board || '').toLowerCase().includes(q)
      );
    }

    // Sort: unvisited first, then S.No
    return list.sort((a, b) => {
      if (a.visited_by_current_user !== b.visited_by_current_user) {
        return a.visited_by_current_user ? 1 : -1;
      }
      return a.s_no - b.s_no;
    });
  }, [schools, existingSchoolIds, activeFilter, search, dayAreas, mode, oldSchool]);

  const handleSelectSchool = async (targetSchool: any) => {
    setSubmitting(true);
    setError(null);
    try {
      const payload: any = {
        date,
        action: mode === 'REPLACE' ? 'REPLACE' : 'ADD',
      };

      if (mode === 'REPLACE') {
        payload.oldSchoolId = oldSchool?.id;
        payload.newSchoolId = targetSchool.id;
      } else {
        payload.schoolId = targetSchool.id;
      }

      const res = await fetch('/api/routes/modify-stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update route.');
      }

      notifyDataChange('route');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-white/20 text-white tracking-wide uppercase">
                {mode === 'REPLACE' ? 'Replace Stop' : 'Add Stop'}
              </span>
              <span className="text-xs font-mono opacity-90">{dayLabel} � {date}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight">
              {mode === 'REPLACE' && oldSchool
                ? `Replace S.No ${oldSchool.s_no} � ${oldSchool.school_name}`
                : `Add School to ${dayLabel}'s Circuit`}
            </h2>
            <p className="text-xs text-emerald-100 mt-0.5">
              {mode === 'REPLACE'
                ? 'Select a replacement school to take this position in the circuit.'
                : 'Select an unvisited school to append to this day route.'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters & Search */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 space-y-3">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by school name, S.No, area, or board..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
            />
          </div>

          {/* Quick Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setActiveFilter('CLUSTER')}
              className={`px-3 py-1 rounded-lg font-bold text-[11px] transition ${
                activeFilter === 'CLUSTER'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              ?? Same Area Cluster ({dayAreas.slice(0, 2).join(', ') || 'Nearby'})
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('STATE_PRE')}
              className={`px-3 py-1 rounded-lg font-bold text-[11px] transition ${
                activeFilter === 'STATE_PRE'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              ??? State / Pre-School
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('CBSE_ICSE')}
              className={`px-3 py-1 rounded-lg font-bold text-[11px] transition ${
                activeFilter === 'CBSE_ICSE'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              ?? CBSE / ICSE
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1 rounded-lg font-bold text-[11px] transition ${
                activeFilter === 'ALL'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              ?? All Schools ({schools.length})
            </button>
          </div>
        </div>

        {/* Candidate List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs animate-pulse">
              Loading available schools from master database...
            </div>
          ) : filteredSchools.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs space-y-1">
              <p className="font-bold">No schools matched your filter.</p>
              <p className="text-slate-400">Try switching filters or clearing the search box.</p>
            </div>
          ) : (
            filteredSchools.slice(0, 50).map((school) => {
              const isPreSchool =
                ['PLAY SCHOOL', 'PRE-SCHOOL', 'NURSERY'].includes(school.school_type?.toUpperCase()) ||
                school.school_name?.toLowerCase().includes('pre school');

              const isVisited = Boolean(school.visited_by_current_user || school.visit_status === 'VISITED');

              return (
                <div
                  key={school.id}
                  className={`py-3 flex items-center justify-between gap-3 px-3 rounded-xl transition border-l-4 ${
                    isVisited
                      ? 'border-l-emerald-500 bg-emerald-50/20 hover:bg-emerald-50/40'
                      : 'border-l-rose-500 bg-rose-50/10 hover:bg-rose-50/20'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white font-mono text-[10px] font-bold">
                        #{school.s_no}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">{school.school_id}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isPreSchool
                            ? 'bg-pink-100 text-pink-800'
                            : school.board === 'CBSE'
                            ? 'bg-indigo-100 text-indigo-800'
                            : school.board === 'ICSE'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isPreSchool ? '🧸 PRE-SCHOOL' : school.board || 'STATE BOARD'}
                      </span>
                      {isVisited ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          VISITED
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                          NOT VISITED
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-slate-900 text-xs truncate">
                      {school.school_name}
                    </h4>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {school.area}
                      </span>
                      {school.student_strength && (
                        <span>� {school.student_strength} students</span>
                      )}
                      <span>� {school.recommended_programme || 'MOM'}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleSelectSchool(school)}
                    className="flex-shrink-0 px-3.5 py-1.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    {mode === 'REPLACE' ? (
                      <>
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        <span>Select</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {Math.min(filteredSchools.length, 50)} of {filteredSchools.length} candidates</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl font-bold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
