'use client';

import React, { useEffect, useState } from 'react';
import { useNotificationStore } from '@/store/use-notification';
import { ShieldAlert, Check, User, HeartPulse, Activity, FileText, Settings, Bell, Trash2, Search, Filter } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

const CategoryIcon = ({ category, type }: { category: string, type: string }) => {
  const props = { className: "h-5 w-5 shrink-0" };
  if (type === 'CRITICAL' || type === 'ERROR') return <ShieldAlert {...props} className={`${props.className} text-red-500`} />;
  if (type === 'SUCCESS') return <Check {...props} className={`${props.className} text-emerald-500`} />;
  
  switch (category) {
    case 'PATIENT': return <User {...props} className={`${props.className} text-primary`} />;
    case 'DOCTOR': return <HeartPulse {...props} className={`${props.className} text-rose-500`} />;
    case 'INVENTORY': return <Activity {...props} className={`${props.className} text-orange-500`} />;
    case 'BILLING': return <FileText {...props} className={`${props.className} text-blue-500`} />;
    case 'SYSTEM': return <Settings {...props} className={`${props.className} text-slate-500`} />;
    default: return <Bell {...props} className={`${props.className} text-slate-400`} />;
  }
};

export default function NotificationsPage() {
  const { notifications, fetchNotifications, markAsRead, deleteNotification, total, isLoading } = useNotificationStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    fetchNotifications({ search, category: filter, limit: 100 });
  }, [fetchNotifications, search, filter]);

  return (
    <div className="p-6 max-w-5xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notification Center</h1>
          <p className="text-sm text-slate-500 mt-1">Manage and view all your system alerts and notifications.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => markAsRead()}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <Check className="h-4 w-4" />
            Mark all read
          </button>
          <button 
            onClick={() => deleteNotification()}
            className="px-4 py-2 bg-white border border-red-200 text-red-600 text-sm font-semibold rounded-xl shadow-sm hover:bg-red-50 transition-colors flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Clear all
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden flex flex-col">
        {/* Filters */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/50">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search notifications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            {['ALL', 'PATIENT', 'DOCTOR', 'INVENTORY', 'BILLING', 'SYSTEM', 'SECURITY'].map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                  filter === cat 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="divide-y divide-slate-100 flex-1 overflow-y-auto min-h-100">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 text-slate-400">
              <Bell className="h-12 w-12 mb-3 opacity-20" />
              <p className="text-lg font-medium text-slate-500">No notifications found</p>
              <p className="text-sm">Try adjusting your filters or search terms.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div 
                key={n.id} 
                className={`flex items-start gap-4 p-5 hover:bg-slate-50 transition-colors group ${!n.isRead ? 'bg-primary/[0.03]' : ''}`}
              >
                <div className={`p-2 rounded-xl ${!n.isRead ? 'bg-white shadow-sm' : 'bg-slate-100'}`}>
                  <CategoryIcon category={n.category} type={n.type} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-1">
                    <h3 className={`font-bold text-sm truncate ${!n.isRead ? 'text-slate-900' : 'text-slate-700'}`}>
                      {n.title}
                    </h3>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-medium text-slate-400">
                        {format(new Date(n.createdAt), 'MMM d, h:mm a')}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!n.isRead && (
                          <button 
                            onClick={() => markAsRead(n.id)}
                            className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="Mark as read"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button 
                          onClick={() => deleteNotification(n.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className={`text-sm leading-relaxed ${!n.isRead ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>
                    {n.message}
                  </p>
                </div>
                
                {!n.isRead && (
                  <div className="shrink-0 mt-2">
                    <span className="block h-2.5 w-2.5 bg-accent rounded-full border-2 border-white" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
