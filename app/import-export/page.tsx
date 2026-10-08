'use client';

import React, { useState } from 'react';
import {
  UploadCloud,
  Download,
  FileSpreadsheet,
  Database,
  CheckCircle2,
  AlertTriangle,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { notifyDataChange } from '@/lib/realtimeSync';

export default function ImportExportPage() {
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<any>(null);
  const [csvText, setCsvText] = useState('');

  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState('');

  // Handle CSV Import
  const handleImportCsv = async () => {
    if (!csvText.trim()) {
      alert('Please paste CSV text or choose a file.');
      return;
    }

    setImporting(true);
    setImportSummary(null);

    try {
      // Parse CSV rows into objects
      const lines = csvText.trim().split('\n');
      if (lines.length < 2) {
        throw new Error('CSV must have a header row and at least one data row.');
      }

      const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
      const rows = [];

      for (let i = 1; i < lines.length; i++) {
        const currentLine = lines[i].trim();
        if (!currentLine) continue;

        // Basic CSV split considering quotes
        const values = currentLine.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        const obj: any = {};
        for (let j = 0; j < headers.length; j++) {
          let val = values[j] ? values[j].trim() : '';
          val = val.replace(/^["']|["']$/g, '');
          obj[headers[j]] = val;
        }
        rows.push(obj);
      }

      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Import failed');

      setImportSummary(json.summary);
      notifyDataChange('all');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
    };
    reader.readAsText(file);
  };

  // Restore JSON Backup
  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const backupData = JSON.parse(text);

        const res = await fetch('/api/backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(backupData),
        });

        const json = await res.json();
        if (json.success) {
          setRestoreMessage(json.message);
          notifyDataChange('all');
        } else {
          alert(json.error);
        }
      } catch (err: any) {
        alert('Error restoring backup: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <UploadCloud className="w-6 h-6 text-emerald-600" />
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Data Import, Export & Backup
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Import new schools, export customer database, and back up your entire CRM system
        </p>
      </div>

      {/* SECTION 1: CSV SCHOOL IMPORT */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Batch School CSV Import
            </h3>
            <p className="text-xs text-slate-500">
              Upload school lists with automatic deduplication by School ID, S.No, and Name+Area
            </p>
          </div>

          <a
            href="/schools_template.csv"
            download="schools_template.csv"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition"
          >
            <Download className="w-4 h-4" />
            <span>Download CSV Template</span>
          </a>
        </div>

        {/* File picker & Paste input */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Or Paste CSV Data Directly:
            </label>
            <textarea
              rows={5}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="s_no,school_id,school_name,board,school_type,area,district,phone&#10;488,S-99001,Carmel Public School,CBSE,PRIMARY,Bogadi,Mysuru,9845012345"
              className="w-full text-xs font-mono border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            type="button"
            onClick={handleImportCsv}
            disabled={importing || !csvText.trim()}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition disabled:opacity-50"
          >
            {importing ? 'Validating & Importing...' : 'Import Schools'}
          </button>
        </div>

        {/* Summary notification */}
        {importSummary && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs space-y-1 animate-in fade-in">
            <div className="flex items-center gap-1.5 font-bold text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Import Completed Successfully</span>
            </div>
            <p className="text-slate-700">
              • Processed: <strong>{importSummary.total}</strong> rows<br />
              • Imported: <strong>{importSummary.imported}</strong> valid new schools<br />
              • Duplicates Skipped: <strong>{importSummary.skippedDuplicates}</strong><br />
              • Errors: <strong>{importSummary.errors.length}</strong>
            </p>
          </div>
        )}
      </div>

      {/* SECTION 2: EXPORT ALL SCHOOLS & VISITS */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm sm:text-base">
            Export Master Data (CSV)
          </h3>
          <p className="text-xs text-slate-500">
            Download your live schools database and historical visit records for reporting
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href="/schools_template.csv"
            download="mittsure_487_schools_master.csv"
            className="p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-800 transition shadow-sm"
          >
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <span>Export 487 Schools Master (CSV)</span>
            </div>
            <Download className="w-4 h-4 text-slate-400" />
          </a>

          <a
            href="/api/backup"
            download="mittsure_crm_full_backup.json"
            className="p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-800 transition shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600" />
              <span>Full System JSON Backup</span>
            </div>
            <Download className="w-4 h-4 text-slate-400" />
          </a>
        </div>
      </div>

      {/* SECTION 3: SYSTEM RESTORE */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-3">
        <div>
          <h3 className="font-bold text-slate-900 text-sm sm:text-base">
            Restore from Backup File (JSON)
          </h3>
          <p className="text-xs text-slate-500">
            Restore schools, visit logs, and route history from a previously saved JSON backup
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-2">
          <input
            type="file"
            accept=".json"
            onChange={handleRestoreBackup}
            className="text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
          />
        </div>

        {restoreMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{restoreMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
