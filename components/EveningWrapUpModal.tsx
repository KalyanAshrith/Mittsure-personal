'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  X,
  RotateCcw,
  Sparkles,
  Calendar,
  AlertTriangle,
  Clock,
  MapPin,
  Check,
  Phone,
  HelpCircle,
  FileCheck,
} from 'lucide-react';
import { SchoolData } from '@/lib/types';
import { notifyDataChange } from '@/lib/realtimeSync';

interface EveningWrapUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  routeStops: SchoolData[];
  onSuccess: () => void;
}

export default function EveningWrapUpModal({
  isOpen,
  onClose,
  date,
  routeStops,
  onSuccess,
}: EveningWrapUpModalProps) {
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<Set<string>>(new Set());
  const [revisitSchoolIds, setRevisitSchoolIds] = useState<Set<string>>(new Set());
  const [defaultOutcome, setDefaultOutcome] = useState('Interested');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successResult, setSuccessResult] = useState<{
    count: number;
    firstVisitCount: number;
    revisitCount: number;
    message: string;
  } | null>(null);

  // Initialize state when modal opens or route stops change
  useEffect(() => {
    if (!isOpen) {
      setSuccessResult(null);
      setErrorMessage('');
      return;
    }

    // Default: select all stops in the route
    const allIds = new Set(routeStops.map((s) => s.id));
    setSelectedSchoolIds(allIds);

    // Identify revisits: any school already visited or flagged as visited
    const revisits = new Set<string>();
    for (const s of routeStops) {
      if (
        s.visited_by_current_user ||
        (s.visit_status && s.visit_status !== 'NOT VISITED')
      ) {
        revisits.add(s.id);
      }
    }
    setRevisitSchoolIds(revisits);

    setNotes(`Evening wrap-up: Field route completed successfully for ${date}. All scheduled stops conducted.`);
    setDefaultOutcome('Interested');
    setErrorMessage('');
    setSuccessResult(null);
  }, [isOpen, routeStops, date]);

  // Calculations
  const stats = useMemo(() => {
    const selectedCount = selectedSchoolIds.size;
    let revisits = 0;
    let firstVisits = 0;

    for (const id of Array.from(selectedSchoolIds)) {
      if (revisitSchoolIds.has(id)) {
        revisits++;
      } else {
        firstVisits++;
      }
    }

    return {
      totalStops: routeStops.length,
      selectedCount,
      revisits,
      firstVisits,
    };
  }, [selectedSchoolIds, revisitSchoolIds, routeStops.length]);

  const toggleStopSelection = (schoolId: string) => {
    setSelectedSchoolIds((prev) => {
      const next = new Set(prev);
      if (next.has(schoolId)) {
        next.delete(schoolId);
      } else {
        next.add(schoolId);
      }
      return next;
    });
  };

  const toggleRevisit = (schoolId: string) => {
    setRevisitSchoolIds((prev) => {
      const next = new Set(prev);
      if (next.has(schoolId)) {
        next.delete(schoolId);
      } else {
        next.add(schoolId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedSchoolIds(new Set(routeStops.map((s) => s.id)));
  };

  const handleDeselectAll = () => {
    setSelectedSchoolIds(new Set());
  };

  const handleSubmit = async () => {
    if (selectedSchoolIds.size === 0) {
      setErrorMessage('Please select at least 1 school to complete.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/visits/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          schoolIds: Array.from(selectedSchoolIds),
          revisitSchoolIds: Array.from(revisitSchoolIds),
          defaultOutcome,
          notes,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || json.details || 'Failed to complete visits');
      }

      setSuccessResult({
        count: json.count || selectedSchoolIds.size,
        firstVisitCount: json.firstVisitCount || stats.firstVisits,
        revisitCount: json.revisitCount || stats.revisits,
        message: json.message || 'Evening wrap-up successfully saved to CRM.',
      });

      notifyDataChange('visit', { count: json.count || selectedSchoolIds.size, date });
      onSuccess();
    } catch (err: any) {
      console.error('Evening wrap-up error:', err);
      setErrorMessage(err.message || 'Failed to log visits.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020C21]/60 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-white/95 backdrop-blur-2xl rounded-3xl border border-white/80 shadow-[0_32px_64px_rgba(2,12,33,0.22)] max-w-2xl w-full my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 bg-[#0F1B31] text-white flex items-start justify-between flex-shrink-0 border-b border-white/10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-white text-[#0F1B31] font-bold text-[10px] tracking-wider uppercase flex items-center gap-1">
                <span>🌆 EVENING ROUTE WRAP-UP</span>
              </span>
              <span className="text-xs font-mono font-medium text-slate-300">
                {date}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              End-of-Day Batch Visit Completion
            </h2>
            <p className="text-xs text-slate-300">
              One-click batch mark all visited schools, designate revisits, and sync CRM status.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* SUCCESS BANNER */}
          {successResult && (
            <div className="p-4 bg-emerald-50 border-2 border-emerald-400 rounded-2xl text-emerald-950 space-y-2">
              <div className="flex items-center gap-2 font-black text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>{successResult.message}</span>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold text-emerald-800">
                <span>Total Logged: <strong>{successResult.count}</strong></span>
                <span>• First Visits: <strong>{successResult.firstVisitCount}</strong></span>
                <span>• Revisits: <strong>{successResult.revisitCount}</strong></span>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-sm transition"
                >
                  Done & Return to Route
                </button>
              </div>
            </div>
          )}

          {/* ERROR BANNER */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-2xl text-rose-900 font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!successResult && (
            <>
              {/* SUMMARY COUNTER STATS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Total Stops
                  </span>
                  <span className="text-base font-black text-slate-900">
                    {stats.totalStops}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">
                    Marking Visited
                  </span>
                  <span className="text-base font-black text-emerald-900">
                    {stats.selectedCount}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-center">
                  <span className="text-[10px] uppercase font-bold text-blue-700 block">
                    First Visits
                  </span>
                  <span className="text-base font-black text-blue-900">
                    {stats.firstVisits}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-center">
                  <span className="text-[10px] uppercase font-bold text-amber-700 block">
                    Revisits
                  </span>
                  <span className="text-base font-black text-amber-900">
                    {stats.revisits}
                  </span>
                </div>
              </div>

              {/* CRM INTEGRITY NOTICE */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-slate-700">
                <HelpCircle className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-900 block">
                    Strict CRM Compliance Rule:
                  </span>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Schools are marked as <strong>VISITED</strong> or <strong>REVISITED</strong>. No school is assumed as &apos;Registration Confirmed&apos; unless specifically agreed upon in writing with the school management.
                  </p>
                </div>
              </div>

              {/* GLOBAL VISIT SETTINGS */}
              <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                      Default Visit Outcome
                    </label>
                    <select
                      value={defaultOutcome}
                      onChange={(e) => setDefaultOutcome(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-2 bg-white font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 text-xs"
                    >
                      <option value="Interested">Interested (Standard Field Outreach)</option>
                      <option value="Follow-up Required">Follow-up Required (Needs Revisit)</option>
                      <option value="Demo Scheduled">Demo Scheduled</option>
                      <option value="Principal Not Available">Principal Not Available (Met Coordinator)</option>
                      <option value="Registration Confirmed">Registration Confirmed (Signed Contract Only)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                      Quick Selection
                    </label>
                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 font-bold text-slate-800 transition"
                      >
                        Select All Stops
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAll}
                        className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 font-semibold text-slate-700 transition"
                      >
                        Clear Selection
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Field Remarks & Notes
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter evening remarks for daily summary log..."
                    className="w-full border border-slate-300 rounded-xl p-2.5 font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 text-xs"
                  />
                </div>
              </div>

              {/* STOPS LIST */}
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1">
                  <h3 className="font-black text-slate-900 uppercase tracking-wider text-[11px]">
                    Today&apos;s Route Stops ({routeStops.length})
                  </h3>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    Uncheck any schools that were skipped/closed
                  </span>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {routeStops.map((school, index) => {
                    const isSelected = selectedSchoolIds.has(school.id);
                    const isRevisit = revisitSchoolIds.has(school.id);

                    return (
                      <div
                        key={school.id}
                        className={`p-3 rounded-2xl border transition ${
                          isSelected
                            ? 'border-emerald-400 bg-emerald-50/30'
                            : 'border-slate-200 bg-slate-50/50 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          {/* Selection Checkbox */}
                          <div className="flex items-start gap-2.5 flex-1">
                            <button
                              type="button"
                              onClick={() => toggleStopSelection(school.id)}
                              className={`w-5 h-5 rounded-lg border flex items-center justify-center transition flex-shrink-0 mt-0.5 ${
                                isSelected
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'border-slate-300 bg-white hover:border-slate-400'
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </button>

                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-800">
                                  STOP #{index + 1}
                                </span>
                                <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-white">
                                  #{school.s_no}
                                </span>
                                <span className="font-bold text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                                  {school.board}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  {school.area}
                                </span>
                              </div>

                              <h4 className="font-bold text-slate-900">
                                {school.school_name}
                              </h4>

                              <p className="text-[10px] text-slate-500">
                                Contact: {school.principal_name || school.contact_person || 'Principal'}
                                {school.phone && ` • ${school.phone}`}
                              </p>
                            </div>
                          </div>

                          {/* Revisit Toggle */}
                          <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
                            <button
                              type="button"
                              onClick={() => toggleRevisit(school.id)}
                              title="Toggle between First Visit and Revisit"
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border flex items-center gap-1 transition ${
                                isRevisit
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                              }`}
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>{isRevisit ? 'REVISIT' : 'FIRST VISIT'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* MODAL FOOTER */}
        {!successResult && (
          <div className="p-4 sm:p-5 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-full border border-slate-200 font-semibold text-[#59627E] hover:text-[#020C21] hover:bg-slate-100 transition text-xs uppercase tracking-wider"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || selectedSchoolIds.size === 0}
              className="btn-cta px-6 py-2.5 rounded-full text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#0F1B31]/20 transition active:scale-95 disabled:opacity-40 inline-flex items-center gap-2"
            >
              <span>
                {submitting
                  ? 'Saving Visits to CRM...'
                  : `CONFIRM & COMPLETE ALL (${stats.selectedCount})`}
              </span>
              <span className="btn-knob">
                <CheckCircle2 className={`w-3.5 h-3.5 text-white ${submitting ? 'animate-spin' : ''}`} />
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
