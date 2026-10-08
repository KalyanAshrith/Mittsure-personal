'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Phone,
  Navigation,
  Calendar,
  ClipboardList,
  Filter,
  Check,
} from 'lucide-react';
import RecordVisitModal from '@/components/RecordVisitModal';
import { FollowUpData, SchoolData } from '@/lib/types';
import { subscribeToDataChanges, notifyDataChange } from '@/lib/realtimeSync';

export default function FollowupsPage() {
  const [followups, setFollowups] = useState<FollowUpData[]>([]);
  const [counts, setCounts] = useState({ today: 0, overdue: 0, pending: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'TODAY' | 'OVERDUE' | 'PENDING' | 'COMPLETED'>('TODAY');

  const [selectedSchoolForVisit, setSelectedSchoolForVisit] = useState<SchoolData | null>(null);
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);

  const fetchFollowups = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/followups?status=${activeTab}`, { cache: 'no-store' });
      const json = await res.json();
      setFollowups(json.followups || []);
      if (json.counts) setCounts(json.counts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowups();
  }, [activeTab]);

  useEffect(() => {
    const unsubscribe = subscribeToDataChanges((changeType) => {
      if (changeType === 'followup' || changeType === 'visit' || changeType === 'all') {
        fetchFollowups();
      }
    });
    return () => unsubscribe();
  }, [activeTab]);

  const handleMarkComplete = async (id: string) => {
    try {
      await fetch('/api/followups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'Completed' }),
      });
      fetchFollowups();
      notifyDataChange('followup');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-6 h-6 text-amber-600" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Follow-up Management
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Track scheduled return visits, coordinator callbacks, and overdue outreach
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex rounded-2xl bg-white border border-slate-200 p-1 text-xs font-bold shadow-sm overflow-x-auto">
          <button
            onClick={() => setActiveTab('TODAY')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'TODAY'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Today</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/10 text-[10px]">
              {counts.today}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('OVERDUE')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'OVERDUE'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Overdue</span>
            <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
              {counts.overdue}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('PENDING')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'PENDING'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>All Pending</span>
            <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
              {counts.pending}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('COMPLETED')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'COMPLETED'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Completed</span>
            <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
              {counts.completed}
            </span>
          </button>
        </div>
      </div>

      {/* Follow-up Cards */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 text-xs">Loading follow-ups...</div>
      ) : followups.length === 0 ? (
        <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl text-slate-500 text-xs">
          No follow-ups found in this category.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {followups.map((f) => {
            const isOverdue = f.status === 'Overdue';
            const isToday = f.status === 'Today';

            return (
              <div
                key={f.id}
                className={`p-5 rounded-2xl bg-white border shadow-sm transition flex flex-col justify-between ${
                  isOverdue
                    ? 'border-red-300 ring-1 ring-red-200'
                    : isToday
                    ? 'border-amber-300 ring-1 ring-amber-200'
                    : 'border-slate-200'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                        isOverdue
                          ? 'bg-red-100 text-red-800'
                          : isToday
                          ? 'bg-amber-100 text-amber-900'
                          : f.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {f.status}
                    </span>

                    <span className="text-xs font-mono font-bold text-slate-700 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(f.due_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      • {f.due_time || '11:00 AM'}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base">
                    {f.school?.school_name}
                  </h3>

                  <p className="text-xs text-slate-600">
                    Contact: <strong className="text-slate-800">{f.contact_person || 'Principal'}</strong>{' '}
                    ({f.contact_number || f.school?.phone})
                  </p>

                  {f.notes && (
                    <p className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 italic">
                      &ldquo;{f.notes}&rdquo;
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {f.contact_number && (
                      <a
                        href={`tel:${f.contact_number}`}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 transition"
                        title="Call"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    )}

                    {f.school && (
                      <a
                        href={
                          f.school.google_maps_url ||
                          `https://www.google.com/maps/search/?api=1&query=${f.school.latitude},${f.school.longitude}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 transition"
                        title="Navigate"
                      >
                        <Navigation className="w-4 h-4 fill-current" />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {f.status !== 'Completed' && (
                      <button
                        onClick={() => handleMarkComplete(f.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                      >
                        Done
                      </button>
                    )}

                    <button
                      onClick={() => {
                        if (f.school) {
                          setSelectedSchoolForVisit(f.school as SchoolData);
                          setIsVisitModalOpen(true);
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-sm"
                    >
                      Visit Now
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Record Visit Modal */}
      <RecordVisitModal
        school={selectedSchoolForVisit}
        isOpen={isVisitModalOpen}
        onClose={() => {
          setIsVisitModalOpen(false);
          setSelectedSchoolForVisit(null);
        }}
        onVisitSaved={fetchFollowups}
      />
    </div>
  );
}
