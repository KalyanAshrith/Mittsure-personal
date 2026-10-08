'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin,
  Compass,
  X,
  Plus,
  Check,
  RotateCcw,
  Phone,
  Mail,
  Search,
} from 'lucide-react';
import { SchoolData } from '@/lib/types';

interface NearbySchoolItem {
  id: string;
  s_no: number;
  school_id: string;
  school_name: string;
  area: string;
  district: string;
  school_type: string;
  board: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  contact_number: string | null;
  email: string | null;
  contact_person: string | null;
  principal_name: string | null;
  visit_status: string;
  visited_by_current_user: boolean;
  is_revisit_candidate: boolean;
  distanceKm: number;
  verifiedPitch: string;
  is_early_years: boolean;
}

interface NearbySchoolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  routeStops: SchoolData[];
  baseLocation: { address: string; lat: number; lng: number };
  onAddSchool: (school: SchoolData) => void;
  selectedSchoolIds: string[];
  isSaturday?: boolean;
}

export default function NearbySchoolsModal({
  isOpen,
  onClose,
  routeStops,
  baseLocation,
  onAddSchool,
  selectedSchoolIds,
  isSaturday = false,
}: NearbySchoolsModalProps) {
  const [anchorType, setAnchorType] = useState<string>('ROUTE_CENTROID');
  const [customStopId, setCustomStopId] = useState<string>('');
  const [radiusKm, setRadiusKm] = useState<number>(3.5);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNVISITED' | 'REVISIT' | 'EARLY_YEARS'>('UNVISITED');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [nearbySchools, setNearbySchools] = useState<NearbySchoolItem[]>([]);
  const [addedSchoolIds, setAddedSchoolIds] = useState<Set<string>>(new Set(selectedSchoolIds));

  // Sync added IDs
  useEffect(() => {
    setAddedSchoolIds(new Set(selectedSchoolIds));
  }, [selectedSchoolIds]);

  // Determine anchor coordinates
  const anchorCoords = useMemo(() => {
    if (anchorType === 'BASE') {
      return { lat: baseLocation.lat, lng: baseLocation.lng, label: 'PG Base (Bogadi)' };
    }
    if (anchorType === 'STOP' && customStopId) {
      const stop = routeStops.find((s) => s.id === customStopId);
      if (stop) {
        return { lat: stop.latitude, lng: stop.longitude, label: stop.school_name };
      }
    }
    // Route Centroid: average of all current stops
    if (routeStops.length > 0) {
      const avgLat = routeStops.reduce((acc, s) => acc + s.latitude, 0) / routeStops.length;
      const avgLng = routeStops.reduce((acc, s) => acc + s.longitude, 0) / routeStops.length;
      return { lat: avgLat, lng: avgLng, label: 'Current Route Circuit Centroid' };
    }
    return { lat: baseLocation.lat, lng: baseLocation.lng, label: 'PG Base (Bogadi)' };
  }, [anchorType, customStopId, routeStops, baseLocation]);

  // Fetch nearby schools when anchor, radius, or filter changes
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function fetchNearby() {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          lat: String(anchorCoords.lat),
          lng: String(anchorCoords.lng),
          radiusKm: String(radiusKm),
          filter: activeFilter,
          excludeIds: selectedSchoolIds.join(','),
        });

        const res = await fetch(`/api/routes/nearby-schools?${params.toString()}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          setNearbySchools(data.schools || []);
        }
      } catch (err) {
        console.error('Error fetching nearby schools:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchNearby();
    return () => {
      isMounted = false;
    };
  }, [isOpen, anchorCoords, radiusKm, activeFilter, selectedSchoolIds]);

  if (!isOpen) return null;

  const filteredDisplay = nearbySchools.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.school_name.toLowerCase().includes(q) ||
      s.area.toLowerCase().includes(q) ||
      String(s.s_no).includes(q)
    );
  });

  const handleAdd = (school: NearbySchoolItem) => {
    if (isSaturday && selectedSchoolIds.length >= 5) {
      const proceed = confirm(
        'Saturday is a half-day (recommended maximum 5 schools). Add another stop anyway?'
      );
      if (!proceed) return;
    }

    // Pass school entity to parent
    onAddSchool(school as unknown as SchoolData);
    setAddedSchoolIds((prev) => new Set([...Array.from(prev), school.id]));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020C21]/60 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-white/95 backdrop-blur-2xl rounded-3xl border border-white/80 shadow-[0_32px_64px_rgba(2,12,33,0.22)] max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="p-5 bg-[#0F1B31] text-white flex items-center justify-between flex-shrink-0 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 text-white flex items-center justify-center font-black shadow-sm">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white tracking-tight">
                  Find & Add Nearby Schools
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/20 uppercase tracking-wider">
                  LOCAL PROXIMITY
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Explore pending or revisit schools near your specific route stops.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter & Anchor Controls Panel */}
        <div className="p-4 bg-slate-50/80 border-b border-slate-200/80 space-y-3 flex-shrink-0 text-xs">
          {/* Row 1: Anchor Reference & Radius */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#59627E] uppercase tracking-wider text-[10px] mb-1">
                Proximity Reference Anchor
              </label>
              <select
                value={anchorType === 'STOP' ? `STOP:${customStopId}` : anchorType}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.startsWith('STOP:')) {
                    setAnchorType('STOP');
                    setCustomStopId(val.replace('STOP:', ''));
                  } else {
                    setAnchorType(val);
                    setCustomStopId('');
                  }
                }}
                className="w-full border border-slate-200 rounded-xl p-2 bg-white font-medium text-[#020C21] shadow-sm focus:ring-2 focus:ring-[#0F1B31]"
              >
                <option value="ROUTE_CENTROID">★ Route Centroid ({routeStops.length} stops circuit)</option>
                <option value="BASE">PG Base (Bogadi 2nd Stage)</option>
                {routeStops.map((st, i) => (
                  <option key={st.id} value={`STOP:${st.id}`}>
                    Stop #{i + 1}: {st.school_name} ({st.area})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#59627E] uppercase tracking-wider text-[10px] mb-1">
                Max Search Distance: <strong className="text-[#020C21] font-mono">{radiusKm} km</strong>
              </label>
              <div className="grid grid-cols-4 gap-1 font-bold">
                {[1.5, 2.5, 3.5, 5.0].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRadiusKm(r)}
                    className={`py-1.5 rounded-xl text-xs transition font-mono ${
                      radiusKm === r
                        ? 'bg-[#0F1B31] text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-[#59627E] hover:bg-slate-100 hover:text-[#020C21]'
                    }`}
                  >
                    {r} km
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: Filter Tabs & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { key: 'UNVISITED', label: 'Pending Unvisited' },
                { key: 'REVISIT', label: '🔄 Revisit Candidates' },
                { key: 'EARLY_YEARS', label: 'Early-Years / Pre-School' },
                { key: 'ALL', label: 'All Nearby' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveFilter(tab.key as any)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider transition ${
                    activeFilter === tab.key
                      ? 'bg-[#0F1B31] text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-[#59627E] hover:bg-slate-100 hover:text-[#020C21]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Filter name, area, S.No..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
          </div>
        </div>

        {/* School Candidates Scroll Area */}
        <div className="p-4 flex-1 overflow-y-auto space-y-2.5 text-xs">
          {loading ? (
            <div className="py-12 text-center text-slate-400 font-medium flex flex-col items-center gap-2">
              <Compass className="w-8 h-8 animate-spin text-emerald-600" />
              <span>Scanning schools within {radiusKm} km of {anchorCoords.label}...</span>
            </div>
          ) : filteredDisplay.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-1">
              <p className="font-bold text-slate-800 text-sm">No schools found within {radiusKm} km</p>
              <p className="text-xs text-slate-400">
                Try increasing the radius to 5.0 km or changing the filter tab above.
              </p>
            </div>
          ) : (
            filteredDisplay.map((school) => {
              const isAlreadyAdded = addedSchoolIds.has(school.id);
              const isVisited = Boolean(school.visited_by_current_user || school.visit_status === 'VISITED');

              return (
                <div
                  key={school.id}
                  className={`p-3.5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-l-4 ${
                    isAlreadyAdded
                      ? 'border-emerald-300 bg-emerald-50/50 opacity-90'
                      : isVisited
                      ? 'border-l-emerald-500 border-slate-200 bg-white hover:border-slate-300 shadow-sm'
                      : 'border-l-rose-500 border-slate-200 bg-white hover:border-slate-300 shadow-sm'
                  }`}
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono font-black text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-white">
                        #{school.s_no}
                      </span>
                      <span className="font-bold text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                        {school.board}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-800 font-black px-1.5 py-0.5 rounded bg-emerald-100/70">
                        📍 {school.distanceKm} km from anchor
                      </span>

                      {isVisited ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          VISITED
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                          NOT VISITED
                        </span>
                      )}

                      {school.is_revisit_candidate && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                          <RotateCcw className="w-3 h-3" />
                          <span>REVISIT CANDIDATE</span>
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-slate-950 text-sm">
                      {school.school_name}
                    </h4>

                    <p className="text-[11px] text-slate-600">
                      {school.area} • Category: {school.school_type || 'Standard'} • Pitch:{' '}
                      <strong className="text-emerald-900 font-bold">{school.verifiedPitch}</strong>
                    </p>

                    {/* Contact details row if available */}
                    <div className="pt-1 flex items-center gap-2 flex-wrap text-[10px]">
                      {(school.phone || school.contact_number) && (
                        <a
                          href={`tel:${school.phone || school.contact_number}`}
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-100 text-slate-800 font-bold flex items-center gap-1 transition"
                        >
                          <Phone className="w-2.5 h-2.5 text-emerald-600" />
                          <span>{school.phone || school.contact_number}</span>
                        </a>
                      )}
                      {school.email && (
                        <a
                          href={`mailto:${school.email}`}
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-100 text-slate-800 font-bold flex items-center gap-1 transition"
                        >
                          <Mail className="w-2.5 h-2.5 text-emerald-600" />
                          <span>{school.email}</span>
                        </a>
                      )}
                      {(school.contact_person || school.principal_name) && (
                        <span className="text-slate-500">
                          Contact: {school.contact_person || school.principal_name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Add Action Button */}
                  <div className="flex-shrink-0 self-end sm:self-auto">
                    {isAlreadyAdded ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-800 font-bold text-xs border border-emerald-500/20">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>In Route</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAdd(school)}
                        className="btn-cta inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-white font-bold text-xs shadow-md shadow-[#0F1B31]/10 transition active:scale-95"
                      >
                        <span>{school.is_revisit_candidate ? 'Add Revisit' : 'Add to Route'}</span>
                        <span className="btn-knob">
                          <Plus className="w-3 h-3 text-white" />
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between flex-shrink-0 text-xs">
          <span className="text-[#59627E] font-medium">
            Showing <strong className="text-[#020C21] font-mono">{filteredDisplay.length}</strong> nearby schools within {radiusKm} km
          </span>
          <button
            type="button"
            onClick={onClose}
            className="btn-cta px-6 py-2 rounded-full text-white font-bold text-xs uppercase tracking-wider transition active:scale-95 shadow-md shadow-[#0F1B31]/15"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
