'use client';

import React, { useState } from 'react';
import {
  Home,
  MapPin,
  ExternalLink,
  Navigation,
  Compass,
  Layers,
  Bike,
  Info,
} from 'lucide-react';
import { RouteLeg, SchoolData, TravelMode } from '@/lib/types';

interface RouteMapProps {
  origin: { address: string; lat: number; lng: number };
  stops: SchoolData[];
  legs?: RouteLeg[];
  totalDistanceKm?: number;
  totalDurationFormatted?: string;
  travelMode?: TravelMode;
  googleMapsDirectionsUrl?: string;
  isSimulated?: boolean;
  onSelectSchool?: (school: SchoolData) => void;
}

export default function RouteMap({
  origin,
  stops,
  legs = [],
  totalDistanceKm = 0,
  totalDurationFormatted = '0 min',
  travelMode = 'TWO_WHEELER',
  googleMapsDirectionsUrl,
  isSimulated = true,
  onSelectSchool,
}: RouteMapProps) {
  const [activeStopIndex, setActiveStopIndex] = useState<number | null>(null);

  if (stops.length === 0) {
    return (
      <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-8 text-center text-slate-500">
        <Compass className="w-10 h-10 mx-auto text-slate-400 mb-2 animate-spin-slow" />
        <p className="font-semibold text-slate-700">No schools selected for mapping</p>
        <p className="text-xs text-slate-500 mt-1">
          Select candidate schools in the route planner and click &ldquo;Optimize Round Trip&rdquo;.
        </p>
      </div>
    );
  }

  // Calculate bounding box for SVG visualization
  const allLats = [origin.lat, ...stops.map((s) => s.latitude)];
  const allLngs = [origin.lng, ...stops.map((s) => s.longitude)];

  const minLat = Math.min(...allLats);
  const maxLat = Math.max(...allLats);
  const minLng = Math.min(...allLngs);
  const maxLng = Math.max(...allLngs);

  // Add padding
  const padLat = Math.max(0.015, (maxLat - minLat) * 0.15);
  const padLng = Math.max(0.015, (maxLng - minLng) * 0.15);

  const viewMinLat = minLat - padLat;
  const viewMaxLat = maxLat + padLat;
  const viewMinLng = minLng - padLng;
  const viewMaxLng = maxLng + padLng;

  const mapWidth = 800;
  const mapHeight = 500;

  // Project (lat, lng) to SVG coordinates (X, Y)
  const project = (lat: number, lng: number) => {
    const x = ((lng - viewMinLng) / (viewMaxLng - viewMinLng)) * (mapWidth - 80) + 40;
    // Invert lat for Y coordinate
    const y = ((viewMaxLat - lat) / (viewMaxLat - viewMinLat)) * (mapHeight - 80) + 40;
    return { x: Math.round(x), y: Math.round(y) };
  };

  const originCoords = project(origin.lat, origin.lng);
  const stopCoords = stops.map((s) => project(s.latitude, s.longitude));

  // Build SVG path for closed round-trip loop: Base -> Stop 1 -> ... -> Stop N -> Base
  let polylinePath = `M ${originCoords.x} ${originCoords.y}`;
  stopCoords.forEach((pt) => {
    polylinePath += ` L ${pt.x} ${pt.y}`;
  });
  polylinePath += ` Z`; // Closes back to Base!

  const activeSchool = activeStopIndex !== null ? stops[activeStopIndex] : null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
      {/* Map Header Bar */}
      <div className="bg-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Optimized Round-Trip Route</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {stops.length} STOPS
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              PG Base ➔ Stops 1..{stops.length} ➔ PG Base ({travelMode === 'TWO_WHEELER' ? 'Two-Wheeler / Bike' : 'Car / Drive'})
            </p>
          </div>
        </div>

        {/* Quick Launch Google Maps Directions */}
        {googleMapsDirectionsUrl && (
          <a
            href={googleMapsDirectionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition shadow-sm"
          >
            <Navigation className="w-3.5 h-3.5 fill-current" />
            <span>Open Route in Google Maps</span>
            <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
          </a>
        )}
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 bg-slate-50 border-b border-slate-200 text-center py-2.5 px-4 text-xs">
        <div>
          <p className="text-slate-500 font-medium">Total Distance</p>
          <p className="text-base font-bold text-slate-900 mt-0.5">
            {totalDistanceKm} km
          </p>
        </div>
        <div>
          <p className="text-slate-500 font-medium">Estimated Riding Time</p>
          <p className="text-base font-bold text-slate-900 mt-0.5">
            {totalDurationFormatted}
          </p>
        </div>
        <div>
          <p className="text-slate-500 font-medium">Mode</p>
          <p className="text-base font-bold text-emerald-700 flex items-center justify-center gap-1 mt-0.5">
            <Bike className="w-4 h-4" />
            <span>Two-Wheeler</span>
          </p>
        </div>
      </div>

      {/* Interactive Map Visualizer */}
      <div className="relative w-full bg-slate-950 aspect-[16/9] min-h-[360px] max-h-[500px] overflow-hidden select-none">
        {/* Ambient road grid pattern */}
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              'radial-gradient(#10b981 1px, transparent 1px), radial-gradient(#059669 1px, #090d16 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <svg
          viewBox={`0 0 ${mapWidth} ${mapHeight}`}
          className="w-full h-full object-contain relative z-10"
        >
          {/* Connecting Road Geometry / Polyline */}
          <path
            d={polylinePath}
            fill="none"
            stroke="#10b981"
            strokeWidth="3"
            strokeDasharray="6 4"
            className="animate-pulse"
          />

          {/* Solid subtle track beneath */}
          <path
            d={polylinePath}
            fill="none"
            stroke="#065f46"
            strokeWidth="5"
            opacity="0.5"
          />

          {/* Base Origin Marker */}
          <g transform={`translate(${originCoords.x}, ${originCoords.y})`}>
            <circle r="14" fill="#047857" className="animate-ping opacity-30" />
            <circle r="12" fill="#059669" stroke="#ffffff" strokeWidth="2" />
            <Home className="w-4 h-4 text-white" x="-8" y="-8" />
            <text
              y="24"
              textAnchor="middle"
              className="text-[11px] font-bold fill-white drop-shadow"
            >
              PG Base (Bogadi)
            </text>
          </g>

          {/* Intermediate School Stops */}
          {stops.map((school, index) => {
            const pt = stopCoords[index];
            const isSelected = activeStopIndex === index;

            return (
              <g
                key={school.id}
                transform={`translate(${pt.x}, ${pt.y})`}
                onClick={() => {
                  setActiveStopIndex(index);
                  if (onSelectSchool) onSelectSchool(school);
                }}
                className="cursor-pointer group"
              >
                {isSelected && (
                  <circle r="18" fill="#38bdf8" className="animate-ping opacity-40" />
                )}
                <circle
                  r={isSelected ? "14" : "12"}
                  fill={isSelected ? '#0284c7' : '#10b981'}
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="transition group-hover:scale-110"
                />
                <text
                  textAnchor="middle"
                  dy="4"
                  className="text-[11px] font-black fill-white pointer-events-none"
                >
                  {index + 1}
                </text>
                <text
                  y="-16"
                  textAnchor="middle"
                  className={`text-[10px] font-bold fill-slate-200 drop-shadow transition ${
                    isSelected ? 'fill-sky-400 font-extrabold text-[11px]' : ''
                  }`}
                >
                  {school.school_name.length > 18
                    ? school.school_name.substring(0, 16) + '...'
                    : school.school_name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Active School Card when clicked */}
        {activeSchool && (
          <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-20 bg-white/95 backdrop-blur rounded-xl p-3.5 shadow-xl border border-slate-200 text-slate-900 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Stop #{activeStopIndex! + 1}
                </span>
                <h4 className="text-xs font-bold text-slate-900 line-clamp-1 mt-1">
                  {activeSchool.school_name}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {activeSchool.area} • {activeSchool.board}
                </p>
              </div>
              <button
                onClick={() => setActiveStopIndex(null)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold p-1"
              >
                ✕
              </button>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-600">
                Principal: <span className="font-semibold text-slate-900">{activeSchool.principal_name || 'Principal'}</span>
              </span>
              <a
                href={activeSchool.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${activeSchool.latitude},${activeSchool.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 font-bold hover:underline flex items-center gap-0.5"
              >
                <span>Nav</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Leg-by-Leg Turn Sequence List */}
      {legs.length > 0 && (
        <div className="p-4 border-t border-slate-200 bg-slate-50/50">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Turn-by-Turn Leg Sequence ({legs.length} Legs)
          </h4>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {legs.map((leg, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white border border-slate-200/80 text-xs text-slate-700 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                    {i + 1}
                  </span>
                  <span className="truncate">
                    <span className="font-semibold text-slate-900">{leg.fromName}</span>
                    <span className="text-slate-400 mx-1">➔</span>
                    <span className="font-semibold text-emerald-800">{leg.toName}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 text-slate-500 font-mono">
                  <span>{leg.distanceKm} km</span>
                  <span>•</span>
                  <span className="font-medium text-slate-800">{leg.durationFormatted}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
