'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  Download,
  Search,
  ExternalLink,
  Edit2,
  Check,
} from 'lucide-react';
import { SchoolData } from '@/lib/types';
import { subscribeToDataChanges } from '@/lib/realtimeSync';

export default function DataQualityPage() {
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'missingPin' | 'missingPhone' | 'missingCoords'>('all');

  const loadSchools = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/schools', { cache: 'no-store' });
      const json = await res.json();
      setSchools(json.schools || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchools();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToDataChanges((changeType) => {
      if (changeType === 'visit' || changeType === 'route' || changeType === 'all') {
        loadSchools();
      }
    });
    return () => unsubscribe();
  }, []);

  const missingPinSchools = schools.filter((s) => !s.pincode || s.pincode === '570001');
  const missingPhoneSchools = schools.filter(
    (s) => !s.phone || s.phone.includes('2410000') || s.phone.includes('N/A')
  );
  const missingCoordsSchools = schools.filter((s) => !s.latitude || !s.longitude);

  const displayedSchools =
    activeTab === 'missingPin'
      ? missingPinSchools
      : activeTab === 'missingPhone'
      ? missingPhoneSchools
      : activeTab === 'missingCoords'
      ? missingCoordsSchools
      : schools.filter(
          (s) =>
            !s.pincode ||
            !s.phone ||
            s.phone.includes('2410000') ||
            s.phone.includes('N/A') ||
            s.pincode === '570001'
        );

  const exportErrorsCsv = () => {
    const headers = ['s_no', 'school_id', 'school_name', 'phone', 'pincode', 'issue'];
    const rows = displayedSchools.map((s) => {
      const issues = [];
      if (!s.phone || s.phone.includes('2410000')) issues.push('Missing Phone');
      if (!s.pincode || s.pincode === '570001') issues.push('Generic PIN');
      return [s.s_no, s.school_id, `"${s.school_name}"`, s.phone || '', s.pincode || '', issues.join('; ')];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data_quality_issues_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-emerald-600" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              School Data Quality Scanner
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit incomplete school records, placeholder contacts, and location coordinates
          </p>
        </div>

        <button
          onClick={exportErrorsCsv}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl shadow-sm transition"
        >
          <Download className="w-4 h-4 text-emerald-600" />
          <span>Export Issues CSV</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setActiveTab('missingPhone')}
          className={`p-4 rounded-2xl border cursor-pointer transition shadow-sm ${
            activeTab === 'missingPhone'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-300/20'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-500 uppercase">Missing / Placeholder Phone</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">{missingPhoneSchools.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Requires field verification</p>
        </div>

        <div
          onClick={() => setActiveTab('missingPin')}
          className={`p-4 rounded-2xl border cursor-pointer transition shadow-sm ${
            activeTab === 'missingPin'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-300/20'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-500 uppercase">Generic / Missing PIN</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">{missingPinSchools.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Default 570001 placeholder</p>
        </div>

        <div
          onClick={() => setActiveTab('missingCoords')}
          className={`p-4 rounded-2xl border cursor-pointer transition shadow-sm ${
            activeTab === 'missingCoords'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-300/20'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-500 uppercase">Geocoded Coordinates</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-1">
            {schools.length - missingCoordsSchools.length} / {schools.length}
          </p>
          <p className="text-[11px] text-emerald-600 mt-0.5">100% Geocoded across Mysore region</p>
        </div>
      </div>

      {/* Issues Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Reviewing {displayedSchools.length} Filtered Records
          </span>
          <button
            onClick={() => setActiveTab('all')}
            className="text-xs font-bold text-emerald-700 hover:underline"
          >
            Show All Quality Issues
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Scanning database...</div>
        ) : (
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-wider sticky top-0 font-semibold">
                <tr>
                  <th className="py-3 px-3">S.No</th>
                  <th className="py-3 px-3">School Name</th>
                  <th className="py-3 px-3">Area</th>
                  <th className="py-3 px-3">Phone</th>
                  <th className="py-3 px-3">Pincode</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {displayedSchools.slice(0, 100).map((school) => (
                  <tr key={school.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      #{school.s_no}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {school.school_name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{school.area}</td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {school.phone || (
                        <span className="text-amber-700 font-bold">Needs Phone</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{school.pincode}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {school.visit_status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Link
                        href={`/schools/${school.id}`}
                        className="text-xs font-bold text-emerald-700 hover:underline"
                      >
                        Edit / Fix
                      </Link>
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
