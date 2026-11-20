/* Halaman utama Dasbor Pemantauan ISR, filter status, pencarian, dan pemindaian rentang H-1, H-3, H-7 (FT-05 & FT-03). */

import { BellRing, Calendar, ClipboardEdit, Search, Trash2, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatTanggalIndonesia } from '../lib/format';
import {
  diffDaysIso,
  formatMilestoneListLabel,
  getMaxReminderDays,
} from '../lib/isrLogic';
import type { Client, IsrLicense, SystemSettings } from '../types';
import { FrequencyBackground } from './FrequencyBackground';
import { FollowupStatusBadge } from './StatusBadge';

type DashboardFilter =
  | 'ALL_ACTIVE'
  | 'IN_RANGE_TODAY'
  | 'CRITICAL'
  | 'EXPIRED'
  | 'IN_RENEWAL'
  | 'ARCHIVED';

interface DashboardViewProps {
  licenses: IsrLicense[];
  clients: Client[];
  settings: SystemSettings;
  referenceDateIso: string;
  onChangeReferenceDate: (nextDate: string) => void;
  onRunScan: () => void;
  onOpenImport: () => void;
  onOpenDeleteSims: () => void;
  onOpenQueue: () => void;
  onSelectLicenseForFollowup: (license: IsrLicense) => void;
  onDeleteSingleLicense: (licenseId: string) => void;
}

export function DashboardView({
  licenses,
  clients,
  settings,
  referenceDateIso,
  onChangeReferenceDate,
  onRunScan,
  onOpenImport,
  onOpenDeleteSims,
  onOpenQueue,
  onSelectLicenseForFollowup,
  onDeleteSingleLicense,
}: DashboardViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DashboardFilter>('ALL_ACTIVE');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const clientMap = useMemo(
    () => new Map(clients.map((c) => [c.clntId, c])),
    [clients],
  );

  const activeMilestones = settings.reminderMilestones;
  const maxWarningDays = getMaxReminderDays(settings);
  const milestoneLabel = formatMilestoneListLabel(activeMilestones);

  const metrics = useMemo(() => {
    let totalActive = 0;
    let inRangeToday = 0;
    let critical = 0;
    let expired = 0;

    for (const lic of licenses) {
      if (!lic.isEligible) continue;
      totalActive += 1;
      const diff = diffDaysIso(lic.targetExpiredDate, referenceDateIso);
      if (diff === null) continue;
      if (activeMilestones.includes(diff)) inRangeToday += 1;
      if (diff > 0 && diff <= maxWarningDays) critical += 1;
      if (diff <= 0) expired += 1;
    }

    return { totalActive, inRangeToday, critical, expired };
  }, [activeMilestones, licenses, maxWarningDays, referenceDateIso]);

  const filteredLicenses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return licenses.filter((lic) => {
      const diff = diffDaysIso(lic.targetExpiredDate, referenceDateIso);

      if (statusFilter === 'ARCHIVED') {
        if (lic.isEligible) return false;
      } else {
        if (!lic.isEligible) return false;
        if (
          statusFilter === 'IN_RANGE_TODAY' &&
          (diff === null || !activeMilestones.includes(diff))
        ) {
          return false;
        }
        if (
          statusFilter === 'CRITICAL' &&
          (diff === null || diff <= 0 || diff > maxWarningDays)
        ) {
          return false;
        }
        if (statusFilter === 'EXPIRED' && (diff === null || diff > 0)) return false;
        if (statusFilter === 'IN_RENEWAL' && lic.followupStatus !== 'In_Renewal') return false;
      }

      if (!query) return true;

      return (
        lic.clntName.toLowerCase().includes(query) ||
        lic.currLicNum.toLowerCase().includes(query) ||
        lic.freqMhz.toLowerCase().includes(query) ||
        lic.city.toLowerCase().includes(query) ||
        lic.stnName.toLowerCase().includes(query)
      );
    });
  }, [
    activeMilestones,
    licenses,
    maxWarningDays,
    referenceDateIso,
    searchQuery,
    statusFilter,
  ]);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-white p-4 sm:p-6">
        <FrequencyBackground />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">
              Pemantauan Masa Berlaku ISR
            </h1>
            <p className="mt-1 text-sm text-neutral-600">
              Rentang pengingat otomatis {milestoneLabel} ({settings.cronExecutionTime}) untuk izin aktif.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onOpenImport}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 ease-out hover:bg-blue-800 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              <span>Unggah SIMS</span>
            </button>
            <button
              type="button"
              onClick={onRunScan}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition-colors duration-150 ease-out hover:bg-neutral-50 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              <BellRing className="h-4 w-4 text-blue-700" aria-hidden="true" />
              <span>Pindai Sekarang</span>
            </button>
            <button
              type="button"
              onClick={onOpenDeleteSims}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-red-800 transition-colors duration-150 ease-out hover:bg-red-50 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              <span>Hapus Data</span>
            </button>
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL_ACTIVE')}
            className={`rounded-xl p-4 text-left transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
              statusFilter === 'ALL_ACTIVE'
                ? 'border border-blue-700 bg-blue-50'
                : 'bg-neutral-50 hover:bg-neutral-100'
            }`}
          >
            <span className="block text-sm text-neutral-600">Total Izin Aktif</span>
            <span className="mt-1 block text-3xl font-semibold text-neutral-900 tabular-nums">
              {metrics.totalActive}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('IN_RANGE_TODAY')}
            className={`rounded-xl p-4 text-left transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
              statusFilter === 'IN_RANGE_TODAY'
                ? 'border border-blue-700 bg-blue-50'
                : 'bg-neutral-50 hover:bg-neutral-100'
            }`}
          >
            <span className="block text-sm text-neutral-600">Antrean {milestoneLabel}</span>
            <span className="mt-1 block text-3xl font-semibold text-neutral-900 tabular-nums">
              {metrics.inRangeToday}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('CRITICAL')}
            className={`rounded-xl p-4 text-left transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
              statusFilter === 'CRITICAL'
                ? 'border border-blue-700 bg-blue-50'
                : 'bg-neutral-50 hover:bg-neutral-100'
            }`}
          >
            <span className="block text-sm text-neutral-600">Kritis &le; {maxWarningDays} Hari</span>
            <span className="mt-1 block text-3xl font-semibold text-neutral-900 tabular-nums">
              {metrics.critical}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('EXPIRED')}
            className={`rounded-xl p-4 text-left transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
              statusFilter === 'EXPIRED'
                ? 'border border-blue-700 bg-blue-50'
                : 'bg-neutral-50 hover:bg-neutral-100'
            }`}
          >
            <span className="block text-sm text-neutral-600">Kedaluwarsa</span>
            <span className="mt-1 block text-3xl font-semibold text-neutral-900 tabular-nums">
              {metrics.expired}
            </span>
          </button>
        </div>

        <div className="relative mt-6 flex flex-col gap-3 border-t border-neutral-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="ref-date-input" className="inline-flex items-center gap-2 text-sm font-medium text-neutral-900">
              <Calendar className="h-4 w-4 text-neutral-600" aria-hidden="true" />
              <span>Tanggal Acuan</span>
            </label>
            <input
              id="ref-date-input"
              name="referenceDate"
              type="date"
              value={referenceDateIso}
              onChange={(e) => onChangeReferenceDate(e.target.value)}
              className="min-h-[44px] rounded-xl border border-neutral-200 bg-white px-3 py-2 text-base text-neutral-900 tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            />
            <span className="text-sm text-neutral-600">
              {formatTanggalIndonesia(referenceDateIso)}
            </span>
          </div>

          {metrics.inRangeToday > 0 && (
            <button
              type="button"
              onClick={onOpenQueue}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              Lihat {metrics.inRangeToday} Antrean {milestoneLabel}
            </button>
          )}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex-1">
            <label htmlFor="isr-search-input" className="block text-sm font-medium text-neutral-900">
              Cari Izin Stasiun Radio
            </label>
            <div className="relative mt-2">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
                aria-hidden="true"
              />
              <input
                id="isr-search-input"
                name="searchQuery"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nama perusahaan, nomor ISR, frekuensi, atau kota"
                className="block w-full min-h-[44px] rounded-xl border border-neutral-200 bg-white py-2 pl-10 pr-4 text-base text-neutral-900 placeholder:text-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              />
            </div>
          </div>

          <div className="w-full md:w-64">
            <label htmlFor="status-filter-select" className="block text-sm font-medium text-neutral-900">
              Saring Status
            </label>
            <select
              id="status-filter-select"
              name="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as DashboardFilter)}
              className="mt-2 block w-full min-h-[44px] rounded-xl border border-neutral-200 bg-white px-3 py-2 text-base text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              <option value="ALL_ACTIVE">Semua Aktif</option>
              <option value="IN_RANGE_TODAY">Antrean {milestoneLabel}</option>
              <option value="CRITICAL">Kritis &le; {maxWarningDays} Hari</option>
              <option value="EXPIRED">Kedaluwarsa</option>
              <option value="IN_RENEWAL">Dalam Perpanjangan</option>
              <option value="ARCHIVED">Arsip Non-Aktif (Prelim. Canceled)</option>
            </select>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          {licenses.length === 0 ? (
            <div className="rounded-xl bg-neutral-50 p-8 text-center">
              <p className="text-base font-medium text-neutral-900">
                Belum ada data SIMS tersimpan.
              </p>
              <button
                type="button"
                onClick={onOpenImport}
                className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
                <span>Unggah SIMS</span>
              </button>
            </div>
          ) : filteredLicenses.length === 0 ? (
            <div className="rounded-xl bg-neutral-50 p-8 text-center">
              <p className="text-base font-medium text-neutral-900">
                Tidak ada data izin yang cocok dengan filter saat ini.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL_ACTIVE');
                }}
                className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                Reset Filter
              </button>
            </div>
          ) : (
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-600">
                  <th className="py-3 pr-4 font-medium">Nomor ISR &amp; Klien</th>
                  <th className="px-3 py-3 font-medium">Stasiun &amp; Frekuensi</th>
                  <th className="px-3 py-3 font-medium">Jatuh Tempo</th>
                  <th className="px-3 py-3 font-medium text-right">Sisa Hari</th>
                  <th className="px-3 py-3 font-medium">Kontak PIC</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="py-3 pl-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredLicenses.map((lic) => {
                  const client = clientMap.get(lic.clntId);
                  const diff = diffDaysIso(lic.targetExpiredDate, referenceDateIso);
                  return (
                    <tr key={lic.id} className="hover:bg-neutral-50">
                      <td className="py-3 pr-4 align-top">
                        <div className="font-medium text-neutral-900 tabular-nums">
                          {lic.currLicNum}
                        </div>
                        <div className="mt-0.5 text-neutral-600">{lic.clntName}</div>
                        {lic.rowCount > 1 && (
                          <div className="mt-0.5 text-xs text-neutral-500 tabular-nums">
                            {lic.rowCount} baris perangkat digabungkan
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div className="text-neutral-900">
                          {lic.stnName} ({lic.city})
                        </div>
                        <div className="mt-0.5 text-neutral-600 tabular-nums">{lic.freqMhz}</div>
                      </td>
                      <td className="px-3 py-3 align-top text-neutral-900 tabular-nums whitespace-nowrap">
                        {formatTanggalIndonesia(lic.targetExpiredDate)}
                      </td>
                      <td className="px-3 py-3 align-top text-right font-medium text-neutral-900 tabular-nums whitespace-nowrap">
                        {diff === null
                          ? '-'
                          : diff > 0
                            ? `${diff} hari`
                            : diff === 0
                              ? 'Hari ini'
                              : `Lewat ${Math.abs(diff)} hari`}
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div className="text-neutral-900 tabular-nums">
                          {client?.picWa
                            ? `WA: ${client.picWa}`
                            : client?.phoneType === 'OFFICE_NON_WA'
                              ? 'Telp Kantor (Non-WA)'
                              : 'WA belum diisi'}
                        </div>
                        <div className="mt-0.5 text-neutral-600">
                          {client?.picEmail || 'Email belum diisi'}
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <FollowupStatusBadge
                          status={lic.followupStatus}
                          isEligible={lic.isEligible}
                        />
                        {lic.operatorNotes && (
                          <p className="mt-1 max-w-[200px] truncate text-xs text-neutral-600" title={lic.operatorNotes}>
                            {lic.operatorNotes}
                          </p>
                        )}
                      </td>
                      <td className="py-3 pl-3 align-top text-right">
                        <div className="inline-flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onSelectLicenseForFollowup(lic)}
                            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-900 hover:bg-neutral-50 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                          >
                            <ClipboardEdit className="h-4 w-4 text-neutral-600" aria-hidden="true" />
                            <span>Tindak Lanjut</span>
                          </button>

                          {pendingDeleteId === lic.id ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteSingleLicense(lic.id);
                                  setPendingDeleteId(null);
                                }}
                                className="inline-flex min-h-[44px] items-center rounded-xl bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                              >
                                Ya, Hapus
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingDeleteId(null)}
                                className="inline-flex min-h-[44px] items-center rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-900 hover:bg-neutral-50 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              aria-label={`Hapus izin ${lic.currLicNum}`}
                              onClick={() => setPendingDeleteId(lic.id)}
                              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-50 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                              <span>Hapus</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
