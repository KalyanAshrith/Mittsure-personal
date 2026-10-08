'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  RotateCcw,
  Check,
  HelpCircle,
} from 'lucide-react';
import { AIMatchedSchoolItem, AIParsedVisitListResult } from '@/lib/aiAssistant';
import { notifyDataChange } from '@/lib/realtimeSync';

interface AIMarkVisitedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialDate?: string;
}

export default function AIMarkVisitedModal({
  isOpen,
  onClose,
  onSuccess,
  initialDate,
}: AIMarkVisitedModalProps) {
  const [inputText, setInputText] = useState('');
  const [targetDate, setTargetDate] = useState<string>(() => {
    if (initialDate) return initialDate;
    const d = new Date();
    // Default to yesterday if morning, or today
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  });
  const [defaultOutcome, setDefaultOutcome] = useState('Interested');
  const [isParsing, setIsParsing] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [parseResult, setParseResult] = useState<AIParsedVisitListResult | null>(null);
  const [commitSummary, setCommitSummary] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleParse = async () => {
    if (!inputText.trim()) {
      setErrorMessage('Please enter or paste a list of schools to mark.');
      return;
    }

    setIsParsing(true);
    setErrorMessage('');
    setCommitSummary(null);

    try {
      const res = await fetch('/api/ai/parse-visited-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          date: targetDate,
          defaultOutcome,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to parse school list');
      }

      setParseResult(data.result);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during AI parsing.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleCommitMark = async () => {
    if (!parseResult || (parseResult.itemsToMarkCount ?? parseResult.matchedCount) === 0) {
      setErrorMessage('No valid schools to commit.');
      return;
    }

    setIsMarking(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/ai/mark-visited', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: targetDate,
          items: parseResult.items.filter((i) => !i.shouldSkipVisit),
          defaultOutcome,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to mark visits');
      }

      setCommitSummary(data);
      notifyDataChange('visit', { count: data.totalMarked, date: targetDate });
      notifyDataChange('school');
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record visits');
    } finally {
      setIsMarking(false);
    }
  };

  const loadSample = () => {
    setInputText(`Bharatiya Vidya Bhavan School Vijayanagar — S-75024
My First School — S-156333
Nios Nest Pre School — S-139929
Pusthi Pre School — S-163331
Tiny Teddy's Pre School Saraswathipuram — S-156504
Tiny Treasure Pre School Vijayanagar — S-162998
Vedic Pre School, Saraswathipuram — S.No. 470
Sri Gokula School, Kuvempunagar — S.No. 412`);
    setParseResult(null);
    setCommitSummary(null);
    setErrorMessage('');
  };

  const resetAll = () => {
    setInputText('');
    setParseResult(null);
    setCommitSummary(null);
    setErrorMessage('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020C21]/60 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white/95 backdrop-blur-2xl rounded-3xl shadow-[0_32px_64px_rgba(2,12,33,0.22)] border border-white/80 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#0F1B31] text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 border border-white/20 rounded-2xl text-white">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">AI Intelligent School Visit Marker</h2>
              <p className="text-xs text-slate-300">
                Paste raw school lists, codes, or field notes — auto-matches against 487 master schools
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Policy Alert Banner */}
        <div className="bg-emerald-50 px-6 py-2.5 border-b border-emerald-200 flex items-center justify-between text-xs text-emerald-800 font-medium">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>
              <strong>Zero Assumed Registrations Policy:</strong> All schools are strictly recorded as{' '}
              <code className="bg-emerald-100 px-1 py-0.5 rounded font-bold">VISITED</code> or{' '}
              <code className="bg-emerald-100 px-1 py-0.5 rounded font-bold">REVISITED</code> with outcome{' '}
              <code className="bg-emerald-100 px-1 py-0.5 rounded font-bold">Interested</code>.
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {commitSummary ? (
            /* Success Summary View */
            <div className="space-y-4 py-4">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">
                  Successfully Marked {commitSummary.totalMarked} School Visits!
                </h3>
                <p className="text-sm text-slate-600">
                  Recorded in database for Date: <strong>{commitSummary.date}</strong>
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 py-2">
                <div className="p-3 bg-slate-50 border rounded-xl text-center">
                  <span className="text-xs text-slate-500">Total Visits Logged</span>
                  <p className="text-2xl font-bold text-slate-800">{commitSummary.totalMarked}</p>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-center">
                  <span className="text-xs text-blue-700">First-Time Visits</span>
                  <p className="text-2xl font-bold text-blue-700">{commitSummary.firstVisitsCount}</p>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-center">
                  <span className="text-xs text-purple-700">Revisits Logged</span>
                  <p className="text-2xl font-bold text-purple-700">{commitSummary.revisitsCount}</p>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-center">
                  <span className="text-xs text-emerald-800 font-semibold">New Schools Created</span>
                  <p className="text-2xl font-bold text-emerald-700">{commitSummary.newSchoolsCreatedCount || 0}</p>
                </div>
                <div className="p-3 bg-slate-50 border rounded-xl text-center">
                  <span className="text-xs text-slate-500">Assumed Registrations</span>
                  <p className="text-2xl font-bold text-slate-700">0 (Strictly Kept)</p>
                </div>
              </div>

              <div className="border rounded-xl overflow-hidden text-sm">
                <div className="bg-slate-100 px-4 py-2 font-semibold text-slate-700 text-xs uppercase tracking-wider">
                  Updated Schools Summary
                </div>
                <div className="max-h-52 overflow-y-auto divide-y divide-slate-100">
                  {commitSummary.recordedVisits.map((v: any, idx: number) => (
                    <div key={idx} className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">
                          #{v.s_no} {v.school_name}
                        </span>
                        {v.isNewSchool && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-200 text-emerald-800 uppercase tracking-wider">
                            ✨ New School
                          </span>
                        )}
                        <span className="text-slate-500">({v.area} • {v.board})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            v.visit_type === 'REVISIT'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {v.visit_status}
                        </span>
                        <span className="px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800 text-[10px]">
                          {v.outcome}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={resetAll}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 text-sm"
                >
                  Mark Another List
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 text-sm shadow-md"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Input & Preview View */
            <div className="space-y-4">
              {/* Date and Outcome Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Visit Date (Date schools were visited)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="px-3 py-1.5 border rounded-xl text-sm w-full bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() - 1);
                        setTargetDate(d.toISOString().split('T')[0]);
                      }}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-slate-600 whitespace-nowrap"
                    >
                      Yesterday
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetDate(new Date().toISOString().split('T')[0])}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-slate-600 whitespace-nowrap"
                    >
                      Today
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Default Outcome (Zero Assumed Registrations)
                  </label>
                  <select
                    value={defaultOutcome}
                    onChange={(e) => setDefaultOutcome(e.target.value)}
                    className="px-3 py-1.5 border rounded-xl text-sm w-full bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Interested">Interested (Standard Field Outreach)</option>
                    <option value="Follow-up Required">Follow-up Required</option>
                    <option value="Principal Not Available">Principal Not Available</option>
                    <option value="Not Interested">Not Interested</option>
                  </select>
                </div>
              </div>

              {/* Text Input Area */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <span>Paste Marked Schools List</span>
                    <span className="text-slate-400 font-normal">
                      (Accepts S-Codes, S.Nos, Names, WhatsApp notes, tables)
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={loadSample}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
                  >
                    Load Yesterday's Example
                  </button>
                </div>
                <textarea
                  rows={5}
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    if (parseResult) setParseResult(null);
                  }}
                  placeholder="Example:
Bharatiya Vidya Bhavan School Vijayanagar — S-75024
My First School — S-156333
Nios Nest Pre School — S-139929
Pusthi Pre School — S-163331
Tiny Teddy's Pre School Saraswathipuram — S-156504
Vedic Pre School, Saraswathipuram — S.No. 470
Sri Gokula School, Kuvempunagar — S.No. 412"
                  className="w-full px-3 py-2 border rounded-xl text-xs sm:text-sm font-mono bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              {/* Action Button: AI Parse */}
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={resetAll}
                  className="text-xs text-slate-500 hover:text-slate-700 underline"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleParse}
                  disabled={isParsing || !inputText.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm shadow-md flex items-center gap-2 disabled:opacity-50 transition-all"
                >
                  {isParsing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Matching Schools with AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>AI Parse & Match Schools</span>
                    </>
                  )}
                </button>
              </div>

              {/* Preview Table of Matched Items */}
              {parseResult && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <span>Preview ({parseResult.itemsToMarkCount ?? parseResult.matchedCount} to Mark Visited)</span>
                      <span className="text-xs font-normal text-slate-500">
                        ({parseResult.totalExtracted} extracted)
                      </span>
                    </h4>
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full font-semibold">
                        {parseResult.firstVisitsCount} First Visits
                      </span>
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full font-semibold">
                        {parseResult.revisitsCount} Revisits
                      </span>
                      {parseResult.newSchoolsCount > 0 && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-semibold border border-emerald-300">
                          ✨ {parseResult.newSchoolsCount} New to Auto-Create
                        </span>
                      )}
                      {parseResult.skippedCount > 0 && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-semibold">
                          ⚠️ {parseResult.skippedCount} Kept Unvisited
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="border rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 sticky top-0 font-semibold border-b">
                        <tr>
                          <th className="p-2.5">S.No & Code</th>
                          <th className="p-2.5">Resolved School</th>
                          <th className="p-2.5">Board / Type</th>
                          <th className="p-2.5">Visit Record</th>
                          <th className="p-2.5">Match Method</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parseResult.items.map((item, idx) => {
                          const isNew = !item.matchedSchool && Boolean(item.newSchoolCandidate) && !item.shouldSkipVisit;
                          const isSkipped = Boolean(item.shouldSkipVisit);
                          const school = item.matchedSchool;
                          const cand = item.newSchoolCandidate;

                          return (
                            <tr
                              key={idx}
                              className={
                                isSkipped
                                  ? 'bg-amber-50/60 text-amber-900'
                                  : isNew
                                  ? 'bg-emerald-50/40 hover:bg-emerald-50/70'
                                  : 'hover:bg-slate-50'
                              }
                            >
                              <td className="p-2.5 whitespace-nowrap">
                                {school ? (
                                  <div className="font-bold text-slate-800">
                                    #{school.s_no}{' '}
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      {school.school_id}
                                    </span>
                                  </div>
                                ) : isNew ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    ✨ Auto-Assign Next #
                                  </span>
                                ) : (
                                  <span className="text-amber-700 font-bold text-[10px]">Unvisited</span>
                                )}
                              </td>
                              <td className="p-2.5">
                                {school ? (
                                  <div>
                                    <span className="font-medium text-slate-900">
                                      {school.school_name}
                                    </span>
                                    <div className="text-[10px] text-slate-500">
                                      {school.area}
                                    </div>
                                    {item.warnings && item.warnings.length > 0 && (
                                      <div className="text-[10px] text-amber-600 mt-0.5 flex items-center gap-1 font-medium">
                                        <HelpCircle className="w-3 h-3 flex-shrink-0" />
                                        <span>{item.warnings[0]}</span>
                                      </div>
                                    )}
                                  </div>
                                ) : cand ? (
                                  <div>
                                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                      <span>{cand.school_name}</span>
                                      <span className="px-1.5 py-0.5 bg-emerald-200 text-emerald-800 rounded text-[9px] font-extrabold uppercase tracking-wide">
                                        New School
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-emerald-700 font-medium">
                                      Area: {cand.area} • District: {cand.district}
                                    </div>
                                    <div className="text-[10px] text-slate-500 italic mt-0.5">
                                      Will auto-create in Master Database & mark VISITED
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-rose-600 italic">{item.rawInput}</div>
                                )}
                              </td>
                              <td className="p-2.5 whitespace-nowrap">
                                <div className="space-y-0.5">
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                    {school?.board || cand?.board || 'STATE BOARD'}
                                  </span>
                                  <div className="text-[10px] text-slate-500">
                                    {school?.school_type || cand?.school_type || 'PRIMARY'}
                                  </div>
                                </div>
                              </td>
                              <td className="p-2.5 whitespace-nowrap">
                                {isSkipped ? (
                                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                    NOT VISITED (Preserved)
                                  </span>
                                ) : (
                                  <div className="space-y-0.5">
                                    <span
                                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        item.isRevisit
                                          ? 'bg-purple-100 text-purple-800'
                                          : 'bg-emerald-100 text-emerald-800'
                                      }`}
                                    >
                                      {item.proposedStatus} {isNew ? '(New)' : ''}
                                    </span>
                                    <div className="text-[10px] text-slate-600 font-medium">
                                      Outcome: {item.proposedOutcome}
                                    </div>
                                  </div>
                                )}
                              </td>
                              <td className="p-2.5 whitespace-nowrap">
                                <span className="text-[10px] font-mono text-slate-600">
                                  {isNew ? (
                                    <span className="text-emerald-700 font-bold">AUTO_CREATE</span>
                                  ) : isSkipped ? (
                                    <span className="text-amber-700 font-bold">PRESERVED</span>
                                  ) : (
                                    `${item.matchMethod} (${Math.round(item.confidence * 100)}%)`
                                  )}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Confirm and Commit Button */}
                  <div className="pt-2 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setParseResult(null)}
                      className="px-5 py-2 border border-slate-200 rounded-full text-[#59627E] text-xs font-semibold uppercase tracking-wider hover:text-[#020C21] hover:bg-slate-100 transition"
                    >
                      Edit List
                    </button>
                    <button
                      type="button"
                      onClick={handleCommitMark}
                      disabled={isMarking || (parseResult.itemsToMarkCount ?? parseResult.matchedCount) === 0}
                      className="btn-cta px-6 py-2.5 rounded-full text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#0F1B31]/20 inline-flex items-center gap-2 disabled:opacity-50 transition-all"
                    >
                      {isMarking ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-white" />
                          <span>Saving Visits to Database...</span>
                        </>
                      ) : (
                        <>
                          <span>Confirm & Mark All {parseResult.itemsToMarkCount ?? parseResult.matchedCount} Visited</span>
                          <span className="btn-knob">
                            <Check className="w-3.5 h-3.5 text-white" />
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
