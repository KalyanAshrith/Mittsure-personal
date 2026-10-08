'use client';

import React, { useState } from 'react';
import {
  Award,
  Sparkles,
  BookOpen,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  HelpCircle,
} from 'lucide-react';
import { SchoolData } from '@/lib/types';

interface PitchCardProps {
  school?: SchoolData;
}

export default function PitchCard({ school }: PitchCardProps) {
  const isPreSchool =
    school &&
    ['PRE-SCHOOL', 'PLAY SCHOOL', 'NURSERY', 'MONTESSORI'].includes(school.school_type);

  const [activeTab, setActiveTab] = useState<'MOM' | 'QUEST'>(
    isPreSchool ? 'QUEST' : 'MOM'
  );
  const [copied, setCopied] = useState(false);
  const [showObjections, setShowObjections] = useState(false);

  const momPitch = `Mittsure Olympiad Masters (MOM) is India's premier academic & cognitive talent quest for Classes 1–12 across Math, Science, English, and Cyber.
Key School Highlights:
• Every registered student receives an individualized diagnostic skill gap report.
• Every student receives a guaranteed ₹500 MittStore learning voucher.
• Scholarships up to ₹50,000, smart tablets, trophies, and gold medals.
• Host school receives institutional benchmarking analytics & School of Academic Excellence Trophy.
• Nominal entry of ₹150 with complete printed study materials included. Zero teacher overhead!`;

  const questPitch = `Junior Power Quest is an NEP-aligned holistic talent assessment specifically crafted for Nursery, LKG, and UKG students based on the Panchakosha framework.
Key Pre-School Highlights:
• Child-friendly pictorial challenges that celebrate learning without exam stress.
• Every child receives a Digital Holistic Progress Passport measuring physical, cognitive, and social milestones.
• Every student receives an attractive participation medal and merit certificate.
• Elevates school credibility during admissions and parent-teacher orientations.
• Mittsure provides complete testing kits and handles end-to-end evaluation.`;

  const activePitchText = activeTab === 'MOM' ? momPitch : questPitch;

  const handleCopy = () => {
    navigator.clipboard.writeText(activePitchText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-slate-900 text-sm sm:text-base">
            Field Pitch & Sales Collateral
          </h3>
        </div>

        <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-bold">
          <button
            onClick={() => setActiveTab('MOM')}
            className={`px-3 py-1 rounded-md transition ${
              activeTab === 'MOM'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            MOM (Class 1–12)
          </button>
          <button
            onClick={() => setActiveTab('QUEST')}
            className={`px-3 py-1 rounded-md transition ${
              activeTab === 'QUEST'
                ? 'bg-white text-indigo-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Junior Power Quest (Nur–UKG)
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mt-4 space-y-3 text-xs sm:text-sm text-slate-700">
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 leading-relaxed font-sans whitespace-pre-line">
          {activePitchText}
        </div>

        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => setShowObjections(!showObjections)}
            className="flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900 text-xs"
          >
            <HelpCircle className="w-4 h-4 text-amber-600" />
            <span>Common School Objections & Answers</span>
            {showObjections ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Pitch</span>
              </>
            )}
          </button>
        </div>

        {/* Collapsible Objection Handling */}
        {showObjections && (
          <div className="mt-3 p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2.5 text-xs text-slate-800">
            <div>
              <p className="font-bold text-amber-950">Q: &ldquo;We already conduct SOF Olympiads.&rdquo;</p>
              <p className="text-slate-700 mt-0.5">
                A: &ldquo;SOF is purely rank-oriented. Mittsure MOM provides an individualized diagnostic skill gap analysis for every single child and includes a ₹500 MittStore voucher, giving parents 3x return on value.&rdquo;
              </p>
            </div>
            <div>
              <p className="font-bold text-amber-950">Q: &ldquo;Principal is not available today.&rdquo;</p>
              <p className="text-slate-700 mt-0.5">
                A: &ldquo;Leave the printed brief with the Admin/Coordinator, note their direct number, and confirm a return visit in 2 days between 10:30 AM – 12:30 PM.&rdquo;
              </p>
            </div>
            <div>
              <p className="font-bold text-amber-950">Q: &ldquo;Parents will find ₹150 extra burden.&rdquo;</p>
              <p className="text-slate-700 mt-0.5">
                A: &ldquo;The registration includes full mock workbooks and a ₹500 digital learning voucher. Parents actually save money on external test prep books.&rdquo;
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
