/* Komponen utama aplikasi SI-ISR yang menyatukan navigasi, pemrosesan otomatis H-1/H-3/H-7, dan penyimpanan lokal. */

import { CheckCircle2, Upload } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ClientDirectoryView } from './components/ClientDirectoryView';
import { DashboardView } from './components/DashboardView';
import { DeleteSimsModal } from './components/DeleteSimsModal';
import { FollowUpModal } from './components/FollowUpModal';
import { FrequencyBackground } from './components/FrequencyBackground';
import { ImportModal } from './components/ImportModal';
import { InstitutionLogos } from './components/InstitutionLogos';
import { NotificationLogView } from './components/NotificationLogView';
import { ReminderQueueView } from './components/ReminderQueueView';
import { SettingsView } from './components/SettingsView';
import { APP_CONFIG } from './config';
import { formatTanggalIndonesia } from './lib/format';
import {
  buildBatchDispatchLogs,
  computeFollowupStatus,
  formatMilestoneListLabel,
  getMaxReminderDays,
  scanReminderQueue,
} from './lib/isrLogic';
import { normalizeIndonesianPhone } from './lib/phone';
import { loadAppState, resetAppState, saveAppState } from './lib/storage';
import type {
  AppState,
  Client,
  FollowUpStatus,
  ImportSummary,
  IsrLicense,
  NotificationChannel,
  NotificationLog,
  NotificationStatus,
  SystemSettings,
} from './types';

type ActiveTab = 'dashboard' | 'queue' | 'clients' | 'logs' | 'settings';

function runAutoScanState(state: AppState): {
  nextState: AppState;
  autoSent: number;
  autoSkipped: number;
  queueCount: number;
} {
  const maxWarningDays = getMaxReminderDays(state.settings);
  const updatedLicenses = state.licenses.map((lic) => ({
    ...lic,
    followupStatus: computeFollowupStatus(
      lic.isEligible,
      lic.targetExpiredDate,
      state.lastScanDateWib,
      lic.followupStatus,
      lic.manualStatusLocked,
      maxWarningDays,
    ),
  }));

  const queue = scanReminderQueue(
    updatedLicenses,
    state.logs,
    state.clients,
    state.lastScanDateWib,
    state.settings,
  );

  if (!state.settings.autoScanOnOpen || queue.length === 0) {
    return {
      nextState: { ...state, licenses: updatedLicenses },
      autoSent: 0,
      autoSkipped: 0,
      queueCount: queue.length,
    };
  }

  const batch = buildBatchDispatchLogs(
    queue,
    state.lastScanDateWib,
    state.settings,
  );

  return {
    nextState: {
      ...state,
      licenses: updatedLicenses,
      logs: batch.newLogs.length > 0 ? [...batch.newLogs, ...state.logs] : state.logs,
    },
    autoSent: batch.sentCount,
    autoSkipped: batch.skippedCount,
    queueCount: queue.length,
  };
}

export default function App() {
  const [initialSetup] = useState(() => runAutoScanState(loadAppState()));
  const [appState, setAppState] = useState<AppState>(initialSetup.nextState);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isDeleteSimsOpen, setIsDeleteSimsOpen] = useState(false);
  const [followupTargetId, setFollowupTargetId] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState(() => {
    if (initialSetup.autoSent > 0 || initialSetup.autoSkipped > 0) {
      return `Pemindaian otomatis (${formatMilestoneListLabel(initialSetup.nextState.settings.reminderMilestones)}) selesai: ${initialSetup.queueCount} izin masuk antrean, ${initialSetup.autoSent} pesan siap dikirim, ${initialSetup.autoSkipped} dilewati.`;
    }
    return '';
  });

  useEffect(() => {
    saveAppState(appState);
  }, [appState]);

  const referenceDateIso = appState.lastScanDateWib;

  const reminderQueue = useMemo(
    () =>
      scanReminderQueue(
        appState.licenses,
        appState.logs,
        appState.clients,
        referenceDateIso,
        appState.settings,
      ),
    [appState.clients, appState.licenses, appState.logs, appState.settings, referenceDateIso],
  );

  const followupLicense = useMemo(
    () => appState.licenses.find((l) => l.id === followupTargetId) || null,
    [appState.licenses, followupTargetId],
  );

  const followupClient = useMemo(() => {
    if (!followupLicense) return undefined;
    return appState.clients.find((c) => c.clntId === followupLicense.clntId);
  }, [appState.clients, followupLicense]);

  function handleChangeReferenceDate(nextDate: string) {
    if (!nextDate) return;
    setAppState((prev) => {
      const res = runAutoScanState({ ...prev, lastScanDateWib: nextDate });
      setStatusBanner(
        `Tanggal acuan diubah ke ${formatTanggalIndonesia(nextDate)}: ${res.queueCount} izin ditemukan (${res.autoSent} antrean baru diproses otomatis).`,
      );
      return res.nextState;
    });
  }

  function handleRunScan() {
    setAppState((prev) => {
      const res = runAutoScanState(prev);
      const milestoneText = formatMilestoneListLabel(prev.settings.reminderMilestones);
      setStatusBanner(
        `Pemindaian (${milestoneText}) selesai untuk ${formatTanggalIndonesia(prev.lastScanDateWib)}: ${res.queueCount} izin ditemukan, ${res.autoSent} catatan baru diproses, ${res.autoSkipped} dilewati.`,
      );
      return res.nextState;
    });
  }

  function handleApplyImport(
    nextLicenses: IsrLicense[],
    nextClients: Client[],
    summary: ImportSummary,
  ) {
    const summaryText = `Impor selesai: ${summary.uniqueActiveGrouped} izin aktif unik (${summary.insertedCount} baru, ${summary.updatedCount} diperbarui, ${summary.archivedCanceledCount} arsip non-aktif).`;
    setAppState((prev) => {
      const updated: AppState = {
        ...prev,
        licenses: nextLicenses,
        clients: nextClients,
        lastImportAt: new Date().toISOString(),
        lastImportSummary: summaryText,
      };
      const res = runAutoScanState(updated);
      setStatusBanner(
        `${summaryText} Antrean otomatis: ${res.queueCount} izin terdeteksi (${res.autoSent} siap dikirim).`,
      );
      return res.nextState;
    });
  }

  function handleSaveClientContact(
    clntId: string,
    picName: string,
    rawPhone: string,
    picEmail: string,
    picTelegramId: string,
  ) {
    const normalized = normalizeIndonesianPhone(rawPhone);
    const nowIso = new Date().toISOString();
    setAppState((prev) => ({
      ...prev,
      clients: prev.clients.map((c) =>
        c.clntId === clntId
          ? {
              ...c,
              picName,
              rawPhone,
              picWa: normalized.picWa,
              phoneType: normalized.phoneType,
              picEmail,
              picTelegramId,
              updatedAt: nowIso,
            }
          : c,
      ),
    }));
  }

  function handleSaveFollowup(
    licenseId: string,
    nextStatus: FollowUpStatus,
    notes: string,
  ) {
    const locked = nextStatus === 'In_Renewal' || nextStatus === 'Not_Renewed';
    const nowIso = new Date().toISOString();
    setAppState((prev) => ({
      ...prev,
      licenses: prev.licenses.map((lic) =>
        lic.id === licenseId
          ? {
              ...lic,
              followupStatus: nextStatus,
              manualStatusLocked: locked,
              operatorNotes: notes,
              updatedAt: nowIso,
            }
          : lic,
      ),
    }));
    setStatusBanner('Status tindak lanjut dan catatan operator diperbarui.');
  }

  function handleRecordDispatch(entry: {
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
  }) {
    const nowIso = new Date().toISOString();
    const newLog: NotificationLog = {
      id: `log-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      isrId: entry.isrId,
      currLicNum: entry.currLicNum,
      clntName: entry.clntName,
      targetDate: entry.targetDate,
      sentDateWib: referenceDateIso,
      milestoneDays: entry.milestoneDays,
      channel: entry.channel,
      recipient: entry.recipient,
      messageSubject: entry.messageSubject,
      messageBody: entry.messageBody,
      status: entry.status,
      errorDetail: entry.errorDetail,
      sentAt: nowIso,
    };

    setAppState((prev) => ({
      ...prev,
      logs: [newLog, ...prev.logs],
    }));
  }

  function handleProcessBatch() {
    const batch = buildBatchDispatchLogs(
      reminderQueue,
      referenceDateIso,
      appState.settings,
    );

    if (batch.newLogs.length > 0) {
      setAppState((prev) => ({
        ...prev,
        logs: [...batch.newLogs, ...prev.logs],
      }));
    }

    return {
      sentCount: batch.sentCount,
      skippedCount: batch.skippedCount,
      duplicateSkippedCount: batch.duplicateSkippedCount,
    };
  }

  function handleResendLog(log: NotificationLog) {
    handleRecordDispatch({
      isrId: log.isrId,
      currLicNum: log.currLicNum,
      clntName: log.clntName,
      targetDate: log.targetDate,
      milestoneDays: log.milestoneDays ?? 7,
      channel: log.channel,
      recipient: log.recipient,
      messageSubject: log.messageSubject,
      messageBody: log.messageBody,
      status: 'SUCCESS',
      errorDetail: 'Dikirim ulang secara manual dari Audit Log.',
    });
  }

  function handleMarkLogFailed(logId: string) {
    setAppState((prev) => ({
      ...prev,
      logs: prev.logs.map((l) =>
        l.id === logId
          ? {
              ...l,
              status: 'FAILED',
              errorDetail: 'Ditandai gagal oleh operator untuk pengiriman ulang.',
            }
          : l,
      ),
    }));
  }

  function handleSaveSettings(nextSettings: SystemSettings) {
    setAppState((prev) => {
      const res = runAutoScanState({ ...prev, settings: nextSettings });
      return res.nextState;
    });
  }

  function handleResetSampleData() {
    const fresh = resetAppState();
    const res = runAutoScanState(fresh);
    setAppState(res.nextState);
    setStatusBanner('Seluruh data contoh berhasil dikembalikan ke kondisi awal.');
  }

  function handleDeleteSingleLicense(licenseId: string) {
    const target = appState.licenses.find((l) => l.id === licenseId);
    setAppState((prev) => ({
      ...prev,
      licenses: prev.licenses.filter((l) => l.id !== licenseId),
      logs: prev.logs.filter((log) => log.isrId !== licenseId),
    }));
    if (target) {
      setStatusBanner(`Data izin ${target.currLicNum} berhasil dihapus.`);
    }
  }

  function handleDeleteAllSims(alsoDeleteClients: boolean) {
    setAppState((prev) => ({
      ...prev,
      licenses: [],
      logs: [],
      clients: alsoDeleteClients ? [] : prev.clients,
      lastImportAt: '',
      lastImportSummary: '',
    }));
    setStatusBanner(
      alsoDeleteClients
        ? 'Seluruh data SIMS, log notifikasi, dan direktori klien berhasil dihapus.'
        : 'Seluruh data izin SIMS dan log notifikasi berhasil dihapus.',
    );
  }

  function handleDeleteArchivedOnly() {
    const archivedCount = appState.licenses.filter((l) => !l.isEligible).length;
    setAppState((prev) => ({
      ...prev,
      licenses: prev.licenses.filter((l) => l.isEligible),
    }));
    setStatusBanner(`${archivedCount} data arsip non-aktif berhasil dihapus.`);
  }

  const navItems: { id: ActiveTab; label: string }[] = [
    { id: 'dashboard', label: 'Dasbor' },
    { id: 'queue', label: `Antrean (${reminderQueue.length})` },
    { id: 'clients', label: 'Klien PIC' },
    { id: 'logs', label: 'Log Notifikasi' },
    { id: 'settings', label: 'Template' },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="relative overflow-hidden border-b border-neutral-200 bg-white">
        <FrequencyBackground />
        <div className="relative mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <InstitutionLogos />
            <a
              href="#main-content"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('dashboard');
              }}
              className="text-lg font-semibold text-neutral-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              {APP_CONFIG.appName}
            </a>
          </div>

          <nav
            aria-label="Navigasi utama"
            className="flex flex-wrap items-center gap-1 sm:gap-2"
          >
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setStatusBanner('');
                  }}
                  className={`min-h-[44px] rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-150 ease-out whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => setIsImportOpen(true)}
            className="hidden sm:inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 ease-out hover:bg-blue-800 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            <span>Unggah SIMS</span>
          </button>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {statusBanner && (
          <div
            role="status"
            className="mb-6 flex items-center justify-between gap-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{statusBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusBanner('')}
              className="text-sm font-medium underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              Tutup
            </button>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            licenses={appState.licenses}
            clients={appState.clients}
            settings={appState.settings}
            referenceDateIso={referenceDateIso}
            onChangeReferenceDate={handleChangeReferenceDate}
            onRunScan={handleRunScan}
            onOpenImport={() => setIsImportOpen(true)}
            onOpenDeleteSims={() => setIsDeleteSimsOpen(true)}
            onOpenQueue={() => setActiveTab('queue')}
            onSelectLicenseForFollowup={(lic) => setFollowupTargetId(lic.id)}
            onDeleteSingleLicense={handleDeleteSingleLicense}
          />
        )}

        {activeTab === 'queue' && (
          <ReminderQueueView
            queueItems={reminderQueue}
            referenceDateIso={referenceDateIso}
            settings={appState.settings}
            onRecordDispatch={handleRecordDispatch}
            onProcessBatch={handleProcessBatch}
          />
        )}

        {activeTab === 'clients' && (
          <ClientDirectoryView
            clients={appState.clients}
            licenses={appState.licenses}
            onSaveClientContact={handleSaveClientContact}
          />
        )}

        {activeTab === 'logs' && (
          <NotificationLogView
            logs={appState.logs}
            settings={appState.settings}
            onResendLog={handleResendLog}
            onMarkLogFailed={handleMarkLogFailed}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={appState.settings}
            onSaveSettings={handleSaveSettings}
            onResetSampleData={handleResetSampleData}
          />
        )}
      </main>

      <ImportModal
        isOpen={isImportOpen}
        appState={appState}
        referenceDateIso={referenceDateIso}
        onClose={() => setIsImportOpen(false)}
        onApplyImport={handleApplyImport}
      />

      <DeleteSimsModal
        isOpen={isDeleteSimsOpen}
        totalLicensesCount={appState.licenses.length}
        archivedCount={appState.licenses.filter((l) => !l.isEligible).length}
        clientsCount={appState.clients.length}
        onClose={() => setIsDeleteSimsOpen(false)}
        onDeleteAllSims={handleDeleteAllSims}
        onDeleteArchivedOnly={handleDeleteArchivedOnly}
      />

      <FollowUpModal
        license={followupLicense}
        client={followupClient}
        onClose={() => setFollowupTargetId(null)}
        onSave={handleSaveFollowup}
      />
    </div>
  );
}
