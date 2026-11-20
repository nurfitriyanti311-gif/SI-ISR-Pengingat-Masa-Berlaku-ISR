/* Halaman Audit Log Notifikasi dan tombol Kirim Ulang manual untuk pengiriman gagal (FT-07). */

import { RotateCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatWaktuWib } from '../lib/format';
import { buildMailtoUrl, buildTelegramUrl, buildWhatsAppUrl } from '../lib/isrLogic';
import type {
  NotificationChannel,
  NotificationLog,
  NotificationStatus,
  SystemSettings,
} from '../types';
import { LogStatusBadge } from './StatusBadge';

interface NotificationLogViewProps {
  logs: NotificationLog[];
  settings: SystemSettings;
  onResendLog: (log: NotificationLog) => void;
  onMarkLogFailed: (logId: string) => void;
}

export function NotificationLogView({
  logs,
  settings,
  onResendLog,
  onMarkLogFailed,
}: NotificationLogViewProps) {
  const [statusFilter, setStatusFilter] = useState<'ALL' | NotificationStatus>('ALL');
  const [channelFilter, setChannelFilter] = useState<'ALL' | NotificationChannel>('ALL');

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (statusFilter !== 'ALL' && log.status !== statusFilter) return false;
      if (channelFilter !== 'ALL' && log.channel !== channelFilter) return false;
      return true;
    });
  }, [channelFilter, logs, statusFilter]);

  function getResendUrl(log: NotificationLog): string {
    if (log.channel === 'WHATSAPP') {
      return buildWhatsAppUrl(log.recipient, log.messageBody);
    }
    if (log.channel === 'EMAIL') {
      return buildMailtoUrl(
        log.recipient,
        log.messageSubject || `Pengingat ISR ${log.currLicNum}`,
        log.messageBody,
      );
    }
    return buildTelegramUrl(settings.telegramInternalGroupTarget, log.messageBody);
  }

  return (
    <section className="rounded-2xl bg-white p-4 sm:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Log Notifikasi</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Riwayat pengiriman pengingat per tahap (H-1, H-3, H-7), kanal, dan status.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label htmlFor="log-status-filter" className="block text-sm font-medium text-neutral-900">
              Status
            </label>
            <select
              id="log-status-filter"
              name="logStatusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | NotificationStatus)}
              className="mt-1 min-h-[44px] rounded-xl border border-neutral-200 bg-white px-3 py-2 text-base text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              <option value="ALL">Semua Status</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILED">FAILED</option>
              <option value="SKIPPED">SKIPPED</option>
            </select>
          </div>

          <div>
            <label htmlFor="log-channel-filter" className="block text-sm font-medium text-neutral-900">
              Kanal
            </label>
            <select
              id="log-channel-filter"
              name="logChannelFilter"
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value as 'ALL' | NotificationChannel)}
              className="mt-1 min-h-[44px] rounded-xl border border-neutral-200 bg-white px-3 py-2 text-base text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              <option value="ALL">Semua Kanal</option>
              <option value="WHATSAPP">WHATSAPP</option>
              <option value="EMAIL">EMAIL</option>
              <option value="TELEGRAM">TELEGRAM</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        {filteredLogs.length === 0 ? (
          <div className="rounded-xl bg-neutral-50 p-8 text-center">
            <p className="text-base font-medium text-neutral-900">
              Belum ada catatan pengiriman untuk filter yang dipilih.
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-neutral-600">
                <th className="py-3 pr-4 font-medium">Waktu</th>
                <th className="px-3 py-3 font-medium">Nomor ISR &amp; Klien</th>
                <th className="px-3 py-3 font-medium">Tahap</th>
                <th className="px-3 py-3 font-medium">Kanal</th>
                <th className="px-3 py-3 font-medium">Tujuan</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Keterangan</th>
                <th className="py-3 pl-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filteredLogs.map((log) => {
                const resendUrl = getResendUrl(log);
                return (
                  <tr key={log.id} className="hover:bg-neutral-50">
                    <td className="py-3 pr-4 align-top text-neutral-900 tabular-nums whitespace-nowrap">
                      {formatWaktuWib(log.sentAt)}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="font-medium text-neutral-900 tabular-nums">
                        {log.currLicNum}
                      </div>
                      <div className="mt-0.5 text-neutral-600">{log.clntName}</div>
                    </td>
                    <td className="px-3 py-3 align-top font-medium text-neutral-900 tabular-nums whitespace-nowrap">
                      H-{log.milestoneDays ?? 7}
                    </td>
                    <td className="px-3 py-3 align-top font-medium text-neutral-900">
                      {log.channel}
                    </td>
                    <td className="px-3 py-3 align-top text-neutral-900 tabular-nums">
                      {log.recipient || '-'}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <LogStatusBadge status={log.status} />
                    </td>
                    <td className="px-3 py-3 align-top text-neutral-600">
                      {log.errorDetail || '-'}
                    </td>
                    <td className="py-3 pl-3 align-top text-right whitespace-nowrap">
                      {log.status === 'FAILED' && resendUrl && (
                        <a
                          href={resendUrl}
                          target="_blank"
                          rel="noopener"
                          onClick={() => onResendLog(log)}
                          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                        >
                          <RotateCw className="h-4 w-4" aria-hidden="true" />
                          <span>Kirim Ulang</span>
                        </a>
                      )}
                      {log.status === 'SUCCESS' && (
                        <button
                          type="button"
                          onClick={() => onMarkLogFailed(log.id)}
                          className="inline-flex min-h-[44px] items-center rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-900 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                        >
                          Tandai Gagal
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
