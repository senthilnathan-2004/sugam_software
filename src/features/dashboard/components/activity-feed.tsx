'use client';

import React from 'react';
import { History, ShieldAlert, CheckSquare } from 'lucide-react';

interface ActivityLog {
  id: string;
  action: string;
  entity: string;
  timestamp: string;
  user: { name: string; role: string };
}

interface ActivityFeedProps {
  activities: ActivityLog[];
  isLoading: boolean;
}

export function ActivityFeed({ activities, isLoading }: ActivityFeedProps) {
  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-emerald-50 text-success border-emerald-100';
      case 'DELETE':
        return 'bg-rose-50 text-danger border-rose-100';
      case 'UPDATE':
        return 'bg-blue-50 text-primary border-blue-100';
      case 'LOGIN':
        return 'bg-purple-50 text-purple-600 border-purple-100';
      default:
        return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  return (
    <div className="bg-white rounded-hms border border-slate-100 shadow-md p-6 h-full">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-800">System Log Feed</h3>
        <p className="text-xs text-slate-400 font-medium">Real-time system activity & audit trails</p>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <p className="text-xs text-slate-400 py-4 text-center">Loading feed logs...</p>
        ) : activities.length > 0 ? (
          activities.map((act) => (
            <div key={act.id} className="flex gap-3 text-xs">
              <div className="relative flex flex-col items-center">
                <span className={`p-1.5 rounded-lg border shrink-0 ${getActionColor(act.action)}`}>
                  <CheckSquare className="h-3 w-3" />
                </span>
                <span className="w-0.5 grow bg-slate-100 mt-2 last:hidden" />
              </div>
              <div className="flex-1 pb-1">
                <p className="font-bold text-slate-700 leading-tight">
                  <span className="text-slate-900 font-extrabold">{act.user.name}</span> ({act.user.role.toLowerCase()}){' '}
                  performed <span className="font-extrabold text-slate-800">{act.action}</span> on{' '}
                  <span className="font-extrabold text-slate-800">{act.entity}</span>
                </p>
                <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                  {new Date(act.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-slate-400 py-4 text-center">No system activities recorded.</p>
        )}
      </div>
    </div>
  );
}
