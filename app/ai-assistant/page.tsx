'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Award,
  BookOpen,
  MessageSquare,
  Compass,
  Copy,
  Check,
  Send,
  HelpCircle,
  School,
  Clock,
  ThumbsUp,
} from 'lucide-react';
import { SchoolData } from '@/lib/types';

export default function AiAssistantPage() {
  const [activeTab, setActiveTab] = useState<'pitch' | 'objection' | 'advice'>('pitch');
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(true);

  // Pitch Generator state
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [selectedProgramme, setSelectedProgramme] = useState<'MOM' | 'Junior Power Quest' | 'Both'>('Both');
  const [isGeneratingPitch, setIsGeneratingPitch] = useState(false);
  const [generatedPitch, setGeneratedPitch] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Objection Handler state
  const [customObjection, setCustomObjection] = useState('');
  const [isHandlingObjection, setIsHandlingObjection] = useState(false);
  const [objectionResponse, setObjectionResponse] = useState<any>(null);

  // Daily Advice state
  const [adviceDate, setAdviceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isGettingAdvice, setIsGettingAdvice] = useState(false);
  const [dailyAdvice, setDailyAdvice] = useState<any>(null);

  useEffect(() => {
    async function loadSchools() {
      try {
        setLoadingSchools(true);
        const res = await fetch('/api/schools', { cache: 'no-store' });
        const data = await res.json();
        if (data.schools) {
          setSchools(data.schools);
          if (data.schools.length > 0) {
            setSelectedSchoolId(data.schools[0].id);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingSchools(false);
      }
    }
    loadSchools();
  }, []);

  const handleGeneratePitch = async () => {
    if (!selectedSchoolId) return;
    setIsGeneratingPitch(true);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pitch',
          schoolId: selectedSchoolId,
          programme: selectedProgramme,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedPitch(data.pitch);
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsGeneratingPitch(false);
    }
  };

  const handleProcessObjection = async (text?: string) => {
    const query = text || customObjection;
    if (!query.trim()) return;
    setIsHandlingObjection(true);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'objection',
          objection: query,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setObjectionResponse(data.guidance);
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsHandlingObjection(false);
    }
  };

  const handleGetDailyAdvice = async () => {
    setIsGettingAdvice(true);
    try {
      // Find route plan for selected date
      const routeRes = await fetch(`/api/routes/${adviceDate}`);
      const routeData = await routeRes.json();
      const stops = routeData.routePlan?.stops || [];
      const schoolIds = stops.map((s: any) => s.school_id);

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'route-advice',
          date: adviceDate,
          schoolIds,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDailyAdvice(data.advice);
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsGettingAdvice(false);
    }
  };

  const selectedSchool = schools.find((s) => s.id === selectedSchoolId);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            AI Field Co-Pilot
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Intelligent pitch formulations, instant school objection handling, and daily route strategy
        </p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-2xl bg-white border border-slate-200 p-1.5 shadow-sm text-xs sm:text-sm font-bold">
        <button
          onClick={() => setActiveTab('pitch')}
          className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-2 ${
            activeTab === 'pitch'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Pitch Generator</span>
        </button>

        <button
          onClick={() => setActiveTab('objection')}
          className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-2 ${
            activeTab === 'objection'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Objection Handler</span>
        </button>

        <button
          onClick={() => setActiveTab('advice')}
          className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-2 ${
            activeTab === 'advice'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Daily Route Advice</span>
        </button>
      </div>

      {/* TAB 1: PITCH GENERATOR */}
      {activeTab === 'pitch' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Select Target School (from 487 Master List)
              </label>
              <select
                value={selectedSchoolId}
                onChange={(e) => setSelectedSchoolId(e.target.value)}
                disabled={loadingSchools}
                className="w-full border border-slate-300 rounded-xl p-2.5 font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500"
              >
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    #{s.s_no} - {s.school_name} ({s.area})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Target Programme Offering
              </label>
              <select
                value={selectedProgramme}
                onChange={(e) => setSelectedProgramme(e.target.value as any)}
                className="w-full border border-slate-300 rounded-xl p-2.5 font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Both">Both (MOM & Junior Power Quest)</option>
                <option value="MOM">Mittsure Olympiad Masters (MOM - Class 1–12)</option>
                <option value="Junior Power Quest">Junior Power Quest (Nursery–UKG)</option>
              </select>
            </div>
          </div>

          {/* School Snapshot */}
          {selectedSchool && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs flex items-center justify-between gap-3">
              <div>
                <span className="font-bold text-slate-900 block text-sm">
                  {selectedSchool.school_name}
                </span>
                <span className="text-slate-500">
                  {selectedSchool.area} • {selectedSchool.board} • Principal:{' '}
                  <strong>{selectedSchool.principal_name || 'Principal'}</strong>
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full font-bold bg-indigo-100 text-indigo-800 flex-shrink-0">
                Category {selectedSchool.opportunity_type}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={handleGeneratePitch}
            disabled={isGeneratingPitch || !selectedSchoolId}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-sm shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isGeneratingPitch ? 'Formulating Pitch...' : 'Generate Tailored Pitch'}</span>
          </button>

          {/* Result */}
          {generatedPitch && (
            <div className="pt-4 border-t border-slate-100 space-y-4 text-xs sm:text-sm animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200">
                <span className="font-bold text-indigo-950 uppercase tracking-wider text-[10px] block mb-1">
                  1. Opening Hook (Greeting & Icebreaker)
                </span>
                <p className="text-slate-800 font-medium italic">
                  &ldquo;{generatedPitch.openingHook}&rdquo;
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">
                    2. Quick 30-Second Elevator Pitch
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedPitch.quickPitch);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:underline"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-slate-700 leading-relaxed">{generatedPitch.quickPitch}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] block">
                  3. Key Differentiators to Emphasize
                </span>
                <ul className="list-disc pl-4 space-y-1 text-slate-700">
                  {generatedPitch.keySellingPoints.map((pt: string, i: number) => (
                    <li key={i} className="leading-snug">{pt}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] block">
                  4. Detailed Presentation Pitch
                </span>
                <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                  {generatedPitch.detailedPitch}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: OBJECTION HANDLER */}
      {activeTab === 'objection' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Instant School Objection Scripts
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any common objection faced in Mysuru schools or type what the Principal/Trustee said.
            </p>
          </div>

          {/* Quick Preset Objections */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Common Real-World Scenarios
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                'We already do SOF / Silverzone Olympiad exams.',
                'Our student parents have tight budgets for extra fees.',
                'The Principal is busy with admissions / exams today.',
                'We are a play school; we don’t believe in written tests.',
                'Trustee is not in town; call back next month.',
              ].map((obj) => (
                <button
                  key={obj}
                  type="button"
                  onClick={() => {
                    setCustomObjection(obj);
                    handleProcessObjection(obj);
                  }}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 text-left text-slate-700 font-medium transition"
                >
                  &ldquo;{obj}&rdquo;
                </button>
              ))}
            </div>
          </div>

          {/* Custom Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={customObjection}
              onChange={(e) => setCustomObjection(e.target.value)}
              placeholder="Or type what the school administration objected..."
              className="flex-1 border border-slate-300 rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={() => handleProcessObjection()}
              disabled={isHandlingObjection || !customObjection.trim()}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md transition disabled:opacity-50"
            >
              {isHandlingObjection ? 'Analyzing...' : 'Handle'}
            </button>
          </div>

          {/* Objection Result */}
          {objectionResponse && (
            <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3 text-xs sm:text-sm animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-200 text-indigo-950 font-bold text-xs uppercase">
                  Strategy: {objectionResponse.strategy}
                </span>
              </div>

              <div>
                <span className="font-bold text-indigo-950 block mb-1">Response Script:</span>
                <p className="p-3.5 rounded-xl bg-white border border-indigo-200/80 text-slate-800 leading-relaxed font-sans italic">
                  {objectionResponse.responseScript}
                </p>
              </div>

              <div>
                <span className="font-bold text-indigo-950 block mb-1">Key Counter-Arguments:</span>
                <ul className="list-disc pl-4 space-y-1 text-slate-700">
                  {objectionResponse.counterPoints.map((cp: string, i: number) => (
                    <li key={i}>{cp}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DAILY ROUTE ADVISOR */}
      {activeTab === 'advice' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Daily Route & Timing Advisor
              </h3>
              <p className="text-xs text-slate-500">
                AI analyzes your planned schools for the day and creates optimal visiting windows.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={adviceDate}
                onChange={(e) => setAdviceDate(e.target.value)}
                className="border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
              />
              <button
                type="button"
                onClick={handleGetDailyAdvice}
                disabled={isGettingAdvice}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
              >
                {isGettingAdvice ? 'Analyzing...' : 'Get Route Advice'}
              </button>
            </div>
          </div>

          {dailyAdvice && (
            <div className="space-y-4 pt-3 border-t border-slate-100 text-xs sm:text-sm">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-900 block text-xs uppercase tracking-wider mb-1">
                  Route Summary
                </span>
                <p className="text-slate-700">{dailyAdvice.summary}</p>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200">
                <span className="font-bold text-indigo-950 block text-xs uppercase tracking-wider mb-1.5">
                  Visiting Windows & Timing Strategy
                </span>
                <ul className="space-y-1.5 text-slate-700">
                  {dailyAdvice.timingTips.map((tip: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                <span className="font-bold text-emerald-950 block text-xs uppercase tracking-wider mb-1">
                  Recommended Programme Focus
                </span>
                <p className="text-slate-800">{dailyAdvice.suggestedFocus}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
