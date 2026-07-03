'use client';

import React, { useEffect, useState } from 'react';
import { ReportFilters } from '@/features/reports/components/report-filters';
import { RevenueReport } from '@/features/reports/components/revenue-report';
import { PatientReport } from '@/features/reports/components/patient-report';
import { InventoryReport } from '@/features/reports/components/inventory-report';
import { DoctorReport } from '@/features/reports/components/doctor-report';
import { ExportActions } from '@/features/reports/components/export-actions';
import { useReports } from '@/features/reports/hooks/use-reports';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3,
  TrendingUp,
  Users,
  Package,
  Stethoscope,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';

type TabId = 'revenue' | 'patients' | 'inventory' | 'doctors';

const TAB_META: { id: TabId; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'revenue',   label: 'Revenue & Sales',      icon: TrendingUp, description: 'Financial receipts, sales totals, and payment mode breakdown.' },
  { id: 'patients',  label: 'Patient Traffic',       icon: Users,      description: 'Registration trends, demographics, and visit frequency.' },
  { id: 'doctors',   label: 'Doctor Performance',    icon: Stethoscope, description: 'Consultation metrics, patient load, and generated revenue.' },
  { id: 'inventory', label: 'Inventory Valuation',   icon: Package,    description: 'Stock value, expiry overview, and low-stock items.' },
];

export default function ReportsPage() {
  const {
    revenueData,
    patientsData,
    inventoryData,
    doctorsData,
    isLoading,
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    fetchRevenueReport,
    fetchPatientsReport,
    fetchInventoryReport,
    fetchDoctorReport,
  } = useReports();

  const [activeTab, setActiveTab] = useState<TabId>('revenue');

  useEffect(() => {
    if (activeTab === 'revenue')   fetchRevenueReport();
    if (activeTab === 'patients')  fetchPatientsReport();
    if (activeTab === 'doctors')   fetchDoctorReport();
    if (activeTab === 'inventory') fetchInventoryReport();
  }, [activeTab, fetchRevenueReport, fetchPatientsReport, fetchInventoryReport, fetchDoctorReport]);

  const getExportData = () => {
    if (activeTab === 'revenue')  return revenueData.items;
    if (activeTab === 'patients') return patientsData.chartData;
    if (activeTab === 'doctors')  return doctorsData.items;
    return inventoryData.items;
  };

  const activeMeta = TAB_META.find((t) => t.id === activeTab)!;
  return (
    <div className="space-y-6">

      {/* ── Page Header ──────────────────────────────────────────── */}
      <PageHeader
        title="Reports & Analytics"
        description={activeMeta.description}
        actions={
          <ExportActions
            reportType={activeTab}
            data={getExportData()}
            fileName={`${activeTab}_report_${startDate}_to_${endDate}`}
          />
        }
      />

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <Tabs
        defaultValue="revenue"
        onValueChange={(v) => setActiveTab(v as TabId)}
        className="flex flex-col space-y-6"
      >
        <div className="flex flex-col gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          {/* Tab strip */}
          <div className="w-full">
            <TabsList className="bg-slate-50 border border-slate-100 p-1 rounded-xl h-auto flex flex-row flex-wrap gap-1">
              {TAB_META.map(({ id, label, icon: Icon }) => (
                <TabsTrigger
                  key={id}
                  value={id}
                  className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg transition-all
                    data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm
                    data-[state=inactive]:text-slate-500 data-[state=inactive]:hover:bg-slate-200/50 data-[state=inactive]:hover:text-slate-800
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Date filter — only for date-range tabs */}
          {activeTab !== 'inventory' && (
            <div className="w-full border-t border-slate-100 pt-4">
              <ReportFilters
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                onApply={() => {
                  if (activeTab === 'revenue') fetchRevenueReport();
                  if (activeTab === 'patients') fetchPatientsReport();
                  if (activeTab === 'doctors') fetchDoctorReport();
                }}
                isLoading={isLoading}
              />
            </div>
          )}
        </div>

        {/* Tab content */}
        <div className="w-full mt-4">
          <TabsContent value="revenue" className="m-0 focus-visible:outline-none">
            <RevenueReport data={revenueData} />
          </TabsContent>
          <TabsContent value="patients" className="m-0 focus-visible:outline-none">
            <PatientReport data={patientsData} />
          </TabsContent>
          <TabsContent value="doctors" className="m-0 focus-visible:outline-none">
            <DoctorReport data={doctorsData} />
          </TabsContent>
          <TabsContent value="inventory" className="m-0 focus-visible:outline-none">
            <InventoryReport data={inventoryData} />
          </TabsContent>
        </div>
      </Tabs>

    </div>
  );
}