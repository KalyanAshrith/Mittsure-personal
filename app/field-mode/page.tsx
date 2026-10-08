'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bike,
  Navigation,
  Phone,
  ClipboardList,
  CheckCircle2,
  Clock,
  ArrowRight,
  MapPin,
  Compass,
  RotateCcw,
  Sparkles,
  Award,
  Wifi,
  WifiOff,
} from 'lucide-react';
import RecordVisitModal from '@/components/RecordVisitModal';
import NearbySchoolsModal from '@/components/NearbySchoolsModal';
import EveningWrapUpModal from '@/components/EveningWrapUpModal';
import AIMarkVisitedModal from '@/components/AIMarkVisitedModal';
import { RoutePlanData, RouteStopData, SchoolData } from '@/lib/types';
import { notifyDataChange, subscribeToDataChanges } from '@/lib/realtimeSync';

export default function FieldModePage() {
  const [routePlan, setRoutePlan] = useState<RoutePlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [selectedSchoolForVisit, setSelectedSchoolForVisit] = useState<SchoolData | null>(null);
  const [isNearbyModalOpen, setIsNearbyModalOpen] = useState(false);
  const [isEveningWrapUpOpen, setIsEveningWrapUpOpen] = useState(false);
  const [isAiMarkVisitedOpen, setIsAiMarkVisitedOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const fetchTodayRoute = async () => {
    try {
      setLoading(true);
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/routes/${todayStr}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.routePlan) {
          setRoutePlan(json.routePlan);
          // Auto find first unvisited stop
          const firstPending = json.routePlan.stops.findIndex(
            (s: RouteStopData) => s.status !== 'VISITED'
          );
          if (firstPending !== -1) {
            setCurrentStopIndex(firstPending);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayRoute();
    const unsubscribe = subscribeToDataChanges(() => {
      fetchTodayRoute();
    });
    return () => unsubscribe();
  }, []);

  const handleMarkVisited = async (stop: RouteStopData) => {
    try {
      // Quick log visit
      await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: stop.school.id,
          visit_date: new Date(),
          purpose: 'Field Mode Quick Outreach',
          programme_discussed: stop.school.recommended_programme || 'Both',
          contact_person: stop.school.principal_name || 'Principal',
          outcome: 'Interested',
          notes: 'Marked visited from on-bike Field Mode.',
        }),
      });

      notifyDataChange('visit', { schoolId: stop.school.id });

      // Advance to next stop
      if (routePlan && currentStopIndex < routePlan.stops.length - 1) {
        setCurrentStopIndex(currentStopIndex + 1);
      }
      fetchTodayRoute();
    } catch (e: any) {
      alert('Error marking visited: ' + e.message);
    }
  };

  const handleAddNearbySchoolInFieldMode = async (school: SchoolData) => {
    if (!routePlan) return;
    const existingIds = routePlan.stops.map((s) => s.school.id);
    if (existingIds.includes(school.id)) {
      alert(`"${school.school_name}" is already in today's route.`);
      return;
    }

    const updatedIds = [...existingIds, school.id];
    const todayStr = routePlan.date || new Date().toISOString().split('T')[0];

    try {
      const res = await fetch('/api/routes/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intermediateSchoolIds: updatedIds,
          date: todayStr,
          savePlan: true,
          travelMode: routePlan.travel_mode || 'TWO_WHEELER',
        }),
      });

      if (res.ok) {
        setToastMessage(`Added "${school.school_name}" to today's route.`);
        setIsNearbyModalOpen(false);
        notifyDataChange('route', { date: todayStr });
        fetchTodayRoute();
      } else {
        const err = await res.json();
        alert('Error adding school: ' + (err.error || 'Failed to update route'));
      }
    } catch (e: any) {
      alert('Error adding school: ' + e.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center text-slate-400">
        Loading Field Mode...
      </div>
    );
  }

  const stops = routePlan?.stops || [];
  const currentStop = stops[currentStopIndex];
  const nextStop = stops[currentStopIndex + 1];
  const completedCount = stops.filter((s) => s.status === 'VISITED').length;
  const remainingCount = stops.length - completedCount;

  if (!routePlan || stops.length === 0) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white border border-slate-200 rounded-3xl text-center space-y-4 shadow-sm mt-8">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
          <Bike className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900">No Active Route for Today</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Field Mode requires a planned daily circuit of schools. Use the Route Planner to pick your 7 candidate schools and optimize your circuit.
        </p>
        <Link
          href="/route-planner"
          className="inline-block w-full py-3 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-2xl shadow-md transition"
        >
          Plan Today&apos;s Route
        </Link>
      </div>
    );
  }

  const currentSchool = currentStop?.school;

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-28">
      {/* High-Contrast Field Mode Header */}
      <div className="glass-panel rounded-3xl p-4 sm:p-5 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#0F1B31] text-emerald-400 flex items-center justify-center font-black shadow-xs">
            <Bike className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-700">
                FIELD MODE
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <h1 className="text-sm sm:text-base font-extrabold text-[#020C21]">
              Stop #{currentStopIndex + 1} of {stops.length}
            </h1>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs text-[#59627E] font-medium block">Progress</span>
          <span className="text-sm font-mono font-bold text-emerald-700">
            {completedCount} Visited • {remainingCount} Left
          </span>
        </div>
      </div>

      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50/90 border border-emerald-300 rounded-2xl text-emerald-950 font-bold text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage('')}
            className="text-emerald-700 hover:text-emerald-900 font-bold text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* On-Road Quick Actions Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <button
          type="button"
          onClick={() => setIsNearbyModalOpen(true)}
          className="p-3 rounded-2xl glass-card text-[#0F182F] hover:text-[#020C21] font-black text-xs flex items-center justify-center gap-2 shadow-xs transition active:scale-95"
        >
          <Compass className="w-4 h-4 text-emerald-600" />
          <span>+ Nearby Schools</span>
        </button>

        <button
          type="button"
          onClick={() => setIsAiMarkVisitedOpen(true)}
          className="p-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs transition active:scale-95"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>AI Batch Mark</span>
        </button>

        <button
          type="button"
          onClick={() => setIsEveningWrapUpOpen(true)}
          className="p-3 rounded-2xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-[#020C21] font-black text-xs flex items-center justify-center gap-2 shadow-xs transition"
        >
          <span>🌆 Evening Wrap-Up</span>
        </button>
      </div>

      {/* CURRENT SCHOOL HERO CARD (Large High-Contrast for Outdoors) */}
      {currentSchool && (
        <div className="glass-card border-2 border-emerald-500/70 rounded-3xl p-5 shadow-md space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-[#0F1B31] text-white shadow-xs">
                  STOP #{currentStopIndex + 1}
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-white/80 text-[#0F182F] font-bold border border-white/80 shadow-xs">
                  #{currentSchool.s_no}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-white/80 text-[#0F182F] border border-white/80 shadow-xs">
                  {currentSchool.board}
                </span>
              </div>

              <h2 className="text-xl font-black text-[#020C21] mt-2.5 leading-tight">
                {currentSchool.school_name}
              </h2>

              <p className="text-xs font-medium text-[#59627E] flex items-center gap-1.5 mt-1.5">
                <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{currentSchool.address}</span>
              </p>
            </div>

            <span
              className={`text-xs px-3 py-1 rounded-full font-extrabold flex-shrink-0 border shadow-xs ${
                currentStop.status === 'VISITED' ? 'badge-visited' : 'badge-not-visited'
              }`}
            >
              {currentStop.status === 'VISITED' ? 'VISITED' : 'NOT VISITED'}
            </span>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-white/60">
            <div className="p-2.5 rounded-xl glass-card">
              <span className="text-[#59627E] block text-[10px] font-bold uppercase">
                Contact Person
              </span>
              <span className="font-bold text-[#020C21] text-sm block truncate mt-0.5">
                {currentSchool.principal_name || 'Principal'}
              </span>
            </div>

            <div className="p-2.5 rounded-xl glass-card">
              <span className="text-[#59627E] block text-[10px] font-bold uppercase">
                Recommended Pitch
              </span>
              <span className="font-bold text-emerald-800 text-sm block truncate mt-0.5">
                {currentSchool.recommended_programme}
              </span>
            </div>
          </div>

          {/* LARGE TOUCH ACTIONS ROW */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {/* NAVIGATE BUTTON */}
            <a
              href={
                currentSchool.google_maps_url ||
                `https://www.google.com/maps/dir/?api=1&destination=${currentSchool.latitude},${currentSchool.longitude}&travelmode=motorcycle`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-[#0F1B31] hover:bg-black active:scale-95 text-white font-black text-sm shadow-md transition"
            >
              <Navigation className="w-5 h-5 fill-current text-emerald-400" />
              <span>NAVIGATE</span>
            </a>

            {/* CALL BUTTON */}
            <a
              href={currentSchool.phone ? `tel:${currentSchool.phone}` : '#'}
              onClick={(e) => {
                if (!currentSchool.phone) {
                  e.preventDefault();
                  alert('No phone number recorded for this school.');
                }
              }}
              className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-white/80 hover:bg-white active:scale-95 text-[#0F182F] font-black text-sm border border-white/80 transition shadow-xs"
            >
              <Phone className="w-5 h-5 text-emerald-700" />
              <span>CALL</span>
            </a>
          </div>

          {/* SECONDARY LARGE ACTIONS */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setSelectedSchoolForVisit(currentSchool);
                setIsVisitModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition"
            >
              <ClipboardList className="w-4 h-4" />
              <span>RECORD VISIT</span>
            </button>

            <button
              onClick={() => handleMarkVisited(currentStop)}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-white/80 hover:bg-white active:scale-95 text-[#0F182F] font-bold text-xs sm:text-sm border border-white/80 transition shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>MARK VISITED</span>
            </button>
          </div>
        </div>
      )}

      {/* NEXT STOP PREVIEW & CONTROLS */}
      <div className="glass-panel rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-[#59627E] uppercase tracking-wider">
            Up Next (Stop #{currentStopIndex + 2})
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentStopIndex(Math.max(0, currentStopIndex - 1))}
              disabled={currentStopIndex === 0}
              className="px-2.5 py-1 rounded-xl bg-white/80 text-[#0F182F] font-bold disabled:opacity-30 border border-white/80 shadow-xs"
            >
              Prev
            </button>
            <button
              onClick={() => setCurrentStopIndex(Math.min(stops.length - 1, currentStopIndex + 1))}
              disabled={currentStopIndex === stops.length - 1}
              className="px-2.5 py-1 rounded-xl bg-[#0F1B31] text-white font-bold disabled:opacity-30 flex items-center gap-1 shadow-xs"
            >
              <span>Next</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {nextStop ? (
          <div className="p-3 rounded-2xl glass-card flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-[#020C21] block line-clamp-1">
                {nextStop.school.school_name}
              </span>
              <span className="text-[11px] text-[#59627E]">
                {nextStop.school.area} • {nextStop.school.board}
              </span>
            </div>
            <span className="text-emerald-700 font-mono font-bold bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md">
              ~{nextStop.leg_distance_km || 2.5} km
            </span>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900 font-bold text-center">
            You have reached the final school! Next destination is PG Base (Bogadi 2nd Stage).
          </div>
        )}
      </div>

      {/* All Stops Pill Navigator */}
      <div className="glass-panel rounded-3xl p-4 shadow-sm">
        <h3 className="text-xs font-bold text-[#59627E] uppercase tracking-wider mb-2.5">
          Route Stops Circuit
        </h3>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {stops.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrentStopIndex(idx)}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs ${
                currentStopIndex === idx
                  ? 'bg-[#0F1B31] text-white shadow-sm ring-2 ring-emerald-500'
                  : s.status === 'VISITED'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                  : 'bg-white/80 text-[#0F182F] hover:bg-white border border-white/80'
              }`}
            >
              <span>#{idx + 1}</span>
              <span className="max-w-[80px] truncate">{s.school.school_name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Record Visit Modal */}
      <RecordVisitModal
        school={selectedSchoolForVisit}
        isOpen={isVisitModalOpen}
        onClose={() => {
          setIsVisitModalOpen(false);
          setSelectedSchoolForVisit(null);
        }}
        onVisitSaved={fetchTodayRoute}
      />

      {/* Sticky Bottom Quick Action Bar for Outdoors / Motorcycling */}
      {currentSchool && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#E6EDF6]/90 backdrop-blur-md border-t border-white/80 p-3 shadow-2xl">
          <div className="max-w-xl mx-auto grid grid-cols-3 gap-2">
            <Link
              href="/route-planner"
              className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-2xl bg-white/80 hover:bg-white text-[#0F182F] font-bold text-xs active:scale-95 transition border border-white/80 shadow-xs"
            >
              <Compass className="w-4 h-4 text-emerald-600" />
              <span>MAP</span>
            </Link>

            <a
              href={
                currentSchool.google_maps_url ||
                `https://www.google.com/maps/dir/?api=1&destination=${currentSchool.latitude},${currentSchool.longitude}&travelmode=motorcycle`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-2xl bg-[#0F1B31] hover:bg-black text-white font-black text-xs active:scale-95 transition shadow-sm"
            >
              <Navigation className="w-4 h-4 fill-current text-emerald-400" />
              <span>NAVIGATE</span>
            </a>

            <button
              onClick={() => {
                setSelectedSchoolForVisit(currentSchool);
                setIsVisitModalOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-2xl bg-white/90 hover:bg-white text-[#020C21] font-black text-xs active:scale-95 transition border border-white/80 shadow-xs"
            >
              <ClipboardList className="w-4 h-4 text-emerald-700" />
              <span>LOG VISIT</span>
            </button>
          </div>
        </div>
      )}

      {/* NEARBY SCHOOLS MODAL */}
      <NearbySchoolsModal
        isOpen={isNearbyModalOpen}
        onClose={() => setIsNearbyModalOpen(false)}
        routeStops={stops.map((s) => s.school as unknown as SchoolData)}
        baseLocation={{
          address: 'Bogadi 2nd Stage PG, Mysuru',
          lat: 12.3021,
          lng: 76.6178,
        }}
        onAddSchool={handleAddNearbySchoolInFieldMode}
        selectedSchoolIds={stops.map((s) => s.school.id)}
      />

      {/* EVENING WRAP-UP MODAL */}
      <EveningWrapUpModal
        isOpen={isEveningWrapUpOpen}
        onClose={() => setIsEveningWrapUpOpen(false)}
        date={routePlan?.date || new Date().toISOString().split('T')[0]}
        routeStops={stops.map((s) => s.school as unknown as SchoolData)}
        onSuccess={() => {
          setToastMessage('Evening wrap-up complete! All visits recorded to CRM.');
          fetchTodayRoute();
        }}
      />

      {/* AI INTELLIGENT VISIT MARKER MODAL */}
      <AIMarkVisitedModal
        isOpen={isAiMarkVisitedOpen}
        onClose={() => setIsAiMarkVisitedOpen(false)}
        initialDate={routePlan?.date || new Date().toISOString().split('T')[0]}
        onSuccess={() => {
          setToastMessage('AI batch marking complete! All visits recorded to CRM.');
          fetchTodayRoute();
        }}
      />
    </div>
  );
}
