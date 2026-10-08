'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Bike,
  Sparkles,
  Save,
  CheckCircle2,
  Navigation,
  ArrowRight,
  PlusCircle,
  FileText,
  Trash2,
  ArrowRightLeft,
  AlertTriangle,
  Plus,
} from 'lucide-react';
import RecordVisitModal from '@/components/RecordVisitModal';
import AddOrReplaceSchoolModal from '@/components/AddOrReplaceSchoolModal';
import ForcedHolidayModal from '@/components/ForcedHolidayModal';
import { SchoolData } from '@/lib/types';
import { subscribeToDataChanges, notifyDataChange } from '@/lib/realtimeSync';

export default function CalendarSchedulePage() {
  const [schedule, setSchedule] = useState<any[]>([]);
  const [repeatedSchools, setRepeatedSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingDate, setSavingDate] = useState<string | null>(null);
  const [modifyingDate, setModifyingDate] = useState<string | null>(null);
  const [dailyRemarks, setDailyRemarks] = useState<{ [date: string]: string }>({});

  const [selectedSchoolForVisit, setSelectedSchoolForVisit] = useState<SchoolData | null>(null);
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);

  const [forcedHolidayState, setForcedHolidayState] = useState<{
    isOpen: boolean;
    date: string;
    dayLabel: string;
  }>({
    isOpen: false,
    date: '',
    dayLabel: '',
  });

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'ADD' | 'REPLACE';
    date: string;
    dayLabel: string;
    oldSchool: any | null;
    currentRouteStops: any[];
  }>({
    isOpen: false,
    mode: 'ADD',
    date: '',
    dayLabel: '',
    oldSchool: null,
    currentRouteStops: [],
  });

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/calendar?days=3', { cache: 'no-store' });
      const json = await res.json();
      if (json.schedule) {
        setSchedule(json.schedule);
        setRepeatedSchools(json.repeatedSchools || []);
        const initialRemarks: { [date: string]: string } = {};
        json.schedule.forEach((day: any) => {
          initialRemarks[day.date] = day.summary?.remarks || day.routePlan?.remarks || '';
        });
        setDailyRemarks(initialRemarks);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
    const unsubscribe = subscribeToDataChanges(() => {
      fetchSchedule();
    });
    return () => unsubscribe();
  }, []);

  const handleSaveRemarks = async (date: string, generateAiAdvice: boolean = false) => {
    setSavingDate(date);
    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          remarks: dailyRemarks[date] || '',
          generateAiAdvice,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchSchedule();
      }
    } catch (e: any) {
      alert('Error updating remarks: ' + e.message);
    } finally {
      setSavingDate(null);
    }
  };

  const handleRemoveStop = async (date: string, schoolId: string, schoolName: string) => {
    if (!confirm(`Are you sure you want to remove "${schoolName}" from the route on ${date}?`)) {
      return;
    }
    setModifyingDate(date);
    try {
      const res = await fetch('/api/routes/modify-stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REMOVE',
          date,
          schoolId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove school');
      notifyDataChange('route');
      fetchSchedule();
    } catch (err: any) {
      alert('Error removing stop: ' + err.message);
    } finally {
      setModifyingDate(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-emerald-600" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              3-Day School Schedule & Daily Remarks
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Rolling 3-day field outreach preview with AI daily co-pilot & daily remarks section
          </p>
        </div>

        <Link
          href="/route-planner"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Plan Another Circuit</span>
        </Link>
      </div>

      {/* Repeated Schools Alert Banner */}
      {repeatedSchools.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center font-bold flex-shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-amber-950 text-sm">
                Repeated School Detected in 3-Day Schedule ({repeatedSchools.length} duplicate{repeatedSchools.length > 1 ? 's' : ''})
              </h3>
              <p className="text-amber-800 mt-0.5 leading-relaxed">
                {repeatedSchools.map((r) => (
                  <span key={r.schoolId} className="inline-block mr-3">
                    <strong>{r.schoolName}</strong> (#{r.s_no}) is scheduled on{' '}
                    <span className="underline font-semibold">{r.dayLabels.join(' & ')}</span>
                  </span>
                ))}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[11px] font-bold text-amber-800 bg-amber-100/80 border border-amber-300/60 px-3 py-1.5 rounded-xl">
              Use "Delete" or "Replace" below to remove duplicate
            </span>
          </div>
        </div>
      )}

      {/* 3 Days Rolling View */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Loading 3-day schedule...</div>
      ) : schedule.length === 0 ? (
        <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl text-slate-500 text-xs">
          No schedule planned yet. Use the Route Planner to create daily school circuits.
        </div>
      ) : (
        <div className="space-y-6">
          {schedule.map((day) => {
            const plan = day.routePlan;
            const stops = plan?.stops || [];
            const isToday = day.dayLabel === 'Today';

            return (
              <div
                key={day.date}
                className={`bg-white border rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 transition ${
                  isToday
                    ? 'border-emerald-400 ring-2 ring-emerald-400/20'
                    : 'border-slate-200'
                }`}
              >
                {/* Day Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shadow-sm ${
                        isToday
                          ? 'bg-emerald-600 text-white shadow-emerald-600/25'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {new Date(day.date).getDate()}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            day.isHoliday
                              ? 'bg-rose-100 text-rose-900 font-black'
                              : isToday
                              ? 'bg-emerald-100 text-emerald-900 font-black'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {day.dayLabel}
                        </span>
                        <span className="text-xs font-mono text-slate-500">{day.date}</span>
                        {day.isHoliday && (
                          <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold text-white ${
                            day.isForcedHoliday ? 'bg-amber-600' : 'bg-rose-600'
                          }`}>
                            {day.isForcedHoliday ? 'FORCED HOLIDAY' : 'SUNDAY HOLIDAY'}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                        {day.isHoliday
                          ? day.holidayLabel || (day.isForcedHoliday ? 'Forced Non-Working Holiday' : 'Sunday Weekly Non-Working Holiday')
                          : plan?.name || `${day.formattedDate} Field Outreach`}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {plan && !day.isHoliday && (
                      <button
                        type="button"
                        onClick={() =>
                          setForcedHolidayState({
                            isOpen: true,
                            date: day.date,
                            dayLabel: day.dayLabel,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 shadow-sm transition active:scale-95"
                        title="Declare Forced Holiday (Bandh/Weather) & Hand Off Route to Next Working Day"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Forced Holiday? Hand Off</span>
                      </button>
                    )}

                    {plan ? (
                      <div className="flex items-center gap-3 text-xs bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-2 flex-shrink-0">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                          Circuit Length
                        </span>
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {plan.total_distance_km} km
                        </span>
                      </div>
                      <div className="w-px h-6 bg-slate-200" />
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                          Travel Time
                        </span>
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {plan.total_duration_formatted}
                        </span>
                      </div>
                      <div className="w-px h-6 bg-slate-200" />
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                          Stops
                        </span>
                        <span className="font-mono font-bold text-emerald-700 text-sm">
                          {stops.length} Schools
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No circuit planned yet</span>
                  )}
                  </div>
                </div>

                {/* 7 Schools Grid Preview */}
                {stops.length > 0 ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Planned Route Stops ({stops.length} Schools)
                      </h4>

                      <button
                        type="button"
                        onClick={() =>
                          setModalState({
                            isOpen: true,
                            mode: 'ADD',
                            date: day.date,
                            dayLabel: day.dayLabel,
                            oldSchool: null,
                            currentRouteStops: stops,
                          })
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add School</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      {stops.map((stop: any) => {
                        const repItem = repeatedSchools.find((r) => r.schoolId === stop.school.id);
                        const otherDays = repItem
                          ? repItem.dayLabels.filter((dl: string) => dl !== day.dayLabel)
                          : [];

                        return (
                          <div
                            key={stop.id}
                            className={`p-3 rounded-2xl border flex flex-col justify-between text-xs transition ${
                              repItem
                                ? 'bg-amber-50/70 border-amber-300 hover:bg-amber-100/70 ring-1 ring-amber-400/30'
                                : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/80'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <div className="flex items-center gap-1">
                                  <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900 text-white text-[10px]">
                                    Stop #{stop.optimized_sequence}
                                  </span>
                                  {repItem && (
                                    <span
                                      className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500 text-white flex items-center gap-0.5"
                                      title={`Repeated on ${otherDays.join(', ')}`}
                                    >
                                      <AlertTriangle className="w-2.5 h-2.5" />
                                      <span>REPEATED</span>
                                    </span>
                                  )}
                                </div>

                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                    stop.status === 'VISITED'
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                      : 'bg-rose-100 text-rose-800 border-rose-300'
                                  }`}
                                >
                                  {stop.status === 'VISITED' ? 'VISITED' : 'NOT VISITED'}
                                </span>
                              </div>

                              <h5 className="font-bold text-slate-900 line-clamp-1">
                                {stop.school.school_name}
                              </h5>

                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {stop.school.area} • {stop.school.board}
                              </p>

                              {repItem && otherDays.length > 0 && (
                                <p className="text-[10px] font-bold text-amber-700 mt-1">
                                  ⚠️ Also scheduled on {otherDays.join(', ')}
                                </p>
                              )}
                            </div>

                            <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1">
                                <a
                                  href={
                                    stop.school.google_maps_url ||
                                    `https://www.google.com/maps/search/?api=1&query=${stop.school.latitude},${stop.school.longitude}`
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-700 font-bold hover:underline flex items-center gap-0.5 text-[11px]"
                                >
                                  <Navigation className="w-3 h-3 fill-current" />
                                  <span>Nav</span>
                                </a>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedSchoolForVisit(stop.school);
                                    setIsVisitModalOpen(true);
                                  }}
                                  className="px-1.5 py-0.5 text-[10px] font-bold bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-800"
                                >
                                  Visit
                                </button>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  title="Replace with another school"
                                  onClick={() =>
                                    setModalState({
                                      isOpen: true,
                                      mode: 'REPLACE',
                                      date: day.date,
                                      dayLabel: day.dayLabel,
                                      oldSchool: stop.school,
                                      currentRouteStops: stops,
                                    })
                                  }
                                  className="p-1 rounded text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 transition"
                                >
                                  <ArrowRightLeft className="w-3 h-3" />
                                </button>

                                <button
                                  type="button"
                                  title="Delete school from this day's route"
                                  onClick={() =>
                                    handleRemoveStop(day.date, stop.school.id, stop.school.school_name)
                                  }
                                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : day.isForcedHoliday ? (
                  <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 text-center space-y-2.5 shadow-sm">
                    <div className="text-3xl">⚠️</div>
                    <p className="text-xs font-black text-amber-950 uppercase tracking-wide">
                      Forced Non-Working Holiday Declared
                    </p>
                    <p className="text-xs text-amber-900 max-w-lg mx-auto leading-relaxed">
                      {day.holidayLabel || 'Due to unexpected closure, bandh, or severe weather conditions, field outreach was paused and route safely handed off to the next working day.'}
                    </p>
                    <div className="pt-1">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-200/80 text-amber-950 font-bold text-xs border border-amber-300/80">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        <span>Route circuit safely preserved & rolled forward</span>
                      </span>
                    </div>
                  </div>
                ) : day.isHoliday ? (
                  <div className="p-5 rounded-3xl bg-emerald-50/70 border border-emerald-200 text-center space-y-2">
                    <div className="text-2xl">🌿</div>
                    <p className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                      Weekly Non-Working Holiday
                    </p>
                    <p className="text-xs text-slate-600 max-w-md mx-auto">
                      Sunday is designated as your weekly rest day. No school visits are scheduled.
                    </p>
                    <div className="pt-1">
                      <Link
                        href="/route-planner"
                        className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition"
                      >
                        <span>Plan Monday Route</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-50 text-center text-xs text-slate-500">
                    No stops assigned for this date.{' '}
                    <Link href={`/route-planner?date=${day.date}`} className="text-emerald-700 font-bold underline">
                      Click here to plan route for {day.dayLabel}
                    </Link>
                  </div>
                )}

                {/* AI Route Advice Box (if available) */}
                {day.summary?.ai_summary && (
                  <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-2xl text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>AI Field Assistant Strategy for {day.dayLabel}</span>
                    </div>
                    <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                      {day.summary.ai_summary}
                    </p>
                  </div>
                )}

                {/* DAILY REMARKS SECTION (As Requested in Prompt!) */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span>Daily Remarks & Field Notes for {day.dayLabel} ({day.date})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveRemarks(day.date, true)}
                        disabled={savingDate === day.date}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-100/70 hover:bg-indigo-100 transition"
                        title="Analyze with AI"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>AI Route Advice</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSaveRemarks(day.date, false)}
                        disabled={savingDate === day.date}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{savingDate === day.date ? 'Saving...' : 'Save Remarks'}</span>
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={2}
                    value={dailyRemarks[day.date] || ''}
                    onChange={(e) =>
                      setDailyRemarks({ ...dailyRemarks, [day.date]: e.target.value })
                    }
                    placeholder={`Update field remarks for ${day.dayLabel} (e.g. Principal timings, key agreements, student strength, or route roadblocks)...`}
                    className="w-full text-xs border border-slate-300 rounded-xl p-3 bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Record Visit Modal */}
      <RecordVisitModal
        school={selectedSchoolForVisit}
        isOpen={isVisitModalOpen}
        onClose={() => {
          setIsVisitModalOpen(false);
          setSelectedSchoolForVisit(null);
        }}
        onVisitSaved={fetchSchedule}
      />

      {/* Add or Replace School Modal for 3-Day Schedule */}
      <AddOrReplaceSchoolModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
        mode={modalState.mode}
        date={modalState.date}
        dayLabel={modalState.dayLabel}
        oldSchool={modalState.oldSchool}
        currentRouteStops={modalState.currentRouteStops}
        onSuccess={() => {
          fetchSchedule();
        }}
      />

      {/* Forced Holiday Hand-Off Modal */}
      <ForcedHolidayModal
        isOpen={forcedHolidayState.isOpen}
        onClose={() => setForcedHolidayState((prev) => ({ ...prev, isOpen: false }))}
        date={forcedHolidayState.date}
        dayLabel={forcedHolidayState.dayLabel}
        onSuccess={() => {
          fetchSchedule();
        }}
      />
    </div>
  );
}
