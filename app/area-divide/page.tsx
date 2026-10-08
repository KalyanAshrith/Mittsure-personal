'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Navigation,
  Phone,
  ExternalLink,
  PlusCircle,
  Building2,
  Layers,
  Sparkles,
  Route,
  RefreshCw,
  Award,
  RotateCcw,
} from 'lucide-react';
import RecordVisitModal from '@/components/RecordVisitModal';
import { SchoolData } from '@/lib/types';
import { subscribeToDataChanges, notifyDataChange } from '@/lib/realtimeSync';

interface AreaGroup {
  areaName: string;
  district: string;
  schools: any[];
  totalSchools: number;
  visitedCount: number;
  unvisitedCount: number;
  cbseCount: number;
  statePreCount: number;
  minDistFromPgKm: number;
  avgDistFromPgKm: number;
  completionRate: number;
  filteredCount: number;
}

export default function AreaDividePage() {
  const [data, setData] = useState<{
    summary: {
      totalAreas: number;
      totalSchools: number;
      totalVisited: number;
      totalUnvisited: number;
      overallCompletionRate: number;
    };
    pgBase: {
      latitude: number;
      longitude: number;
      address: string;
    };
    areas: AreaGroup[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VISITED' | 'UNVISITED'>('ALL');
  const [boardFilter, setBoardFilter] = useState('ALL');
  const [areaSortBy, setAreaSortBy] = useState<'unvisited' | 'total' | 'proximity' | 'name'>('unvisited');
  const [schoolSortBy, setSchoolSortBy] = useState<'s_no' | 'dist' | 'name' | 'status'>('s_no');
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());

  // Record visit modal state
  const [selectedSchoolForVisit, setSelectedSchoolForVisit] = useState<SchoolData | null>(null);
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [togglingSchoolId, setTogglingSchoolId] = useState<string | null>(null);

  const handleQuickToggle = async (schoolId: string, currentVisited: boolean) => {
    setTogglingSchoolId(schoolId);
    try {
      const res = await fetch('/api/schools/quick-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, targetStatus: !currentVisited }),
      });
      if (res.ok) {
        notifyDataChange('school');
        fetchAreaBreakdown();
      }
    } catch (err) {
      console.error('Error toggling school in area view:', err);
    } finally {
      setTogglingSchoolId(null);
    }
  };

  const fetchAreaBreakdown = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: searchQuery,
        status: statusFilter,
        board: boardFilter,
        sortBy: areaSortBy,
      });
      const res = await fetch(`/api/schools/area-breakdown?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch area breakdown');
      const json = await res.json();
      setData(json);

      // Default: expand top 5 areas
      if (json.areas && json.areas.length > 0) {
        const topAreas = new Set<string>(json.areas.slice(0, 5).map((a: any) => a.areaName));
        setExpandedAreas(topAreas);
      }
    } catch (err) {
      console.error('Error loading area breakdown:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAreaBreakdown();
    const unsubscribe = subscribeToDataChanges(() => {
      fetchAreaBreakdown();
    });
    return () => unsubscribe();
  }, [searchQuery, statusFilter, boardFilter, areaSortBy]);

  const toggleAreaExpand = (areaName: string) => {
    setExpandedAreas((prev) => {
      const next = new Set(prev);
      if (next.has(areaName)) next.delete(areaName);
      else next.add(areaName);
      return next;
    });
  };

  const expandAll = () => {
    if (!data?.areas) return;
    setExpandedAreas(new Set(data.areas.map((a) => a.areaName)));
  };

  const collapseAll = () => {
    setExpandedAreas(new Set());
  };

  // Sort schools inside each area based on schoolSortBy
  const getSortedSchools = (schools: any[]) => {
    const list = [...schools];
    if (schoolSortBy === 's_no') {
      return list.sort((a, b) => a.s_no - b.s_no);
    } else if (schoolSortBy === 'dist') {
      return list.sort((a, b) => a.road_dist_km - b.road_dist_km);
    } else if (schoolSortBy === 'name') {
      return list.sort((a, b) => a.school_name.localeCompare(b.school_name));
    } else if (schoolSortBy === 'status') {
      // Unvisited first, then visited
      return list.sort((a, b) => (a.visited === b.visited ? a.s_no - b.s_no : a.visited ? 1 : -1));
    }
    return list;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner - ConSentinel Studio Style */}
      <div className="glass-panel rounded-3xl p-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#0F1B31] text-emerald-400 shadow-sm">
                <MapPin className="w-4 h-4" />
              </span>
              <span className="text-xs font-black tracking-wider uppercase text-[#59627E]">
                Territory Division & Field CRM
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#020C21] tracking-tight mt-2">
              Area & Nagar Divide
            </h1>
            <p className="text-xs sm:text-sm text-[#59627E] mt-1 max-w-2xl font-medium">
              All 487 master institutions clustered by Nagar, locality, and regional zones. Visited schools are strictly
              highlighted in <span className="font-extrabold text-emerald-600">Green</span> and unvisited schools in{' '}
              <span className="font-extrabold text-rose-600">Red</span>.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/route-planner"
              className="btn-cta text-xs py-2 px-4 shadow-sm"
            >
              <span>Plan Daily Route</span>
              <span className="btn-knob w-6 h-6">
                <Route className="w-3.5 h-3.5 text-emerald-400" />
              </span>
            </Link>
            <button
              onClick={() => fetchAreaBreakdown()}
              className="p-2.5 rounded-2xl glass-card text-[#0F182F] hover:text-[#020C21] transition shadow-xs"
              title="Refresh Area Breakdown"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Overview Cards - ConSentinel Glass Surfaces */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Areas Card */}
        <div className="glass-card rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#59627E]">Distinct Localities</span>
            <span className="p-2 rounded-xl bg-white/80 text-[#0F182F] border border-white/80 shadow-xs">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-light text-[#020C21] font-mono tracking-tight">
              {data?.summary?.totalAreas || 0}
            </span>
            <span className="text-xs text-[#59627E] block mt-0.5 font-medium">Nagars & Area Clusters</span>
          </div>
        </div>

        {/* Visited Schools (GREEN) */}
        <div className="glass-card rounded-2xl p-4 flex flex-col justify-between border-l-4 border-l-emerald-500 bg-emerald-50/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              Visited Schools
            </span>
            <span className="p-2 rounded-xl bg-emerald-100/80 text-emerald-800 border border-emerald-200/80 shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-light text-emerald-700 font-mono tracking-tight">
              {data?.summary?.totalVisited || 0}
            </span>
            <span className="text-xs font-extrabold text-emerald-800 block mt-0.5">
              Completed by Kalyan ({data?.summary?.overallCompletionRate || 0}%)
            </span>
          </div>
        </div>

        {/* Unvisited Schools (RED) */}
        <div className="glass-card rounded-2xl p-4 flex flex-col justify-between border-l-4 border-l-rose-500 bg-rose-50/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
              Unvisited Schools
            </span>
            <span className="p-2 rounded-xl bg-rose-100/80 text-rose-800 border border-rose-200/80 shadow-xs">
              <AlertCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-light text-rose-700 font-mono tracking-tight">
              {data?.summary?.totalUnvisited || 0}
            </span>
            <span className="text-xs font-extrabold text-rose-800 block mt-0.5">
              Pending Outreach Target
            </span>
          </div>
        </div>

        {/* Master Total */}
        <div className="glass-card rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#59627E]">Master Allotment</span>
            <span className="p-2 rounded-xl bg-white/80 text-[#0F182F] border border-white/80 shadow-xs">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-light text-[#020C21] font-mono tracking-tight">
              {data?.summary?.totalSchools || 487}
            </span>
            <div className="track-meter h-2 mt-2">
              <div
                className="track-meter-fill"
                style={{ width: `${data?.summary?.overallCompletionRate || 0}%` }}
                title={`Visited: ${data?.summary?.overallCompletionRate || 0}%`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Sorting Controls */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 space-y-4">
        {/* Search and Main Status Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#59627E] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Nagar, Area, School name, or #S.No..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-xs bg-white/80 border border-[#DDE4EE] rounded-xl focus:ring-2 focus:ring-[#0F1B31] font-semibold text-[#020C21] placeholder-[#59627E]/70 shadow-xs"
            />
          </div>

          {/* Status Filter Tabs (Green / Red) */}
          <div className="flex items-center gap-1.5 p-1 bg-white/60 border border-white/80 rounded-2xl shadow-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                statusFilter === 'ALL'
                  ? 'bg-[#0F1B31] text-white shadow-sm'
                  : 'text-[#59627E] hover:text-[#020C21]'
              }`}
            >
              All Schools
            </button>
            <button
              onClick={() => setStatusFilter('VISITED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                statusFilter === 'VISITED'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-800 hover:bg-emerald-100/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Visited (Green)</span>
            </button>
            <button
              onClick={() => setStatusFilter('UNVISITED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                statusFilter === 'UNVISITED'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-rose-800 hover:bg-rose-100/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span>Unvisited (Red)</span>
            </button>
          </div>
        </div>

        {/* Secondary Filters & Sorters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/60 text-xs">
          {/* Board Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-[#59627E] text-[11px] uppercase tracking-wider">Board:</span>
            {['ALL', 'CBSE', 'ICSE', 'STATE BOARD', 'PRE-SCHOOL'].map((b) => (
              <button
                key={b}
                onClick={() => setBoardFilter(b)}
                className={`px-2.5 py-1 rounded-xl font-bold text-[11px] transition shadow-xs ${
                  boardFilter === b
                    ? 'bg-[#0F1B31] text-white'
                    : 'bg-white/70 text-[#0F182F] hover:bg-white border border-white/80'
                }`}
              >
                {b}
              </button>
            ))}
          </div>

          {/* Sorters and Expand Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Sort Areas By */}
            <div className="flex items-center gap-1">
              <span className="font-bold text-[#59627E] text-[11px] uppercase tracking-wider">Sort Areas:</span>
              <select
                value={areaSortBy}
                onChange={(e: any) => setAreaSortBy(e.target.value)}
                className="bg-white/80 border border-[#DDE4EE] rounded-xl px-2.5 py-1 text-xs font-bold text-[#0F182F] focus:ring-2 focus:ring-[#0F1B31]"
              >
                <option value="unvisited">Most Unvisited (Red)</option>
                <option value="total">Most Total Schools</option>
                <option value="proximity">Proximity from PG Base</option>
                <option value="visited">Most Visited (Green)</option>
                <option value="name">Nagar Name (A-Z)</option>
              </select>
            </div>

            {/* Sort Schools Within Area */}
            <div className="flex items-center gap-1">
              <span className="font-bold text-[#59627E] text-[11px] uppercase tracking-wider">Sort Schools:</span>
              <select
                value={schoolSortBy}
                onChange={(e: any) => setSchoolSortBy(e.target.value)}
                className="bg-white/80 border border-[#DDE4EE] rounded-xl px-2.5 py-1 text-xs font-bold text-[#0F182F] focus:ring-2 focus:ring-[#0F1B31]"
              >
                <option value="s_no">S.No (#1..#487)</option>
                <option value="dist">Distance from PG</option>
                <option value="status">Unvisited First</option>
                <option value="name">School Name</option>
              </select>
            </div>

            {/* Expand / Collapse All */}
            <div className="flex items-center gap-1 border-l border-white/80 pl-2">
              <button
                onClick={expandAll}
                className="px-2.5 py-1 rounded-xl bg-white/70 hover:bg-white text-[#0F182F] font-bold text-[11px] border border-white/80 transition shadow-xs"
              >
                Expand All
              </button>
              <button
                onClick={collapseAll}
                className="px-2.5 py-1 rounded-xl bg-white/70 hover:bg-white text-[#0F182F] font-bold text-[11px] border border-white/80 transition shadow-xs"
              >
                Collapse
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Area Groups List */}
      {loading ? (
        <div className="p-16 text-center text-[#59627E] font-medium flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#0F1B31] border-t-transparent rounded-full animate-spin"></div>
          <span>Dividing and organizing schools by Nagar and Area...</span>
        </div>
      ) : !data?.areas || data.areas.length === 0 ? (
        <div className="p-16 text-center glass-panel rounded-3xl space-y-2">
          <MapPin className="w-10 h-10 text-[#59627E] mx-auto" />
          <h3 className="font-bold text-[#020C21] text-base">No areas or schools match your filter</h3>
          <p className="text-xs text-[#59627E]">Try changing your search query or reset status/board filters.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('ALL');
              setBoardFilter('ALL');
            }}
            className="px-4 py-2 rounded-xl bg-[#0F1B31] text-white font-bold text-xs hover:bg-black transition mt-2 shadow-sm"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {data.areas.map((area) => {
            const isExpanded = expandedAreas.has(area.areaName);
            const sortedSchools = getSortedSchools(area.schools);

            return (
              <div
                key={area.areaName}
                className="glass-panel rounded-2xl overflow-hidden card-hover transition-all duration-300 animate-fade-in hover:shadow-lg"
              >
                {/* Area Card Header */}
                <div
                  onClick={() => toggleAreaExpand(area.areaName)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer bg-white/40 hover:bg-white/70 transition select-none"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs">
                        <MapPin className="w-4 h-4" />
                      </span>
                      <h3 className="font-black text-[#020C21] text-lg">{area.areaName}</h3>
                      <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-white/80 text-[#59627E] border border-white/80 shadow-xs">
                        📍 ~{area.minDistFromPgKm} km from Base
                      </span>
                    </div>

                    <p className="text-xs text-[#59627E] font-medium">
                      Total {area.totalSchools} schools ({area.cbseCount} CBSE/ICSE, {area.statePreCount} State/Pre)
                    </p>
                  </div>

                  {/* Badges, Plan Route, & Progress Bar */}
                  <div className="flex items-center gap-2.5 self-end sm:self-auto flex-wrap">
                    {/* ConSentinel Plan Round Route for this Area */}
                    <Link
                      href={`/route-planner?area=${encodeURIComponent(area.areaName)}`}
                      onClick={(e) => e.stopPropagation()}
                      className="btn-cta text-[11px] py-1.5 px-3 shadow-xs"
                      title={`Plan a round route starting from PG base visiting unvisited schools in ${area.areaName}`}
                    >
                      <span>Plan Round Route</span>
                      <span className="btn-knob w-5 h-5">
                        <Route className="w-3 h-3 text-emerald-400" />
                      </span>
                    </Link>

                    {/* Green Visited Badge */}
                    <span className="badge-visited text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5 shadow-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{area.visitedCount} Visited</span>
                    </span>

                    {/* Red Unvisited Badge */}
                    <span className="badge-not-visited text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5 shadow-xs">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>{area.unvisitedCount} Unvisited</span>
                    </span>

                    {/* Completion Mini Track-Meter */}
                    <div className="w-24 hidden md:block">
                      <div className="text-[10px] font-extrabold text-[#59627E] text-right mb-1">
                        {area.completionRate}% Done
                      </div>
                      <div className="track-meter h-1.5">
                        <div
                          className="track-meter-fill"
                          style={{ width: `${area.completionRate}%` }}
                        />
                      </div>
                    </div>

                    {/* Chevron */}
                    <div className="p-1 rounded-xl bg-white/70 border border-white/80 text-[#0F182F] shadow-xs">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Schools List */}
                {isExpanded && (
                  <div className="border-t border-white/60 p-4 sm:p-5 bg-white/20">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {sortedSchools.map((school) => {
                        const isVisited = school.visited;

                        return (
                          <div
                            key={school.id}
                            className={`glass-card rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 ${
                              isVisited
                                ? 'border-l-4 border-l-emerald-500 bg-emerald-50/20'
                                : 'border-l-4 border-l-rose-500 bg-rose-50/20'
                            }`}
                          >
                            <div className="space-y-2">
                              {/* S.No & Prominent Green/Red Status Badge */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-[#0F1B31] text-white">
                                    #{school.s_no}
                                  </span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase bg-white/80 text-[#0F182F] border border-white/80">
                                    {school.board}
                                  </span>
                                </div>

                                {/* CRITICAL: Visited in Green, Unvisited in Red */}
                                <span
                                  className={`px-2.5 py-0.5 rounded-full font-extrabold text-[10px] tracking-wide border flex items-center gap-1 shadow-xs ${
                                    isVisited ? 'badge-visited' : 'badge-not-visited'
                                  }`}
                                >
                                  {isVisited ? (
                                    <>
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>VISITED</span>
                                    </>
                                  ) : (
                                    <>
                                      <AlertCircle className="w-3 h-3" />
                                      <span>NOT VISITED</span>
                                    </>
                                  )}
                                </span>
                              </div>

                              {/* School Name */}
                              <Link
                                href={`/schools/${school.id}`}
                                className="font-black text-[#020C21] text-sm leading-snug hover:text-[#0F1B31] line-clamp-2 block mt-1 transition-colors"
                              >
                                {school.school_name}
                              </Link>

                              {/* Address */}
                              <p className="text-[11px] text-[#59627E] line-clamp-2 flex items-start gap-1 font-medium">
                                <MapPin className="w-3 h-3 text-emerald-600 flex-shrink-0 mt-0.5" />
                                <span>{school.address}</span>
                              </p>

                              {/* Distance & Contact Info */}
                              <div className="pt-2 border-t border-white/60 flex items-center justify-between text-[11px]">
                                <span className="font-bold text-emerald-700 font-mono text-[11px] px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200/60">
                                  📍 {school.road_dist_km} km from PG
                                </span>
                                {school.principal_name && (
                                  <span className="text-[#59627E] font-medium truncate max-w-[120px]">
                                    {school.principal_name}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Actions Bar */}
                            <div className="mt-3.5 pt-2.5 border-t border-white/60 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <a
                                  href={school.google_maps_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-xl bg-white/70 hover:bg-[#0F1B31] text-[#0F182F] hover:text-white border border-white/80 transition shadow-xs"
                                  title="Navigate in Google Maps"
                                >
                                  <Navigation className="w-3.5 h-3.5 fill-current" />
                                </a>

                                {school.phone && (
                                  <a
                                    href={`tel:${school.phone}`}
                                    className="p-1.5 rounded-xl bg-white/70 hover:bg-emerald-50 text-[#0F182F] hover:text-emerald-700 border border-white/80 transition shadow-xs"
                                    title={`Call ${school.phone}`}
                                  >
                                    <Phone className="w-3.5 h-3.5" />
                                  </a>
                                )}

                                <Link
                                  href={`/schools/${school.id}`}
                                  className="p-1.5 rounded-xl bg-white/70 hover:bg-white text-[#0F182F] border border-white/80 transition shadow-xs"
                                  title="View Details"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Link>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={togglingSchoolId === school.id}
                                  onClick={() => handleQuickToggle(school.id, isVisited)}
                                  className={`px-2.5 py-1 rounded-xl font-black text-[11px] flex items-center gap-1 transition active:scale-95 shadow-xs ${
                                    isVisited
                                      ? 'bg-white/80 border border-rose-300 text-rose-700 hover:bg-rose-50'
                                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  }`}
                                  title={isVisited ? 'Mark as Not Visited (Red)' : 'Mark as Visited (Green)'}
                                >
                                  {isVisited ? (
                                    <>
                                      <RotateCcw className="w-3 h-3" />
                                      <span>Unvisit</span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>✓ Visited</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedSchoolForVisit(school as unknown as SchoolData);
                                    setIsVisitModalOpen(true);
                                  }}
                                  className="p-1 rounded-xl text-[#59627E] hover:text-[#020C21] hover:bg-white/80 transition border border-white/80"
                                  title="Add detailed visit notes"
                                >
                                  <PlusCircle className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Record Visit Modal */}
      {selectedSchoolForVisit && (
        <RecordVisitModal
          school={selectedSchoolForVisit}
          isOpen={isVisitModalOpen}
          onClose={() => {
            setIsVisitModalOpen(false);
            setSelectedSchoolForVisit(null);
          }}
          onVisitSaved={() => {
            fetchAreaBreakdown();
          }}
        />
      )}
    </div>
  );
}
