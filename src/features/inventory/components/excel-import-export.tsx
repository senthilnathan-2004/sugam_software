'use client';

import React, { useRef, useState } from 'react';
import { Download, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExcelImportExportProps {
  dataToExport: any[];
  exportFileName: string;
  onImport: (data: any[]) => void;
}

export function ExcelImportExport({ dataToExport, exportFileName, onImport }: ExcelImportExportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  // xlsx is loaded on demand (dynamic import) so it stays out of the page's
  // initial bundle until the user actually imports/exports.
  const handleExport = async () => {
    if (!dataToExport || dataToExport.length === 0) {
      alert('No data available to export.');
      return;
    }
    const xlsx = await import('xlsx');
    const worksheet = xlsx.utils.json_to_sheet(dataToExport);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Data');
    xlsx.writeFile(workbook, `${exportFileName}.xlsx`);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const xlsx = await import('xlsx');
        const bstr = evt.target?.result;
        const workbook = xlsx.read(bstr, { type: 'binary' });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        const data = xlsx.utils.sheet_to_json(ws);
        onImport(data);
      } catch (err) {
        console.error('Error importing Excel:', err);
        alert('Failed to parse Excel file. Please ensure it is a valid .xlsx file.');
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="file"
        accept=".xlsx, .xls"
        className="hidden"
        ref={fileInputRef}
        onChange={handleImport}
      />
      <Button
        variant="outline"
        className="h-9 text-xs font-bold gap-2 text-slate-700 bg-white border-slate-200"
        onClick={() => fileInputRef.current?.click()}
        disabled={isImporting}
      >
        {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 text-primary" />}
        Import Excel
      </Button>
      <Button
        variant="outline"
        className="h-9 text-xs font-bold gap-2 text-slate-700 bg-white border-slate-200"
        onClick={handleExport}
      >
        <Download className="h-4 w-4 text-emerald-600" />
        Export Excel
      </Button>
    </div>
  );
}
