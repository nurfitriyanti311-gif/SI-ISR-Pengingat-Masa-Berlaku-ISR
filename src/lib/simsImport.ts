/* Modul parsing dan upsert file laporan SIMS (.xlsx / .csv) di browser menggunakan pustaka xlsx. */

import * as XLSX from 'xlsx';
import { APP_CONFIG } from '../config';
import type { AppState, Client, ImportSummary, IsrLicense } from '../types';
import {
  computeFollowupStatus,
  diffDaysIso,
  getMaxReminderDays,
  isEligibleSimfStatus,
  parseSimsDateToIso,
  resolveTargetExpiredDate,
} from './isrLogic';
import { normalizeIndonesianPhone } from './phone';

interface NormalizedRow {
  clntId: string;
  noSimf: string;
  currLicNum: string;
  clntName: string;
  corrAddr: string;
  statusSimf: string;
  service: string;
  subservice: string;
  freq: string;
  stnName: string;
  city: string;
  province: string;
  licenceDate: string;
  masaLaku: string;
  validityDate: string;
  phone: string;
}

function normalizeHeaderKey(header: string): string {
  return header.trim().toUpperCase().replace(/\s+/g, '_');
}

function getFieldValue(
  rowMap: Record<string, unknown>,
  aliases: readonly string[],
): unknown {
  for (const alias of aliases) {
    const key = normalizeHeaderKey(alias);
    if (key in rowMap && rowMap[key] !== undefined && rowMap[key] !== null) {
      return rowMap[key];
    }
  }
  return '';
}

function toCleanString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function slugClientId(clntName: string): string {
  const clean = clntName
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 18);
  return `CL-${clean || 'UMUM'}`;
}

function joinUniqueValues(values: string[]): string {
  const unique = Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));
  return unique.join(', ');
}

export interface SimsImportResult {
  nextLicenses: IsrLicense[];
  nextClients: Client[];
  summary: ImportSummary;
}

export function parseSimsWorkbook(
  arrayBuffer: ArrayBuffer,
  existingState: AppState,
  referenceDateIso: string,
): SimsImportResult {
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('Berkas kosong. Pastikan lembar kerja pertama berisi data laporan SIMS.');
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: true,
  });

  if (rawRows.length === 0) {
    throw new Error('Tidak ada baris data pada berkas. Pastikan header dan isi tabel tersedia.');
  }

  // Normalisasi kunci header tiap baris
  const normalizedMaps = rawRows.map((row) => {
    const mapped: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(row)) {
      mapped[normalizeHeaderKey(key)] = val;
    }
    return mapped;
  });

  const firstRowKeys = Object.keys(normalizedMaps[0]);
  const hasLicCol = APP_CONFIG.simsColumnAliases.currLicNum.some((alias) =>
    firstRowKeys.includes(normalizeHeaderKey(alias)),
  );
  const hasClientCol = APP_CONFIG.simsColumnAliases.clntName.some((alias) =>
    firstRowKeys.includes(normalizeHeaderKey(alias)),
  );

  if (!hasLicCol || !hasClientCol) {
    throw new Error(
      'Kolom wajib CURR_LIC_NUM atau CLNT_NAME tidak ditemukan. Periksa baris header berkas ekspor SIMS.',
    );
  }

  const parsedRows: NormalizedRow[] = [];
  for (const rowMap of normalizedMaps) {
    const currLicNum = toCleanString(
      getFieldValue(rowMap, APP_CONFIG.simsColumnAliases.currLicNum),
    );
    const clntName = toCleanString(
      getFieldValue(rowMap, APP_CONFIG.simsColumnAliases.clntName),
    );
    if (!currLicNum || !clntName) continue;

    const rawClntId = toCleanString(
      getFieldValue(rowMap, APP_CONFIG.simsColumnAliases.clntId),
    );

    parsedRows.push({
      clntId: rawClntId || slugClientId(clntName),
      noSimf: toCleanString(getFieldValue(rowMap, APP_CONFIG.simsColumnAliases.noSimf)),
      currLicNum,
      clntName,
      corrAddr: toCleanString(getFieldValue(rowMap, APP_CONFIG.simsColumnAliases.corrAddr)),
      statusSimf: toCleanString(getFieldValue(rowMap, APP_CONFIG.simsColumnAliases.statusSimf)) || 'Granted',
      service: toCleanString(getFieldValue(rowMap, APP_CONFIG.simsColumnAliases.service)),
      subservice: toCleanString(getFieldValue(rowMap, APP_CONFIG.simsColumnAliases.subservice)),
      freq: toCleanString(getFieldValue(rowMap, APP_CONFIG.simsColumnAliases.freq)),
      stnName: toCleanString(getFieldValue(rowMap, APP_CONFIG.simsColumnAliases.stnName)),
      city: toCleanString(getFieldValue(rowMap, APP_CONFIG.simsColumnAliases.city)),
      province: toCleanString(getFieldValue(rowMap, APP_CONFIG.simsColumnAliases.province)),
      licenceDate: parseSimsDateToIso(
        getFieldValue(rowMap, APP_CONFIG.simsColumnAliases.licenceDate),
      ),
      masaLaku: parseSimsDateToIso(
        getFieldValue(rowMap, APP_CONFIG.simsColumnAliases.masaLaku),
      ),
      validityDate: parseSimsDateToIso(
        getFieldValue(rowMap, APP_CONFIG.simsColumnAliases.validityDate),
      ),
      phone: toCleanString(getFieldValue(rowMap, APP_CONFIG.simsColumnAliases.phone)),
    });
  }

  if (parsedRows.length === 0) {
    throw new Error('Seluruh baris tidak memiliki CURR_LIC_NUM dan CLNT_NAME yang terisi.');
  }

  // Pengelompokan berdasarkan CURR_LIC_NUM (BL-01)
  const groupedByLic = new Map<string, NormalizedRow[]>();
  for (const row of parsedRows) {
    const existing = groupedByLic.get(row.currLicNum);
    if (existing) {
      existing.push(row);
    } else {
      groupedByLic.set(row.currLicNum, [row]);
    }
  }

  const nowIso = new Date().toISOString();
  const clientMap = new Map<string, Client>(
    existingState.clients.map((c) => [c.clntId, { ...c }]),
  );
  const licenseMap = new Map<string, IsrLicense>(
    existingState.licenses.map((l) => [l.currLicNum, { ...l }]),
  );

  let eligibleRows = 0;
  let uniqueActiveGrouped = 0;
  let archivedCanceledCount = 0;
  let incompleteDateCount = 0;
  let insertedCount = 0;
  let updatedCount = 0;
  let resetToActiveCount = 0;
  let newClientsCount = 0;

  for (const [currLicNum, rows] of groupedByLic.entries()) {
    const activeRows = rows.filter((r) => isEligibleSimfStatus(r.statusSimf));
    eligibleRows += activeRows.length;

    const chosenRows = activeRows.length > 0 ? activeRows : rows;
    const primary = chosenRows[0];
    const isEligible = activeRows.length > 0;

    if (isEligible) {
      uniqueActiveGrouped += 1;
    } else {
      archivedCanceledCount += 1;
    }

    // Upsert master klien berdasarkan CLNT_ID
    const existingClient = clientMap.get(primary.clntId);
    if (!existingClient) {
      const normalizedPhone = normalizeIndonesianPhone(primary.phone);
      clientMap.set(primary.clntId, {
        clntId: primary.clntId,
        clntName: primary.clntName,
        corrAddr: primary.corrAddr,
        rawPhone: primary.phone,
        picName: '',
        picWa: normalizedPhone.picWa,
        phoneType: normalizedPhone.phoneType,
        picEmail: '',
        picTelegramId: '',
        updatedAt: nowIso,
      });
      newClientsCount += 1;
    } else {
      const updatedClient: Client = {
        ...existingClient,
        clntName: primary.clntName || existingClient.clntName,
        corrAddr: primary.corrAddr || existingClient.corrAddr,
        updatedAt: nowIso,
      };
      if (!existingClient.rawPhone && primary.phone) {
        const normalizedPhone = normalizeIndonesianPhone(primary.phone);
        updatedClient.rawPhone = primary.phone;
        updatedClient.picWa = normalizedPhone.picWa;
        updatedClient.phoneType = normalizedPhone.phoneType;
      }
      clientMap.set(primary.clntId, updatedClient);
    }

    const masaLaku = chosenRows.find((r) => r.masaLaku)?.masaLaku || '';
    const validityDate = chosenRows.find((r) => r.validityDate)?.validityDate || '';
    const targetExpiredDate = resolveTargetExpiredDate(masaLaku, validityDate);
    if (isEligible && !targetExpiredDate) {
      incompleteDateCount += 1;
    }

    const existingLic = licenseMap.get(currLicNum);
    const freqCombined = joinUniqueValues(chosenRows.map((r) => r.freq));
    const stnCombined = joinUniqueValues(chosenRows.map((r) => r.stnName));

    if (!existingLic) {
      const maxWarningDays = getMaxReminderDays(existingState.settings);
      const newStatus = computeFollowupStatus(
        isEligible,
        targetExpiredDate,
        referenceDateIso,
        'Active',
        false,
        maxWarningDays,
      );
      licenseMap.set(currLicNum, {
        id: `isr-${currLicNum.replace(/[^A-Za-z0-9]/g, '').slice(0, 12)}-${Date.now().toString(36).slice(-4)}`,
        currLicNum,
        noSimf: primary.noSimf,
        clntId: primary.clntId,
        clntName: primary.clntName,
        service: primary.service || '-',
        subservice: primary.subservice,
        freqMhz: freqCombined || '-',
        stnName: stnCombined || '-',
        city: primary.city || '-',
        province: primary.province,
        statusSimf: primary.statusSimf,
        isEligible,
        licenceDate: primary.licenceDate,
        masaLaku,
        validityDate,
        targetExpiredDate,
        followupStatus: newStatus,
        manualStatusLocked: false,
        operatorNotes: isEligible
          ? ''
          : 'Diabaikan dari antrean notifikasi karena berstatus non-Granted.',
        rowCount: rows.length,
        updatedAt: nowIso,
      });
      insertedCount += 1;
    } else {
      const maxWarningDays = getMaxReminderDays(existingState.settings);
      const remaining = diffDaysIso(targetExpiredDate, referenceDateIso);
      const renewedToActive =
        isEligible &&
        targetExpiredDate !== existingLic.targetExpiredDate &&
        remaining !== null &&
        remaining > maxWarningDays;

      if (renewedToActive) {
        resetToActiveCount += 1;
      }

      const nextStatus = computeFollowupStatus(
        isEligible,
        targetExpiredDate,
        referenceDateIso,
        renewedToActive ? 'Active' : existingLic.followupStatus,
        renewedToActive ? false : existingLic.manualStatusLocked,
        maxWarningDays,
      );

      licenseMap.set(currLicNum, {
        ...existingLic,
        noSimf: primary.noSimf || existingLic.noSimf,
        clntId: primary.clntId,
        clntName: primary.clntName,
        service: primary.service || existingLic.service,
        subservice: primary.subservice || existingLic.subservice,
        freqMhz: freqCombined || existingLic.freqMhz,
        stnName: stnCombined || existingLic.stnName,
        city: primary.city || existingLic.city,
        province: primary.province || existingLic.province,
        statusSimf: primary.statusSimf,
        isEligible,
        licenceDate: primary.licenceDate || existingLic.licenceDate,
        masaLaku,
        validityDate,
        targetExpiredDate,
        followupStatus: nextStatus,
        manualStatusLocked: renewedToActive ? false : existingLic.manualStatusLocked,
        rowCount: rows.length,
        updatedAt: nowIso,
      });
      updatedCount += 1;
    }
  }

  return {
    nextLicenses: Array.from(licenseMap.values()),
    nextClients: Array.from(clientMap.values()),
    summary: {
      totalRowsRead: parsedRows.length,
      eligibleRows,
      uniqueActiveGrouped,
      archivedCanceledCount,
      incompleteDateCount,
      insertedCount,
      updatedCount,
      resetToActiveCount,
      newClientsCount,
    },
  };
}

export function generateSampleSimsWorkbookArrayBuffer(): ArrayBuffer {
  const sampleRows = [
    {
      CLNT_ID: 'CL-1001',
      NO_SIMF: 'SIMF-2025-88410',
      CURR_LIC_NUM: '02973844-000SU/2620252030',
      CLNT_NAME: 'PT Nusantara Telekomunikasi Contoh',
      CORR_ADDR: 'Jl. Merdeka Selatan No. 10, Jakarta Pusat',
      STATUS_SIMF: 'Granted',
      SERVICE: 'Fixed Service',
      SUBSERVICE: 'Point-to-Point Microwave',
      FREQ: '7425,5 MHz (TX)',
      STN_NAME: 'STN-JKT-PUSAT-01',
      CITY: 'Jakarta Pusat',
      PROVINCE: 'DKI Jakarta',
      LICENCE_DATE: '27-NOV-2025',
      MASA_LAKU: '27-NOV-2026',
      VALIDITY_DATE: '27-NOV-2030',
      PHONE: '0812-3456-7890',
    },
    {
      CLNT_ID: 'CL-1001',
      NO_SIMF: 'SIMF-2025-88410',
      CURR_LIC_NUM: '02973844-000SU/2620252030',
      CLNT_NAME: 'PT Nusantara Telekomunikasi Contoh',
      CORR_ADDR: 'Jl. Merdeka Selatan No. 10, Jakarta Pusat',
      STATUS_SIMF: 'Granted',
      SERVICE: 'Fixed Service',
      SUBSERVICE: 'Point-to-Point Microwave',
      FREQ: '7586,5 MHz (RX)',
      STN_NAME: 'STN-JKT-PUSAT-01',
      CITY: 'Jakarta Pusat',
      PROVINCE: 'DKI Jakarta',
      LICENCE_DATE: '27-NOV-2025',
      MASA_LAKU: '27-NOV-2026',
      VALIDITY_DATE: '27-NOV-2030',
      PHONE: '0812-3456-7890',
    },
    {
      CLNT_ID: 'CL-1002',
      NO_SIMF: 'SIMF-2024-71205',
      CURR_LIC_NUM: '03104912-001TX/2620242029',
      CLNT_NAME: 'PT Khatulistiwa Transmisi Contoh',
      CORR_ADDR: 'Jl. Jenderal Sudirman Kav. 45, Jakarta Selatan',
      STATUS_SIMF: 'Granted',
      SERVICE: 'Fixed Service',
      SUBSERVICE: 'Broadband Wireless Access',
      FREQ: '5810 MHz',
      STN_NAME: 'STN-BDG-UTARA-04',
      CITY: 'Bandung',
      PROVINCE: 'Jawa Barat',
      LICENCE_DATE: '27-NOV-2024',
      MASA_LAKU: '27-NOV-2026',
      VALIDITY_DATE: '27-NOV-2029',
      PHONE: '021-5215445',
    },
    {
      CLNT_ID: 'CL-1003',
      NO_SIMF: 'SIMF-2025-90112',
      CURR_LIC_NUM: '04188201-000MR/2620252030',
      CLNT_NAME: 'PT Samudra Radio Maritim Contoh',
      CORR_ADDR: 'Jl. Perak Timur No. 88, Surabaya',
      STATUS_SIMF: 'Granted (Under modification)',
      SERVICE: 'Maritime Mobile Service',
      SUBSERVICE: 'Coast Station VHF',
      FREQ: '156,8 MHz',
      STN_NAME: 'STN-SBY-TANJUNG-02',
      CITY: 'Surabaya',
      PROVINCE: 'Jawa Timur',
      LICENCE_DATE: '27-NOV-2025',
      MASA_LAKU: '27-NOV-2026',
      VALIDITY_DATE: '27-NOV-2030',
      PHONE: '0813-9876-5432',
    },
    {
      CLNT_ID: 'CL-1004',
      NO_SIMF: 'SIMF-2023-44109',
      CURR_LIC_NUM: '05221009-002BC/2620232028',
      CLNT_NAME: 'PT Andalas Siaran Contoh',
      CORR_ADDR: 'Jl. Ahmad Yani No. 24, Medan',
      STATUS_SIMF: 'Granted',
      SERVICE: 'Broadcasting Service',
      SUBSERVICE: 'FM Radio Broadcast',
      FREQ: '101,4 MHz',
      STN_NAME: 'STN-MDN-BARAT-01',
      CITY: 'Medan',
      PROVINCE: 'Sumatera Utara',
      LICENCE_DATE: '28-NOV-2023',
      MASA_LAKU: '28-NOV-2026',
      VALIDITY_DATE: '28-NOV-2028',
      PHONE: '0811-2233-4455',
    },
    {
      CLNT_ID: 'CL-1005',
      NO_SIMF: 'SIMF-2025-77310',
      CURR_LIC_NUM: '06110293-000FX/2620252030',
      CLNT_NAME: 'PT Borneo Jaringan Contoh',
      CORR_ADDR: 'Jl. Mulawarman No. 12, Balikpapan',
      STATUS_SIMF: 'Granted',
      SERVICE: 'Fixed Service',
      SUBSERVICE: 'Point-to-Point Microwave',
      FREQ: '18420 MHz',
      STN_NAME: 'STN-BPN-KOTA-01',
      CITY: 'Balikpapan',
      PROVINCE: 'Kalimantan Timur',
      LICENCE_DATE: '23-NOV-2025',
      MASA_LAKU: '23-NOV-2026',
      VALIDITY_DATE: '23-NOV-2030',
      PHONE: '0815-4455-6677',
    },
    {
      CLNT_ID: 'CL-1005',
      NO_SIMF: 'SIMF-2025-77311',
      CURR_LIC_NUM: '06110294-000FX/2620252030',
      CLNT_NAME: 'PT Borneo Jaringan Contoh',
      CORR_ADDR: 'Jl. Mulawarman No. 12, Balikpapan',
      STATUS_SIMF: 'Granted',
      SERVICE: 'Fixed Service',
      SUBSERVICE: 'Point-to-Point Microwave',
      FREQ: '23100 MHz',
      STN_NAME: 'STN-SMD-UTARA-02',
      CITY: 'Samarinda',
      PROVINCE: 'Kalimantan Timur',
      LICENCE_DATE: '21-NOV-2025',
      MASA_LAKU: '21-NOV-2026',
      VALIDITY_DATE: '21-NOV-2030',
      PHONE: '0815-4455-6677',
    },
    {
      CLNT_ID: 'CL-1004',
      NO_SIMF: 'SIMF-2024-00912',
      CURR_LIC_NUM: '01990044-000CN/2620242029',
      CLNT_NAME: 'PT Andalas Siaran Contoh',
      CORR_ADDR: 'Jl. Ahmad Yani No. 24, Medan',
      STATUS_SIMF: 'Prelim. Canceled',
      SERVICE: 'Fixed Service',
      SUBSERVICE: 'STL Link',
      FREQ: '320 MHz',
      STN_NAME: 'STN-PDG-LAMA-01',
      CITY: 'Padang',
      PROVINCE: 'Sumatera Barat',
      LICENCE_DATE: '10-MAY-2024',
      MASA_LAKU: '27-NOV-2026',
      VALIDITY_DATE: '10-MAY-2029',
      PHONE: '0811-2233-4455',
    },
    {
      CLNT_ID: 'CL-1002',
      NO_SIMF: 'SIMF-2023-00412',
      CURR_LIC_NUM: '01990045-000CN/2620232028',
      CLNT_NAME: 'PT Khatulistiwa Transmisi Contoh',
      CORR_ADDR: 'Jl. Jenderal Sudirman Kav. 45, Jakarta Selatan',
      STATUS_SIMF: 'Prelim. Canceled',
      SERVICE: 'Land Mobile Service',
      SUBSERVICE: 'Private Radio',
      FREQ: '151,2 MHz',
      STN_NAME: 'STN-BKS-BARAT-09',
      CITY: 'Bekasi',
      PROVINCE: 'Jawa Barat',
      LICENCE_DATE: '01-FEB-2023',
      MASA_LAKU: '27-NOV-2026',
      VALIDITY_DATE: '01-FEB-2028',
      PHONE: '021-5215445',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan_SIMS');
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}
