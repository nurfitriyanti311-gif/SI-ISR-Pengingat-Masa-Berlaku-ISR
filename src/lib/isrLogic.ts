/* Logika bisnis utama SI-ISR: kelayakan status, tanggal jatuh tempo, antrean H-1/H-3/H-7, dan pembuatan tautan pesan. */

import { APP_CONFIG } from '../config';
import type {
  Client,
  FollowUpStatus,
  IsrLicense,
  NotificationChannel,
  NotificationLog,
  SystemSettings,
} from '../types';
import { formatTanggalIndonesia } from './format';

const MONTH_MAP: Record<string, number> = {
  JAN: 1,
  JANUARI: 1,
  FEB: 2,
  FEBRUARI: 2,
  MAR: 3,
  MARET: 3,
  APR: 4,
  APRIL: 4,
  MAY: 5,
  MEI: 5,
  JUN: 6,
  JUNI: 6,
  JUL: 7,
  JULI: 7,
  AUG: 8,
  AGU: 8,
  AGUSTUS: 8,
  SEP: 9,
  SEPT: 9,
  SEPTEMBER: 9,
  OCT: 10,
  OKT: 10,
  OKTOBER: 10,
  NOV: 11,
  NOVEMBER: 11,
  DEC: 12,
  DES: 12,
  DESEMBER: 12,
};

function toIsoDate(year: number, month: number, day: number): string {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return '';
  }
  const testDate = new Date(Date.UTC(year, month - 1, day));
  if (
    testDate.getUTCFullYear() !== year ||
    testDate.getUTCMonth() !== month - 1 ||
    testDate.getUTCDate() !== day
  ) {
    return '';
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseSimsDateToIso(rawValue: unknown): string {
  if (rawValue === null || rawValue === undefined) return '';

  if (typeof rawValue === 'number' && Number.isFinite(rawValue) && rawValue > 1) {
    const excelEpochMs = Date.UTC(1899, 11, 30);
    const parsed = new Date(excelEpochMs + Math.round(rawValue) * 86400000);
    return toIsoDate(parsed.getUTCFullYear(), parsed.getUTCMonth() + 1, parsed.getUTCDate());
  }

  if (rawValue instanceof Date && !Number.isNaN(rawValue.getTime())) {
    return toIsoDate(rawValue.getUTCFullYear(), rawValue.getUTCMonth() + 1, rawValue.getUTCDate());
  }

  const text = String(rawValue).trim();
  if (!text || text.toUpperCase() === 'NULL' || text === '-') return '';

  const isoMatch = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    return toIsoDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }

  const monthTextMatch = text.match(/^(\d{1,2})[-\s/]([A-Za-z]+)[-\s/](\d{2,4})$/);
  if (monthTextMatch) {
    const day = Number(monthTextMatch[1]);
    const monthNum = MONTH_MAP[monthTextMatch[2].toUpperCase()];
    let year = Number(monthTextMatch[3]);
    if (year < 100) year += 2000;
    if (monthNum) {
      return toIsoDate(year, monthNum, day);
    }
  }

  const dmyMatch = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    return toIsoDate(Number(dmyMatch[3]), Number(dmyMatch[2]), Number(dmyMatch[1]));
  }

  return '';
}

export function isEligibleSimfStatus(statusSimf: string): boolean {
  const normalized = statusSimf.trim().toLowerCase();
  return APP_CONFIG.eligibleStatuses.some((allowed) => normalized === allowed);
}

export function resolveTargetExpiredDate(masaLaku: string, validityDate: string): string {
  if (masaLaku && /^\d{4}-\d{2}-\d{2}$/.test(masaLaku)) return masaLaku;
  if (validityDate && /^\d{4}-\d{2}-\d{2}$/.test(validityDate)) return validityDate;
  return '';
}

export function diffDaysIso(targetIso: string, referenceIso: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetIso) || !/^\d{4}-\d{2}-\d{2}$/.test(referenceIso)) {
    return null;
  }
  const [ty, tm, td] = targetIso.split('-').map(Number);
  const [ry, rm, rd] = referenceIso.split('-').map(Number);
  const targetMs = Date.UTC(ty, tm - 1, td);
  const refMs = Date.UTC(ry, rm - 1, rd);
  return Math.round((targetMs - refMs) / 86400000);
}

export function getMaxReminderDays(settings: SystemSettings): number {
  if (settings.reminderMilestones && settings.reminderMilestones.length > 0) {
    return Math.max(...settings.reminderMilestones);
  }
  return settings.reminderDaysBefore || APP_CONFIG.defaultReminderDaysBefore;
}

export function formatMilestoneListLabel(milestones: number[]): string {
  const sorted = [...milestones].sort((a, b) => b - a);
  return sorted.map((d) => `H-${d}`).join(', ');
}

export function computeFollowupStatus(
  isEligible: boolean,
  targetExpiredDate: string,
  referenceIso: string,
  currentStatus: FollowUpStatus,
  manualLocked: boolean,
  maxWarningDays: number = APP_CONFIG.defaultReminderDaysBefore,
): FollowUpStatus {
  if (!isEligible) {
    return currentStatus;
  }
  if (!targetExpiredDate) {
    return 'Incomplete_Date';
  }
  if (manualLocked && (currentStatus === 'In_Renewal' || currentStatus === 'Not_Renewed')) {
    return currentStatus;
  }
  const remaining = diffDaysIso(targetExpiredDate, referenceIso);
  if (remaining === null) return 'Incomplete_Date';
  if (remaining <= 0) return 'Expired';
  if (remaining <= maxWarningDays) return 'Warning_H7';
  return 'Active';
}

export interface ChannelDispatchPlan {
  channel: NotificationChannel;
  alreadySent: boolean;
  alreadySkipped: boolean;
  canSend: boolean;
  skipReason: string;
  recipient: string;
  subject: string;
  body: string;
  actionUrl: string;
}

export interface ReminderQueueItem {
  license: IsrLicense;
  client: Client | undefined;
  sisaHari: number;
  whatsapp: ChannelDispatchPlan;
  email: ChannelDispatchPlan;
  telegramAlreadySent: boolean;
}

export type H7QueueItem = ReminderQueueItem;

export function renderMessageTemplate(
  template: string,
  license: IsrLicense,
  sisaHari: number,
  portalUrl: string,
): string {
  const lokasi = [license.stnName, license.city, license.province].filter(Boolean).join(', ');
  const tglFormatted = formatTanggalIndonesia(license.targetExpiredDate);

  return template
    .replaceAll('{nama_klien}', license.clntName || '-')
    .replaceAll('{no_isr}', license.currLicNum || '-')
    .replaceAll('{frekuensi}', license.freqMhz || '-')
    .replaceAll('{lokasi_stasiun}', lokasi || '-')
    .replaceAll('{tgl_jatuh_tempo}', tglFormatted)
    .replaceAll('{sisa_hari}', String(sisaHari))
    .replaceAll('{tautan_portal}', portalUrl);
}

export function buildWhatsAppUrl(picWa: string, body: string): string {
  if (!picWa) return '';
  return `https://wa.me/${picWa}?text=${encodeURIComponent(body)}`;
}

export function buildMailtoUrl(email: string, subject: string, body: string): string {
  if (!email) return '';
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function buildTelegramUrl(targetHandle: string, body: string): string {
  const cleanHandle = targetHandle.trim().replace(/^@+/, '');
  if (!cleanHandle) {
    return `https://t.me/share/url?url=${encodeURIComponent('https://spektrum.postel.go.id')}&text=${encodeURIComponent(body)}`;
  }
  return `https://t.me/${encodeURIComponent(cleanHandle)}?text=${encodeURIComponent(body)}`;
}

export function hasSuccessfulLog(
  logs: NotificationLog[],
  currLicNum: string,
  targetDate: string,
  channel: NotificationChannel,
  milestoneDays?: number,
  sentDateWib?: string,
): boolean {
  return logs.some((log) => {
    const logMilestone = log.milestoneDays ?? 7;
    const sameKey =
      log.currLicNum === currLicNum &&
      log.targetDate === targetDate &&
      log.channel === channel &&
      log.status === 'SUCCESS' &&
      (milestoneDays === undefined || logMilestone === milestoneDays);
    if (!sameKey) return false;
    if (!sentDateWib) return true;
    return log.sentDateWib === sentDateWib;
  });
}

export function hasSkippedLog(
  logs: NotificationLog[],
  currLicNum: string,
  targetDate: string,
  channel: NotificationChannel,
  milestoneDays: number,
  sentDateWib: string,
): boolean {
  return logs.some((log) => {
    const logMilestone = log.milestoneDays ?? 7;
    return (
      log.currLicNum === currLicNum &&
      log.targetDate === targetDate &&
      log.channel === channel &&
      log.status === 'SKIPPED' &&
      logMilestone === milestoneDays &&
      log.sentDateWib === sentDateWib
    );
  });
}

export function scanReminderQueue(
  licenses: IsrLicense[],
  logs: NotificationLog[],
  clients: Client[],
  referenceDateIso: string,
  settings: SystemSettings,
): ReminderQueueItem[] {
  const activeMilestones =
    settings.reminderMilestones && settings.reminderMilestones.length > 0
      ? settings.reminderMilestones
      : [settings.reminderDaysBefore || 7];
  const clientMap = new Map(clients.map((c) => [c.clntId, c]));
  const items: ReminderQueueItem[] = [];

  for (const license of licenses) {
    if (!license.isEligible || !license.targetExpiredDate) continue;
    const sisaHari = diffDaysIso(license.targetExpiredDate, referenceDateIso);
    if (sisaHari === null || !activeMilestones.includes(sisaHari)) continue;

    const client = clientMap.get(license.clntId);
    const waBody = renderMessageTemplate(
      settings.templateWa,
      license,
      sisaHari,
      settings.portalPerpanjanganUrl,
    );
    const emailSubject = renderMessageTemplate(
      settings.templateEmailSubject,
      license,
      sisaHari,
      settings.portalPerpanjanganUrl,
    );
    const emailBody = renderMessageTemplate(
      settings.templateEmailBody,
      license,
      sisaHari,
      settings.portalPerpanjanganUrl,
    );

    const waAlready = hasSuccessfulLog(
      logs,
      license.currLicNum,
      license.targetExpiredDate,
      'WHATSAPP',
      sisaHari,
    );
    const waSkipped = hasSkippedLog(
      logs,
      license.currLicNum,
      license.targetExpiredDate,
      'WHATSAPP',
      sisaHari,
      referenceDateIso,
    );
    const emailAlready = hasSuccessfulLog(
      logs,
      license.currLicNum,
      license.targetExpiredDate,
      'EMAIL',
      sisaHari,
    );
    const emailSkipped = hasSkippedLog(
      logs,
      license.currLicNum,
      license.targetExpiredDate,
      'EMAIL',
      sisaHari,
      referenceDateIso,
    );
    const telegramAlready = hasSuccessfulLog(
      logs,
      license.currLicNum,
      license.targetExpiredDate,
      'TELEGRAM',
      sisaHari,
    );

    const hasValidWa = Boolean(client && client.phoneType === 'WA_VALID' && client.picWa);
    const waSkipReason = !client
      ? 'SKIPPED - Data klien tidak ditemukan'
      : client.phoneType === 'OFFICE_NON_WA'
        ? 'SKIPPED - No Valid WA (Telepon Kantor Non-WA)'
        : !client.picWa
          ? 'SKIPPED - No Valid WA (Nomor belum diisi)'
          : '';

    const hasValidEmail = Boolean(client && client.picEmail);
    const emailSkipReason = hasValidEmail ? '' : 'SKIPPED - Alamat Email PIC belum diisi';

    items.push({
      license,
      client,
      sisaHari,
      whatsapp: {
        channel: 'WHATSAPP',
        alreadySent: waAlready,
        alreadySkipped: waSkipped,
        canSend: hasValidWa,
        skipReason: waSkipReason,
        recipient: hasValidWa ? client!.picWa : client?.rawPhone || '-',
        subject: '',
        body: waBody,
        actionUrl: hasValidWa ? buildWhatsAppUrl(client!.picWa, waBody) : '',
      },
      email: {
        channel: 'EMAIL',
        alreadySent: emailAlready,
        alreadySkipped: emailSkipped,
        canSend: hasValidEmail,
        skipReason: emailSkipReason,
        recipient: hasValidEmail ? client!.picEmail : '-',
        subject: emailSubject,
        body: emailBody,
        actionUrl: hasValidEmail ? buildMailtoUrl(client!.picEmail, emailSubject, emailBody) : '',
      },
      telegramAlreadySent: telegramAlready,
    });
  }

  return items.sort((a, b) => a.sisaHari - b.sisaHari);
}

export const scanH7Queue = scanReminderQueue;

export function buildTelegramRecapMessage(
  queueItems: ReminderQueueItem[],
  templateTelegram: string,
  referenceDateIso: string,
  portalUrl: string,
): string {
  if (queueItems.length === 0) {
    return `Rekap SI-ISR (${formatTanggalIndonesia(referenceDateIso)}): Tidak ada ISR pada rentang pengingat hari ini.`;
  }

  const countsByStage = new Map<number, number>();
  for (const item of queueItems) {
    countsByStage.set(item.sisaHari, (countsByStage.get(item.sisaHari) || 0) + 1);
  }
  const stageSummary = Array.from(countsByStage.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([days, count]) => `H-${days}: ${count}`)
    .join(', ');

  const header = `REKAP HARIAN SI-ISR (${formatTanggalIndonesia(referenceDateIso)})\nTotal izin perlu diingatkan: ${queueItems.length} (${stageSummary})\n`;
  const blocks = queueItems.map((item, idx) => {
    const rendered = renderMessageTemplate(
      templateTelegram,
      item.license,
      item.sisaHari,
      portalUrl,
    );
    return `${idx + 1}. [H-${item.sisaHari}] ${rendered}`;
  });

  return `${header}\n${blocks.join('\n\n')}`;
}

export function buildBatchDispatchLogs(
  queueItems: ReminderQueueItem[],
  referenceDateIso: string,
  settings: SystemSettings,
): {
  newLogs: NotificationLog[];
  sentCount: number;
  skippedCount: number;
  duplicateSkippedCount: number;
} {
  const nowIso = new Date().toISOString();
  const newLogs: NotificationLog[] = [];
  let sentCount = 0;
  let skippedCount = 0;
  let duplicateSkippedCount = 0;

  const telegramRecapBody = buildTelegramRecapMessage(
    queueItems,
    settings.templateTelegram,
    referenceDateIso,
    settings.portalPerpanjanganUrl,
  );

  for (const item of queueItems) {
    const uid = () =>
      `log-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

    if (item.whatsapp.alreadySent || (!item.whatsapp.canSend && item.whatsapp.alreadySkipped)) {
      duplicateSkippedCount += 1;
    } else if (!item.whatsapp.canSend) {
      skippedCount += 1;
      newLogs.push({
        id: uid(),
        isrId: item.license.id,
        currLicNum: item.license.currLicNum,
        clntName: item.license.clntName,
        targetDate: item.license.targetExpiredDate,
        sentDateWib: referenceDateIso,
        milestoneDays: item.sisaHari,
        channel: 'WHATSAPP',
        recipient: item.whatsapp.recipient,
        messageBody: '',
        status: 'SKIPPED',
        errorDetail: item.whatsapp.skipReason,
        sentAt: nowIso,
      });
    } else {
      sentCount += 1;
      newLogs.push({
        id: uid(),
        isrId: item.license.id,
        currLicNum: item.license.currLicNum,
        clntName: item.license.clntName,
        targetDate: item.license.targetExpiredDate,
        sentDateWib: referenceDateIso,
        milestoneDays: item.sisaHari,
        channel: 'WHATSAPP',
        recipient: item.whatsapp.recipient,
        messageBody: item.whatsapp.body,
        status: 'SUCCESS',
        errorDetail: `Diproses otomatis (H-${item.sisaHari}), tautan wa.me siap dibuka.`,
        sentAt: nowIso,
      });
    }

    if (item.email.alreadySent || (!item.email.canSend && item.email.alreadySkipped)) {
      duplicateSkippedCount += 1;
    } else if (!item.email.canSend) {
      skippedCount += 1;
      newLogs.push({
        id: uid(),
        isrId: item.license.id,
        currLicNum: item.license.currLicNum,
        clntName: item.license.clntName,
        targetDate: item.license.targetExpiredDate,
        sentDateWib: referenceDateIso,
        milestoneDays: item.sisaHari,
        channel: 'EMAIL',
        recipient: item.email.recipient,
        messageSubject: item.email.subject,
        messageBody: '',
        status: 'SKIPPED',
        errorDetail: item.email.skipReason,
        sentAt: nowIso,
      });
    } else {
      sentCount += 1;
      newLogs.push({
        id: uid(),
        isrId: item.license.id,
        currLicNum: item.license.currLicNum,
        clntName: item.license.clntName,
        targetDate: item.license.targetExpiredDate,
        sentDateWib: referenceDateIso,
        milestoneDays: item.sisaHari,
        channel: 'EMAIL',
        recipient: item.email.recipient,
        messageSubject: item.email.subject,
        messageBody: item.email.body,
        status: 'SUCCESS',
        errorDetail: `Diproses otomatis (H-${item.sisaHari}), tautan mailto siap dibuka.`,
        sentAt: nowIso,
      });
    }

    if (item.telegramAlreadySent) {
      duplicateSkippedCount += 1;
    } else {
      sentCount += 1;
      newLogs.push({
        id: uid(),
        isrId: item.license.id,
        currLicNum: item.license.currLicNum,
        clntName: item.license.clntName,
        targetDate: item.license.targetExpiredDate,
        sentDateWib: referenceDateIso,
        milestoneDays: item.sisaHari,
        channel: 'TELEGRAM',
        recipient: settings.telegramInternalGroupTarget || 'Grup Internal',
        messageBody: telegramRecapBody,
        status: 'SUCCESS',
        errorDetail: `Termasuk dalam rekap Telegram H-${item.sisaHari}.`,
        sentAt: nowIso,
      });
    }
  }

  return { newLogs, sentCount, skippedCount, duplicateSkippedCount };
}
