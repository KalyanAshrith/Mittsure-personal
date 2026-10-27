'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  UploadCloud,
  FileText,
  Sparkles,
  MapPin,
  User,
  Phone,
  Mail,
  Route,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Printer,
  ShieldCheck,
  BookOpen,
  MessageSquare,
  Clock,
  Layers,
  HelpCircle,
  X,
  RotateCcw,
  Lock,
} from 'lucide-react';
import { getActiveUser, setActiveUser, DEFAULT_LEAD_USER, ActiveUser } from '@/lib/activeUser';

interface SupporterSchool {
  stopNumber: number;
  id: string;
  s_no: number;
  school_name: string;
  area: string;
  district: string;
  board: string;
  school_type: string;
  visited: boolean;
  suggestedProduct: string;
  productAngle: string;
  pitchScript: string;
  phone: string;
  principal_name: string;
}

interface SupporterGuide {
  representative: {
    name: string;
    phone: string;
    email: string;
    baseLocation: string;
    targetDistrict: string;
    dailyGoal: number;
  };
  greeting: string;
  dailyBrief: string;
  morningChecklist: string[];
  stepByStepPlan: Array<{
    step: number;
    time: string;
    title: string;
    description: string;
  }>;
  objectionCheatsheet: Array<{
    objection: string;
    response: string;
  }>;
  schools: SupporterSchool[];
}

export default function TeamSupporterHero() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'plan' | 'pitches' | 'objections' | 'checklist'>('plan');

  // Form State
  const [representativeName, setRepresentativeName] = useState('Nichhenametla Kalyan Ashrith');
  const [phone, setPhone] = useState('+91 94939 65636');
  const [email, setEmail] = useState('');
  const [baseLocation, setBaseLocation] = useState('661, Bogadi 2nd Stage, Mysuru');
  const [targetDistrict, setTargetDistrict] = useState('Mysuru');
  const [dailyGoal, setDailyGoal] = useState('7');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedNotes, setPastedNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedPitchIndex, setCopiedPitchIndex] = useState<number | null>(null);

  // Completed checklist items stored in state
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  // Active supporter guide
  const [supporterData, setSupporterData] = useState<SupporterGuide | null>(null);

  // Load saved supporter session from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mittsure_team_supporter_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.representative?.name) {
          setSupporterData(parsed);
          setRepresentativeName(parsed.representative.name);
          if (parsed.representative.phone) setPhone(parsed.representative.phone);
          if (parsed.representative.baseLocation) setBaseLocation(parsed.representative.baseLocation);
          if (parsed.representative.targetDistrict) setTargetDistrict(parsed.representative.targetDistrict);
        }
      }
      const savedChecks = localStorage.getItem('mittsure_team_checklist');
      if (savedChecks) {
        setCheckedItems(JSON.parse(savedChecks));
      }
    } catch (e) {
      // Ignore storage errors
    }
  }, []);

  // Listen for global switch profile / open onboarding events
  useEffect(() => {
    const handler = () => {
      setIsExpanded(true);
      const el = document.getElementById('onboarding-portal');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    };
    window.addEventListener('mittsure_open_onboarding', handler);
    return () => window.removeEventListener('mittsure_open_onboarding', handler);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setErrorMessage('');
    }
  };

  const handleToggleChecklist = (itemKey: string) => {
    setCheckedItems((prev) => {
      const next = { ...prev, [itemKey]: !prev[itemKey] };
      try {
        localStorage.setItem('mittsure_team_checklist', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const handleSwitchToLead = () => {
    const lead = DEFAULT_LEAD_USER;
    setActiveUser(lead);
    setRepresentativeName(lead.name);
    setPhone(lead.phone);
    setBaseLocation(lead.baseLocation);
    setTargetDistrict(lead.targetDistrict);
    setSupporterData(null);
    setSelectedFile(null);
    setPastedNotes('');
    try {
      localStorage.removeItem('mittsure_team_supporter_data');
    } catch (e) {}
  };

  const handleGenerateSupporter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!representativeName.trim()) {
      setErrorMessage('Please enter your name.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append('pdf', selectedFile);
      }
      formData.append('representativeName', representativeName.trim());
      formData.append('phone', phone.trim());
      formData.append('email', email.trim());
      formData.append('baseLocation', baseLocation.trim());
      formData.append('targetDistrict', targetDistrict);
      formData.append('dailyGoal', dailyGoal);
      if (pastedNotes.trim()) {
        formData.append('pastedText', pastedNotes.trim());
      }

      const res = await fetch('/api/team/supporter', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (json.success && json.supporterGuide) {
        setSupporterData(json.supporterGuide);
        try {
          localStorage.setItem('mittsure_team_supporter_data', JSON.stringify(json.supporterGuide));
        } catch (e) {}

        // Automate personal user session across entire CRM
        const isLead =
          representativeName.toLowerCase().includes('kalyan') ||
          representativeName.toLowerCase().includes('ashrith');

        const newUser: ActiveUser = {
          id: isLead ? 'KA-REP-01' : `REP-${Date.now().toString(36).toUpperCase()}`,
          name: representativeName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          baseLocation: baseLocation.trim(),
          baseLat: 12.3021,
          baseLng: 76.6178,
          targetDistrict,
          dailyGoal: parseInt(dailyGoal, 10) || 7,
          isDefaultLead: isLead,
          uploadedPdfName: selectedFile?.name,
          lastActive: new Date().toISOString(),
        };
        setActiveUser(newUser);

        setIsExpanded(true);
      } else {
        setErrorMessage(json.error || 'Failed to generate supporter guide.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error uploading and processing PDF.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyPitch = (script: string, index: number) => {
    navigator.clipboard.writeText(script);
    setCopiedPitchIndex(index);
    setTimeout(() => setCopiedPitchIndex(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleResetAgent = () => {
    if (confirm('Clear current personal session and onboard a new member or upload a new PDF?')) {
      setSupporterData(null);
      setSelectedFile(null);
      setPastedNotes('');
      try {
        localStorage.removeItem('mittsure_team_supporter_data');
        localStorage.removeItem('mittsure_team_checklist');
      } catch (e) {}
    }
  };

  return (
    <div
      id="onboarding-portal"
      className="glass-panel rounded-3xl p-5 sm:p-6 shadow-sm border border-white/90 relative overflow-hidden transition-all duration-300"
    >
      {/* Background Gradient Accent */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-gradient-to-br from-emerald-400/20 via-sky-400/15 to-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-[#0F1B31] text-emerald-400 shadow-xs">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-black tracking-wider uppercase text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Team Member Copilot & 24/7 Field Supporter
            </span>
            {supporterData && (
              <span className="text-[10px] font-mono font-bold bg-[#0F1B31] text-white px-2 py-0.5 rounded-full">
                Active: {supporterData.representative.name}
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#020C21] tracking-tight mt-1">
            {supporterData
              ? `Field Outreach Supporter: ${supporterData.representative.name}`
              : 'Field Team Member Onboarding & Support Assistant'}
          </h2>
          <p className="text-xs text-[#59627E] font-medium max-w-2xl mt-0.5">
            {supporterData
              ? `Operational outreach roadmap tailored for ${supporterData.representative.targetDistrict} starting from ${supporterData.representative.baseLocation}.`
              : 'Upload your allotment PDF or daily school schedule, enter your details, and receive an instant personalized field guide, route sequence, and school pitch cheatsheet.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {supporterData && (
            <>
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-xl bg-white/80 hover:bg-white text-xs font-bold text-[#0F182F] border border-white/90 shadow-xs flex items-center gap-1.5 transition"
                title="Print Field Brief"
              >
                <Printer className="w-3.5 h-3.5 text-[#59627E]" />
                <span className="hidden sm:inline">Print Sheet</span>
              </button>
              <button
                type="button"
                onClick={handleResetAgent}
                className="px-3 py-1.5 rounded-xl bg-white/80 hover:bg-rose-50 text-xs font-bold text-rose-700 border border-white/90 shadow-xs flex items-center gap-1.5 transition"
                title="Switch Agent or Upload New PDF"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Upload</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-2 rounded-xl bg-white/80 hover:bg-white text-[#0F182F] border border-white/90 shadow-xs transition"
            title={isExpanded ? 'Collapse Supporter' : 'Expand Supporter'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      {isExpanded && (
        <div className="mt-5 pt-4 border-t border-white/70 relative z-10 space-y-5">
          {!supporterData ? (
            /* Upload & Registration Form */
            <div className="space-y-4">
              {/* Quick Profile Switcher Bar */}
              <div className="p-3 bg-white/70 border border-white/80 rounded-2xl flex items-center justify-between gap-3 flex-wrap text-xs shadow-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-[#59627E] text-[11px] uppercase tracking-wider">
                    Quick Profile Launch:
                  </span>
                  <button
                    type="button"
                    onClick={handleSwitchToLead}
                    className="px-3 py-1.5 rounded-xl bg-[#0F1B31] text-white font-bold text-xs hover:bg-black transition shadow-xs flex items-center gap-1.5 active:scale-95"
                  >
                    <User className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Launch as Lead: Kalyan Ashrith (Mysuru)</span>
                  </button>
                </div>
                <span className="text-[11px] text-[#59627E] font-medium">
                  Team members: Upload your PDF below to automate your private personal workspace.
                </span>
              </div>

              <form onSubmit={handleGenerateSupporter} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* PDF File Uploader Card */}
                <div className="md:col-span-1 p-4 rounded-2xl bg-white/75 border border-dashed border-slate-300 hover:border-emerald-500 transition flex flex-col justify-center items-center text-center space-y-2.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-[#020C21] block">
                      {selectedFile ? selectedFile.name : 'Upload Allotment / Schedule PDF'}
                    </span>
                    <span className="text-[11px] text-[#59627E] block mt-0.5">
                      {selectedFile
                        ? `${(selectedFile.size / 1024).toFixed(1)} KB PDF Attached`
                        : 'Drag & drop or browse your outreach file'}
                    </span>
                  </div>
                  <label className="btn-cta text-xs py-1.5 px-3.5 cursor-pointer shadow-xs">
                    <span>{selectedFile ? 'Change PDF' : 'Select PDF File'}</span>
                    <input
                      type="file"
                      accept=".pdf,.txt,.csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Team Member Details Form */}
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-extrabold text-[#59627E] text-[11px] uppercase tracking-wider block mb-1">
                      Representative Name *
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-[#59627E] absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={representativeName}
                        onChange={(e) => setRepresentativeName(e.target.value)}
                        placeholder="e.g. Nichhenametla Kalyan Ashrith"
                        className="w-full pl-9 pr-3 py-2 bg-white/90 border border-[#DDE4EE] rounded-xl font-semibold text-[#020C21] focus:ring-2 focus:ring-[#0F1B31]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-extrabold text-[#59627E] text-[11px] uppercase tracking-wider block mb-1">
                      Phone / WhatsApp Number
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-[#59627E] absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. +91 94939 65636"
                        className="w-full pl-9 pr-3 py-2 bg-white/90 border border-[#DDE4EE] rounded-xl font-semibold text-[#020C21] focus:ring-2 focus:ring-[#0F1B31]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-extrabold text-[#59627E] text-[11px] uppercase tracking-wider block mb-1">
                      Starting Base Location (PG / Residence)
                    </label>
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 text-[#59627E] absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={baseLocation}
                        onChange={(e) => setBaseLocation(e.target.value)}
                        placeholder="e.g. 661, Bogadi 2nd Stage, Mysuru"
                        className="w-full pl-9 pr-3 py-2 bg-white/90 border border-[#DDE4EE] rounded-xl font-semibold text-[#020C21] focus:ring-2 focus:ring-[#0F1B31]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-extrabold text-[#59627E] text-[11px] uppercase tracking-wider block mb-1">
                      Assigned District Territory
                    </label>
                    <select
                      value={targetDistrict}
                      onChange={(e) => setTargetDistrict(e.target.value)}
                      className="w-full px-3 py-2 bg-white/90 border border-[#DDE4EE] rounded-xl font-bold text-[#020C21] focus:ring-2 focus:ring-[#0F1B31]"
                    >
                      <option value="Mysuru">Mysuru District (Urban & Rural)</option>
                      <option value="Mandya">Mandya District</option>
                      <option value="Chamarajanagar">Chamarajanagar District</option>
                      <option value="Hassan">Hassan District</option>
                      <option value="Kodagu">Kodagu District</option>
                      <option value="ALL">All Combined Allotment</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-extrabold text-[#59627E] text-[11px] uppercase tracking-wider block mb-1">
                      Optional: Paste School Names or Schedule Notes (if no PDF)
                    </label>
                    <textarea
                      rows={2}
                      value={pastedNotes}
                      onChange={(e) => setPastedNotes(e.target.value)}
                      placeholder="Paste schools, S.Nos, or instructions (e.g. Balodyana English School, S-18090, Nirmala Public School)..."
                      className="w-full px-3 py-2 bg-white/90 border border-[#DDE4EE] rounded-xl font-medium text-[#020C21] text-xs focus:ring-2 focus:ring-[#0F1B31]"
                    />
                  </div>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                  {errorMessage}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-cta text-xs py-2 px-5 shadow-sm"
                >
                  <span>{isSubmitting ? 'Analyzing PDF & Building Plan...' : 'Generate My Supporter Field Plan'}</span>
                  <span className="btn-knob w-5 h-5">
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                  </span>
                </button>
              </div>
            </form>
          </div>
          ) : (
            /* Active Supporter Workspace & Cheatsheet */
            <div className="space-y-4">
              {/* Personal Data Isolation Badge */}
              <div className="p-3 rounded-2xl bg-indigo-50/80 border border-indigo-200/90 text-indigo-950 text-xs flex items-center justify-between gap-3 flex-wrap shadow-xs">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  <span className="font-medium">
                    <strong>Personal Workspace Active:</strong> Operating as <strong>{supporterData.representative.name}</strong> ({supporterData.representative.targetDistrict} Territory). Other team members&apos; completed visits and route plans are isolated and not mixed with your workspace.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSwitchToLead}
                  className="px-2.5 py-1 rounded-xl bg-white border border-indigo-200 text-[#0F1B31] font-bold text-[11px] hover:bg-indigo-100 transition shadow-xs"
                >
                  Switch to Kalyan (Lead)
                </button>
              </div>
              {/* Daily Brief Pill Bar */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
                <div>
                  <span className="text-[11px] font-black text-emerald-800 uppercase tracking-wider block">
                    Strategic Focus for Today
                  </span>
                  <p className="text-xs font-bold text-[#020C21] mt-0.5">
                    {supporterData.dailyBrief}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/route-planner?origin=${encodeURIComponent(supporterData.representative.baseLocation)}`}
                    className="btn-cta text-xs py-1.5 px-3.5 shadow-xs"
                  >
                    <span>Open in Route Planner</span>
                    <span className="btn-knob w-5 h-5">
                      <Route className="w-3 h-3 text-emerald-400" />
                    </span>
                  </Link>
                </div>
              </div>

              {/* Sub-Tabs Navigation */}
              <div className="flex items-center gap-1.5 border-b border-white/80 pb-2 text-xs font-bold overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('plan')}
                  className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                    activeTab === 'plan'
                      ? 'bg-[#0F1B31] text-white shadow-xs'
                      : 'text-[#59627E] hover:text-[#020C21] bg-white/60'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Daily Action Schedule</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('pitches')}
                  className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                    activeTab === 'pitches'
                      ? 'bg-[#0F1B31] text-white shadow-xs'
                      : 'text-[#59627E] hover:text-[#020C21] bg-white/60'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>School Pitch Cards ({supporterData.schools.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('objections')}
                  className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                    activeTab === 'objections'
                      ? 'bg-[#0F1B31] text-white shadow-xs'
                      : 'text-[#59627E] hover:text-[#020C21] bg-white/60'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Gatekeeper Cheatsheet</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('checklist')}
                  className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                    activeTab === 'checklist'
                      ? 'bg-[#0F1B31] text-white shadow-xs'
                      : 'text-[#59627E] hover:text-[#020C21] bg-white/60'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Morning & Field Checklist</span>
                </button>
              </div>

              {/* Sub-Tab 1: Step by Step Daily Plan */}
              {activeTab === 'plan' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                  {supporterData.stepByStepPlan.map((s) => (
                    <div
                      key={s.step}
                      className="p-3.5 rounded-2xl glass-card border border-white/90 space-y-2 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="w-6 h-6 rounded-full bg-[#0F1B31] text-white text-xs font-black flex items-center justify-center font-mono">
                            {s.step}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                            {s.time}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-[#020C21] text-xs mt-2">
                          {s.title}
                        </h4>
                        <p className="text-[11px] text-[#59627E] mt-1 leading-relaxed">
                          {s.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Sub-Tab 2: School Pitches */}
              {activeTab === 'pitches' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {supporterData.schools.map((sc, idx) => (
                    <div
                      key={sc.id || idx}
                      className="p-4 rounded-2xl glass-card border border-white/90 space-y-2.5 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-black text-[#020C21] flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-[#0F1B31] text-white flex items-center justify-center text-[10px]">
                              #{sc.stopNumber}
                            </span>
                            <span>{sc.school_name}</span>
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-[#0F182F] border border-slate-200">
                            {sc.board}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#59627E] font-medium mt-1">
                          📍 {sc.area}, {sc.district} • Contact: {sc.principal_name}
                        </div>

                        <div className="mt-2.5 p-2 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
                          <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">
                            Recommended Pitch: {sc.suggestedProduct}
                          </span>
                          <p className="text-[11px] text-emerald-950 mt-0.5 font-medium">
                            {sc.productAngle}
                          </p>
                        </div>

                        <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-[#020C21] font-mono leading-relaxed relative">
                          <span className="text-[9px] font-extrabold text-[#59627E] uppercase tracking-wider block mb-0.5">
                            Spoken Script (Word-for-Word):
                          </span>
                          &quot;{sc.pitchScript}&quot;
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <button
                          type="button"
                          onClick={() => handleCopyPitch(sc.pitchScript, idx)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[#0F182F] font-bold hover:bg-slate-50 transition flex items-center gap-1 text-[11px]"
                        >
                          {copiedPitchIndex === idx ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-[#59627E]" />
                              <span>Copy Script</span>
                            </>
                          )}
                        </button>

                        <Link
                          href={`/schools/${sc.id}`}
                          className="font-bold text-[#0F1B31] hover:underline text-[11px]"
                        >
                          View CRM Record →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Sub-Tab 3: Objection Handling Cheatsheet */}
              {activeTab === 'objections' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {supporterData.objectionCheatsheet.map((obj, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-2xl glass-card border border-white/90 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded-lg bg-rose-100 text-rose-800 font-bold text-[10px]">
                          OBJECTION
                        </span>
                        <h4 className="font-extrabold text-xs text-rose-950">
                          {obj.objection}
                        </h4>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-emerald-950 leading-relaxed">
                        <span className="font-extrabold text-emerald-800 block text-[10px] uppercase tracking-wider mb-1">
                          Verified Field Response:
                        </span>
                        {obj.response}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Sub-Tab 4: Morning & Field Checklist */}
              {activeTab === 'checklist' && (
                <div className="p-4 rounded-2xl glass-card border border-white/90 space-y-3">
                  <span className="text-xs font-black text-[#020C21] uppercase tracking-wider block">
                    Field Readiness Protocol
                  </span>
                  <div className="space-y-2">
                    {supporterData.morningChecklist.map((item, idx) => {
                      const itemKey = `item_${idx}`;
                      const isDone = Boolean(checkedItems[itemKey]);

                      return (
                        <div
                          key={idx}
                          onClick={() => handleToggleChecklist(itemKey)}
                          className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between text-xs ${
                            isDone
                              ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900 font-bold'
                              : 'bg-white/80 border-slate-200 text-[#020C21] font-medium hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                                isDone
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isDone && <Check className="w-3 h-3" />}
                            </span>
                            <span className={isDone ? 'line-through opacity-80' : ''}>
                              {item}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-[#59627E]">
                            {isDone ? 'Verified ✓' : 'Pending'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
