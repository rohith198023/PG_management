'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  Mail,
  Smartphone,
  MessageSquare,
  Receipt,
  Wrench,
  Utensils,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RotateCw
} from 'lucide-react';

export default function TenantNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/tenant/notifications');
      const data = await res.json();
      if (data.notifications) {
        setNotifications(data.notifications);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'INVOICE_ISSUED':
      case 'INVOICE_OVERDUE':
        return <Receipt className="w-5 h-5 text-indigo-400" />;
      case 'PAYMENT_RECEIPT':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'COMPLAINT_UPDATE':
        return <Wrench className="w-5 h-5 text-amber-400" />;
      case 'MEAL_CUTOFF_REMINDER':
        return <Utensils className="w-5 h-5 text-rose-400" />;
      default:
        return <Bell className="w-5 h-5 text-blue-400" />;
    }
  };

  const getActionLink = (item: any) => {
    const payload = item.payload_json || {};
    if (item.type === 'INVOICE_ISSUED' || item.type === 'INVOICE_OVERDUE') {
      return { label: 'View Invoices', href: '/tenant/invoices' };
    }
    if (item.type === 'PAYMENT_RECEIPT') {
      return { label: 'View Payments', href: '/tenant/payments' };
    }
    if (item.type === 'COMPLAINT_UPDATE') {
      return { label: 'Check Ticket', href: '/tenant/complaints' };
    }
    if (item.type === 'MEAL_CUTOFF_REMINDER') {
      return { label: 'Meal Choices', href: '/tenant/meals' };
    }
    return null;
  };

  return (
    <div className="space-y-8 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
              <Bell className="w-6 h-6 text-indigo-400" />
              Notifications & Alerts
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Your real-time rent invoices, receipts, meal reminders and maintenance updates
            </p>
          </div>

          <button
            onClick={() => fetchNotifications()}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-sm transition"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Notifications Feed */}
        {loading ? (
          <div className="text-center py-16 text-slate-400">
            <RotateCw className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
            Loading your alerts...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl">
            <Bell className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white">You are all caught up!</h3>
            <p className="text-sm text-slate-400 mt-1">
              No pending notifications or alerts at this time.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((item) => {
              const action = getActionLink(item);
              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-xl"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 shrink-0 mt-0.5">
                      {getTypeIcon(item.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-white">
                          {item.subject || item.type}
                        </h4>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {item.channel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {item.rendered_body?.replace(/<[^>]*>?/gm, '')}
                      </p>
                      <span className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {action && (
                    <Link
                      href={action.href}
                      className="self-start sm:self-center shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition"
                    >
                      {action.label}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
  );
}
