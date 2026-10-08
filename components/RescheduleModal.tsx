'use client';

import React, { useState } from 'react';
import { SchoolData } from '@/lib/types';

interface RescheduleModalProps {
  school: SchoolData | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function RescheduleModal({
  school,
  isOpen,
  onClose,
  onSuccess
}: RescheduleModalProps) {
  const [targetDate, setTargetDate] = useState('2026-09-08');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen || !school) return null;

  // Next available working days (excluding Sundays)
  const quickDays = [
    { label: 'Tomorrow (Tue 8 Sep)', date: '2026-09-08', type: 'Full Day' },
    { label: 'Wed 9 Sep', date: '2026-09-09', type: 'Full Day' },
    { label: 'Thu 10 Sep', date: '2026-09-10', type: 'Full Day' },
    { label: 'Fri 11 Sep', date: '2026-09-11', type: 'Full Day' },
    { label: 'Sat 12 Sep', date: '2026-09-12', type: 'Half Day' },
  ];

  const handleReschedule = async () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/routes/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: school.id,
          target_date: targetDate,
          notes: notes || `Follow-up revisit for ${school.school_name}`
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reschedule revisit');
      }

      setSuccessMsg(data.message || `Successfully added to route for ${targetDate}!`);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1400);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-white/10 rounded-xl text-white">
                <svg className="w-5 h-5 animate-spin-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </span>
              <div>
                <h3 className="font-bold text-lg">Reschedule Revisit & Add to Route</h3>
                <p className="text-xs text-teal-100">Schedule follow-up without duplicating unique completed metrics</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* School Summary Card */}
        <div className="p-5 space-y-4">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                S.No #{school.s_no} • {school.school_id}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                {school.board}
              </span>
            </div>
            <h4 className="font-bold text-slate-900 text-base">{school.school_name}</h4>
            <p className="text-xs text-slate-500">{school.area} • {school.district} • Contact: {school.principal_name || 'Principal'}</p>
          </div>

          {/* Quick Date Presets */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Route Target Date:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {quickDays.map((q) => (
                <button
                  key={q.date}
                  type="button"
                  onClick={() => setTargetDate(q.date)}
                  className={`p-2.5 rounded-xl text-left border text-xs font-medium transition-all ${
                    targetDate === q.date
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-300'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="font-bold">{q.label}</div>
                  <div className={`text-[10px] mt-0.5 ${targetDate === q.date ? 'text-emerald-100' : 'text-slate-500'}`}>
                    {q.type}
                  </div>
                </button>
              ))}
            </div>

            {/* Custom Date Picker */}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-slate-500">Or custom date:</span>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                min="2026-09-08"
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Notes / Purpose */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Revisit Purpose / Notes:
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Follow-up meeting with Principal, review syllabus, handover registration forms..."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Feedback Banners */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2 animate-shake">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 animate-fade-in">
              <svg className="w-4 h-4 shrink-0 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleReschedule}
            disabled={loading}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition shadow-md flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Scheduling Revisit...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Revisit to Route Plan
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
