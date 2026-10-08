'use client';

import React from 'react';
import Link from 'next/link';
import {
  MapPin,
  Navigation,
  Phone,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Award,
  Mail,
  User,
} from 'lucide-react';
import { SchoolData } from '@/lib/types';
import { getVerifiedProductRecommendation } from '@/lib/recommendationEngine';
import { notifyDataChange } from '@/lib/realtimeSync';

interface SchoolCardProps {
  school: SchoolData;
  onRecordVisit?: (school: SchoolData) => void;
  onToggleSelect?: (schoolId: string) => void;
  onStatusToggle?: (schoolId: string, newVisited: boolean) => void;
  isSelected?: boolean;
  selectable?: boolean;
  showDetailsLink?: boolean;
}

export default function SchoolCard({
  school,
  onRecordVisit,
  onToggleSelect,
  onStatusToggle,
  isSelected = false,
  selectable = false,
  showDetailsLink = true,
}: SchoolCardProps) {
  const [toggling, setToggling] = React.useState(false);
  const isVisited = Boolean(school.visited_by_current_user || school.visit_status === 'VISITED');

  const handleToggle = async () => {
    if (onStatusToggle) {
      onStatusToggle(school.id, !isVisited);
      return;
    }
    try {
      setToggling(true);
      const res = await fetch('/api/schools/quick-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId: school.id, targetStatus: !isVisited }),
      });
      if (res.ok) {
        notifyDataChange('school');
      }
    } catch (err) {
      console.error('Error toggling school:', err);
    } finally {
      setToggling(false);
    }
  };

  // Strict CRM Color Rule: GREEN for Visited, RED for Unvisited
  const getStatusBadge = () => {
    if (isVisited) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-400 font-black';
    }
    return 'bg-rose-100 text-rose-800 border-rose-400 font-black';
  };

  const getOppBadge = () => {
    switch (school.opportunity_type) {
      case 'A':
        return { label: 'Cat A: Large/Premium', color: 'bg-emerald-700 text-white' };
      case 'B':
        return { label: 'Cat B: Medium', color: 'bg-teal-700 text-white' };
      case 'C':
        return { label: 'Cat C: Small/Local', color: 'bg-sky-700 text-white' };
      case 'D':
        return { label: 'Cat D: Pre-School', color: 'bg-amber-600 text-white' };
      case 'E':
        return { label: 'Cat E: Nursery', color: 'bg-indigo-600 text-white' };
      default:
        return { label: 'General', color: 'bg-slate-600 text-white' };
    }
  };

  const opp = getOppBadge();

  return (
    <div
      className={`glass-card rounded-2xl transition-all duration-200 p-4 flex flex-col justify-between group relative overflow-hidden ${
        isSelected
          ? 'ring-2 ring-emerald-500 bg-emerald-50/40 shadow-md'
          : isVisited
          ? 'border-l-4 border-l-emerald-500 hover:shadow-lg'
          : 'border-l-4 border-l-rose-500 hover:shadow-lg'
      }`}
    >
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#0F1B31] text-white tracking-wide shadow-xs">
              #{school.s_no}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider bg-white/70 text-[#0F182F] border border-white/80 shadow-xs">
              {school.board}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shadow-xs ${opp.color}`}>
              {opp.label}
            </span>
          </div>

          {selectable && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect && onToggleSelect(school.id)}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
            />
          )}
        </div>

        {/* School Name & Area */}
        <h3 className="font-extrabold text-[#020C21] text-base leading-snug line-clamp-1 group-hover:text-[#0F1B31] transition-colors">
          {school.school_name}
        </h3>

        <p className="text-xs text-[#59627E] flex items-center gap-1.5 mt-1.5 font-medium">
          <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold text-[#0F182F]">{school.area}</span>
          <span className="text-slate-300">•</span>
          <span>{school.district}</span>
          {school.distance_from_base_km !== undefined && (
            <>
              <span className="text-slate-300">•</span>
              <span className="font-bold text-emerald-700 font-mono text-[11px] px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200/60">
                📍 {school.distance_from_base_km} km from PG
              </span>
            </>
          )}
        </p>

        {/* Principal & Programme */}
        <div className="mt-3 pt-2.5 border-t border-white/60 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-[#59627E] block text-[10px] uppercase font-bold tracking-wider">
              Contact / Principal
            </span>
            <span className="font-semibold text-[#0F182F] line-clamp-1 mt-0.5">
              {school.principal_name && !school.principal_name.includes('Head')
                ? school.principal_name
                : school.contact_person || 'Principal'}
            </span>
          </div>

          <div>
            <span className="text-[#59627E] block text-[10px] uppercase font-bold tracking-wider">
              Recommended Pitch
            </span>
            <span className="font-bold text-emerald-800 flex items-center gap-1 line-clamp-1 mt-0.5">
              <Award className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              {getVerifiedProductRecommendation(school)}
            </span>
          </div>
        </div>

        {/* Status Badge Row */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <span
            className={`text-[11px] px-2.5 py-0.5 rounded-full font-extrabold border flex items-center gap-1.5 shadow-xs ${
              isVisited ? 'badge-visited' : 'badge-not-visited'
            }`}
          >
            {isVisited ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>VISITED</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                <span>NOT VISITED</span>
              </>
            )}
          </span>

          {school.last_visit_date && (
            <span className="text-[11px] text-[#59627E]">
              Last visit:{' '}
              <strong className="text-[#0F182F]">
                {new Date(school.last_visit_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </strong>
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="mt-4 pt-3 border-t border-white/60 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Navigate Google Maps */}
          <a
            href={
              school.google_maps_url ||
              `https://www.google.com/maps/search/?api=1&query=${school.latitude},${school.longitude}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-white/70 hover:bg-[#0F1B31] text-[#0F182F] hover:text-white border border-white/80 hover:border-[#0F1B31] transition shadow-xs"
            title="Open in Google Maps"
          >
            <Navigation className="w-3.5 h-3.5 fill-current" />
          </a>

          {/* Call */}
          {(school.phone || school.contact_number) && (
            <a
              href={`tel:${school.phone || school.contact_number}`}
              className="p-2 rounded-xl bg-white/70 hover:bg-emerald-50 text-[#0F182F] hover:text-emerald-700 border border-white/80 transition shadow-xs"
              title={`Call ${school.phone || school.contact_number}`}
            >
              <Phone className="w-3.5 h-3.5" />
            </a>
          )}

          {/* Email */}
          {school.email && (
            <a
              href={`mailto:${school.email}`}
              className="p-2 rounded-xl bg-white/70 hover:bg-emerald-50 text-[#0F182F] hover:text-emerald-700 border border-white/80 transition shadow-xs"
              title={`Email ${school.email}`}
            >
              <Mail className="w-3.5 h-3.5" />
            </a>
          )}

          {showDetailsLink && (
            <Link
              href={`/schools/${school.id}`}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#59627E] hover:text-[#020C21] hover:bg-white/80 transition"
            >
              Details
            </Link>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* 1-Click Visited / Not Visited Toggle Button */}
          <button
            type="button"
            disabled={toggling}
            onClick={handleToggle}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-xs active:scale-95 ${
              isVisited
                ? 'bg-white/80 border border-rose-300 text-rose-700 hover:bg-rose-50'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
            }`}
            title={isVisited ? 'Mark this school as Not Visited (Red)' : 'Mark this school as Visited (Green)'}
          >
            {isVisited ? (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Mark Unvisited</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>✓ Mark Visited</span>
              </>
            )}
          </button>

          {/* Optional detailed notes */}
          {onRecordVisit && (
            <button
              type="button"
              onClick={() => onRecordVisit(school)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#59627E] hover:text-[#020C21] hover:bg-white/80 transition border border-white/80"
              title="Add detailed visit notes"
            >
              Notes
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
