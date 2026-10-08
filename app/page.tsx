'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  School,
  CheckCircle2,
  XCircle,
  MapPin,
  Route,
  Calendar,
  Navigation,
  Compass,
  ArrowRight,
  Sparkles,
  Bike,
  PlusCircle,
  ExternalLink,
} from 'lucide-react';
import { SchoolData } from '@/lib/types';
import { subscribeToDataChanges, notifyDataChange } from '@/lib/realtimeSync';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [areaBreakdown, setAreaBreakdown] = useState<any[]>([]);
  const [togglingSchoolId, setTogglingSchoolId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dashRes, areaRes] = await Promise.all([
        fetch('/api/dashboard', { cache: 'no-store' }),
        fetch('/api/schools/area-breakdown?sortBy=proximity', { cache: 'no-store' }),
      ]);

      if (dashRes.ok) {
        const dashJson = await dashRes.json();
        setData(dashJson);
      }
      if (areaRes.ok) {
        const areaJson = await areaRes.json();
        setAreaBreakdown(areaJson.areas || []);
      }
    } catch (err) {
      console.error('Failed to load overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const unsubscribe = subscribeToDataChanges(() => {
      fetchData();
    });
    return () => unsubscribe();
  }, []);

  const handleQuickToggle = async (schoolId: string, currentVisited: boolean) => {
    setTogglingSchoolId(schoolId);
    try {
      const res = await fetch('/api/schools/quick-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, targetStatus: !currentVisited }),
      });
      if (res.ok) {
        notifyDataChange('school');
        fetchData();
      }
    } catch (err) {
      console.error('Error toggling school status:', err);
    } finally {
      setTogglingSchoolId(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-6 animate-pulse p-2">
        <div className="h-10 glass-pill w-72"></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 glass-card"></div>
          ))}
        </div>
        <div className="h-72 glass-panel"></div>
      </div>
    );
  }

  const kpis = data?.kpis || {
    totalAssigned: 487,
    completed: 68,
    remaining: 419,
    completionPercentage: 14.0,
  };

  const todayRoute = data?.todayRoute;
  const stops = todayRoute?.stops || [];

  return (
    <div className="space-y-7 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#59627E] uppercase tracking-wider mb-1">
            Outreach Intelligence &amp; Round Planning
          </p>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping-slow"></span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-light text-[#020C21] tracking-tight">
              Smarter Field Management <span className="font-black text-[#0F1B31]">Starts Here</span>
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#59627E] mt-1.5 font-medium">
            Managing <strong className="text-[#020C21] font-bold">{kpis.totalAssigned} Institutions</strong> across Mysuru from{' '}
            <strong className="text-[#4A78B0] font-bold">PG Base (Bogadi 2nd Stage)</strong>
          </p>
        </div>

        {/* Action Shortcuts */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/area-divide"
            className="glass-pill px-4 py-2 text-xs font-bold text-[#0F1B31] hover:bg-white/90 shadow-sm transition active:scale-95 flex items-center gap-1.5"
          >
            <MapPin className="w-3.5 h-3.5 text-[#4A78B0]" />
            <span>Area-wise Planning</span>
          </Link>

          <Link
            href="/route-planner"
            className="btn-cta px-4 py-2 text-xs font-black gap-2"
          >
            <span className="btn-knob w-5 h-5">
              <Route className="w-3 h-3 text-white" />
            </span>
            <span>Plan Round Route from PG</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI Cards (Total, Visited in Green, Unvisited in Red, Progress) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Allotted */}
        <Link
          href="/schools"
          className="glass-card p-5 border border-white/90 card-hover group block space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#59627E] group-hover:text-[#020C21] transition">
              Total Master Schools
            </span>
            <span className="glass-pill p-1.5 text-[#4A78B0]">
              <School className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-4xl sm:text-5xl font-extralight text-[#020C21] font-mono tracking-tight">
            {kpis.totalAssigned}
          </p>
          <p className="text-xs text-[#59627E] font-medium">Allotment across 51 Nagars</p>
        </Link>

        {/* Visited (Strictly Green) */}
        <Link
          href="/schools?filter=VISITED"
          className="glass-card p-5 border border-emerald-500/30 bg-emerald-500/5 card-hover group block space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">
              Visited Schools
            </span>
            <span className="badge-visited px-2 py-0.5 text-[10px]">
              GREEN
            </span>
          </div>
          <p className="text-4xl sm:text-5xl font-light text-emerald-800 font-mono tracking-tight">
            {kpis.completed}
          </p>
          <p className="text-xs text-emerald-700 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Successfully visited</span>
          </p>
        </Link>

        {/* Not Visited (Strictly Red) */}
        <Link
          href="/schools?filter=UNVISITED"
          className="glass-card p-5 border border-rose-500/30 bg-rose-500/5 card-hover group block space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-rose-800">
              Not Visited Schools
            </span>
            <span className="badge-not-visited px-2 py-0.5 text-[10px]">
              RED
            </span>
          </div>
          <p className="text-4xl sm:text-5xl font-light text-rose-800 font-mono tracking-tight">
            {kpis.remaining}
          </p>
          <p className="text-xs text-rose-700 font-bold flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" />
            <span>Pending field outreach</span>
          </p>
        </Link>

        {/* Completion Progress & PG Base */}
        <div className="glass-card p-5 border border-white/90 shadow-sm flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#59627E]">
                Outreach Progress
              </span>
              <span className="text-sm font-black text-[#020C21] font-mono">
                {kpis.completionPercentage}%
              </span>
            </div>
            {/* ConSentinel Progress Track */}
            <div className="track-meter mb-1.5">
              <div
                className="track-meter-fill"
                style={{ width: `${kpis.completionPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] font-mono text-[#59627E]">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-[#59627E]">
            <div className="flex items-center gap-1 font-medium">
              <MapPin className="w-3.5 h-3.5 text-[#4A78B0] flex-shrink-0" />
              <span className="truncate">Bogadi 2nd Stage PG</span>
            </div>
            <a
              href="https://www.google.com/maps/search/?api=1&query=12.3021,76.6178"
              target="_blank"
              rel="noopener noreferrer"
              className="glass-pill px-2 py-0.5 text-[10px] font-black text-[#4A78B0] hover:text-[#020C21] flex items-center gap-0.5"
            >
              <span>GPS</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Area-wise Quick Round-Trip Planner from PG Base */}
      <div className="glass-panel p-6 border border-white/90 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-[#4A78B0]" />
              <h2 className="text-lg font-black text-[#020C21]">
                Plan Area-Wise Round Trips from PG Base
              </h2>
            </div>
            <p className="text-xs text-[#59627E] mt-0.5">
              Select any Nagar or locality to instantly generate a round circuit starting and ending at your PG.
            </p>
          </div>

          <Link
            href="/area-divide"
            className="text-xs font-bold text-[#4A78B0] hover:text-[#020C21] flex items-center gap-1 transition"
          >
            <span>View All 51 Areas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Top 6 Proximity Areas Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {areaBreakdown.slice(0, 6).map((area) => (
            <div
              key={area.areaName}
              className="glass-card p-4 border border-white/90 card-hover flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <h3 className="font-black text-[#020C21] text-sm">{area.areaName}</h3>
                  <span className="glass-pill font-mono text-[10px] font-bold px-2 py-0.5 text-[#4A78B0]">
                    📍 {area.minDistFromPgKm} km from PG
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] mt-2">
                  <span className="px-2 py-0.5 rounded-full bg-white/90 border border-slate-200 font-bold text-[#0F182F]">
                    {area.totalSchools} Total
                  </span>
                  <span className="badge-visited px-2 py-0.5">
                    ✓ {area.visitedCount} Visited
                  </span>
                  <span className="badge-not-visited px-2 py-0.5">
                    ✕ {area.unvisitedCount} Pending
                  </span>
                </div>

                {/* Progress bar */}
                <div className="track-meter mt-3">
                  <div
                    className="track-meter-fill"
                    style={{
                      width: `${area.totalSchools > 0 ? (area.visitedCount / area.totalSchools) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Plan Round Route Button with ConSentinel CTA Knob */}
              <Link
                href={`/route-planner?area=${encodeURIComponent(area.areaName)}`}
                className="btn-cta w-full py-2 px-3 text-xs font-bold justify-center gap-2"
              >
                <span className="btn-knob w-4 h-4">
                  <Route className="w-2.5 h-2.5 text-white" />
                </span>
                <span>Plan Round Route for {area.areaName}</span>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Today's Round Circuit from PG Base */}
      {stops.length > 0 && (
        <div className="glass-panel p-6 border border-white/90 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/70 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Bike className="w-5 h-5 text-[#4A78B0]" />
                <h2 className="text-lg font-black text-[#020C21]">
                  {todayRoute.name || 'Today\'s Round Circuit from PG Base'}
                </h2>
              </div>
              <p className="text-xs text-[#59627E] mt-0.5">
                Round-trip starting at PG (Bogadi), covering {stops.length} schools, and returning to base.
              </p>
            </div>

            {/* Google Maps Multi-stop directions link */}
            <a
              href={`https://www.google.com/maps/dir/?api=1&origin=12.3021,76.6178&destination=12.3021,76.6178&waypoints=${stops
                .map((s: any) => `${s.school.latitude},${s.school.longitude}`)
                .join('|')}&travelmode=motorcycle`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-cta px-4 py-2 text-xs font-black gap-2"
            >
              <span className="btn-knob w-5 h-5">
                <Navigation className="w-3 h-3 text-white fill-current" />
              </span>
              <span>Open Full Round Trip in Google Maps</span>
            </a>
          </div>

          {/* Start PG Card */}
          <div className="p-3.5 rounded-2xl bg-[#0F1B31] text-white border border-white/30 flex items-center justify-between text-xs shadow-md">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-emerald-500 text-[#020C21] font-black flex items-center justify-center text-[10px]">
                🚩
              </span>
              <div>
                <span className="font-bold text-white block">Start Origin: PG Base (Bogadi 2nd Stage)</span>
                <span className="text-[11px] text-slate-300">661, Sahukar Chennaiah Road, Mysuru</span>
              </div>
            </div>
            <span className="font-mono text-[10px] text-emerald-300 font-bold">0.0 km</span>
          </div>

          {/* Stops List */}
          <div className="space-y-2.5">
            {stops.map((stop: any) => {
              const isVisited = stop.status === 'VISITED' || stop.school.visited_by_current_user;

              return (
                <div
                  key={stop.id}
                  className={`p-3.5 rounded-2xl glass-card transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-l-4 ${
                    isVisited
                      ? 'border-l-emerald-500 bg-emerald-500/5'
                      : 'border-l-rose-500 bg-rose-500/5'
                  }`}
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-[10px] px-2 py-0.5 rounded-lg bg-[#0F1B31] text-white">
                        Stop #{stop.optimized_sequence}
                      </span>
                      <span className="font-mono text-[10px] text-[#59627E] font-bold">
                        #{stop.school.s_no}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md glass-pill text-[#59627E]">
                        {stop.school.board}
                      </span>

                      {isVisited ? (
                        <span className="badge-visited px-2.5 py-0.5 text-[10px] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>VISITED</span>
                        </span>
                      ) : (
                        <span className="badge-not-visited px-2.5 py-0.5 text-[10px] flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          <span>NOT VISITED</span>
                        </span>
                      )}
                    </div>

                    <h4 className="font-black text-[#020C21] text-sm">
                      {stop.school.school_name}
                    </h4>

                    <p className="text-xs text-[#59627E]">
                      {stop.school.area} • {stop.school.address}
                    </p>
                  </div>

                  {/* Actions (1-Click Toggle + Nav) */}
                  <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      disabled={togglingSchoolId === stop.school.id}
                      onClick={() => handleQuickToggle(stop.school.id, isVisited)}
                      className={`px-3 py-1.5 rounded-xl font-black text-xs border transition active:scale-95 ${
                        isVisited
                          ? 'badge-not-visited hover:bg-rose-50'
                          : 'badge-visited bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-xs'
                      }`}
                    >
                      {isVisited ? '↩ Mark Unvisited' : '✓ Mark Visited'}
                    </button>

                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${stop.school.latitude},${stop.school.longitude}&travelmode=motorcycle`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-xl glass-pill hover:bg-emerald-50 text-[#59627E] hover:text-emerald-700 transition"
                      title="Navigate directly to school"
                    >
                      <Navigation className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Return to PG Card */}
          <div className="p-3.5 rounded-2xl bg-[#0F1B31] text-white border border-white/30 flex items-center justify-between text-xs shadow-md">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-teal-500 text-[#020C21] font-black flex items-center justify-center text-[10px]">
                🏁
              </span>
              <div>
                <span className="font-bold text-white block">Finish Destination: Return to PG Base</span>
                <span className="text-[11px] text-slate-300">Complete round circuit back to Bogadi base</span>
              </div>
            </div>
            <span className="font-mono text-xs text-emerald-300 font-black">
              Total: {todayRoute.total_distance_km || 9.5} km
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
