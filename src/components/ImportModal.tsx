/* Dialog unggah dan upsert laporan SIMS (.xlsx / .csv) langsung di browser (FT-01). */

import { Download, FileSpreadsheet, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import {
  generateSampleSimsWorkbookArrayBuffer,
  parseSimsWorkbook,
} from '../lib/simsImport';
import type { AppState, Client, ImportSummary, IsrLicense } from '../types';

interface ImportModalProps {
  isOpen: boolean;
  appState: AppState;
  referenceDateIso: string;
  onClose: () => void;
  onApplyImport: (
    nextLicenses: IsrLicense[],
    nextClients: Client[],
    summary: ImportSummary,
  ) => void;
}

export function ImportModal({
  isOpen,
  appState,
  referenceDateIso,
  onClose,
  onApplyImport,
}: ImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [previewResult, setPreviewResult] = useState<{
    fileName: string;
    nextLicenses: IsrLicense[];
    nextClients: Client[];
    summary: ImportSummary;
  } | null>(null);

  if (!isOpen) return null;

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setErrorMessage('');
    setPreviewResult(null);

    const lowerName = file.name.toLowerCase();
    if (
      !lowerName.endsWith('.xlsx') &&
      !lowerName.endsWith('.xls') &&
      !lowerName.endsWith('.csv')
    ) {
      setErrorMessage(
        'Format berkas tidak didukung. Gunakan file Excel (.xlsx) atau CSV (.csv), contoh: laporan_sims.xlsx.',
      );
      fileInputRef.current?.focus();
      return;
    }

    setIsProcessing(true);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseSimsWorkbook(buffer, appState, referenceDateIso);
      setPreviewResult({
        fileName: file.name,
        ...parsed,
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Berkas gagal dibaca. Pastikan format kolom SIMS sesuai contoh.';
      setErrorMessage(message);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  function handleDownloadSample() {
    const buffer = generateSampleSimsWorkbookArrayBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'contoh_laporan_sims_si_isr.xlsx';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function handleConfirmImport() {
    if (!previewResult) return;
    onApplyImport(
      previewResult.nextLicenses,
      previewResult.nextClients,
      previewResult.summary,
    );
    setPreviewResult(null);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
    >
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.08)]">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 pb-4">
          <div>
            <h2 id="import-modal-title" className="text-lg font-semibold text-neutral-900">
              Unggah Laporan SIMS
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              Pilih berkas ekspor SIMS (.xlsx atau .csv) untuk memperbarui data izin.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog unggah"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="sims-file-input"
              className="block text-sm font-medium text-neutral-900"
            >
              Berkas Laporan Postel/SIMS
            </label>
            <input
              ref={fileInputRef}
              id="sims-file-input"
              name="simsFile"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="mt-2 block w-full min-h-[44px] rounded-xl border border-neutral-200 bg-white px-3 py-2 text-base text-neutral-900 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            />
            <p className="mt-1.5 text-sm text-neutral-600">
              Baris berstatus Prelim. Canceled otomatis dipisahkan ke arsip non-aktif.
            </p>
            {errorMessage && (
              <p role="alert" className="mt-2 text-sm text-red-800">
                {errorMessage}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-4">
            <button
              type="button"
              onClick={handleDownloadSample}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              <Download className="h-4 w-4 text-neutral-600" aria-hidden="true" />
              <span>Unduh Contoh XLSX</span>
            </button>
            {isProcessing && (
              <span className="inline-flex items-center gap-2 text-sm text-neutral-600">
                <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                <span>Membaca berkas…</span>
              </span>
            )}
          </div>

          {previewResult && (
            <div className="rounded-xl bg-neutral-50 p-4">
              <p className="text-sm font-semibold text-neutral-900">
                Ringkasan Berkas: {previewResult.fileName}
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm tabular-nums">
                <div>
                  <dt className="text-neutral-600">Baris terbaca</dt>
                  <dd className="font-semibold text-neutral-900">
                    {previewResult.summary.totalRowsRead}
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-600">Izin aktif unik</dt>
                  <dd className="font-semibold text-neutral-900">
                    {previewResult.summary.uniqueActiveGrouped}
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-600">Data baru</dt>
                  <dd className="font-semibold text-neutral-900">
                    {previewResult.summary.insertedCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-600">Diperbarui</dt>
                  <dd className="font-semibold text-neutral-900">
                    {previewResult.summary.updatedCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-600">Arsip non-aktif</dt>
                  <dd className="font-semibold text-neutral-900">
                    {previewResult.summary.archivedCanceledCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-600">Kembali aman</dt>
                  <dd className="font-semibold text-neutral-900">
                    {previewResult.summary.resetToActiveCount}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-neutral-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={!previewResult || isProcessing}
            onClick={handleConfirmImport}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 ease-out hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            <span>Simpan Data</span>
          </button>
        </div>
      </div>
    </div>
  );
}
