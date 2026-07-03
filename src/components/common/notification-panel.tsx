'use client';

import React, { useEffect } from 'react';
import { Bell, Check, Trash2, ShieldAlert, HeartPulse, Activity, FileText, Settings, X, Calendar, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useNotificationStore, NotificationItem } from '@/store/use-notification';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

const CategoryIcon = ({ category, type }: { category: string, type: string }) => {
  const props = { className: "h-4 w-4 shrink-0" };
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

export function NotificationPanel() {
  const router = useRouter();
  const { 
    notifications, 
    unreadCount, 
    fetchNotifications, 
    markAsRead, 
    deleteNotification 
  } = useNotificationStore();

  useEffect(() => {
    fetchNotifications({ limit: 5 });
  }, [fetchNotifications]);

  const handleMarkAllRead = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    markAsRead();
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    deleteNotification();
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    deleteNotification(id);
  };

  const handleNotificationClick = (id: string) => {
    markAsRead(id);
    // Ideally, navigate to the related entity here.
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors duration-150">
          <Bell className="h-5 w-5 stroke-[1.75]" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-accent rounded-full border-2 border-white animate-pulse" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 shadow-card border border-slate-100 rounded-xl bg-white overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
          <span className="font-bold text-sm text-slate-800 flex items-center gap-2">
            Notifications 
            {unreadCount > 0 && (
              <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </span>
          {notifications.length > 0 && (
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1 transition-colors duration-150"
                  title="Mark all as read"
                >
                  <Check className="h-3 w-3" />
                </button>
              )}
              <button
                onClick={handleClearAll}
                className="text-xs font-bold text-red-500 hover:underline flex items-center gap-1 transition-colors duration-150"
                title="Clear all"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
        
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm font-medium">All caught up!</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((n) => (
                <DropdownMenuItem
                  key={n.id}
                  onClick={() => handleNotificationClick(n.id)}
                  className={`flex items-start gap-3 p-3 border-b border-slate-50 last:border-0 rounded-none cursor-pointer focus:bg-slate-50 transition-colors duration-150 ${!n.isRead ? 'bg-primary/5' : ''}`}
                >
                  <CategoryIcon category={n.category} type={n.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`font-bold text-sm truncate pr-2 ${!n.isRead ? 'text-slate-900' : 'text-slate-700'}`}>
                        {n.title}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400 shrink-0">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className={`text-xs leading-relaxed line-clamp-2 ${!n.isRead ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>
                      {n.message}
                    </p>
                  </div>
                  <button 
                    onClick={(e) => handleDelete(e, n.id)}
                    className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all duration-200"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </div>

        <div className="p-2 bg-slate-50 border-t border-slate-100">
          <button 
            onClick={() => router.push('/notifications')}
            className="w-full text-center text-xs font-bold text-primary hover:text-primary-dark transition-colors py-1.5 rounded-lg hover:bg-primary/5"
          >
            View All Notifications
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
