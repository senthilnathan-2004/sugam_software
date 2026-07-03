'use client';

import React from 'react';
import { Bell, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { DashboardNotification } from '../hooks/use-dashboard';
// removed unused formatDistanceToNow import

// Wait, I will write a simple date formatter inside the component to avoid dependencies

interface NotificationsWidgetProps {
  notifications: DashboardNotification[];
  isLoading: boolean;
}

export function NotificationsWidget({ notifications, isLoading }: NotificationsWidgetProps) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-slate-100 shadow-card flex flex-col h-full animate-pulse">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="h-5 bg-slate-200 rounded w-1/3"></div>
        </div>
        <div className="p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-slate-200 shrink-0"></div>
              <div className="space-y-2 w-full">
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                <div className="h-3 bg-slate-200 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'WARNING': return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'SUCCESS': return <CheckCircle className="h-4 w-4 text-success" />;
      default: return <Info className="h-4 w-4 text-primary" />;
    }
  };

  const getBg = (type: string) => {
    switch (type) {
      case 'WARNING': return 'bg-warning/10';
      case 'SUCCESS': return 'bg-success/10';
      default: return 'bg-primary/10';
    }
  };

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-card rounded-lg border border-slate-100 shadow-card flex flex-col h-full">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          System Notifications
        </h3>
        <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
          {notifications.length} New
        </span>
      </div>

      <div className="p-2 space-y-1 flex-1 overflow-y-auto max-h-[300px]">
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-slate-500 font-medium">
            No new notifications.
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-hover transition-colors duration-150 cursor-pointer"
            >
              <div className={`mt-0.5 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${getBg(notif.type)}`}>
                {getIcon(notif.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <p className="text-sm font-bold text-slate-800 truncate">{notif.title}</p>
                  <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                    {formatTime(notif.createdAt)}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-500 leading-snug">
                  {notif.message}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
