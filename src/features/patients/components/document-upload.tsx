'use client';

import React, { useState } from 'react';
import { Upload, FileText, Download, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { PatientDocument } from '../types/patient.types';
import { useAuthStore } from '@/store/auth.store';

interface DocumentUploadProps {
  documents: PatientDocument[];
  onUpload?: (file: File, type: string) => Promise<boolean>;
}

export function DocumentUpload({ documents, onUpload }: DocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [docType, setDocType] = useState('LAB_REPORT');
  const { hasPermission } = useAuthStore();
  const canUpload = hasPermission('patients:write');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canUpload) return;

    setIsUploading(true);
    
    if (onUpload) {
      const success = await onUpload(file, docType);
      if (success) {
        // Clear input value so same file can be uploaded again if needed
        e.target.value = '';
      }
    } else {
      // Simulate upload delay; in production offline-first, this writes file to userData/documents path via Electron
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.success('Document uploaded successfully (Simulation Mode).');
    }
    
    setIsUploading(false);
  };

  return (
    <div className="bg-white rounded-hms border border-slate-100 shadow-md p-6 h-full flex flex-col">
      <div className="mb-5 border-b border-slate-50 pb-3">
        <h3 className="text-sm font-bold text-slate-800">Medical Documents</h3>
        <p className="text-xs text-slate-400 font-medium">Scan results, prescriptions, and lab reports</p>
      </div>

      {/* Upload trigger */}
      {canUpload && (
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
        <div className="w-full sm:w-44">
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="LAB_REPORT">Lab Report</option>
            <option value="SCAN">Imaging / Scan</option>
            <option value="PRESCRIPTION">Prescription</option>
            <option value="OTHER">Other Document</option>
          </select>
        </div>
        <label className="w-full sm:w-auto flex items-center justify-center gap-1.5 h-10 px-6 bg-primary hover:bg-primary-light text-white font-bold rounded-lg text-xs cursor-pointer transition-colors shadow">
          {isUploading ? (
            'Uploading...'
          ) : (
            <>
              <Upload className="h-4 w-4" /> Choose & Upload Document
            </>
          )}
          <input
            type="file"
            onChange={handleFileChange}
            disabled={isUploading}
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg"
          />
        </label>
        <span className="text-[10px] text-slate-400 font-medium hidden sm:block">PDF, JPG, PNG up to 10MB</span>
      </div>
      )}

      {/* Documents List */}
      {documents.length > 0 ? (
        <div className="space-y-2.5">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate leading-snug">{doc.fileName}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    {doc.type.replace('_', ' ')} ·{' '}
                    {new Date(doc.uploadedAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              {/* Action triggers */}
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:bg-slate-100">
                  <Eye className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:bg-slate-100">
                  <Download className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-danger hover:bg-rose-50">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-slate-400 text-xs font-semibold bg-slate-50/20 border border-dashed rounded-xl">
          No medical documents uploaded.
        </div>
      )}
    </div>
  );
}
