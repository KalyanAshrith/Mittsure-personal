'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Award,
  Target,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight,
} from 'lucide-react';

import { subscribeToDataChanges } from '@/lib/realtimeSync';

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard', { cache: 'no-store' });
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToDataChanges((changeType) => {
      if (changeType === 'visit' || changeType === 'route' || changeType === 'all') {
        loadStats();
      }
    });
    return () => unsubscribe();
  }, []);

  if (loading || !data) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs animate-pulse">
        Calculating performance analytics...
      </div>
    );
  }

  const { kpis, boardBreakdown, typeBreakdown, outcomeBreakdown } = data;

  const totalVisits = kpis.totalVisitEvents || 1;
  const registrationCount =
    outcomeBreakdown.find((o: any) => o.name?.includes('Registration'))?.count || 0;
  const interestedCount =
    outcomeBreakdown.find((o: any) => o.name === 'Interested')?.count || 0;
  const followUpCount =
    outcomeBreakdown.find((o: any) => o.name === 'Follow-up Required')?.count || 0;

  const registrationConversion = ((registrationCount / totalVisits) * 100).toFixed(1);
  const interestedConversion = ((interestedCount / totalVisits) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-emerald-600" />
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Field Outreach Analytics & KPI Tracker
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Conversion funnel, board coverage benchmarks, and target completion velocity
        </p>
      </div>

      {/* Target Progress Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <Target className="w-4 h-4 text-emerald-600" />
              <span>Overall Coverage Target (487 Schools)</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mt-1">
              {kpis.completed} of {kpis.totalAssigned} Schools Covered ({kpis.completionPercentage}%)
            </h2>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-500 block font-medium">Remaining Target</span>
            <span className="text-2xl font-black text-slate-800 font-mono">
              {kpis.remaining} Schools
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden border border-slate-200">
          <div
            className="bg-emerald-600 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(2, kpis.completionPercentage))}%` }}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs text-slate-600">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Daily Target</span>
            <span className="font-bold text-slate-900 text-sm">7 schools / day</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Weekly Target</span>
            <span className="font-bold text-slate-900 text-sm">35 schools / week</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Estimated Days to Finish</span>
            <span className="font-bold text-emerald-700 text-sm">
              ~{Math.ceil(kpis.remaining / 7)} field days
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Target Date</span>
            <span className="font-bold text-slate-900 text-sm">Nov 30, 2026</span>
          </div>
        </div>
      </div>

      {/* Conversion Funnel Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Registrations */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Confirmed Registrations
            </span>
            <Award className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-black text-purple-700 mt-2">{registrationCount}</p>
          <p className="text-xs text-slate-500 mt-1">
            <span className="font-bold text-slate-700">{registrationConversion}%</span> conversion of all logged visits
          </p>
        </div>

        {/* Interested */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Interested Leads
            </span>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-black text-blue-700 mt-2">{interestedCount}</p>
          <p className="text-xs text-slate-500 mt-1">
            <span className="font-bold text-slate-700">{interestedConversion}%</span> pipeline warmth rate
          </p>
        </div>

        {/* Follow-ups */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Follow-ups Scheduled
            </span>
            <Calendar className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-3xl font-black text-amber-600 mt-2">{followUpCount}</p>
          <p className="text-xs text-slate-500 mt-1">
            Active return meetings in pipeline
          </p>
        </div>
      </div>

      {/* Breakdowns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Board Distribution */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-900 text-sm sm:text-base">
            Master List Board Breakdown
          </h3>
          <div className="space-y-2.5">
            {boardBreakdown.map((b: any) => {
              const pct = ((b.count / kpis.totalAssigned) * 100).toFixed(1);
              return (
                <div key={b.name} className="text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{b.name}</span>
                    <span className="font-mono text-slate-500">
                      {b.count} schools ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Visit Outcomes Breakdown */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-900 text-sm sm:text-base">
            Visit Outcomes Distribution
          </h3>
          <div className="space-y-2.5">
            {outcomeBreakdown.map((o: any) => {
              const pct = ((o.count / totalVisits) * 100).toFixed(1);
              return (
                <div key={o.name} className="text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{o.name}</span>
                    <span className="font-mono text-slate-500">
                      {o.count} visits ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
