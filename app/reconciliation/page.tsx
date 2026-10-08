'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { subscribeToDataChanges, notifyDataChange } from '@/lib/realtimeSync';

interface ReconciliationData {
  totalAssigned: number;
  completedCount: number;
  remainingCount: number;
  completedSNoList: number[];
  completedSchools: Array<{
    s_no: number;
    school_id: string;
    school_name: string;
    area: string;
    board: string;
    status: string;
    latest_outcome: string;
  }>;
  previousRepSchools: Array<{
    s_no: number;
    school_id: string;
    school_name: string;
    area: string;
  }>;
}

interface ComparisonResult {
  currentCount: number;
  importedCount: number;
  matchedCount: number;
  matched: number[];
  extraInCurrent: number[];
  missingInCurrent: number[];
  missingSchools: Array<{
    s_no: number;
    school_name: string;
    area: string;
    board: string;
  }>;
  message: string;
}

export default function ReconciliationPage() {
  const [data, setData] = useState<ReconciliationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [inputSNos, setInputSNos] = useState('');
  const [comparing, setComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [applying, setApplying] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchReconciliationData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reconciliation', { cache: 'no-store' });
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error('Failed to load reconciliation data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReconciliationData();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToDataChanges((changeType) => {
      if (changeType === 'visit' || changeType === 'route' || changeType === 'all') {
        fetchReconciliationData();
      }
    });
    return () => unsubscribe();
  }, []);

  const handleCompare = async () => {
    if (!inputSNos.trim()) {
      setFeedback({ type: 'error', message: 'Please paste or enter S.Nos to reconcile.' });
      return;
    }

    setComparing(true);
    setFeedback(null);
    try {
      // Parse numbers from input string (handles comma, space, newline, brackets)
      const parsedSNos = inputSNos
        .replace(/[\[\]]/g, '')
        .split(/[,\s\n]+/)
        .map(n => parseInt(n.trim(), 10))
        .filter(n => !isNaN(n) && n >= 1 && n <= 487);

      if (parsedSNos.length === 0) {
        setFeedback({ type: 'error', message: 'No valid S.Nos (1 to 487) found in input.' });
        setComparing(false);
        return;
      }

      const res = await fetch('/api/reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'COMPARE',
          importedSNos: parsedSNos,
        }),
      });

      const result = await res.json();
      if (res.ok) {
        setComparisonResult(result);
        setFeedback({ type: 'success', message: result.message });
      } else {
        setFeedback({ type: 'error', message: result.error || 'Comparison failed.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error running reconciliation.' });
    } finally {
      setComparing(false);
    }
  };

  const handleApplyImported = async () => {
    if (!comparisonResult || comparisonResult.missingInCurrent.length === 0) {
      setFeedback({ type: 'error', message: 'No missing S.Nos to apply.' });
      return;
    }

    setApplying(true);
    try {
      const res = await fetch('/api/reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPLY_IMPORTED',
          bulkUpdateSNos: comparisonResult.missingInCurrent,
        }),
      });

      const result = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: result.message });
        setComparisonResult(null);
        setInputSNos('');
        await fetchReconciliationData();
        notifyDataChange('visit');
      } else {
        setFeedback({ type: 'error', message: result.error || 'Failed to apply updates.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error updating schools.' });
    } finally {
      setApplying(false);
    }
  };

  const loadSampleDiff = () => {
    // Current completed: 22 schools. Let's provide 25 schools (22 matched + 3 new: 74, 75, 81)
    if (!data) return;
    const sample = [...data.completedSNoList, 74, 75, 81];
    setInputSNos(sample.join(', '));
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/40 text-indigo-100 border border-indigo-300/30">
                AUDIT & S.NO RECONCILIATION
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white">
                Master 487 Database
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Data Reconciliation & Visit Audit</h1>
            <p className="text-indigo-200 text-sm mt-1 max-w-2xl">
              Compare reported field completions against the master 487-school allotment. Detect discrepancies, resolve missing S.Nos, and maintain database integrity for <strong>Nichhenametla Kalyan Ashrith</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/completed"
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold transition"
            >
              View Completed ({data?.completedCount ?? 22})
            </Link>
            <Link
              href="/remaining"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition"
            >
              View Remaining ({data?.remainingCount ?? 465})
            </Link>
          </div>
        </div>

        {/* Master KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/20">
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-indigo-200 text-xs font-medium uppercase tracking-wider">Total Allotted</p>
            <p className="text-2xl font-black">{data?.totalAssigned ?? 487}</p>
            <p className="text-xs text-indigo-300/80 mt-0.5">Master Mysore allotment</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-indigo-200 text-xs font-medium uppercase tracking-wider">Personally Completed</p>
            <p className="text-2xl font-black text-emerald-400">{data?.completedCount ?? 22}</p>
            <p className="text-xs text-indigo-300/80 mt-0.5">{(((data?.completedCount ?? 22) / 487) * 100).toFixed(2)}% completion</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-indigo-200 text-xs font-medium uppercase tracking-wider">Remaining Unvisited</p>
            <p className="text-2xl font-black text-amber-400">{data?.remainingCount ?? 465}</p>
            <p className="text-xs text-indigo-300/80 mt-0.5">{(((data?.remainingCount ?? 465) / 487) * 100).toFixed(2)}% remaining</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-indigo-200 text-xs font-medium uppercase tracking-wider">Previous Rep Visited</p>
            <p className="text-2xl font-black text-purple-300">{data?.previousRepSchools.length ?? 0}</p>
            <p className="text-xs text-indigo-300/80 mt-0.5">Separate rep tracking</p>
          </div>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
          feedback.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            <span className="font-bold">{feedback.type === 'success' ? '✓' : '⚠'}</span>
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs opacity-70 hover:opacity-100">Dismiss</button>
        </div>
      )}

      {/* Active Database S.No Matrix */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Current Verified Completed S.No Matrix</h3>
            <p className="text-xs text-slate-500">
              The exactly verified {data?.completedCount ?? 22} schools personally visited by Nichhenametla Kalyan Ashrith.
            </p>
          </div>
          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
            {data?.completedCount ?? 22} Verified S.Nos
          </span>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {data?.completedSNoList.map(sNo => (
            <span
              key={sNo}
              className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition"
            >
              #{sNo}
            </span>
          ))}
        </div>
      </div>

      {/* Reconciliation Tool Box */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Reconcile External S.No Records</h3>
            <p className="text-xs text-slate-500">
              Paste S.Nos from your handwritten visit log, WhatsApp updates, or CRM export to audit against the database.
            </p>
          </div>
          <button
            onClick={loadSampleDiff}
            className="text-xs text-indigo-600 font-semibold hover:text-indigo-800 underline self-start md:self-auto"
          >
            Load Sample Discrepancy Test (25 S.Nos)
          </button>
        </div>

        <textarea
          rows={3}
          value={inputSNos}
          onChange={(e) => setInputSNos(e.target.value)}
          placeholder="Paste comma-separated or space-separated S.Nos (e.g., 52, 57, 67, 86, 87, 97, 109, 147, 182, 197, 413, 481, 72, 107, 223, 242, 258, 282, 82, 113, 203, 204)..."
          className="w-full p-3 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        <div className="flex items-center gap-3">
          <button
            onClick={handleCompare}
            disabled={comparing || !inputSNos.trim()}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {comparing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Analyzing Differences...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Compare & Audit S.Nos
              </>
            )}
          </button>
          {comparisonResult && (
            <button
              onClick={() => {
                setComparisonResult(null);
                setInputSNos('');
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium transition"
            >
              Keep Current App Data & Clear
            </button>
          )}
        </div>
      </div>

      {/* Comparison Results Card */}
      {comparisonResult && (
        <div className="bg-white p-6 rounded-xl border border-indigo-200 shadow-md space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                AUDIT AUDIT REPORT
              </span>
              <h3 className="font-bold text-slate-900 text-lg mt-1">Discrepancy Analysis Results</h3>
            </div>
            {comparisonResult.missingInCurrent.length > 0 && (
              <button
                onClick={handleApplyImported}
                disabled={applying}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {applying ? 'Applying Updates...' : `Accept & Update Missing (${comparisonResult.missingInCurrent.length})`}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Matched */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Matched in Both</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-black text-xs">
                  {comparisonResult.matched.length} S.Nos
                </span>
              </div>
              <p className="text-xs text-emerald-700 mb-3">Both active CRM and uploaded input agree these are completed.</p>
              <div className="flex flex-wrap gap-1">
                {comparisonResult.matched.map(s => (
                  <span key={s} className="px-2 py-0.5 rounded bg-emerald-200/80 text-emerald-900 font-mono text-xs font-bold">
                    #{s}
                  </span>
                ))}
              </div>
            </div>

            {/* Missing in Current DB */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Missing in App DB</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-black text-xs">
                  {comparisonResult.missingInCurrent.length} S.Nos
                </span>
              </div>
              <p className="text-xs text-amber-700 mb-3">Present in your input, but currently marked as unvisited in app.</p>
              <div className="flex flex-wrap gap-1">
                {comparisonResult.missingInCurrent.length === 0 ? (
                  <span className="text-xs text-amber-600 font-medium italic">None. App has all input schools.</span>
                ) : (
                  comparisonResult.missingInCurrent.map(s => (
                    <span key={s} className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-mono text-xs font-bold border border-amber-300">
                      #{s}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Extra in Current DB */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Extra in App DB</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-black text-xs">
                  {comparisonResult.extraInCurrent.length} S.Nos
                </span>
              </div>
              <p className="text-xs text-slate-600 mb-3">Completed in app DB, but omitted from your uploaded input list.</p>
              <div className="flex flex-wrap gap-1">
                {comparisonResult.extraInCurrent.length === 0 ? (
                  <span className="text-xs text-slate-500 font-medium italic">None. Complete match.</span>
                ) : (
                  comparisonResult.extraInCurrent.map(s => (
                    <span key={s} className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-mono text-xs font-bold">
                      #{s}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Missing Schools Table Preview */}
          {comparisonResult.missingSchools && comparisonResult.missingSchools.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden mt-4">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 text-xs font-bold text-slate-700">
                Detailed Inspection: Schools to be Marked Completed
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="py-2 px-3">S.No</th>
                    <th className="py-2 px-3">School Name</th>
                    <th className="py-2 px-3">Area</th>
                    <th className="py-2 px-3">Board</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {comparisonResult.missingSchools.map(s => (
                    <tr key={s.s_no} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono font-bold text-amber-700">#{s.s_no}</td>
                      <td className="py-2 px-3 font-semibold text-slate-800">{s.school_name}</td>
                      <td className="py-2 px-3 text-slate-600">{s.area}</td>
                      <td className="py-2 px-3 text-slate-600">{s.board}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
