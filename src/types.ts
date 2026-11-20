/* Definisi tipe data utama untuk entitas SI-ISR (klien, izin ISR, log notifikasi, dan pengaturan). */

export type FollowUpStatus =
  | 'Active'
  | 'Warning_H7'
  | 'In_Renewal'
  | 'Expired'
  | 'Not_Renewed'
  | 'Incomplete_Date';

export type NotificationChannel = 'WHATSAPP' | 'EMAIL' | 'TELEGRAM';

export type NotificationStatus = 'SUCCESS' | 'FAILED' | 'SKIPPED';

export type PhoneType = 'WA_VALID' | 'OFFICE_NON_WA' | 'EMPTY';

export interface Client {
  clntId: string;
  clntName: string;
  corrAddr: string;
  rawPhone: string;
  picName: string;
  picWa: string;
  phoneType: PhoneType;
  picEmail: string;
  picTelegramId: string;
  updatedAt: string;
}

export interface IsrLicense {
  id: string;
  currLicNum: string;
  noSimf: string;
  clntId: string;
  clntName: string;
  service: string;
  subservice: string;
  freqMhz: string;
  stnName: string;
  city: string;
  province: string;
  statusSimf: string;
  isEligible: boolean;
  licenceDate: string;
  masaLaku: string;
  validityDate: string;
  targetExpiredDate: string;
  followupStatus: FollowUpStatus;
  manualStatusLocked: boolean;
  operatorNotes: string;
  rowCount: number;
  updatedAt: string;
}

export interface NotificationLog {
  id: string;
  isrId: string;
  currLicNum: string;
  clntName: string;
  targetDate: string;
  sentDateWib: string;
  milestoneDays?: number;
  channel: NotificationChannel;
  recipient: string;
  messageSubject?: string;
  messageBody: string;
  status: NotificationStatus;
  errorDetail: string;
  sentAt: string;
}

export interface SystemSettings {
  reminderDaysBefore: number;
  reminderMilestones: number[];
  autoScanOnOpen: boolean;
  cronExecutionTime: string;
  telegramInternalGroupTarget: string;
  portalPerpanjanganUrl: string;
  templateWa: string;
  templateEmailSubject: string;
  templateEmailBody: string;
  templateTelegram: string;
}

export interface AppState {
  clients: Client[];
  licenses: IsrLicense[];
  logs: NotificationLog[];
  settings: SystemSettings;
  lastScanDateWib: string;
  lastImportAt: string;
  lastImportSummary: string;
}

export interface ImportSummary {
  totalRowsRead: number;
  eligibleRows: number;
  uniqueActiveGrouped: number;
  archivedCanceledCount: number;
  incompleteDateCount: number;
  insertedCount: number;
  updatedCount: number;
  resetToActiveCount: number;
  newClientsCount: number;
}
