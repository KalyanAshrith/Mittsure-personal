'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ClipboardList,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  RotateCcw,
  Navigation,
  Sparkles,
} from 'lucide-react';
import { SchoolVisitData } from '@/lib/types';
import { subscribeToDataChanges } from '@/lib/realtimeSync';

export default function VisitsPage() {
  const [visits, setVisits] = useState<SchoolVisitData[]>([]);
  const [loading, setLoading] = useState(true);
  const [outcomeFilter, setOutcomeFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const fetchVisits = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (outcomeFilter !== 'ALL') params.append('outcome', outcomeFilter);
      const res = await fetch(`/api/visits?${params.toString()}`, { cache: 'no-store' });
      const json = await res.json();
      setVisits(json.visits || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisits();
  }, [outcomeFilter]);

  useEffect(() => {
    const unsubscribe = subscribeToDataChanges((changeType) => {
      if (changeType === 'visit' || changeType === 'all') {
        fetchVisits();
      }
    });
    return () => unsubscribe();
  }, [outcomeFilter]);

  const filteredVisits = visits.filter((v) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      v.school?.school_name.toLowerCase().includes(s) ||
      v.contact_person?.toLowerCase().includes(s) ||
      v.notes?.toLowerCase().includes(s) ||
      v.programme_discussed.toLowerCase().includes(s)
    );
  });

  const uniqueSchoolCount = new Set(visits.map((v) => v.school_id)).size;

  return (
    <div className="space-y-6">
      {/* Header & Stats Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-emerald-600" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Field Visit History & CRM
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Chronological audit of every field engagement • Revisits are permanently preserved
          </p>
        </div>

        {/* Counter Pill */}
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-2 text-xs shadow-sm">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">
              Unique Schools
            </span>
            <span className="text-base font-black text-emerald-700 font-mono">
              {uniqueSchoolCount}
            </span>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">
              Total Visit Events
            </span>
            <span className="text-base font-black text-slate-900 font-mono">
              {visits.length}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search school name, contact, notes..."
            className="w-full text-xs border border-slate-300 rounded-xl pl-9 pr-3 py-2 focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto text-xs">
          <select
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value)}
            className="w-full sm:w-auto border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 font-semibold text-slate-800"
          >
            <option value="ALL">All Outcomes</option>
            <option value="Registration Confirmed">Registration Confirmed</option>
            <option value="Registration Discussion">Registration Discussion</option>
            <option value="Interested">Interested</option>
            <option value="Follow-up Required">Follow-up Required</option>
            <option value="Principal Not Available">Principal Not Available</option>
            <option value="Not Interested">Not Interested</option>
          </select>
        </div>
      </div>

      {/* Visits Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Loading visit logs...</div>
        ) : filteredVisits.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No visits match the current criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">School Name</th>
                  <th className="py-3 px-3">Contact Person</th>
                  <th className="py-3 px-3">Programme</th>
                  <th className="py-3 px-3">Outcome</th>
                  <th className="py-3 px-3">Interest</th>
                  <th className="py-3 px-3">GPS Verify</th>
                  <th className="py-3 px-3">Notes</th>
                  <th className="py-3 px-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredVisits.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {new Date(v.visit_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="py-3 px-3">
                      {v.school ? (
                        <Link
                          href={`/schools/${v.school.id}`}
                          className="font-bold text-slate-900 hover:text-emerald-700 hover:underline block"
                        >
                          {v.school.school_name}
                        </Link>
                      ) : (
                        <span className="font-bold text-slate-900">Unknown School</span>
                      )}
                      <span className="text-[10px] text-slate-400">
                        {v.school?.area} • #{v.school?.s_no}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-900 block">
                        {v.contact_person || 'Principal'}
                      </span>
                      <span className="text-[10px] text-slate-500">{v.designation}</span>
                    </td>

                    <td className="py-3 px-3 font-medium text-slate-700">
                      {v.programme_discussed}
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] whitespace-nowrap ${
                          v.outcome.includes('Registration')
                            ? 'bg-purple-100 text-purple-800'
                            : v.outcome === 'Interested'
                            ? 'bg-blue-100 text-blue-800'
                            : v.outcome === 'Follow-up Required'
                            ? 'bg-amber-100 text-amber-800'
                            : v.outcome === 'Not Interested'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {v.outcome}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {v.interest_level}
                    </td>

                    <td className="py-3 px-3">
                      {v.location_verified ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Verified ({Math.round(v.distance_from_school || 0)}m)</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Manual</span>
                      )}
                    </td>

                    <td className="py-3 px-3 max-w-[180px] truncate text-slate-600">
                      {v.notes || '—'}
                    </td>

                    <td className="py-3 px-3 text-right">
                      {v.school && (
                        <Link
                          href={`/schools/${v.school.id}`}
                          className="text-xs font-bold text-emerald-700 hover:underline"
                        >
                          View
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
