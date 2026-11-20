/* Halaman Manajemen Direktori Klien dan Kontak PIC per perusahaan (FT-02). */

import { CheckCircle2, Mail, Phone, Search, Send } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import {
  normalizeIndonesianPhone,
  normalizeTelegramHandle,
  validateEmailInput,
  validatePhoneInput,
} from '../lib/phone';
import type { Client, IsrLicense } from '../types';

interface ClientDirectoryViewProps {
  clients: Client[];
  licenses: IsrLicense[];
  onSaveClientContact: (
    clntId: string,
    picName: string,
    rawPhone: string,
    picEmail: string,
    picTelegramId: string,
  ) => void;
}

export function ClientDirectoryView({
  clients,
  licenses,
  onSaveClientContact,
}: ClientDirectoryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>(
    clients[0]?.clntId || '',
  );

  const selectedClient = useMemo(
    () => clients.find((c) => c.clntId === selectedClientId) || clients[0] || null,
    [clients, selectedClientId],
  );

  const [picName, setPicName] = useState(selectedClient?.picName || '');
  const [rawPhone, setRawPhone] = useState(selectedClient?.rawPhone || '');
  const [picEmail, setPicEmail] = useState(selectedClient?.picEmail || '');
  const [picTelegramId, setPicTelegramId] = useState(
    selectedClient?.picTelegramId || '',
  );

  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [savedNotice, setSavedNotice] = useState('');

  const phoneInputRef = useRef<HTMLInputElement | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  function handleSelectClient(client: Client) {
    setSelectedClientId(client.clntId);
    setPicName(client.picName);
    setRawPhone(client.rawPhone);
    setPicEmail(client.picEmail);
    setPicTelegramId(client.picTelegramId);
    setPhoneError('');
    setEmailError('');
    setSavedNotice('');
  }

  const stationCountByClient = useMemo(() => {
    const counts = new Map<string, number>();
    for (const lic of licenses) {
      counts.set(lic.clntId, (counts.get(lic.clntId) || 0) + 1);
    }
    return counts;
  }, [licenses]);

  const filteredClients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.clntName.toLowerCase().includes(q) ||
        c.clntId.toLowerCase().includes(q) ||
        c.picName.toLowerCase().includes(q) ||
        c.picEmail.toLowerCase().includes(q),
    );
  }, [clients, searchQuery]);

  const liveNormalizedPhone = useMemo(
    () => normalizeIndonesianPhone(rawPhone),
    [rawPhone],
  );

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedClient) return;

    const pErr = validatePhoneInput(rawPhone);
    const eErr = validateEmailInput(picEmail);

    setPhoneError(pErr || '');
    setEmailError(eErr || '');
    setSavedNotice('');

    if (pErr) {
      phoneInputRef.current?.focus();
      return;
    }
    if (eErr) {
      emailInputRef.current?.focus();
      return;
    }

    onSaveClientContact(
      selectedClient.clntId,
      picName.trim(),
      rawPhone.trim(),
      picEmail.trim(),
      normalizeTelegramHandle(picTelegramId),
    );
    const linkedStations = stationCountByClient.get(selectedClient.clntId) || 0;
    setSavedNotice(
      `Kontak PIC disimpan dan terhubung ke ${linkedStations} stasiun milik ${selectedClient.clntName}.`,
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <section className="rounded-2xl bg-white p-4 sm:p-6 lg:col-span-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">
              Direktori Klien &amp; PIC
            </h1>
            <p className="mt-1 text-sm text-neutral-600">
              Ubah kontak satu kali untuk seluruh stasiun per perusahaan.
            </p>
          </div>
          <span className="text-sm font-medium text-neutral-600 tabular-nums">
            {clients.length} perusahaan
          </span>
        </div>

        <div className="mt-4">
          <label htmlFor="client-search-input" className="block text-sm font-medium text-neutral-900">
            Cari Perusahaan atau ID Klien
          </label>
          <div className="relative mt-2">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
              aria-hidden="true"
            />
            <input
              id="client-search-input"
              name="clientSearch"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nama perusahaan atau CLNT_ID"
              className="block w-full min-h-[44px] rounded-xl border border-neutral-200 bg-white py-2 pl-10 pr-4 text-base text-neutral-900 placeholder:text-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            />
          </div>
        </div>

        <div className="mt-4 divide-y divide-neutral-200">
          {filteredClients.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-600">
              Tidak ada perusahaan yang cocok dengan pencarian Anda.
            </p>
          ) : (
            filteredClients.map((client) => {
              const isSelected = selectedClient?.clntId === client.clntId;
              const stationCount = stationCountByClient.get(client.clntId) || 0;
              return (
                <button
                  key={client.clntId}
                  type="button"
                  onClick={() => handleSelectClient(client)}
                  className={`flex w-full items-start justify-between gap-4 rounded-xl px-3 py-3 text-left transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                    isSelected
                      ? 'border border-blue-700 bg-blue-50'
                      : 'border border-transparent hover:bg-neutral-50'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-neutral-900">{client.clntName}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-600">
                      <span className="tabular-nums">{client.clntId}</span>
                      <span className="tabular-nums">{stationCount} izin</span>
                      <span>
                        {client.phoneType === 'WA_VALID'
                          ? `WA: ${client.picWa}`
                          : client.phoneType === 'OFFICE_NON_WA'
                            ? 'Telp Kantor (Non-WA)'
                            : 'WA belum diisi'}
                      </span>
                    </div>
                    <div className="mt-0.5 text-sm text-neutral-600">
                      {client.picEmail || 'Email PIC belum diisi'}
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-blue-700">
                    Pilih
                  </span>
                </button>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 sm:p-6 lg:col-span-5">
        {selectedClient ? (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="border-b border-neutral-200 pb-4">
              <h2 className="text-lg font-semibold text-neutral-900">
                Ubah Kontak PIC
              </h2>
              <p className="mt-1 text-sm text-neutral-600">
                {selectedClient.clntName} ({selectedClient.clntId})
              </p>
              <p className="mt-1 text-sm text-neutral-600 tabular-nums">
                Terhubung ke {stationCountByClient.get(selectedClient.clntId) || 0} data izin ISR.
              </p>
            </div>

            <div>
              <label htmlFor="pic-name-input" className="block text-sm font-medium text-neutral-900">
                Nama PIC
              </label>
              <input
                id="pic-name-input"
                name="picName"
                type="text"
                autoComplete="name"
                value={picName}
                onChange={(e) => setPicName(e.target.value)}
                placeholder="Contoh: Raka Pratama"
                className="mt-2 block w-full min-h-[44px] rounded-xl border border-neutral-200 bg-white px-3 py-2 text-base text-neutral-900 placeholder:text-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              />
            </div>

            <div>
              <label htmlFor="pic-phone-input" className="block text-sm font-medium text-neutral-900">
                Nomor Telepon / WhatsApp PIC
              </label>
              <div className="relative mt-2">
                <Phone
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
                  aria-hidden="true"
                />
                <input
                  ref={phoneInputRef}
                  id="pic-phone-input"
                  name="picPhone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={rawPhone}
                  onChange={(e) => {
                    setRawPhone(e.target.value);
                    if (phoneError) setPhoneError('');
                  }}
                  placeholder="Contoh: 0812-3456-7890"
                  className="block w-full min-h-[44px] rounded-xl border border-neutral-200 bg-white py-2 pl-10 pr-4 text-base text-neutral-900 tabular-nums placeholder:text-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                />
              </div>
              <p className="mt-1.5 text-sm text-neutral-600 tabular-nums">
                Hasil normalisasi: {liveNormalizedPhone.label}
              </p>
              {phoneError && (
                <p role="alert" className="mt-1.5 text-sm text-red-800">
                  {phoneError}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="pic-email-input" className="block text-sm font-medium text-neutral-900">
                Alamat Email PIC
              </label>
              <div className="relative mt-2">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
                  aria-hidden="true"
                />
                <input
                  ref={emailInputRef}
                  id="pic-email-input"
                  name="picEmail"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={picEmail}
                  onChange={(e) => {
                    setPicEmail(e.target.value);
                    if (emailError) setEmailError('');
                  }}
                  placeholder="Contoh: pic@perusahaan.co.id"
                  className="block w-full min-h-[44px] rounded-xl border border-neutral-200 bg-white py-2 pl-10 pr-4 text-base text-neutral-900 placeholder:text-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                />
              </div>
              {emailError && (
                <p role="alert" className="mt-1.5 text-sm text-red-800">
                  {emailError}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="pic-telegram-input" className="block text-sm font-medium text-neutral-900">
                Username atau ID Telegram PIC
              </label>
              <div className="relative mt-2">
                <Send
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
                  aria-hidden="true"
                />
                <input
                  id="pic-telegram-input"
                  name="picTelegram"
                  type="text"
                  value={picTelegramId}
                  onChange={(e) => setPicTelegramId(e.target.value)}
                  placeholder="Opsional, contoh: raka_perizinan"
                  className="block w-full min-h-[44px] rounded-xl border border-neutral-200 bg-white py-2 pl-10 pr-4 text-base text-neutral-900 placeholder:text-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                />
              </div>
              <p className="mt-1.5 text-sm text-neutral-600">
                Dipakai untuk tautan langsung Telegram PIC.
              </p>
            </div>

            {savedNotice && (
              <div
                role="status"
                className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{savedNotice}</span>
              </div>
            )}

            <div className="flex justify-end border-t border-neutral-200 pt-4">
              <button
                type="submit"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-blue-700 px-5 py-2 text-sm font-medium text-white transition-colors duration-150 ease-out hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                Simpan Kontak PIC
              </button>
            </div>
          </form>
        ) : (
          <p className="py-8 text-center text-sm text-neutral-600">
            Belum ada data klien. Unggah laporan SIMS untuk memulai.
          </p>
        )}
      </section>
    </div>
  );
}
