'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileText, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ExportButtonProps {
  onExportExcel: () => void;
  onExportPdf: () => void;
  disabled?: boolean;
}

export function ExportButton({ onExportExcel, onExportPdf, disabled = false }: ExportButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          disabled={disabled}
          className="h-10 px-4 bg-primary hover:bg-primary-light text-white font-bold rounded-lg flex items-center gap-1.5 shadow"
        >
          Export Data Logs <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-white border rounded-hms w-40 text-xs font-semibold">
        <DropdownMenuItem onClick={onExportExcel} className="flex items-center gap-2 cursor-pointer p-2.5">
          <FileSpreadsheet className="h-4 w-4 text-success" /> Export Spreadsheet
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExportPdf} className="flex items-center gap-2 cursor-pointer p-2.5">
          <FileText className="h-4 w-4 text-rose-500" /> Export PDF Report
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
