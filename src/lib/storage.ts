/* Pengelolaan penyimpanan lokal dalam satu kunci localStorage dengan penanganan data kosong atau rusak. */

import { APP_CONFIG, DEFAULT_SETTINGS, INITIAL_SAMPLE_STATE } from '../config';
import type { AppState } from '../types';

export function loadAppState(): AppState {
  try {
    const raw = window.localStorage.getItem(APP_CONFIG.storageKey);
    if (!raw) {
      return structuredClone(INITIAL_SAMPLE_STATE);
    }
    const parsed = JSON.parse(raw) as Partial<AppState>;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !Array.isArray(parsed.licenses) ||
      !Array.isArray(parsed.clients) ||
      !Array.isArray(parsed.logs)
    ) {
      return structuredClone(INITIAL_SAMPLE_STATE);
    }

    return {
      clients: parsed.clients,
      licenses: parsed.licenses,
      logs: parsed.logs,
      settings: {
        ...DEFAULT_SETTINGS,
        ...(parsed.settings || {}),
        reminderMilestones:
          Array.isArray(parsed.settings?.reminderMilestones) &&
          parsed.settings.reminderMilestones.length > 0
            ? parsed.settings.reminderMilestones
            : DEFAULT_SETTINGS.reminderMilestones,
        autoScanOnOpen:
          typeof parsed.settings?.autoScanOnOpen === 'boolean'
            ? parsed.settings.autoScanOnOpen
            : DEFAULT_SETTINGS.autoScanOnOpen,
      },
      lastScanDateWib:
        typeof parsed.lastScanDateWib === 'string' && parsed.lastScanDateWib
          ? parsed.lastScanDateWib
          : INITIAL_SAMPLE_STATE.lastScanDateWib,
      lastImportAt: typeof parsed.lastImportAt === 'string' ? parsed.lastImportAt : '',
      lastImportSummary:
        typeof parsed.lastImportSummary === 'string' ? parsed.lastImportSummary : '',
    };
  } catch {
    return structuredClone(INITIAL_SAMPLE_STATE);
  }
}

export function saveAppState(state: AppState): void {
  try {
    window.localStorage.setItem(APP_CONFIG.storageKey, JSON.stringify(state));
  } catch {
    // Abaikan kegagalan kuota penyimpanan agar aplikasi tetap berjalan.
  }
}

export function resetAppState(): AppState {
  const fresh = structuredClone(INITIAL_SAMPLE_STATE);
  saveAppState(fresh);
  return fresh;
}
