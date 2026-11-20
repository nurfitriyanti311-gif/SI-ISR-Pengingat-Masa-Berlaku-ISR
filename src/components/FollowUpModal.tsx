/* Dialog pembaruan status tindak lanjut dan catatan operator per izin ISR (FT-08). */

import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { APP_CONFIG } from '../config';
import { formatTanggalIndonesia } from '../lib/format';
import type { Client, FollowUpStatus, IsrLicense } from '../types';

interface FollowUpModalProps {
  license: IsrLicense | null;
  client: Client | undefined;
  onClose: () => void;
  onSave: (licenseId: string, nextStatus: FollowUpStatus, notes: string) => void;
}

const EDITABLE_STATUSES: FollowUpStatus[] = [
  'Active',
  'Warning_H7',
  'In_Renewal',
  'Expired',
  'Not_Renewed',
];

export function FollowUpModal({
  license,
  client,
  onClose,
  onSave,
}: FollowUpModalProps) {
  const [status, setStatus] = useState<FollowUpStatus>('Active');
  const [notes, setNotes] = useState('');
  const [notesError, setNotesError] = useState('');
  const notesRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (license) {
      setStatus(license.followupStatus);
      setNotes(license.operatorNotes || '');
      setNotesError('');
    }
  }, [license]);

  if (!license) return null;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!license) return;
    const cleanedNotes = notes.trim();
    if (cleanedNotes.length > 500) {
      setNotesError(
        'Catatan maksimal 500 karakter. Ringkas catatan Anda, contoh: PIC konfirmasi bayar BHP minggu ini.',
      );
      notesRef.current?.focus();
      return;
    }
    onSave(license.id, status, cleanedNotes);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="followup-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.08)]">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 pb-4">
          <div>
            <h2 id="followup-modal-title" className="text-lg font-semibold text-neutral-900">
              Tindak Lanjut Izin
            </h2>
            <p className="mt-1 text-sm text-neutral-600 tabular-nums">{license.currLicNum}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog tindak lanjut"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
          <div className="grid grid-cols-1 gap-2 rounded-xl bg-neutral-50 p-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-neutral-600">Pemegang Izin</span>
              <span className="text-right font-medium text-neutral-900">{license.clntName}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-neutral-600">Jatuh Tempo</span>
              <span className="text-right font-medium text-neutral-900 tabular-nums">
                {formatTanggalIndonesia(license.targetExpiredDate)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-neutral-600">WhatsApp PIC</span>
              <span className="text-right font-medium text-neutral-900 tabular-nums">
                {client?.picWa || (client?.phoneType === 'OFFICE_NON_WA' ? 'Telepon Kantor (Non-WA)' : '-')}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-neutral-600">Email PIC</span>
              <span className="text-right font-medium text-neutral-900">
                {client?.picEmail || '-'}
              </span>
            </div>
          </div>

          <div>
            <label
              htmlFor="followup-status-select"
              className="block text-sm font-medium text-neutral-900"
            >
              Status Penanganan
            </label>
            <select
              id="followup-status-select"
              name="followupStatus"
              value={status}
              onChange={(e) => setStatus(e.target.value as FollowUpStatus)}
              className="mt-2 block w-full min-h-[44px] rounded-xl border border-neutral-200 bg-white px-3 py-2 text-base text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              {EDITABLE_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {APP_CONFIG.followupLabels[item]}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-sm text-neutral-600">
              Status Dalam Perpanjangan dipertahankan sampai tanggal diperbarui.
            </p>
          </div>

          <div>
            <label
              htmlFor="operator-notes-input"
              className="block text-sm font-medium text-neutral-900"
            >
              Catatan Operator
            </label>
            <textarea
              ref={notesRef}
              id="operator-notes-input"
              name="operatorNotes"
              rows={3}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                if (notesError) setNotesError('');
              }}
              placeholder="Contoh: PIC mengonfirmasi sedang proses pembayaran BHP"
              className="mt-2 block w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-base text-neutral-900 placeholder:text-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            />
            <div className="mt-1 flex items-center justify-between gap-2 text-sm">
              <span className="text-neutral-600">Maksimal 500 karakter.</span>
              <span className="text-neutral-600 tabular-nums">{notes.trim().length}/500</span>
            </div>
            {notesError && (
              <p role="alert" className="mt-1.5 text-sm text-red-800">
                {notesError}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-neutral-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              Batal
            </button>
            <button
              type="submit"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 ease-out hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              Simpan Tindak Lanjut
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
