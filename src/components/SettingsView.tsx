/* Halaman Pengaturan Template Pesan, Rentang H-1/H-3/H-7, dan Pemrosesan Otomatis tanpa kredensial API (FT-06). */

import { CheckCircle2, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { APP_CONFIG, DEFAULT_SETTINGS } from '../config';
import type { SystemSettings } from '../types';

interface SettingsViewProps {
  settings: SystemSettings;
  onSaveSettings: (nextSettings: SystemSettings) => void;
  onResetSampleData: () => void;
}

export function SettingsView({
  settings,
  onSaveSettings,
  onResetSampleData,
}: SettingsViewProps) {
  const [selectedMilestones, setSelectedMilestones] = useState<number[]>(
    settings.reminderMilestones,
  );
  const [autoScanOnOpen, setAutoScanOnOpen] = useState<boolean>(
    settings.autoScanOnOpen,
  );
  const [cronTime, setCronTime] = useState(settings.cronExecutionTime);
  const [telegramTarget, setTelegramTarget] = useState(
    settings.telegramInternalGroupTarget,
  );
  const [portalUrl, setPortalUrl] = useState(settings.portalPerpanjanganUrl);
  const [templateWa, setTemplateWa] = useState(settings.templateWa);
  const [templateEmailSubject, setTemplateEmailSubject] = useState(
    settings.templateEmailSubject,
  );
  const [templateEmailBody, setTemplateEmailBody] = useState(
    settings.templateEmailBody,
  );
  const [templateTelegram, setTemplateTelegram] = useState(settings.templateTelegram);

  useEffect(() => {
    setSelectedMilestones(settings.reminderMilestones);
    setAutoScanOnOpen(settings.autoScanOnOpen);
    setCronTime(settings.cronExecutionTime);
    setTelegramTarget(settings.telegramInternalGroupTarget);
    setPortalUrl(settings.portalPerpanjanganUrl);
    setTemplateWa(settings.templateWa);
    setTemplateEmailSubject(settings.templateEmailSubject);
    setTemplateEmailBody(settings.templateEmailBody);
    setTemplateTelegram(settings.templateTelegram);
  }, [settings]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedNotice, setSavedNotice] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const firstMilestoneRef = useRef<HTMLInputElement | null>(null);
  const portalRef = useRef<HTMLInputElement | null>(null);
  const waRef = useRef<HTMLTextAreaElement | null>(null);
  const subjectRef = useRef<HTMLInputElement | null>(null);
  const emailBodyRef = useRef<HTMLTextAreaElement | null>(null);
  const telegramRef = useRef<HTMLTextAreaElement | null>(null);

  function toggleMilestone(day: number) {
    setSelectedMilestones((prev) =>
      prev.includes(day)
        ? prev.filter((item) => item !== day)
        : [...prev, day].sort((a, b) => b - a),
    );
  }

  function handleRestoreDefaults() {
    setSelectedMilestones([...DEFAULT_SETTINGS.reminderMilestones]);
    setAutoScanOnOpen(DEFAULT_SETTINGS.autoScanOnOpen);
    setCronTime(DEFAULT_SETTINGS.cronExecutionTime);
    setTelegramTarget(DEFAULT_SETTINGS.telegramInternalGroupTarget);
    setPortalUrl(DEFAULT_SETTINGS.portalPerpanjanganUrl);
    setTemplateWa(DEFAULT_SETTINGS.templateWa);
    setTemplateEmailSubject(DEFAULT_SETTINGS.templateEmailSubject);
    setTemplateEmailBody(DEFAULT_SETTINGS.templateEmailBody);
    setTemplateTelegram(DEFAULT_SETTINGS.templateTelegram);
    setErrors({});
    setSavedNotice('Template bawaan dipulihkan. Tekan Simpan Pengaturan untuk menerapkan.');
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSavedNotice('');

    const nextErrors: Record<string, string> = {};
    if (selectedMilestones.length === 0) {
      nextErrors.milestones =
        'Pilih minimal satu rentang pengingat, contoh: H-7, H-3, atau H-1.';
    }

    const cleanPortal = portalUrl.trim();
    if (!cleanPortal.startsWith('https://') && !cleanPortal.startsWith('http://')) {
      nextErrors.portalUrl =
        'Masukkan URL portal yang valid, contoh: https://spektrum.postel.go.id.';
    }

    if (!templateWa.trim()) {
      nextErrors.templateWa =
        'Template WhatsApp wajib diisi. Gunakan tombol Kembalikan Bawaan jika perlu.';
    }
    if (!templateEmailSubject.trim()) {
      nextErrors.templateEmailSubject =
        'Subjek email wajib diisi, contoh: Peringatan ISR H-{sisa_hari} - {no_isr}.';
    }
    if (!templateEmailBody.trim()) {
      nextErrors.templateEmailBody =
        'Isi surat email wajib diisi. Gunakan tombol Kembalikan Bawaan jika perlu.';
    }
    if (!templateTelegram.trim()) {
      nextErrors.templateTelegram =
        'Template rekap Telegram wajib diisi. Gunakan tombol Kembalikan Bawaan jika perlu.';
    }

    setErrors(nextErrors);

    if (nextErrors.milestones) {
      firstMilestoneRef.current?.focus();
      return;
    }
    if (nextErrors.portalUrl) {
      portalRef.current?.focus();
      return;
    }
    if (nextErrors.templateWa) {
      waRef.current?.focus();
      return;
    }
    if (nextErrors.templateEmailSubject) {
      subjectRef.current?.focus();
      return;
    }
    if (nextErrors.templateEmailBody) {
      emailBodyRef.current?.focus();
      return;
    }
    if (nextErrors.templateTelegram) {
      telegramRef.current?.focus();
      return;
    }

    const sortedMilestones = [...selectedMilestones].sort((a, b) => b - a);

    onSaveSettings({
      reminderDaysBefore: Math.max(...sortedMilestones),
      reminderMilestones: sortedMilestones,
      autoScanOnOpen,
      cronExecutionTime: cronTime.trim() || '08.00 WIB',
      telegramInternalGroupTarget: telegramTarget.trim().replace(/^@+/, ''),
      portalPerpanjanganUrl: cleanPortal,
      templateWa: templateWa.trim(),
      templateEmailSubject: templateEmailSubject.trim(),
      templateEmailBody: templateEmailBody.trim(),
      templateTelegram: templateTelegram.trim(),
    });
    setSavedNotice('Pengaturan rentang H-1/H-3/H-7 dan template pesan berhasil disimpan.');
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} noValidate className="rounded-2xl bg-white p-4 sm:p-6">
        <div className="flex flex-col gap-3 border-b border-neutral-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">
              Template &amp; Pengaturan
            </h1>
            <p className="mt-1 text-sm text-neutral-600">
              Atur rentang hari pengingat (H-7, H-3, H-1), pemrosesan otomatis, dan template pesan.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRestoreDefaults}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            <RotateCcw className="h-4 w-4 text-neutral-600" aria-hidden="true" />
            <span>Kembalikan Bawaan</span>
          </button>
        </div>

        <div className="mt-6 space-y-6">
          <div>
            <span className="block text-sm font-medium text-neutral-900">
              Rentang Hari Pengingat Aktif
            </span>
            <div className="mt-2 flex flex-wrap gap-3">
              {APP_CONFIG.availableMilestones.map((day, idx) => {
                const checked = selectedMilestones.includes(day);
                return (
                  <label
                    key={day}
                    className={`inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium ${
                      checked
                        ? 'border-blue-700 bg-blue-50 text-blue-700'
                        : 'border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50'
                    }`}
                  >
                    <input
                      ref={idx === 0 ? firstMilestoneRef : undefined}
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMilestone(day)}
                      className="h-4 w-4 accent-blue-700"
                    />
                    <span className="tabular-nums">H-{day} ({day} hari sebelum jatuh tempo)</span>
                  </label>
                );
              })}
            </div>
            {errors.milestones && (
              <p role="alert" className="mt-1.5 text-sm text-red-800">
                {errors.milestones}
              </p>
            )}
          </div>

          <div>
            <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-900">
              <input
                type="checkbox"
                checked={autoScanOnOpen}
                onChange={(e) => setAutoScanOnOpen(e.target.checked)}
                className="h-4 w-4 accent-blue-700"
              />
              <span>
                Proses antrean notifikasi otomatis saat aplikasi dibuka, data SIMS diimpor, atau tanggal diubah
              </span>
            </label>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="cron-time-input" className="block text-sm font-medium text-neutral-900">
              Jam Jadwal Acuan
            </label>
            <input
              id="cron-time-input"
              name="cronExecutionTime"
              type="text"
              value={cronTime}
              onChange={(e) => setCronTime(e.target.value)}
              placeholder="Contoh: 08.00 WIB"
              className="mt-2 block w-full min-h-[44px] rounded-xl border border-neutral-200 bg-white px-3 py-2 text-base text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            />
          </div>

          <div>
            <label htmlFor="telegram-target-input" className="block text-sm font-medium text-neutral-900">
              Username Grup Telegram Internal
            </label>
            <input
              id="telegram-target-input"
              name="telegramInternalGroupTarget"
              type="text"
              value={telegramTarget}
              onChange={(e) => setTelegramTarget(e.target.value)}
              placeholder="Contoh: si_isr_monitoring_internal"
              className="mt-2 block w-full min-h-[44px] rounded-xl border border-neutral-200 bg-white px-3 py-2 text-base text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            />
            <p className="mt-1 text-sm text-neutral-600">
              Dipakai membuka tautan t.me tanpa token bot.
            </p>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="portal-url-input" className="block text-sm font-medium text-neutral-900">
              Tautan Portal Perpanjangan Resmi
            </label>
            <input
              ref={portalRef}
              id="portal-url-input"
              name="portalPerpanjanganUrl"
              type="url"
              value={portalUrl}
              onChange={(e) => setPortalUrl(e.target.value)}
              placeholder="https://spektrum.postel.go.id"
              className="mt-2 block w-full min-h-[44px] rounded-xl border border-neutral-200 bg-white px-3 py-2 text-base text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            />
            {errors.portalUrl && (
              <p role="alert" className="mt-1 text-sm text-red-800">
                {errors.portalUrl}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 border-t border-neutral-200 pt-6">
          <p className="text-sm font-medium text-neutral-900">Variabel Dinamis Tersedia</p>
          <p className="mt-1 text-sm text-neutral-600">
            {APP_CONFIG.templateVariables.join(', ')}
          </p>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="template-wa-input" className="block text-sm font-medium text-neutral-900">
              Template Pesan WhatsApp
            </label>
            <textarea
              ref={waRef}
              id="template-wa-input"
              name="templateWa"
              rows={5}
              value={templateWa}
              onChange={(e) => setTemplateWa(e.target.value)}
              className="mt-2 block w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-base text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            />
            {errors.templateWa && (
              <p role="alert" className="mt-1 text-sm text-red-800">
                {errors.templateWa}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="template-email-subject-input" className="block text-sm font-medium text-neutral-900">
              Subjek Email Pengingat
            </label>
            <input
              ref={subjectRef}
              id="template-email-subject-input"
              name="templateEmailSubject"
              type="text"
              value={templateEmailSubject}
              onChange={(e) => setTemplateEmailSubject(e.target.value)}
              className="mt-2 block w-full min-h-[44px] rounded-xl border border-neutral-200 bg-white px-3 py-2 text-base text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            />
            {errors.templateEmailSubject && (
              <p role="alert" className="mt-1 text-sm text-red-800">
                {errors.templateEmailSubject}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="template-email-body-input" className="block text-sm font-medium text-neutral-900">
              Template Surat Email Resmi
            </label>
            <textarea
              ref={emailBodyRef}
              id="template-email-body-input"
              name="templateEmailBody"
              rows={6}
              value={templateEmailBody}
              onChange={(e) => setTemplateEmailBody(e.target.value)}
              className="mt-2 block w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-base text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            />
            {errors.templateEmailBody && (
              <p role="alert" className="mt-1 text-sm text-red-800">
                {errors.templateEmailBody}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="template-telegram-input" className="block text-sm font-medium text-neutral-900">
              Template Item Rekap Telegram
            </label>
            <textarea
              ref={telegramRef}
              id="template-telegram-input"
              name="templateTelegram"
              rows={4}
              value={templateTelegram}
              onChange={(e) => setTemplateTelegram(e.target.value)}
              className="mt-2 block w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-base text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            />
            {errors.templateTelegram && (
              <p role="alert" className="mt-1 text-sm text-red-800">
                {errors.templateTelegram}
              </p>
            )}
          </div>
        </div>

        {savedNotice && (
          <div
            role="status"
            className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{savedNotice}</span>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-4">
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              Reset Data Contoh
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-neutral-900">Kembalikan data awal?</span>
              <button
                type="button"
                onClick={() => {
                  onResetSampleData();
                  setConfirmReset(false);
                }}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                Ya, Reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                Batal
              </button>
            </div>
          )}

          <button
            type="submit"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-blue-700 px-5 py-2 text-sm font-medium text-white transition-colors duration-150 ease-out hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            Simpan Pengaturan
          </button>
        </div>
      </form>
    </div>
  );
}
