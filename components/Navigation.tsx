'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  School,
  Route,
  Calendar,
  MapPin,
  CheckCircle2,
  XCircle,
  Menu,
  X,
  Compass,
} from 'lucide-react';
import { subscribeToDataChanges } from '@/lib/realtimeSync';

export default function Navigation() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [counts, setCounts] = useState<{ completed: number; remaining: number; total: number }>({
    completed: 61,
    remaining: 426,
    total: 487,
  });

  const fetchCounts = async () => {
    try {
      const res = await fetch('/api/dashboard', { cache: 'no-store' });
      const data = await res.json();
      if (data?.kpis) {
        setCounts({
          completed: data.kpis.completed || 61,
          remaining: data.kpis.remaining || 426,
          total: data.kpis.totalAssigned || 487,
        });
      }
    } catch {
      // Fallback to defaults
    }
  };

  useEffect(() => {
    fetchCounts();
    const unsubscribe = subscribeToDataChanges(() => {
      fetchCounts();
    });
    return () => unsubscribe();
  }, [pathname]);

  const navItems = [
    {
      name: 'Overview',
      href: '/',
      icon: LayoutDashboard,
    },
    {
      name: 'Area-wise Planning',
      href: '/area-divide',
      icon: MapPin,
    },
    {
      name: 'School Manager',
      href: '/schools',
      icon: School,
      showCounts: true,
    },
    {
      name: 'Round Route Planner',
      href: '/route-planner',
      icon: Route,
    },
    {
      name: 'Day Schedule',
      href: '/calendar',
      icon: Calendar,
    },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 glass-panel min-h-[calc(100vh-2rem)] my-4 ml-4 sticky top-4 py-5 px-3.5 z-30 shadow-sm border border-white/90">
        {/* Brand Header */}
        <div className="px-2 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#0F1B31] border border-white/40 text-white flex items-center justify-center text-sm shadow-md shadow-[#0F1B31]/20 font-black font-mono">
              M
            </div>
            <div>
              <div className="leading-tight tracking-tight font-black text-base text-[#020C21]">
                MITTSURE
              </div>
              <div className="text-[10px] text-[#59627E] font-bold uppercase tracking-wider">
                Field School Manager
              </div>
            </div>
          </div>
        </div>

        {/* Representative & PG Base Card */}
        <div className="mx-0.5 mb-5 p-3.5 rounded-2xl glass-card border border-white/90 space-y-2">
          <div>
            <span className="text-[9px] font-black text-[#59627E] uppercase tracking-wider">
              Field Representative
            </span>
            <p className="text-xs font-black text-[#020C21] leading-tight">
              Nichhenametla Kalyan Ashrith
            </p>
          </div>
          <div className="pt-2 border-t border-slate-200/70 flex items-start gap-1.5 text-[11px] text-[#59627E]">
            <MapPin className="w-3.5 h-3.5 text-[#4A78B0] flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#0F182F]">PG Base Location:</span>
              <p className="text-[10px] text-[#59627E] leading-tight">
                661, Bogadi 2nd Stage, Mysuru
              </p>
            </div>
          </div>
        </div>

        {/* 5 Core Navigation Items */}
        <nav className="flex-1 space-y-1.5 px-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#0F1B31] text-white shadow-md shadow-[#0F1B31]/20 translate-x-0.5'
                    : 'text-[#202940] hover:bg-white/80 hover:text-[#020C21]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-white' : 'text-[#4A78B0]'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>

                {item.showCounts && (
                  <div className="flex items-center gap-1">
                    <span
                      title="Visited Schools (Green)"
                      className={`px-2 py-0.5 text-[10px] font-black rounded-full ${
                        isActive
                          ? 'bg-emerald-500 text-white'
                          : 'badge-visited'
                      }`}
                    >
                      {counts.completed}
                    </span>
                    <span
                      title="Unvisited Schools (Red)"
                      className={`px-2 py-0.5 text-[10px] font-black rounded-full ${
                        isActive
                          ? 'bg-rose-500 text-white'
                          : 'badge-not-visited'
                      }`}
                    >
                      {counts.remaining}
                    </span>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Quick Tally Footer */}
        <div className="mt-auto pt-4 px-0.5 space-y-2">
          <div className="p-3.5 rounded-2xl glass-card border border-white/90">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-[#59627E] uppercase tracking-wider">
                Allotment Status
              </span>
              <span className="text-[11px] font-black text-[#020C21]">
                {((counts.completed / counts.total) * 100).toFixed(1)}%
              </span>
            </div>
            {/* ConSentinel Track Meter */}
            <div className="track-meter mb-2.5">
              <div
                className="track-meter-fill"
                style={{ width: `${(counts.completed / counts.total) * 100}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-center text-[10px]">
              <div className="p-1 rounded-xl badge-visited">
                ✓ {counts.completed} Visited
              </div>
              <div className="p-1 rounded-xl badge-not-visited">
                ✕ {counts.remaining} Pending
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Floating Glass Pill Navigation Bar (5 Core Items) */}
      <div className="lg:hidden fixed bottom-3 left-3 right-3 z-50 glass-header rounded-full border border-white/90 shadow-2xl px-2 py-1.5">
        <div className="grid grid-cols-5 gap-1 text-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center py-1.5 rounded-full text-[10px] font-bold transition ${
                  isActive
                    ? 'bg-[#0F1B31] text-white shadow-sm'
                    : 'text-[#59627E] hover:text-[#020C21]'
                }`}
              >
                <Icon className={`w-4 h-4 mb-0.5 ${isActive ? 'text-white' : 'text-[#4A78B0]'}`} />
                <span className="truncate max-w-[60px] text-[9px]">{item.name.split(' ')[0]}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
