'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Users,
  School,
  CheckCircle2,
  Calendar,
  Sparkles,
  Search,
  PlusCircle,
  Phone,
  User,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { OlympiadCampaignData, OlympiadSchoolRecordData, SchoolData } from '@/lib/types';
import { notifyDataChange } from '@/lib/realtimeSync';

export default function OlympiadPage() {
  const [campaigns, setCampaigns] = useState<OlympiadCampaignData[]>([]);
  const [records, setRecords] = useState<OlympiadSchoolRecordData[]>([]);
  const [summary, setSummary] = useState<any>({
    totalIntroduced: 0,
    totalProposalSent: 0,
    totalRegistered: 0,
    expectedStudentsTotal: 0,
    registeredStudentsTotal: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State for new Olympiad registration
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [allSchools, setAllSchools] = useState<SchoolData[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [recordStatus, setRecordStatus] = useState('INTRODUCED');
  const [expectedStudents, setExpectedStudents] = useState('');
  const [registeredStudents, setRegisteredStudents] = useState('');
  const [coordinatorName, setCoordinatorName] = useState('');
  const [coordinatorPhone, setCoordinatorPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [olympiadRes, schoolsRes] = await Promise.all([
        fetch('/api/olympiad'),
        fetch('/api/schools'),
      ]);

      const olympiadData = await olympiadRes.json();
      if (olympiadData.campaigns) {
        setCampaigns(olympiadData.campaigns);
        setRecords(olympiadData.records || []);
        setSummary(olympiadData.summary || {});
        if (olympiadData.campaigns.length > 0) {
          setSelectedCampaignId(olympiadData.campaigns[0].id);
        }
      }

      const schoolsData = await schoolsRes.json();
      if (schoolsData.schools) {
        setAllSchools(schoolsData.schools);
      }
    } catch (err) {
      console.error('Error loading Olympiad hub:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchoolId || !selectedCampaignId) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/olympiad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: selectedCampaignId,
          school_id: selectedSchoolId,
          status: recordStatus,
          expected_students: expectedStudents ? parseInt(expectedStudents, 10) : null,
          registered_students: registeredStudents ? parseInt(registeredStudents, 10) : null,
          coordinator_name: coordinatorName || null,
          coordinator_phone: coordinatorPhone || null,
          notes: notes || null,
        }),
      });

      if (res.ok) {
        setSubmitMessage('Olympiad school record saved successfully!');
        notifyDataChange('school');
        fetchData();
        setTimeout(() => {
          setIsRegisterModalOpen(false);
          setSubmitMessage('');
        }, 1200);
      } else {
        const err = await res.json();
        setSubmitMessage(`Error: ${err.error || 'Failed to save'}`);
      }
    } catch (err) {
      console.error('Failed to submit registration:', err);
      setSubmitMessage('Network error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRecords = records.filter((r) => {
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    if (!matchesStatus) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.school?.school_name.toLowerCase().includes(q) ||
      r.campaign?.name.toLowerCase().includes(q) ||
      (r.coordinator_name && r.coordinator_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-3 sm:p-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-5 sm:p-6 border border-white/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#020C21] tracking-tight">
                Olympiad Outreach & Registration Hub
              </h1>
              <p className="text-xs text-[#59627E] font-medium">
                MOM (Mittsure Olympiad Masters) & Junior Power Quest
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0F1B31] text-white text-xs font-bold shadow-md hover:bg-[#1a2b4d] transition-all"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span>Update School Olympiad Record</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-2xl border border-white/80">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            Campaigns Active
          </span>
          <p className="text-2xl font-black text-[#020C21] mt-1">{campaigns.length}</p>
          <span className="text-[11px] text-indigo-600 font-bold">MOM & Junior Quest</span>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-white/80">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            Introduced Schools
          </span>
          <p className="text-2xl font-black text-[#020C21] mt-1">{summary.totalIntroduced}</p>
          <span className="text-[11px] text-slate-500 font-medium">Pitched in field</span>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-white/80">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            Proposals Sent
          </span>
          <p className="text-2xl font-black text-amber-600 mt-1">{summary.totalProposalSent}</p>
          <span className="text-[11px] text-amber-700 font-bold">Awaiting confirmation</span>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-white/80">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            Confirmed Registrations
          </span>
          <p className="text-2xl font-black text-emerald-600 mt-1">{summary.totalRegistered}</p>
          <span className="text-[11px] text-emerald-700 font-bold">
            {summary.registeredStudentsTotal} students
          </span>
        </div>
      </div>

      {/* Campaigns Spotlight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="glass-card p-5 rounded-2xl border border-white/80 space-y-3 bg-gradient-to-br from-amber-50/50 to-white/70">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200">
              National Olympiad
            </span>
            <span className="text-xs font-bold text-amber-800">Grades 1 to 10</span>
          </div>
          <h3 className="text-lg font-black text-[#020C21]">
            Mittsure Olympiad Masters (MOM) 2026-27
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Premier national competition testing Mathematics, Science, English, and Logical Aptitude. Generates detailed student diagnostic performance reports, national percentiles, and school prestige medals.
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-amber-200/60 text-xs">
            <span className="font-bold text-slate-600">Academic Year: 2026-27</span>
            <span className="font-black text-indigo-700">Exam Window: Nov - Jan</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-white/80 space-y-3 bg-gradient-to-br from-indigo-50/50 to-white/70">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-900 border border-indigo-200">
              Foundational Showcase
            </span>
            <span className="text-xs font-bold text-indigo-800">Pre-School to Grade 2</span>
          </div>
          <h3 className="text-lg font-black text-[#020C21]">
            Junior Power Quest 2026-27
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Encouraging early learning cognitive showcase designed for kindergarten, nursery, and grades 1 & 2. Zero exam stress, visual pattern reasoning, and confidence-building participation awards for all students.
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-indigo-200/60 text-xs">
            <span className="font-bold text-slate-600">Target: Foundational Stage</span>
            <span className="font-black text-indigo-700">Participation: Universal</span>
          </div>
        </div>
      </div>

      {/* School Olympiad Records Table */}
      <div className="glass-panel p-5 rounded-3xl border border-white/80 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-[#020C21]">
              School Olympiad Outreach Records
            </h3>
            <p className="text-xs text-[#59627E]">
              Track which schools have discussed, requested proposals, or registered
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs bg-white border border-slate-200 text-slate-700 font-bold focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="INTRODUCED">Introduced</option>
              <option value="PROPOSAL_SENT">Proposal Sent</option>
              <option value="REGISTERED">Registered</option>
              <option value="EXAM_CONDUCTED">Exam Conducted</option>
            </select>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search school or coordinator..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-white border border-slate-200 text-slate-800 font-medium focus:outline-none"
              />
            </div>
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No Olympiad records matching current criteria. Click "Update School Olympiad Record" to record your outreach discussion!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 text-[10px] font-black uppercase tracking-wider border-b border-slate-200/60">
                <tr>
                  <th className="py-2.5 px-3">School Name</th>
                  <th className="py-2.5 px-3">Area & District</th>
                  <th className="py-2.5 px-3">Programme</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Students</th>
                  <th className="py-2.5 px-3">Coordinator</th>
                  <th className="py-2.5 px-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-white/60 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {r.school?.school_name}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {r.school?.area}, {r.school?.district}
                    </td>
                    <td className="py-3 px-3 font-semibold text-indigo-700">
                      {r.campaign?.name}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                          r.status === 'REGISTERED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.status === 'PROPOSAL_SENT'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-semibold">
                      {r.registered_students || r.expected_students || '—'}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {r.coordinator_name ? (
                        <div>
                          <p className="font-medium text-slate-900">{r.coordinator_name}</p>
                          {r.coordinator_phone && (
                            <p className="text-[10px] text-slate-500">{r.coordinator_phone}</p>
                          )}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-500 max-w-xs truncate">
                      {r.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Olympiad Modal */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleRegisterSubmit}
            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scale-in"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">
                Update School Olympiad Record
              </h3>
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            {submitMessage && (
              <div
                className={`p-3 rounded-xl text-xs font-bold ${
                  submitMessage.startsWith('Error')
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {submitMessage}
              </div>
            )}

            <div>
              <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">
                Select School
              </label>
              <select
                required
                value={selectedSchoolId}
                onChange={(e) => setSelectedSchoolId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">-- Choose School ({allSchools.length} available) --</option>
                {allSchools.map((s) => (
                  <option key={s.id} value={s.id}>
                    #{s.s_no} {s.school_name} ({s.area}, {s.district})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">
                  Olympiad Program
                </label>
                <select
                  required
                  value={selectedCampaignId}
                  onChange={(e) => setSelectedCampaignId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none"
                >
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">
                  Status
                </label>
                <select
                  value={recordStatus}
                  onChange={(e) => setRecordStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none"
                >
                  <option value="INTRODUCED">Introduced / Pitched</option>
                  <option value="PROPOSAL_SENT">Proposal Sent</option>
                  <option value="REGISTERED">Confirmed Registered</option>
                  <option value="EXAM_CONDUCTED">Exam Conducted</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">
                  Expected Students
                </label>
                <input
                  type="number"
                  placeholder="e.g. 50"
                  value={expectedStudents}
                  onChange={(e) => setExpectedStudents(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">
                  Registered Students
                </label>
                <input
                  type="number"
                  placeholder="e.g. 45"
                  value={registeredStudents}
                  onChange={(e) => setRegisteredStudents(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">
                  Coordinator Name
                </label>
                <input
                  type="text"
                  placeholder="Teacher / In-charge"
                  value={coordinatorName}
                  onChange={(e) => setCoordinatorName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">
                  Coordinator Phone
                </label>
                <input
                  type="text"
                  placeholder="Contact phone"
                  value={coordinatorPhone}
                  onChange={(e) => setCoordinatorPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">
                Notes & Next Step
              </label>
              <textarea
                rows={2}
                placeholder="Remarks, exam dates discussed, sample papers given..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none"
              ></textarea>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-[#0F1B31] text-white text-xs font-bold shadow-md hover:bg-[#1a2b4d] disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Olympiad Record'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
