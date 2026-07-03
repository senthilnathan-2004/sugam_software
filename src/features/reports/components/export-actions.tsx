'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { exportToExcel } from '@/lib/excel';
import { toast } from 'sonner';

interface ExportActionsProps {
  reportType: 'revenue' | 'patients' | 'inventory' | 'doctors';
  data: any[];
  fileName: string;
}

export function ExportActions({ reportType, data, fileName }: ExportActionsProps) {
  const handleExcelExport = () => {
    if (data.length === 0) {
      toast.error('No report data available to export.');
      return;
    }
    exportToExcel(data, fileName, reportType.toUpperCase());
    toast.success('Excel spreadsheet downloaded successfully.');
  };

  const handlePdfExport = () => {
    // PDF export simulated; in actual operations window.print() or specialized pdf.ts reports generator is used
    window.print();
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleExcelExport}
        variant="outline"
        className="text-xs font-bold gap-1.5 h-10 border-slate-200"
      >
        <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Export Excel
      </Button>
      <Button
        onClick={handlePdfExport}
        variant="outline"
        className="text-xs font-bold gap-1.5 h-10 border-slate-200"
      >
        <FileText className="h-4 w-4 text-rose-600" /> Print PDF Report
      </Button>
    </div>
  );
}
