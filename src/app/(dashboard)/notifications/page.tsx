'use client';

import { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCw,
  Play,
  Filter,
  Eye,
  Search,
  ExternalLink,
  Shield,
  Layers
} from 'lucide-react';

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [processingBatch, setProcessingBatch] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [stats, setStats] = useState({
    PENDING: 0,
    PROCESSING: 0,
    SENT: 0,
    FAILED: 0,
    CANCELLED: 0,
  });

  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterChannel, setFilterChannel] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotification, setSelectedNotification] = useState<any | null>(null);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== 'ALL') params.append('status', filterStatus);
      if (filterChannel !== 'ALL') params.append('channel', filterChannel);

      const res = await fetch(`/api/notifications/queue?${params.toString()}`);
      const data = await res.json();
      if (data.notifications) {
        setNotifications(data.notifications);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching notification queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [filterStatus, filterChannel]);

  const handleRunBatch = async () => {
    try {
      setProcessingBatch(true);
      const res = await fetch('/api/notifications/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize: 25 }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchQueue();
      }
    } catch (err) {
      console.error('Error running queue batch:', err);
    } finally {
      setProcessingBatch(false);
    }
  };

  const handleRetry = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/retry`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        await fetchQueue();
      }
    } catch (err) {
      console.error('Error retrying notification:', err);
    }
  };

  const getChannelBadge = (channel: string) => {
    switch (channel) {
      case 'EMAIL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Mail className="w-3.5 h-3.5" /> Email
          </span>
        );
      case 'SMS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Smartphone className="w-3.5 h-3.5" /> SMS
          </span>
        );
      case 'WHATSAPP':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
            <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
          </span>
        );
      case 'IN_APP':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Bell className="w-3.5 h-3.5" /> In-App
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Delivered
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse">
            <RotateCw className="w-3 h-3 animate-spin" /> Processing
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" /> Queued
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3 h-3" /> Failed
          </span>
        );
      default:
        return <span className="text-xs text-slate-400">{status}</span>;
    }
  };

  const filteredNotifications = notifications.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.target?.toLowerCase().includes(q) ||
      item.subject?.toLowerCase().includes(q) ||
      item.type?.toLowerCase().includes(q) ||
      item.recipient?.first_name?.toLowerCase().includes(q) ||
      item.recipient?.last_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Bell className="h-7 w-7 text-indigo-400" />
            Notification Dispatch Engine
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Multi-channel asynchronous delivery center (Email, SMS, WhatsApp & In-App Alerts)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchQueue()}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleRunBatch}
            disabled={processingBatch}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
          >
            <Play className={`w-4 h-4 fill-white ${processingBatch ? 'animate-spin' : ''}`} />
            {processingBatch ? 'Dispatching Batch...' : 'Process Queue Now'}
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Delivered</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{stats.SENT}</p>
          <span className="text-[11px] text-emerald-400/80 font-medium">Delivered successfully</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Queue</span>
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{stats.PENDING}</p>
          <span className="text-[11px] text-amber-400/80 font-medium">Awaiting next batch sweep</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Failed / Stalled</span>
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{stats.FAILED}</p>
          <span className="text-[11px] text-rose-400/80 font-medium">Exhausted 3x retries</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Channels</span>
            <Layers className="w-5 h-5 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">4 Channels</p>
          <span className="text-[11px] text-indigo-400/80 font-medium">Email, SMS, WA, In-App</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search recipient, target, type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Queued (Pending)</option>
              <option value="SENT">Delivered</option>
              <option value="FAILED">Failed</option>
            </select>

            <select
              value={filterChannel}
              onChange={(e) => setFilterChannel(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Channels</option>
              <option value="EMAIL">Email</option>
              <option value="SMS">SMS</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="IN_APP">In-App</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-1 self-start md:self-auto">
          <Shield className="w-4 h-4 text-indigo-400" />
          <span>Tenant Isolated Queue</span>
        </div>
      </div>

      {/* Notification Queue Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Recipient / Destination</th>
                <th className="px-4 py-3.5">Channel</th>
                <th className="px-4 py-3.5">Event Type</th>
                <th className="px-4 py-3.5">Subject / Preview</th>
                <th className="px-4 py-3.5">Attempts</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <RotateCw className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                    Loading notification queue...
                  </td>
                </tr>
              ) : filteredNotifications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    No notification jobs found in queue.
                  </td>
                </tr>
              ) : (
                filteredNotifications.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-white">
                        {item.recipient
                          ? `${item.recipient.first_name || ''} ${item.recipient.last_name || ''}`.trim() || 'Resident'
                          : 'System Recipient'}
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-[160px]">
                        {item.target}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">{getChannelBadge(item.channel)}</td>

                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs text-indigo-300 font-semibold bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                        {item.type}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="text-sm font-medium text-slate-200 truncate max-w-xs">
                        {item.subject || 'No Subject'}
                      </div>
                      <div className="text-xs text-slate-400 truncate max-w-xs mt-0.5">
                        {item.rendered_body?.replace(/<[^>]*>?/gm, '') || ''}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="text-xs font-semibold">
                        <span className={item.attempts > 1 ? 'text-amber-400' : 'text-slate-300'}>
                          {item.attempts}
                        </span>
                        <span className="text-slate-500"> / {item.max_retries}</span>
                      </div>
                      {item.last_error && (
                        <span className="text-[10px] text-rose-400 block truncate max-w-[120px]" title={item.last_error}>
                          {item.last_error}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">{getStatusBadge(item.status)}</td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedNotification(item)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          title="View Message Payload"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {item.status === 'FAILED' && (
                          <button
                            onClick={() => handleRetry(item.id)}
                            className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 text-xs font-semibold transition flex items-center gap-1"
                          >
                            <RotateCw className="w-3 h-3" /> Retry
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Message Inspection Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-400" />
                Dispatched Payload Inspection
              </h3>
              <button
                onClick={() => setSelectedNotification(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-lg">
                <span className="text-slate-400">Channel & Status:</span>
                <div className="flex gap-2">
                  {getChannelBadge(selectedNotification.channel)}
                  {getStatusBadge(selectedNotification.status)}
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-400 font-semibold block">Destination:</span>
                <p className="font-mono text-white text-xs bg-slate-950 p-2 rounded mt-1 border border-slate-800">
                  {selectedNotification.target}
                </p>
              </div>

              {selectedNotification.subject && (
                <div>
                  <span className="text-xs text-slate-400 font-semibold block">Subject:</span>
                  <p className="text-slate-200 text-sm font-medium mt-0.5">
                    {selectedNotification.subject}
                  </p>
                </div>
              )}

              <div>
                <span className="text-xs text-slate-400 font-semibold block">Rendered Content:</span>
                <div className="bg-slate-950 p-3 rounded-lg mt-1 border border-slate-800 text-slate-300 text-xs max-h-48 overflow-y-auto font-mono whitespace-pre-wrap">
                  {selectedNotification.rendered_body}
                </div>
              </div>

              {selectedNotification.last_error && (
                <div className="p-2.5 rounded bg-rose-950/50 border border-rose-800/40 text-rose-300 text-xs">
                  <strong>Last Error:</strong> {selectedNotification.last_error}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedNotification(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
