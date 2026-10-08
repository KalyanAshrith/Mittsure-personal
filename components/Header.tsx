'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Navigation,
  Compass,
  Wifi,
  WifiOff,
  RefreshCw,
  Sparkles,
  MapPin,
  Bike,
} from 'lucide-react';

export default function Header() {
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus('syncing');
      setTimeout(() => setSyncStatus('synced'), 1500);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };

    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 glass-header px-4 py-3 sm:px-6">
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        {/* Brand & User Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#0F1B31] border border-white/40 flex items-center justify-center text-white font-black shadow-md shadow-[#0F1B31]/20">
            <span className="text-lg tracking-wider font-mono">M</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-[#020C21] tracking-tight leading-tight">
                Mittsure Field Manager
              </span>
              <span className="hidden sm:inline-block px-2.5 py-0.5 text-[11px] font-bold glass-pill text-[#0F1B31]">
                Mysuru Hub
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#59627E]">
              <span className="font-semibold text-[#0F182F]">Kalyan Ashrith</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-[#4A78B0] font-medium">
                <MapPin className="w-3.5 h-3.5 text-[#4A78B0]" />
                Bogadi 2nd Stage PG Base
              </span>
            </div>
          </div>
        </div>

        {/* Sync & Quick Action */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Online/Sync Status Indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold glass-pill">
            {syncStatus === 'synced' && (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden md:inline text-emerald-800">Synced</span>
              </>
            )}
            {syncStatus === 'syncing' && (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                <span className="hidden md:inline text-amber-800">Syncing...</span>
              </>
            )}
            {syncStatus === 'offline' && (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-600" />
                <span className="text-rose-800">Offline</span>
              </>
            )}
          </div>

          {/* AI Assistant Quick Link */}
          <Link
            href="/ai-assistant"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-bold text-[#0F1B31] glass-pill hover:bg-white/90 transition shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-[#4A78B0]" />
            <span className="hidden sm:inline">AI Co-pilot</span>
          </Link>

          {/* High Priority Field Mode Button for On-the-Go Representative */}
          <Link
            href="/field-mode"
            className="btn-cta px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-black gap-2"
          >
            <span className="btn-knob w-5 h-5 sm:w-6 sm:h-6">
              <Bike className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
            </span>
            <span>Field Mode</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
