/* Dialog penghapusan data SIMS (semua izin, arsip non-aktif, atau beserta klien PIC) dengan konfirmasi aman. */

import { Trash2, X } from 'lucide-react';
import { useState } from 'react';

interface DeleteSimsModalProps {
  isOpen: boolean;
  totalLicensesCount: number;
  archivedCount: number;
  clientsCount: number;
  onClose: () => void;
  onDeleteAllSims: (alsoDeleteClients: boolean) => void;
  onDeleteArchivedOnly: () => void;
}

export function DeleteSimsModal({
  isOpen,
  totalLicensesCount,
  archivedCount,
  clientsCount,
  onClose,
  onDeleteAllSims,
  onDeleteArchivedOnly,
}: DeleteSimsModalProps) {
  const [alsoDeleteClients, setAlsoDeleteClients] = useState(false);
  const [confirmMode, setConfirmMode] = useState<'NONE' | 'ALL' | 'ARCHIVED'>('NONE');

  if (!isOpen) return null;

  function handleClose() {
    setConfirmMode('NONE');
    setAlsoDeleteClients(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-sims-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.08)]">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 pb-4">
          <div>
            <h2 id="delete-sims-title" className="text-lg font-semibold text-neutral-900">
              Hapus Data SIMS
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              Bersihkan data izin yang salah unggah atau hapus arsip non-aktif.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Tutup dialog hapus data"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-3 gap-3 rounded-xl bg-neutral-50 p-4 text-sm tabular-nums">
            <div>
              <div className="text-neutral-600">Total Izin</div>
              <div className="mt-0.5 text-lg font-semibold text-neutral-900">
                {totalLicensesCount}
              </div>
            </div>
            <div>
              <div className="text-neutral-600">Arsip Non-Aktif</div>
              <div className="mt-0.5 text-lg font-semibold text-neutral-900">
                {archivedCount}
              </div>
            </div>
            <div>
              <div className="text-neutral-600">Klien PIC</div>
              <div className="mt-0.5 text-lg font-semibold text-neutral-900">
                {clientsCount}
              </div>
            </div>
          </div>

          <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-900">
            <input
              type="checkbox"
              checked={alsoDeleteClients}
              onChange={(e) => setAlsoDeleteClients(e.target.checked)}
              className="h-4 w-4 accent-blue-700"
            />
            <span>Sekaligus hapus seluruh direktori kontak klien PIC</span>
          </label>

          {confirmMode === 'ALL' && (
            <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">
              <p className="font-medium">
                Konfirmasi hapus {totalLicensesCount} data izin SIMS
                {alsoDeleteClients ? ` dan ${clientsCount} data klien` : ''}?
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onDeleteAllSims(alsoDeleteClients);
                    handleClose();
                  }}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                >
                  Ya, Hapus Semua
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmMode('NONE')}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          {confirmMode === 'ARCHIVED' && (
            <div role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-medium">
                Konfirmasi hapus {archivedCount} data arsip non-aktif (Prelim. Canceled)?
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onDeleteArchivedOnly();
                    handleClose();
                  }}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                >
                  Ya, Hapus Arsip
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmMode('NONE')}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-4">
          <button
            type="button"
            disabled={archivedCount === 0 || confirmMode !== 'NONE'}
            onClick={() => setConfirmMode('ARCHIVED')}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:text-neutral-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            <Trash2 className="h-4 w-4 text-neutral-600" aria-hidden="true" />
            <span>Hapus Arsip</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              Tutup
            </button>
            <button
              type="button"
              disabled={totalLicensesCount === 0 || confirmMode !== 'NONE'}
              onClick={() => setConfirmMode('ALL')}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              <span>Hapus Semua SIMS</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
