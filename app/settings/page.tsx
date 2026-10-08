'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  MapPin,
  Save,
  Key,
  ShieldCheck,
  Bike,
  Award,
  CheckCircle2,
  ExternalLink,
  Target,
  Sparkles,
} from 'lucide-react';
import { SettingsData } from '@/lib/types';
import { notifyDataChange } from '@/lib/realtimeSync';

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Editable fields
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [baseAddress, setBaseAddress] = useState('');
  const [baseLat, setBaseLat] = useState<number>(12.3021);
  const [baseLng, setBaseLng] = useState<number>(76.6178);
  const [workingRadius, setWorkingRadius] = useState<number>(25);
  const [dailyTarget, setDailyTarget] = useState<number>(7);
  const [travelMode, setTravelMode] = useState<'TWO_WHEELER' | 'DRIVE'>('TWO_WHEELER');
  const [gpsRadius, setGpsRadius] = useState<number>(150);
  const [momPitch, setMomPitch] = useState('');
  const [juniorQuestPitch, setJuniorQuestPitch] = useState('');
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const res = await fetch('/api/settings', { cache: 'no-store' });
        const json = await res.json();
        if (json.settings) {
          const s = json.settings;
          setSettings(s);
          setUserName(s.user_name);
          setUserRole(s.user_role);
          setBaseAddress(s.base_address);
          setBaseLat(s.base_latitude);
          setBaseLng(s.base_longitude);
          setWorkingRadius(s.working_radius_km);
          setDailyTarget(s.default_daily_schools || 7);
          setTravelMode(s.preferred_travel_mode || 'TWO_WHEELER');
          setGpsRadius(s.gps_verification_radius_meters || 150);
          setMomPitch(s.mom_pitch || '');
          setJuniorQuestPitch(s.junior_quest_pitch || '');
          setGoogleMapsApiKey(s.google_maps_api_key || '');
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage('');

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_name: userName,
          user_role: userRole,
          base_address: baseAddress,
          base_latitude: baseLat,
          base_longitude: baseLng,
          working_radius_km: workingRadius,
          default_daily_schools: dailyTarget,
          preferred_travel_mode: travelMode,
          gps_verification_radius_meters: gpsRadius,
          mom_pitch: momPitch,
          junior_quest_pitch: juniorQuestPitch,
          google_maps_api_key: googleMapsApiKey,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage('Settings updated successfully!');
        notifyDataChange('all');
        setTimeout(() => setSuccessMessage(''), 3500);
      } else {
        alert(data.error || 'Failed to save settings.');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400 text-xs">Loading configuration...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-emerald-600" />
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Representative Profile & App Settings
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Configure your PG base location, travel mode, daily targets, and editable sales pitch scripts
        </p>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* SECTION 1: USER PROFILE */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm sm:text-base pb-2 border-b border-slate-100">
            Representative Profile
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Full Name</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
                className="w-full border border-slate-300 rounded-xl p-2.5 font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Designation / Role</label>
              <input
                type="text"
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                required
                className="w-full border border-slate-300 rounded-xl p-2.5 font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: BASE LOCATION CONFIGURATION */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Base Location (PG / Home Round-Trip Center)
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Every daily round trip automatically starts from this location and finishes here.
          </p>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Base Address (Bogadi 2nd Stage default)
              </label>
              <input
                type="text"
                value={baseAddress}
                onChange={(e) => setBaseAddress(e.target.value)}
                required
                className="w-full border border-slate-300 rounded-xl p-2.5 font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Base Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={baseLat}
                  onChange={(e) => setBaseLat(parseFloat(e.target.value))}
                  required
                  className="w-full border border-slate-300 rounded-xl p-2.5 font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Base Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={baseLng}
                  onChange={(e) => setBaseLng(parseFloat(e.target.value))}
                  required
                  className="w-full border border-slate-300 rounded-xl p-2.5 font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Working Radius (km)</label>
                <input
                  type="number"
                  value={workingRadius}
                  onChange={(e) => setWorkingRadius(parseFloat(e.target.value))}
                  required
                  className="w-full border border-slate-300 rounded-xl p-2.5 font-mono text-slate-900"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: FIELD & ROUTING PREFERENCES */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Bike className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Field Routing & Visit Verification Preferences
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Default Daily Target Schools
              </label>
              <input
                type="number"
                min={1}
                max={15}
                value={dailyTarget}
                onChange={(e) => setDailyTarget(parseInt(e.target.value, 10))}
                className="w-full border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Default: 7 schools / day</span>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Preferred Travel Mode
              </label>
              <select
                value={travelMode}
                onChange={(e) => setTravelMode(e.target.value as any)}
                className="w-full border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900"
              >
                <option value="TWO_WHEELER">Two-Wheeler / Motorcycle (Default)</option>
                <option value="DRIVE">Drive / Car</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                GPS Location Radius (Meters)
              </label>
              <input
                type="number"
                min={50}
                max={1000}
                value={gpsRadius}
                onChange={(e) => setGpsRadius(parseInt(e.target.value, 10))}
                className="w-full border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Threshold for &ldquo;Location Verified&rdquo;</span>
            </div>
          </div>
        </div>

        {/* SECTION 4: GOOGLE MAPS PLATFORM API INTEGRATION */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Google Maps Platform API Integration
              </h3>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${googleMapsApiKey ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              {googleMapsApiKey ? 'Google Routes API Active' : 'Offline Haversine & Road Estimator Active'}
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Enables live Google Maps Routes API (Directions v2) for real-time traffic-aware multi-stop route optimization and exact turn-by-turn navigation from your PG base.
          </p>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Google Maps API Key (ComputeRoutes & Distance Matrix)
              </label>
              <input
                type="password"
                value={googleMapsApiKey}
                onChange={(e) => setGoogleMapsApiKey(e.target.value)}
                placeholder="AIzaSy... (Leave empty to use built-in calibrated road distance estimator)"
                className="w-full border border-slate-300 rounded-xl p-2.5 font-mono text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Requires <strong>Routes API</strong> or <strong>Directions API</strong> enabled in Google Cloud Console.
              </span>
            </div>

            <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-[11px] text-slate-600 space-y-1">
              <p className="font-bold text-blue-900">Current Integration Features Enabled:</p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                <li>Direct Turn-by-Turn two-wheeler navigation links to Google Maps for all 487 schools.</li>
                <li>Full multi-stop circuit navigation links with waypoints pre-loaded from PG location.</li>
                <li>High-precision distance matrix endpoint (<code>POST /api/routes/distance</code>) with road winding factor.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* SECTION 5: PROGRAMME COLLATERAL CONFIGURATION */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Award className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Customizable Programme Collateral & Pitches
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Edit the pitch scripts used by the AI assistant and field mode cards without changing code.
          </p>

          <div className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Mittsure Olympiad Masters (MOM) Pitch Content
              </label>
              <textarea
                rows={4}
                value={momPitch}
                onChange={(e) => setMomPitch(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-3 font-sans leading-relaxed focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Junior Power Quest Pitch Content
              </label>
              <textarea
                rows={4}
                value={juniorQuestPitch}
                onChange={(e) => setJuniorQuestPitch(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-3 font-sans leading-relaxed focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* SAVE BUTTON */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-sm shadow-md shadow-emerald-600/25 transition flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save All Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
