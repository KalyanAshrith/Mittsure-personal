'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Plus,
  School as SchoolIcon,
  MapPin,
  Phone,
  Navigation,
  ClipboardList,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Layers,
  LayoutGrid,
  Table as TableIcon,
  Award,
  ExternalLink,
  Sparkles,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Compass,
} from 'lucide-react';
import SchoolCard from '@/components/SchoolCard';
import RecordVisitModal from '@/components/RecordVisitModal';
import AIMarkVisitedModal from '@/components/AIMarkVisitedModal';
import { SchoolData } from '@/lib/types';
import { subscribeToDataChanges, notifyDataChange } from '@/lib/realtimeSync';
import { getActiveUser, subscribeToUserChange, ActiveUser } from '@/lib/activeUser';

export default function SchoolMasterPage() {
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [areas, setAreas] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Filter states
  const [search, setSearch] = useState('');
  const [board, setBoard] = useState('ALL');
  const [schoolType, setSchoolType] = useState('ALL');
  const [area, setArea] = useState('ALL');
  const [district, setDistrict] = useState('ALL');
  const [visitStatus, setVisitStatus] = useState('ALL');
  const [priority, setPriority] = useState('ALL');
  const [programme, setProgramme] = useState('ALL');

  // Interactive Sorting & Counts states
  const [sortBy, setSortBy] = useState<string>('s_no');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [countsData, setCountsData] = useState<{
    global: {
      total: number;
      visited: number;
      unvisited: number;
      byBoard: Record<string, number>;
      byDistrict: Record<string, number>;
      byType: Record<string, number>;
      byPriority: Record<string, number>;
      byProgramme: Record<string, number>;
      byArea: Record<string, number>;
    };
    filtered: {
      total: number;
      visited: number;
      unvisited: number;
      byBoard: Record<string, number>;
      byDistrict: Record<string, number>;
      byType: Record<string, number>;
      byPriority: Record<string, number>;
      byProgramme: Record<string, number>;
      byArea: Record<string, number>;
    };
  } | null>(null);

  // Visit Modal
  const [selectedSchoolForVisit, setSelectedSchoolForVisit] = useState<SchoolData | null>(null);
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);

  // AI Batch Marker Modal
  const [isAIMarkModalOpen, setIsAIMarkModalOpen] = useState(false);

  // Add School Modal
  const [isAddSchoolModalOpen, setIsAddSchoolModalOpen] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolBoard, setNewSchoolBoard] = useState('STATE BOARD');
  const [newSchoolType, setNewSchoolType] = useState('PRIMARY');
  const [newSchoolArea, setNewSchoolArea] = useState('Bogadi');
  const [newSchoolDistrict, setNewSchoolDistrict] = useState('Mysuru');
  const [newSchoolAddress, setNewSchoolAddress] = useState('');
  const [newSchoolPrincipal, setNewSchoolPrincipal] = useState('');
  const [newSchoolPhone, setNewSchoolPhone] = useState('');
  const [newSchoolEmail, setNewSchoolEmail] = useState('');
  const [newSchoolStrength, setNewSchoolStrength] = useState('200');
  const [newSchoolProgramme, setNewSchoolProgramme] = useState('MOM');
  const [newSchoolNotes, setNewSchoolNotes] = useState('');
  const [markVisitedImmediately, setMarkVisitedImmediately] = useState(true);
  const [newVisitDate, setNewVisitDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newVisitOutcome, setNewVisitOutcome] = useState('Interested');
  const [newVisitNotes, setNewVisitNotes] = useState('');
  const [isAddingSchool, setIsAddingSchool] = useState(false);
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
        fetchSchools();
      }
    } catch (err) {
      console.error('Error toggling school:', err);
    } finally {
      setTogglingSchoolId(null);
    }
  };

  const fetchSchools = async () => {
    setLoading(true);
    try {
      const activeUser = getActiveUser();
      const params = new URLSearchParams();
      if (activeUser?.name) params.append('repName', activeUser.name);
      if (search) params.append('search', search);
      if (board !== 'ALL') params.append('board', board);
      if (schoolType !== 'ALL') params.append('schoolType', schoolType);
      if (area !== 'ALL') params.append('area', area);
      if (district !== 'ALL') params.append('district', district);
      if (visitStatus !== 'ALL') params.append('visitStatus', visitStatus);
      if (priority !== 'ALL') params.append('priority', priority);
      if (programme !== 'ALL') params.append('programme', programme);

      const res = await fetch(`/api/schools?${params.toString()}`, { cache: 'no-store' });
      const json = await res.json();
      setSchools(json.schools || []);
      if (json.areas) setAreas(json.areas);
      if (json.globalCounts && json.filteredCounts) {
        setCountsData({
          global: json.globalCounts,
          filtered: json.filteredCounts,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleColumnSort = (field: string) => {
    if (sortBy === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  // Client-side instantaneous 60fps sorted list
  const sortedSchools = useMemo(() => {
    const items = [...schools];
    items.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 's_no') {
        comparison = (a.s_no ?? 0) - (b.s_no ?? 0);
      } else if (sortBy === 'school_name') {
        comparison = (a.school_name || '').localeCompare(b.school_name || '');
      } else if (sortBy === 'board') {
        comparison = (a.board || '').localeCompare(b.board || '');
      } else if (sortBy === 'school_type') {
        comparison = (a.school_type || '').localeCompare(b.school_type || '');
      } else if (sortBy === 'area') {
        comparison = (a.area || '').localeCompare(b.area || '');
      } else if (sortBy === 'district') {
        comparison = (a.district || '').localeCompare(b.district || '');
      } else if (sortBy === 'opportunity_type') {
        comparison = (a.opportunity_type || '').localeCompare(b.opportunity_type || '');
      } else if (sortBy === 'visit_status') {
        const aVisited = Boolean(a.visited_by_current_user || a.visit_status === 'VISITED');
        const bVisited = Boolean(b.visited_by_current_user || b.visit_status === 'VISITED');
        comparison = aVisited === bVisited ? 0 : aVisited ? -1 : 1;
      } else if (sortBy === 'last_visit_date') {
        const dateA = a.last_visit_date ? new Date(a.last_visit_date).getTime() : 0;
        const dateB = b.last_visit_date ? new Date(b.last_visit_date).getTime() : 0;
        comparison = dateA - dateB;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return items;
  }, [schools, sortBy, sortDirection]);

  // Breakdown counts for currently active sort category
  const activeSortCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    schools.forEach((s) => {
      let key = 'Other';
      if (sortBy === 'board') {
        key = s.board || 'Unknown';
      } else if (sortBy === 'district') {
        key = s.district || 'Unknown';
      } else if (sortBy === 'visit_status') {
        const isVisited = Boolean(s.visited_by_current_user || s.visit_status === 'VISITED');
        key = isVisited ? 'Visited (Green)' : 'Not Visited (Red)';
      } else if (sortBy === 'school_type') {
        key = s.school_type || 'Unknown';
      } else if (sortBy === 'opportunity_type') {
        key = `Cat ${s.opportunity_type || 'C'}`;
      } else if (sortBy === 'area') {
        key = s.area || 'Unknown';
      } else {
        const isVisited = Boolean(s.visited_by_current_user || s.visit_status === 'VISITED');
        key = isVisited ? 'Completed' : 'Pending';
      }
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [schools, sortBy]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchSchools();
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [search, board, schoolType, area, district, visitStatus, priority, programme]);

  useEffect(() => {
    const unsubUser = subscribeToUserChange(() => {
      fetchSchools();
    });
    const unsubscribe = subscribeToDataChanges(() => {
      fetchSchools();
    });
    return () => {
      unsubUser();
      unsubscribe();
    };
  }, []);

  const handleAddSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolName.trim() || !newSchoolArea.trim()) {
      alert('School name and area are required.');
      return;
    }
    setIsAddingSchool(true);
    try {
      const res = await fetch('/api/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_name: newSchoolName.trim(),
          board: newSchoolBoard,
          school_type: newSchoolType,
          area: newSchoolArea.trim(),
          district: newSchoolDistrict,
          address: newSchoolAddress.trim() || `${newSchoolName.trim()}, ${newSchoolArea.trim()}`,
          principal_name: newSchoolPrincipal.trim() || 'Head / Principal',
          phone: newSchoolPhone.trim(),
          email: newSchoolEmail.trim(),
          student_strength: parseInt(newSchoolStrength, 10) || 200,
          recommended_programme: newSchoolProgramme,
          notes: newSchoolNotes.trim(),
          markVisited: markVisitedImmediately,
          visit_date: newVisitDate,
          outcome: newVisitOutcome,
          visit_notes: newVisitNotes.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        notifyDataChange('school');
        if (markVisitedImmediately) {
          notifyDataChange('visit', { count: 1, date: newVisitDate });
        }
        alert(data.message || 'School added successfully!');
        setIsAddSchoolModalOpen(false);
        setNewSchoolName('');
        setNewSchoolAddress('');
        setNewSchoolPrincipal('');
        setNewSchoolPhone('');
        setNewSchoolEmail('');
        setNewSchoolNotes('');
        setNewVisitNotes('');
        fetchSchools();
      } else {
        alert(data.error || 'Failed to add school.');
      }
    } catch (err: any) {
      alert('Error adding school: ' + err.message);
    } finally {
      setIsAddingSchool(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setBoard('ALL');
    setSchoolType('ALL');
    setArea('ALL');
    setDistrict('ALL');
    setVisitStatus('ALL');
    setPriority('ALL');
    setProgramme('ALL');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-[#020C21] tracking-tight">
              School Master Database
            </h1>
            <span className="glass-pill px-3 py-0.5 rounded-full text-xs font-mono font-bold text-[#0F182F] shadow-xs">
              {schools.length} Schools
            </span>
          </div>
          <p className="text-xs text-[#59627E] mt-1 font-medium">
            Assigned school territory for Mysore region • Search, classify & record field visits
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex rounded-2xl bg-white/60 border border-white/80 p-1 text-xs font-bold shadow-xs">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-xl transition ${
                viewMode === 'table' ? 'bg-[#0F1B31] text-white shadow-sm' : 'text-[#59627E] hover:text-[#020C21]'
              }`}
              title="Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-xl transition ${
                viewMode === 'grid' ? 'bg-[#0F1B31] text-white shadow-sm' : 'text-[#59627E] hover:text-[#020C21]'
              }`}
              title="Grid Cards View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setIsAIMarkModalOpen(true)}
            className="glass-pill px-3.5 py-2 text-xs font-bold text-[#0F1B31] hover:bg-white/90 shadow-xs flex items-center gap-1.5 transition active:scale-95"
            title="Batch mark visited schools using AI parser"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span>AI Batch Marker</span>
          </button>

          <button
            onClick={() => setIsAddSchoolModalOpen(true)}
            className="btn-cta text-xs py-2 px-3.5 shadow-sm"
          >
            <span>Add School</span>
            <span className="btn-knob w-5 h-5">
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
            </span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-[#59627E] absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by school name, S.No, school ID, area, phone, or principal name..."
            className="w-full text-xs font-semibold border border-[#DDE4EE] bg-white/80 text-[#020C21] rounded-xl pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-[#0F1B31] placeholder-[#59627E]/70 shadow-xs"
          />
        </div>

        {/* Filter Chips with Real-Time Total Counts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
          {/* Board */}
          <select
            value={board}
            onChange={(e) => setBoard(e.target.value)}
            className="border border-[#DDE4EE] rounded-xl px-2.5 py-1.5 bg-white/80 font-bold text-[#0F182F] shadow-xs"
          >
            <option value="ALL">Board: All ({countsData?.global?.total || 495})</option>
            <option value="STATE BOARD">
              State Board ({countsData?.global?.byBoard?.['STATE BOARD'] || 258})
            </option>
            <option value="CBSE">
              CBSE ({countsData?.global?.byBoard?.['CBSE'] || 155})
            </option>
            <option value="ICSE">
              ICSE ({countsData?.global?.byBoard?.['ICSE'] || 48})
            </option>
            <option value="OTHER">
              Other ({countsData?.global?.byBoard?.['OTHER'] || 33})
            </option>
          </select>

          {/* School Type */}
          <select
            value={schoolType}
            onChange={(e) => setSchoolType(e.target.value)}
            className="border border-[#DDE4EE] rounded-xl px-2.5 py-1.5 bg-white/80 font-bold text-[#0F182F] shadow-xs"
          >
            <option value="ALL">Type: All ({countsData?.global?.total || 495})</option>
            <option value="PRIMARY">
              Primary ({countsData?.global?.byType?.['PRIMARY'] || 446})
            </option>
            <option value="PRE-SCHOOL">
              Pre-School ({(countsData?.global?.byType?.['PLAY SCHOOL'] || 33) + (countsData?.global?.byType?.['PRE-SCHOOL'] || 2)})
            </option>
            <option value="COMPOSITE">
              Composite ({countsData?.global?.byType?.['COMPOSITE'] || 14})
            </option>
          </select>

          {/* Visit Status */}
          <select
            value={visitStatus}
            onChange={(e) => setVisitStatus(e.target.value)}
            className="border border-[#DDE4EE] rounded-xl px-2.5 py-1.5 bg-white/80 font-bold text-[#0F182F] shadow-xs"
          >
            <option value="ALL">Status: All ({countsData?.global?.total || 495})</option>
            <option value="NOT_VISITED">
              Not Visited ({countsData?.global?.unvisited || 344})
            </option>
            <option value="VISITED_ONLY">
              Visited Only ({countsData?.global?.visited || 151})
            </option>
            <option value="INTERESTED">Interested</option>
            <option value="FOLLOW-UP">Follow-up</option>
            <option value="REGISTRATION">Registration</option>
            <option value="NOT INTERESTED">Not Interested</option>
          </select>

          {/* Area */}
          <select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="border border-[#DDE4EE] rounded-xl px-2.5 py-1.5 bg-white/80 font-bold text-[#0F182F] shadow-xs"
          >
            <option value="ALL">Area: All ({countsData?.global?.total || 495})</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a} ({countsData?.global?.byArea?.[a] || 0})
              </option>
            ))}
          </select>

          {/* District */}
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="border border-[#DDE4EE] rounded-xl px-2.5 py-1.5 bg-white/80 font-bold text-[#0F182F] shadow-xs"
          >
            <option value="ALL">District: All ({countsData?.global?.total || 495})</option>
            <option value="Mysuru">
              Mysuru ({countsData?.global?.byDistrict?.['Mysuru'] || 312})
            </option>
            <option value="Mandya">
              Mandya ({countsData?.global?.byDistrict?.['Mandya'] || 101})
            </option>
            <option value="Hassan">
              Hassan ({countsData?.global?.byDistrict?.['Hassan'] || 38})
            </option>
            <option value="Chamarajanagar">
              Chamarajanagar ({countsData?.global?.byDistrict?.['Chamarajanagar'] || 22})
            </option>
            <option value="Kodagu">
              Kodagu ({countsData?.global?.byDistrict?.['Kodagu'] || 22})
            </option>
          </select>

          {/* Programme */}
          <select
            value={programme}
            onChange={(e) => setProgramme(e.target.value)}
            className="border border-[#DDE4EE] rounded-xl px-2.5 py-1.5 bg-white/80 font-bold text-[#0F182F] shadow-xs"
          >
            <option value="ALL">Programme: All ({countsData?.global?.total || 495})</option>
            <option value="MOM">
              MOM ({countsData?.global?.byProgramme?.['MOM'] || 0})
            </option>
            <option value="Junior Power Quest">
              JPQ ({countsData?.global?.byProgramme?.['Junior Power Quest'] || 0})
            </option>
            <option value="Both">
              Both ({countsData?.global?.byProgramme?.['Both'] || 0})
            </option>
          </select>

          {/* Priority */}
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="border border-[#DDE4EE] rounded-xl px-2.5 py-1.5 bg-white/80 font-bold text-[#0F182F] shadow-xs"
          >
            <option value="ALL">Priority: All ({countsData?.global?.total || 495})</option>
            <option value="HIGH">
              High Priority ({countsData?.global?.byPriority?.['HIGH'] || 494})
            </option>
            <option value="MEDIUM">
              Medium ({countsData?.global?.byPriority?.['MEDIUM'] || 1})
            </option>
            <option value="LOW">Low Priority</option>
          </select>
        </div>

        {/* Interactive Sorting System & Real-Time Item Counts Strip */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-white/60 text-xs">
          {/* Sorter Selector & Direction Switcher */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#59627E] flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#0F1B31]" />
              <span>Sort Order:</span>
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-[#DDE4EE] rounded-xl px-3 py-1.5 bg-white font-bold text-xs text-[#0F182F] shadow-xs focus:ring-2 focus:ring-[#0F1B31] transition"
            >
              <option value="s_no">S.No (Original Allotment #1..495)</option>
              <option value="school_name">School Name (Alphabetical)</option>
              <option value="area">Area / Locality Cluster</option>
              <option value="district">District Zone</option>
              <option value="board">Board (State, CBSE, ICSE)</option>
              <option value="visit_status">Visit Status (Visited vs Pending)</option>
              <option value="last_visit_date">Last Visit Date (Recent)</option>
              <option value="opportunity_type">Opportunity Category (A/B/C)</option>
              <option value="school_type">School Category</option>
            </select>

            <button
              onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="px-3 py-1.5 rounded-xl bg-white border border-[#DDE4EE] font-bold text-xs text-[#0F182F] hover:bg-[#0F1B31] hover:text-white transition flex items-center gap-1.5 shadow-xs"
              title={`Toggle sort direction (currently ${sortDirection === 'asc' ? 'Ascending' : 'Descending'})`}
            >
              {sortDirection === 'asc' ? (
                <>
                  <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Ascending (A→Z / 1→9)</span>
                </>
              ) : (
                <>
                  <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Descending (Z→A / 9→1)</span>
                </>
              )}
            </button>
          </div>

          {/* Live Dynamic Counters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="glass-pill px-3 py-1 text-xs font-bold text-[#0F182F] shadow-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Showing <strong>{sortedSchools.length}</strong> of {countsData?.global?.total || 495}</span>
            </span>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-xs">
              ✓ {sortedSchools.filter((s) => s.visited_by_current_user || s.visit_status === 'VISITED').length} Visited
            </span>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-200 shadow-xs">
              Pending: {sortedSchools.filter((s) => !s.visited_by_current_user && s.visit_status !== 'VISITED').length}
            </span>
          </div>
        </div>

        {/* Dynamic Active Sort Breakdown Ribbon: Shows "How Many Have There" in each category of current sort */}
        <div className="p-2.5 sm:p-3 bg-white/70 border border-white/80 rounded-2xl flex items-center gap-2 flex-wrap text-xs shadow-xs">
          <div className="flex items-center gap-1.5 font-extrabold text-[#59627E] text-[11px] uppercase tracking-wider">
            <BarChart3 className="w-3.5 h-3.5 text-[#0F1B31]" />
            <span>Count Breakdown by {sortBy.replace('_', ' ')}:</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {Object.entries(activeSortCounts).slice(0, 8).map(([key, count]) => (
              <span
                key={key}
                className="px-2.5 py-0.5 rounded-xl bg-white border border-slate-200/90 text-[#020C21] font-bold text-[11px] shadow-2xs flex items-center gap-1 hover:border-[#0F1B31] transition"
              >
                <span className="text-[#59627E]">{key}:</span>
                <span className="font-mono text-[#0F1B31] font-black">{count}</span>
              </span>
            ))}
            {Object.keys(activeSortCounts).length > 8 && (
              <span className="text-[10px] text-[#59627E] font-medium italic">
                +{Object.keys(activeSortCounts).length - 8} more
              </span>
            )}
          </div>
        </div>

        {/* Clear Filters Action */}
        {(search || board !== 'ALL' || schoolType !== 'ALL' || area !== 'ALL' || district !== 'ALL' || visitStatus !== 'ALL' || programme !== 'ALL' || priority !== 'ALL') && (
          <div className="flex items-center justify-between text-xs text-[#59627E] pt-1">
            <span className="font-semibold">Filtered results ({schools.length} matches)</span>
            <button
              onClick={clearFilters}
              className="text-[#0F1B31] font-bold hover:underline"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* Schools List Content */}
      {loading ? (
        <div className="p-12 text-center glass-panel rounded-2xl text-[#59627E] font-medium">
          Loading assigned schools...
        </div>
      ) : schools.length === 0 ? (
        <div className="p-12 text-center glass-panel rounded-2xl border border-dashed border-slate-300 text-[#59627E]">
          <SchoolIcon className="w-10 h-10 text-[#59627E] mx-auto mb-2 opacity-60" />
          <p className="font-bold text-[#020C21]">No schools match the selected criteria</p>
          <button
            onClick={clearFilters}
            className="mt-3 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#0F1B31] hover:bg-black transition shadow-xs"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedSchools.map((school) => (
            <SchoolCard
              key={school.id}
              school={school}
              onStatusToggle={handleQuickToggle}
              onRecordVisit={(s) => {
                setSelectedSchoolForVisit(s);
                setIsVisitModalOpen(true);
              }}
            />
          ))}
        </div>
      ) : (
        /* Powerful Searchable Table with Interactive Column Sorting & Real-Time Counts */
        <div className="glass-panel rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#0F182F]">
              <thead className="bg-[#0F1B31] text-white uppercase text-[10px] tracking-wider font-extrabold select-none">
                <tr>
                  <th className="py-3.5 px-3.5">
                    <button
                      type="button"
                      onClick={() => handleColumnSort('s_no')}
                      className={`flex items-center gap-1 uppercase tracking-wider font-extrabold transition text-[10px] ${
                        sortBy === 's_no' ? 'text-emerald-400 font-black' : 'text-slate-200 hover:text-white'
                      }`}
                      title="Sort by Original Allotment S.No"
                    >
                      <span>S.No</span>
                      {sortBy === 's_no' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </button>
                  </th>
                  <th className="py-3.5 px-3.5">
                    <button
                      type="button"
                      onClick={() => handleColumnSort('school_name')}
                      className={`flex items-center gap-1 uppercase tracking-wider font-extrabold transition text-[10px] ${
                        sortBy === 'school_name' ? 'text-emerald-400 font-black' : 'text-slate-200 hover:text-white'
                      }`}
                      title="Sort Alphabetically by School Name"
                    >
                      <span>School Name</span>
                      {sortBy === 'school_name' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </button>
                  </th>
                  <th className="py-3.5 px-3.5">
                    <button
                      type="button"
                      onClick={() => handleColumnSort('board')}
                      className={`flex items-center gap-1 uppercase tracking-wider font-extrabold transition text-[10px] ${
                        sortBy === 'board' ? 'text-emerald-400 font-black' : 'text-slate-200 hover:text-white'
                      }`}
                      title="Sort by Board"
                    >
                      <span>Board</span>
                      {sortBy === 'board' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </button>
                  </th>
                  <th className="py-3.5 px-3.5">
                    <button
                      type="button"
                      onClick={() => handleColumnSort('school_type')}
                      className={`flex items-center gap-1 uppercase tracking-wider font-extrabold transition text-[10px] ${
                        sortBy === 'school_type' ? 'text-emerald-400 font-black' : 'text-slate-200 hover:text-white'
                      }`}
                      title="Sort by School Type"
                    >
                      <span>Type</span>
                      {sortBy === 'school_type' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </button>
                  </th>
                  <th className="py-3.5 px-3.5">
                    <button
                      type="button"
                      onClick={() => handleColumnSort('area')}
                      className={`flex items-center gap-1 uppercase tracking-wider font-extrabold transition text-[10px] ${
                        sortBy === 'area' ? 'text-emerald-400 font-black' : 'text-slate-200 hover:text-white'
                      }`}
                      title="Sort by Area & Nagar"
                    >
                      <span>Area & Dist</span>
                      {sortBy === 'area' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </button>
                  </th>
                  <th className="py-3.5 px-3.5">
                    <button
                      type="button"
                      onClick={() => handleColumnSort('opportunity_type')}
                      className={`flex items-center gap-1 uppercase tracking-wider font-extrabold transition text-[10px] ${
                        sortBy === 'opportunity_type' ? 'text-emerald-400 font-black' : 'text-slate-200 hover:text-white'
                      }`}
                      title="Sort by Opportunity Category"
                    >
                      <span>Opp</span>
                      {sortBy === 'opportunity_type' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </button>
                  </th>
                  <th className="py-3.5 px-3.5">
                    <button
                      type="button"
                      onClick={() => handleColumnSort('visit_status')}
                      className={`flex items-center gap-1 uppercase tracking-wider font-extrabold transition text-[10px] ${
                        sortBy === 'visit_status' ? 'text-emerald-400 font-black' : 'text-slate-200 hover:text-white'
                      }`}
                      title="Sort by Visited Status"
                    >
                      <span>Visit Status</span>
                      {sortBy === 'visit_status' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </button>
                  </th>
                  <th className="py-3.5 px-3.5">
                    <button
                      type="button"
                      onClick={() => handleColumnSort('last_visit_date')}
                      className={`flex items-center gap-1 uppercase tracking-wider font-extrabold transition text-[10px] ${
                        sortBy === 'last_visit_date' ? 'text-emerald-400 font-black' : 'text-slate-200 hover:text-white'
                      }`}
                      title="Sort by Last Visit Date"
                    >
                      <span>Last Visit</span>
                      {sortBy === 'last_visit_date' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </button>
                  </th>
                  <th className="py-3.5 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/60">
                {sortedSchools.map((school) => {
                  const isVisited = Boolean(school.visited_by_current_user || school.visit_status === 'VISITED');
                  return (
                    <tr key={school.id} className="hover:bg-white/50 transition">
                      <td className="py-3 px-3.5 font-mono font-bold text-[#020C21]">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isVisited ? 'bg-emerald-500 shadow-xs' : 'bg-rose-500 shadow-xs'
                            }`}
                            title={isVisited ? 'Visited (Completed)' : 'Unvisited (Pending)'}
                          />
                          <span>#{school.s_no}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3.5">
                        <Link
                          href={`/schools/${school.id}`}
                          className="font-bold text-[#020C21] hover:text-[#0F1B31] hover:underline block"
                        >
                          {school.school_name}
                        </Link>
                        <span className="text-[10px] text-[#59627E] font-mono">
                          {school.school_id}
                        </span>
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="px-2 py-0.5 rounded font-bold bg-white/80 text-[#0F182F] border border-white/80 text-[10px] shadow-xs">
                          {school.board}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-[#59627E] font-medium truncate max-w-[110px]">
                        {school.school_type}
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="font-bold text-[#020C21]">{school.area}</span>
                        <span className="text-[10px] text-[#59627E] block">{school.district}</span>
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="font-bold px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800">
                          Cat {school.opportunity_type}
                        </span>
                      </td>
                      <td className="py-3 px-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-black text-[10px] border inline-flex items-center gap-1.5 shadow-xs ${
                            isVisited ? 'badge-visited' : 'badge-not-visited'
                          }`}
                        >
                          {isVisited ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                              <span>VISITED</span>
                            </>
                          ) : (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              <span>NOT VISITED</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-[#59627E] font-mono text-[11px]">
                        {school.last_visit_date
                          ? new Date(school.last_visit_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={
                              school.google_maps_url ||
                              `https://www.google.com/maps/search/?api=1&query=${school.latitude},${school.longitude}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-xl bg-white/70 hover:bg-[#0F1B31] text-[#0F182F] hover:text-white border border-white/80 transition shadow-xs"
                            title="Navigate"
                          >
                            <Navigation className="w-3.5 h-3.5 fill-current" />
                          </a>

                          <button
                            disabled={togglingSchoolId === school.id}
                            onClick={() => handleQuickToggle(school.id, isVisited)}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition flex items-center gap-1 active:scale-95 shadow-xs ${
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
                            onClick={() => {
                              setSelectedSchoolForVisit(school);
                              setIsVisitModalOpen(true);
                            }}
                            className="p-1.5 rounded-xl bg-white/70 hover:bg-white text-[#59627E] hover:text-[#020C21] border border-white/80 transition shadow-xs"
                            title="Add Visit Notes"
                          >
                            <ClipboardList className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
        onVisitSaved={fetchSchools}
      />

      {/* Add School Modal */}
      {isAddSchoolModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020C21]/60 backdrop-blur-md p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white/95 backdrop-blur-2xl rounded-3xl shadow-[0_32px_64px_rgba(2,12,33,0.22)] border border-white/80 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="px-6 py-4 bg-[#0F1B31] text-white flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 border border-white/20 rounded-2xl text-white">
                  <Plus className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-white">Add New School to Master Database</h3>
                  <p className="text-xs text-slate-300">
                    Direct User Right • Auto-increments S.No and registers into territory
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddSchoolModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleAddSchool} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  School Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                  placeholder="e.g. Cambridge Montessori / St. Josephs Convent"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-[#0F1B31] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Board</label>
                  <select
                    value={newSchoolBoard}
                    onChange={(e) => setNewSchoolBoard(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-[#0F1B31] outline-none"
                  >
                    <option value="STATE BOARD">State Board</option>
                    <option value="CBSE">CBSE</option>
                    <option value="ICSE">ICSE</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Institution Type</label>
                  <select
                    value={newSchoolType}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewSchoolType(val);
                      if (['PRE-SCHOOL', 'PLAY SCHOOL', 'NURSERY', 'MONTESSORI'].includes(val)) {
                        setNewSchoolProgramme('Junior Power Quest');
                      } else {
                        setNewSchoolProgramme('MOM');
                      }
                    }}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-[#0F1B31] outline-none"
                  >
                    <option value="PRIMARY">Primary School</option>
                    <option value="HIGH SCHOOL">High School</option>
                    <option value="COMPOSITE">Composite (K-10)</option>
                    <option value="PRE-SCHOOL">Pre-School</option>
                    <option value="PLAY SCHOOL">Play School</option>
                    <option value="MONTESSORI">Montessori</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">
                    Area / Locality <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="area-suggestions"
                    value={newSchoolArea}
                    onChange={(e) => setNewSchoolArea(e.target.value)}
                    placeholder="e.g. Bogadi, Vijayanagar..."
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-[#0F1B31] outline-none"
                  />
                  <datalist id="area-suggestions">
                    {areas.map((a, idx) => (
                      <option key={idx} value={a} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="font-bold text-slate-800 block mb-1">District</label>
                  <select
                    value={newSchoolDistrict}
                    onChange={(e) => setNewSchoolDistrict(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-[#0F1B31] outline-none"
                  >
                    <option value="Mysuru">Mysuru</option>
                    <option value="Mandya">Mandya</option>
                    <option value="Chamarajanagar">Chamarajanagar</option>
                    <option value="Hassan">Hassan</option>
                    <option value="Kodagu">Kodagu</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Principal / Correspondent</label>
                  <input
                    type="text"
                    value={newSchoolPrincipal}
                    onChange={(e) => setNewSchoolPrincipal(e.target.value)}
                    placeholder="Principal name"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-[#0F1B31] outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={newSchoolPhone}
                    onChange={(e) => setNewSchoolPhone(e.target.value)}
                    placeholder="+91..."
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-[#0F1B31] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={newSchoolEmail}
                    onChange={(e) => setNewSchoolEmail(e.target.value)}
                    placeholder="school@example.com"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-[#0F1B31] outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Address Detail (Optional)</label>
                  <input
                    type="text"
                    value={newSchoolAddress}
                    onChange={(e) => setNewSchoolAddress(e.target.value)}
                    placeholder="Street, Landmark..."
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-[#0F1B31] outline-none"
                  />
                </div>
              </div>

              {/* Visited Toggle Section */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  markVisitedImmediately
                    ? 'bg-emerald-50/70 border-emerald-300'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                        markVisitedImmediately ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">
                        Mark as VISITED immediately
                      </span>
                      <p className="text-[11px] text-slate-500">
                        {markVisitedImmediately
                          ? 'Will be colored Emerald Green (Visited) and recorded under your completed outreach'
                          : 'Will remain Rose Red (Not Visited) as a candidate for upcoming round planning'}
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={markVisitedImmediately}
                    onChange={(e) => setMarkVisitedImmediately(e.target.checked)}
                    className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                  />
                </label>

                {markVisitedImmediately && (
                  <div className="mt-3 pt-3 border-t border-emerald-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Visit Date</label>
                      <input
                        type="date"
                        value={newVisitDate}
                        onChange={(e) => setNewVisitDate(e.target.value)}
                        className="w-full border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Visit Outcome (Zero Assumed Registrations)
                      </label>
                      <select
                        value={newVisitOutcome}
                        onChange={(e) => setNewVisitOutcome(e.target.value)}
                        className="w-full border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white font-medium"
                      >
                        <option value="Interested">Interested (Standard Field Outreach)</option>
                        <option value="Follow-up Required">Follow-up Required</option>
                        <option value="Registration Confirmed">Registration Confirmed</option>
                        <option value="Principal Not Available">Principal Not Available</option>
                        <option value="Not Interested">Not Interested</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="font-bold text-slate-700 block mb-1">Visit Discussion Notes</label>
                      <input
                        type="text"
                        value={newVisitNotes}
                        onChange={(e) => setNewVisitNotes(e.target.value)}
                        placeholder="Met Principal, introduced MOM / Junior Power Quest..."
                        className="w-full border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddSchoolModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingSchool}
                  className="btn-cta px-6 py-2.5 rounded-full text-white font-bold text-xs uppercase tracking-wider shadow-md disabled:opacity-50"
                >
                  {isAddingSchool ? 'Adding to Master Directory...' : 'Add School to Territory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Mark Visited Modal */}
      <AIMarkVisitedModal
        isOpen={isAIMarkModalOpen}
        onClose={() => setIsAIMarkModalOpen(false)}
        onSuccess={fetchSchools}
      />
    </div>
  );
}
