/* Halaman Antrean Pengingat H-1, H-3, dan H-7 serta pengiriman multi-kanal via tautan resmi (FT-03 & FT-04). */

import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Mail,
  MessageSquare,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatTanggalIndonesia } from '../lib/format';
import {
  buildTelegramRecapMessage,
  buildTelegramUrl,
  formatMilestoneListLabel,
  type ReminderQueueItem,
} from '../lib/isrLogic';
import type {
  NotificationChannel,
  NotificationStatus,
  SystemSettings,
} from '../types';

interface ReminderQueueViewProps {
  queueItems: ReminderQueueItem[];
  referenceDateIso: string;
  settings: SystemSettings;
  onRecordDispatch: (entry: {
    isrId: string;
    currLicNum: string;
    clntName: string;
    targetDate: string;
    milestoneDays: number;
    channel: NotificationChannel;
    recipient: string;
    messageSubject?: string;
    messageBody: string;
    status: NotificationStatus;
    errorDetail: string;
  }) => void;
  onProcessBatch: () => {
    sentCount: number;
    skippedCount: number;
    duplicateSkippedCount: number;
  };
}

export function ReminderQueueView({
  queueItems,
  referenceDateIso,
  settings,
  onRecordDispatch,
  onProcessBatch,
}: ReminderQueueViewProps) {
  const [batchMessage, setBatchMessage] = useState('');
  const [copiedTelegram, setCopiedTelegram] = useState(false);
  const [stageFilter, setStageFilter] = useState<'ALL' | number>('ALL');

  const milestoneLabel = formatMilestoneListLabel(settings.reminderMilestones);

  const visibleItems = useMemo(() => {
    if (stageFilter === 'ALL') return queueItems;
    return queueItems.filter((item) => item.sisaHari === stageFilter);
  }, [queueItems, stageFilter]);

  const telegramRecapText = useMemo(
    () =>
      buildTelegramRecapMessage(
        visibleItems,
        settings.templateTelegram,
        referenceDateIso,
        settings.portalPerpanjanganUrl,
      ),
    [
      visibleItems,
      referenceDateIso,
      settings.portalPerpanjanganUrl,
      settings.templateTelegram,
    ],
  );

  const telegramUrl = useMemo(
    () => buildTelegramUrl(settings.telegramInternalGroupTarget, telegramRecapText),
    [settings.telegramInternalGroupTarget, telegramRecapText],
  );

  function handleRunBatch() {
    const result = onProcessBatch();
    setBatchMessage(
      `Pemrosesan selesai: ${result.sentCount} antrean siap/tercatat, ${result.skippedCount} dilewati (kontak tidak valid), ${result.duplicateSkippedCount} dicegah agar tidak ganda.`,
    );
  }

  async function handleCopyTelegram() {
    try {
      await navigator.clipboard.writeText(telegramRecapText);
      setCopiedTelegram(true);
      setTimeout(() => setCopiedTelegram(false), 2000);
    } catch {
      setCopiedTelegram(false);
    }
  }

  function handleDispatchTelegramRecap() {
    for (const item of visibleItems) {
      if (!item.telegramAlreadySent) {
        onRecordDispatch({
          isrId: item.license.id,
          currLicNum: item.license.currLicNum,
          clntName: item.license.clntName,
          targetDate: item.license.targetExpiredDate,
          milestoneDays: item.sisaHari,
          channel: 'TELEGRAM',
          recipient: settings.telegramInternalGroupTarget || 'Grup Internal',
          messageBody: telegramRecapText,
          status: 'SUCCESS',
          errorDetail: `Rekap H-${item.sisaHari} dibuka melalui tautan Telegram internal.`,
        });
      }
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">
              Antrean Pengingat ({milestoneLabel})
            </h1>
            <p className="mt-1 text-sm text-neutral-600">
              Tanggal acuan {formatTanggalIndonesia(referenceDateIso)}. Pemrosesan otomatis aktif: {settings.autoScanOnOpen ? 'Ya' : 'Tidak'}.
            </p>
          </div>

          <button
            type="button"
            disabled={queueItems.length === 0}
            onClick={handleRunBatch}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 ease-out hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-500 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <span>Proses Ulang Antrean</span>
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-neutral-200 pt-4">
          <button
            type="button"
            onClick={() => setStageFilter('ALL')}
            className={`min-h-[44px] rounded-xl px-4 py-2 text-sm font-medium transition-colors duration-150 ease-out whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
              stageFilter === 'ALL'
                ? 'border border-blue-700 bg-blue-50 text-blue-700'
                : 'bg-neutral-50 text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            Semua ({queueItems.length})
          </button>
          {[1, 3, 7]
            .filter((d) => settings.reminderMilestones.includes(d))
            .map((days) => {
              const count = queueItems.filter((q) => q.sisaHari === days).length;
              return (
                <button
                  key={days}
                  type="button"
                  onClick={() => setStageFilter(days)}
                  className={`min-h-[44px] rounded-xl px-4 py-2 text-sm font-medium transition-colors duration-150 ease-out whitespace-nowrap tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                    stageFilter === days
                      ? 'border border-blue-700 bg-blue-50 text-blue-700'
                      : 'bg-neutral-50 text-neutral-900 hover:bg-neutral-100'
                  }`}
                >
                  H-{days} ({count})
                </button>
              );
            })}
        </div>

        {batchMessage && (
          <div
            role="status"
            className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{batchMessage}</span>
          </div>
        )}
      </section>

      {visibleItems.length === 0 ? (
        <section className="rounded-2xl bg-white p-8 text-center">
          <p className="text-base font-medium text-neutral-900">
            Tidak ada izin aktif pada tahap yang dipilih untuk {formatTanggalIndonesia(referenceDateIso)}.
          </p>
          <p className="mt-1 text-sm text-neutral-600">
            Ubah tanggal acuan di Dasbor atau unggah laporan SIMS terbaru untuk memeriksa jadwal lain.
          </p>
        </section>
      ) : (
        <>
          <section className="rounded-2xl bg-white p-4 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">
                  Rekap Grup Telegram Internal
                </h2>
                <p className="mt-1 text-sm text-neutral-600">
                  Satu pesan gabungan berisi {visibleItems.length} izin yang perlu diingatkan hari ini.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleCopyTelegram}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                >
                  <Copy className="h-4 w-4 text-neutral-600" aria-hidden="true" />
                  <span>{copiedTelegram ? 'Tersalin' : 'Salin Rekap'}</span>
                </button>
                <a
                  href={telegramUrl}
                  target="_blank"
                  rel="noopener"
                  onClick={handleDispatchTelegramRecap}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  <span>Kirim Telegram</span>
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
            </div>

            <pre className="mt-4 max-h-60 overflow-y-auto whitespace-pre-wrap rounded-xl bg-neutral-50 p-4 text-sm text-neutral-900">
              {telegramRecapText}
            </pre>
          </section>

          <section className="rounded-2xl bg-white p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-neutral-900">
              Pengiriman Per Pemegang Izin
            </h2>
            <div className="mt-4 divide-y divide-neutral-200">
              {visibleItems.map((item) => (
                <div
                  key={`${item.license.id}-${item.sisaHari}`}
                  className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 lg:flex-row lg:items-start lg:justify-between"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums ${
                          item.sisaHari <= 1
                            ? 'bg-red-50 text-red-800'
                            : item.sisaHari <= 3
                              ? 'bg-amber-50 text-amber-800'
                              : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        H-{item.sisaHari}
                      </span>
                      <span className="font-semibold text-neutral-900 tabular-nums">
                        {item.license.currLicNum}
                      </span>
                    </div>
                    <div className="text-sm text-neutral-900">{item.license.clntName}</div>
                    <div className="text-sm text-neutral-600">
                      {item.license.stnName} ({item.license.city}) / {item.license.freqMhz}
                    </div>
                    <div className="text-sm text-neutral-600 tabular-nums">
                      Jatuh tempo: {formatTanggalIndonesia(item.license.targetExpiredDate)}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                    {item.whatsapp.canSend ? (
                      <a
                        href={item.whatsapp.actionUrl}
                        target="_blank"
                        rel="noopener"
                        onClick={() =>
                          onRecordDispatch({
                            isrId: item.license.id,
                            currLicNum: item.license.currLicNum,
                            clntName: item.license.clntName,
                            targetDate: item.license.targetExpiredDate,
                            milestoneDays: item.sisaHari,
                            channel: 'WHATSAPP',
                            recipient: item.whatsapp.recipient,
                            messageBody: item.whatsapp.body,
                            status: 'SUCCESS',
                            errorDetail: `Tautan wa.me H-${item.sisaHari} dibuka oleh operator.`,
                          })
                        }
                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                      >
                        <MessageSquare className="h-4 w-4 text-emerald-800" aria-hidden="true" />
                        <span>
                          {item.whatsapp.alreadySent ? 'Buka Ulang WA' : 'Buka WhatsApp'}
                        </span>
                        <ExternalLink className="h-3.5 w-3.5 text-neutral-500" aria-hidden="true" />
                      </a>
                    ) : (
                      <span className="inline-flex min-h-[44px] items-center rounded-xl bg-neutral-100 px-3 py-2 text-sm text-neutral-800">
                        {item.whatsapp.skipReason}
                      </span>
                    )}

                    {item.email.canSend ? (
                      <a
                        href={item.email.actionUrl}
                        target="_blank"
                        rel="noopener"
                        onClick={() =>
                          onRecordDispatch({
                            isrId: item.license.id,
                            currLicNum: item.license.currLicNum,
                            clntName: item.license.clntName,
                            targetDate: item.license.targetExpiredDate,
                            milestoneDays: item.sisaHari,
                            channel: 'EMAIL',
                            recipient: item.email.recipient,
                            messageSubject: item.email.subject,
                            messageBody: item.email.body,
                            status: 'SUCCESS',
                            errorDetail: `Tautan mailto H-${item.sisaHari} dibuka oleh operator.`,
                          })
                        }
                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                      >
                        <Mail className="h-4 w-4 text-blue-700" aria-hidden="true" />
                        <span>
                          {item.email.alreadySent ? 'Buka Ulang Email' : 'Buka Email'}
                        </span>
                        <ExternalLink className="h-3.5 w-3.5 text-neutral-500" aria-hidden="true" />
                      </a>
                    ) : (
                      <span className="inline-flex min-h-[44px] items-center rounded-xl bg-neutral-100 px-3 py-2 text-sm text-neutral-800">
                        {item.email.skipReason}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
