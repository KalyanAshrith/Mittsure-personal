'use client';

import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  Calendar,
  ArrowRight,
  CloudRain,
  ShieldAlert,
  Flame,
  UserX,
  CheckCircle2,
} from 'lucide-react';
import { notifyDataChange } from '@/lib/realtimeSync';

interface ForcedHolidayModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  dayLabel: string;
  onSuccess: () => void;
}

export default function ForcedHolidayModal({
  isOpen,
  onClose,
  date,
  dayLabel,
  onSuccess,
}: ForcedHolidayModalProps) {
  const [selectedReason, setSelectedReason] = useState('Heavy Rain / Monsoon Weather Alert');
  const [customReason, setCustomReason] = useState('');
  const [cascadeDownstream, setCascadeDownstream] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !date) return null;

  // Compute next working day
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + 1);
  const skippedSunday = dt.getDay() === 0;
  if (skippedSunday) {
    dt.setDate(dt.getDate() + 1); // skip Sunday to Monday
  }
  const nextDateFormatted = dt.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const reasonPresets = [
    { label: 'Heavy Rain / Monsoon Alert', icon: CloudRain },
    { label: 'City / Local Bandh or Strike', icon: Flame },
    { label: 'Unscheduled School Holiday', icon: ShieldAlert },
    { label: 'Personal Health / Emergency', icon: UserX },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const finalReason = customReason.trim() || selectedReason;

    try {
      const res = await fetch('/api/routes/forced-holiday', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          reason: finalReason,
          cascadeDownstream,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process forced holiday hand-off');
      }

      notifyDataChange('route');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-rose-600 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">Declare Forced Holiday & Hand Off Route</h3>
              <p className="text-white/80 text-xs mt-0.5">
                {dayLabel} • {date}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl hover:bg-white/20 transition text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-950 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-xs">
              <Calendar className="w-4 h-4 text-amber-700" />
              <span>Automatic Route Hand-off Destination</span>
            </div>
            <p className="text-[11px] text-amber-900 leading-relaxed">
              When declared a forced holiday, today's planned circuit is <strong>never lost</strong>. It
              will automatically transfer to the next working day:
            </p>
            <div className="flex items-center gap-2 font-black text-amber-950 bg-white/80 border border-amber-300 px-3 py-1.5 rounded-xl">
              <span>{date}</span>
              <ArrowRight className="w-4 h-4 text-amber-600" />
              <span className="text-emerald-700 underline">{nextDateFormatted}</span>
              {skippedSunday && (
                <span className="ml-auto text-[10px] bg-rose-600 text-white font-extrabold px-1.5 py-0.5 rounded">
                  Sunday Skipped
                </span>
              )}
            </div>
          </div>

          {/* Reason Selection */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
              Select Reason for Forced Holiday:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {reasonPresets.map((r) => {
                const Icon = r.icon;
                const active = selectedReason === r.label && !customReason;
                return (
                  <button
                    key={r.label}
                    type="button"
                    onClick={() => {
                      setSelectedReason(r.label);
                      setCustomReason('');
                    }}
                    className={`p-2.5 rounded-2xl border text-left flex items-center gap-2 transition font-semibold ${
                      active
                        ? 'border-amber-500 bg-amber-50/80 text-amber-950 ring-2 ring-amber-400/30'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-amber-600' : 'text-slate-400'}`} />
                    <span className="text-[11px] line-clamp-1">{r.label}</span>
                  </button>
                );
              })}
            </div>

            <input
              type="text"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Or type a custom reason (e.g. Traffic disruption, School festival)..."
              className="w-full border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-amber-500 mt-1"
            />
          </div>

          {/* Cascading Checkbox */}
          <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={cascadeDownstream}
              onChange={(e) => setCascadeDownstream(e.target.checked)}
              className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
            />
            <div>
              <span className="font-bold text-slate-900 block text-xs">
                Roll forward future planned schedules (Cascade)
              </span>
              <span className="text-slate-500 text-[10px] block">
                Pushes downstream dates ahead by 1 working day so no other planned circuits are overwritten.
              </span>
            </div>
          </label>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white font-extrabold shadow-sm transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? 'Handing off Route...' : 'Confirm & Hand Off Route'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
