'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Navigation,
  ClipboardList,
  RotateCcw,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Award,
  Sparkles,
  User,
  Users,
  Building,
} from 'lucide-react';
import RecordVisitModal from '@/components/RecordVisitModal';
import RescheduleModal from '@/components/RescheduleModal';
import PitchCard from '@/components/PitchCard';
import { SchoolData } from '@/lib/types';
import { subscribeToDataChanges } from '@/lib/realtimeSync';

export default function SchoolDetailsPage() {
  const params = useParams();
  const id = params?.id as string;

  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);

  const fetchSchool = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/schools/${id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('School not found');
      const json = await res.json();
      setSchool(json.school);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchSchool();
  }, [id]);

  useEffect(() => {
    const unsubscribe = subscribeToDataChanges((changeType) => {
      if (changeType === 'visit' || changeType === 'route' || changeType === 'all') {
        if (id) fetchSchool();
      }
    });
    return () => unsubscribe();
  }, [id]);

  if (loading) {
    return (
      <div className="p-8 text-center animate-pulse text-slate-400">
        Loading school details...
      </div>
    );
  }

  if (error || !school) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-800">
        <h3 className="font-bold text-base">Error Loading School</h3>
        <p className="text-xs mt-1">{error || 'School not found'}</p>
        <Link
          href="/schools"
          className="inline-flex items-center gap-1 mt-4 text-xs font-bold text-red-700 underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to School Master</span>
        </Link>
      </div>
    );
  }

  const isVisited = school.visit_status !== 'NOT VISITED';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back button */}
      <Link
        href="/schools"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Schools List</span>
      </Link>

      {/* Main Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                #{school.s_no}
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                {school.school_id}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                {school.board}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-300">
                Category {school.opportunity_type}
              </span>
              <span
                className={`text-xs font-black px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1.5 ${
                  isVisited
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-400'
                    : 'bg-rose-100 text-rose-800 border-rose-400'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isVisited ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
                <span>{isVisited ? 'VISITED' : 'NOT VISITED'}</span>
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
              {school.school_name}
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-1.5 mt-1">
              <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{school.address}</span>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={
                school.google_maps_url ||
                `https://www.google.com/maps/search/?api=1&query=${school.latitude},${school.longitude}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition shadow-sm"
            >
              <Navigation className="w-4 h-4 text-emerald-600 fill-current" />
              <span>Navigate in Maps</span>
            </a>

            {isVisited && (
              <button
                onClick={() => setIsRescheduleModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl shadow-sm transition active:scale-95 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reschedule / Add to Route</span>
              </button>
            )}

            <button
              onClick={() => setIsVisitModalOpen(true)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl shadow-sm transition active:scale-95 ${
                isVisited
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isVisited ? (
                <>
                  <ClipboardList className="w-4 h-4" />
                  <span>Log Revisit Notes</span>
                </>
              ) : (
                <>
                  <ClipboardList className="w-4 h-4" />
                  <span>Record Visit</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Facts Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Principal / Contact</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block line-clamp-1">
              {school.principal_name || school.contact_person || 'Principal'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Phone / Mobile</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block">
              {school.phone ? (
                <a href={`tel:${school.phone}`} className="hover:underline text-emerald-700">
                  {school.phone}
                </a>
              ) : (
                '—'
              )}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Recommended Programme</span>
            <span className="font-bold text-emerald-800 text-sm mt-0.5 flex items-center gap-1">
              <Award className="w-4 h-4 text-emerald-600" />
              {school.recommended_programme}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Student Strength</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block">
              {school.student_strength || '~250 students'}
            </span>
          </div>
        </div>
      </div>

      {/* Sales Pitch Generator Card */}
      <PitchCard school={school as unknown as SchoolData} />

      {/* Full Visit History (Never Overwritten!) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-base">Visit History ({school.visits?.length || 0} Records)</h3>
          </div>
          <button
            onClick={() => setIsVisitModalOpen(true)}
            className="text-xs font-bold text-emerald-700 hover:underline"
          >
            + Add Visit Log
          </button>
        </div>

        {school.visits && school.visits.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {school.visits.map((visit: any, index: number) => (
              <div key={visit.id} className="py-3.5 space-y-1.5 text-xs text-slate-700">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {new Date(visit.visit_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-slate-100 text-slate-800 border border-slate-200">
                      Visit #{school.visits.length - index}
                    </span>
                    <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800">
                      Outcome: {visit.outcome}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                    {visit.location_verified ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Verified ({Math.round(visit.distance_from_school || 0)}m)
                      </span>
                    ) : (
                      <span className="text-slate-400">Manual Entry</span>
                    )}
                  </div>
                </div>

                <div className="text-slate-600">
                  <span className="font-semibold text-slate-800">Representative:</span> {visit.representative} •{' '}
                  <span className="font-semibold text-slate-800">Met:</span> {visit.contact_person} ({visit.designation}) •{' '}
                  <span className="font-semibold text-slate-800">Programme:</span> {visit.programme_discussed} •{' '}
                  <span className="font-semibold text-slate-800">Interest:</span> {visit.interest_level}
                </div>

                {visit.notes && (
                  <p className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 text-slate-700 italic">
                    &ldquo;{visit.notes}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 py-4 text-center">
            No visits recorded for this school yet. Click &ldquo;Record Visit&rdquo; to log your initial outreach.
          </p>
        )}
      </div>

      {/* Record Visit Modal */}
      <RecordVisitModal
        school={school}
        isOpen={isVisitModalOpen}
        onClose={() => setIsVisitModalOpen(false)}
        onVisitSaved={fetchSchool}
      />

      {/* Reschedule Revisit Modal */}
      <RescheduleModal
        school={school}
        isOpen={isRescheduleModalOpen}
        onClose={() => setIsRescheduleModalOpen(false)}
        onSuccess={fetchSchool}
      />
    </div>
  );
}
