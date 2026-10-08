'use client';

import React, { useState } from 'react';
import {
  X,
  MapPin,
  Clock,
  Phone,
  User,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Calendar,
  Compass,
} from 'lucide-react';
import { SchoolData } from '@/lib/types';
import { verifyLocation } from '@/lib/haversine';
import { notifyDataChange } from '@/lib/realtimeSync';

interface RecordVisitModalProps {
  school: SchoolData | null;
  isOpen: boolean;
  onClose: () => void;
  onVisitSaved: () => void;
}

export default function RecordVisitModal({
  school,
  isOpen,
  onClose,
  onVisitSaved,
}: RecordVisitModalProps) {
  if (!isOpen || !school) return null;

  const isRevisit = school.visit_status !== 'NOT VISITED';

  const [visitDate, setVisitDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [contactPerson, setContactPerson] = useState(
    school.principal_name && !school.principal_name.includes('Head')
      ? school.principal_name
      : school.contact_person || ''
  );
  const [designation, setDesignation] = useState('Principal');
  const [contactNumber, setContactNumber] = useState(school.phone || '');
  const [purpose, setPurpose] = useState(
    isRevisit
      ? 'Follow-up / Confirmation Revisit'
      : 'Field Outreach & Programme Introduction'
  );
  const [programmeDiscussed, setProgrammeDiscussed] = useState(
    school.recommended_programme || 'Both'
  );
  const [interestLevel, setInterestLevel] = useState('High');
  const [outcome, setOutcome] = useState('Interested');
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('11:00 AM');

  // GPS verification state
  const [isVerifyingGps, setIsVerifyingGps] = useState(false);
  const [gpsData, setGpsData] = useState<{
    lat: number;
    lng: number;
    distanceMeters: number;
    verified: boolean;
    message: string;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAiPitch, setShowAiPitch] = useState(false);
  const [aiPitch, setAiPitch] = useState<any>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const handleCaptureGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsVerifyingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        const result = verifyLocation(
          userLat,
          userLng,
          school.latitude,
          school.longitude,
          150 // default threshold
        );

        setGpsData({
          lat: userLat,
          lng: userLng,
          distanceMeters: result.distanceMeters,
          verified: result.verified,
          message: result.message,
        });
        setIsVerifyingGps(false);
      },
      (error) => {
        setIsVerifyingGps(false);
        alert(`GPS error: ${error.message}. You can still save the visit without GPS.`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleFetchAiPitch = async () => {
    setLoadingAi(true);
    setShowAiPitch(true);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pitch',
          schoolId: school.id,
          programme: programmeDiscussed,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAiPitch(data.pitch);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: school.id,
          visit_date: visitDate,
          purpose,
          programme_discussed: programmeDiscussed,
          contact_person: contactPerson,
          contact_number: contactNumber,
          designation,
          interest_level: interestLevel,
          outcome,
          notes,
          latitude: gpsData?.lat,
          longitude: gpsData?.lng,
          follow_up_date: outcome === 'Follow-up Required' ? followUpDate : undefined,
          follow_up_time: outcome === 'Follow-up Required' ? followUpTime : undefined,
          registration_status: outcome.includes('Registration') ? 'CONFIRMED' : undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        notifyDataChange('visit', { schoolId: school.id });
        onVisitSaved();
        onClose();
      } else {
        alert(data.error || 'Failed to save visit.');
      }
    } catch (err: any) {
      alert('Error saving visit: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#020C21]/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white/95 backdrop-blur-2xl rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-[0_32px_64px_rgba(2,12,33,0.22)] border border-white/80 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-[#0F1B31] text-white flex items-center justify-between border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-white text-[#0F1B31]">
                #{school.s_no}
              </span>
              <span className="text-xs text-slate-300 font-medium font-mono">
                {school.school_id}
              </span>
              {isRevisit ? (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-amber-400 text-amber-950 uppercase tracking-wider">
                  REVISIT
                </span>
              ) : (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 uppercase tracking-wider">
                  FIRST VISIT
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white mt-1 line-clamp-1">
              {school.school_name}
            </h2>
            <p className="text-xs text-slate-300 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              {school.area}, {school.district} • {school.board}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Revisit Notification Banner */}
        {isRevisit && (
          <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center gap-1.5 font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                Previously visited ({school.visit_status}). A new visit record will be added to history.
              </span>
            </div>
          </div>
        )}

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-slate-900 flex-1">
          {/* Date & Purpose */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Visit Date
              </label>
              <input
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                required
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Programme Discussed
              </label>
              <select
                value={programmeDiscussed}
                onChange={(e) => setProgrammeDiscussed(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 font-medium focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Both">Both (MOM & Junior Power Quest)</option>
                <option value="MOM">MOM (Mittsure Olympiad Masters)</option>
                <option value="Junior Power Quest">Junior Power Quest (Nursery-UKG)</option>
                <option value="Other">Other / Curriculum Assessment</option>
              </select>
            </div>
          </div>

          {/* Contact Person & Designation */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Person Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="Principal or Admin name"
                  className="w-full text-sm border border-slate-300 rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Designation
              </label>
              <select
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Principal">Principal</option>
                <option value="Vice Principal">Vice Principal</option>
                <option value="Trustee / Director">Trustee / Director</option>
                <option value="Admin Officer">Admin Officer</option>
                <option value="Academic Coordinator">Coordinator</option>
                <option value="Headmaster / HM">Headmaster / HM</option>
              </select>
            </div>
          </div>

          {/* Phone & Purpose */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Phone
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full text-sm border border-slate-300 rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Visit Purpose
              </label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Outcome & Interest */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Visit Outcome <span className="text-rose-500">*</span>
              </label>
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                required
                className="w-full text-sm font-semibold border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Interested">Interested (Requires Brochure/Proposal)</option>
                <option value="Registration Confirmed">Registration Confirmed (Signed / Agreed)</option>
                <option value="Registration Discussion">Registration Discussion Underway</option>
                <option value="Follow-up Required">Follow-up Required (Specific Date)</option>
                <option value="Principal Not Available">Principal Not Available (Met Staff)</option>
                <option value="Admin Contacted">Admin / Coordinator Contacted</option>
                <option value="Call Later">Call Later / Gatekeeper</option>
                <option value="Not Interested">Not Interested</option>
                <option value="School Closed">School Closed / Vacation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Interest Level
              </label>
              <select
                value={interestLevel}
                onChange={(e) => setInterestLevel(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Very High">Very High (Immediate Onboarding)</option>
                <option value="High">High (Positive discussion)</option>
                <option value="Medium">Medium (Considering)</option>
                <option value="Low">Low (Hesitant)</option>
                <option value="Not Interested">Not Interested</option>
              </select>
            </div>
          </div>

          {/* Conditional Follow-up Section */}
          {outcome === 'Follow-up Required' && (
            <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <Clock className="w-3.5 h-3.5 text-amber-700" />
                <span>Schedule Required Follow-up</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-amber-800 mb-0.5">
                    Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    required
                    className="w-full text-xs border border-amber-300 rounded-lg px-2.5 py-1.5 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-amber-800 mb-0.5">
                    Time Window
                  </label>
                  <input
                    type="text"
                    value={followUpTime}
                    onChange={(e) => setFollowUpTime(e.target.value)}
                    placeholder="e.g. 11:30 AM"
                    className="w-full text-xs border border-amber-300 rounded-lg px-2.5 py-1.5 bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* GPS Location Verification Section */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-900">GPS Location Verification</span>
              </div>
              <button
                type="button"
                onClick={handleCaptureGps}
                disabled={isVerifyingGps}
                className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-100 rounded-lg shadow-sm transition"
              >
                {isVerifyingGps ? 'Verifying GPS...' : 'Capture GPS'}
              </button>
            </div>

            {gpsData && (
              <div
                className={`mt-2 p-2 rounded-lg text-xs flex items-center gap-2 ${
                  gpsData.verified
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}
              >
                {gpsData.verified ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" />
                )}
                <span>{gpsData.message}</span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Field Remarks / Meeting Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record Principal's response, student strength discussed, objections, or next steps..."
              className="w-full text-sm border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* AI Pitch Helper in Modal */}
          <div>
            <button
              type="button"
              onClick={handleFetchAiPitch}
              className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:underline"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Need AI pitch or talking points for this school?</span>
            </button>

            {showAiPitch && (
              <div className="mt-2 p-3 bg-indigo-50/80 rounded-xl border border-indigo-200 text-xs space-y-2">
                {loadingAi ? (
                  <p className="text-slate-500 italic">Generating customized pitch...</p>
                ) : aiPitch ? (
                  <>
                    <p className="font-bold text-indigo-950">Quick Pitch:</p>
                    <p className="text-slate-700">{aiPitch.quickPitch}</p>
                    <p className="font-bold text-indigo-950 mt-2">Key Selling Points:</p>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
                      {aiPitch.keySellingPoints?.map((pt: string, idx: number) => (
                        <li key={idx}>{pt}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200/60 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#59627E] hover:text-[#020C21] bg-slate-100/80 hover:bg-slate-200 rounded-full transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-cta px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-full shadow-lg shadow-[#0F1B31]/20 transition disabled:opacity-50 inline-flex items-center gap-2"
            >
              <span>{isSubmitting ? 'Saving...' : isRevisit ? 'Save Revisit' : 'Save Visit'}</span>
              <span className="btn-knob">
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
