/* Fungsi normalisasi dan validasi nomor telepon Indonesia untuk kanal WhatsApp (BL-04). */

import type { PhoneType } from '../types';

export interface PhoneNormalizationResult {
  digits: string;
  picWa: string;
  phoneType: PhoneType;
  label: string;
}

export function normalizeIndonesianPhone(rawPhone: string): PhoneNormalizationResult {
  const trimmed = rawPhone.trim();
  const digits = trimmed.replace(/\D/g, '');

  if (!digits) {
    return {
      digits: '',
      picWa: '',
      phoneType: 'EMPTY',
      label: 'Belum diisi',
    };
  }

  let normalized = digits;
  if (normalized.startsWith('08')) {
    normalized = `62${normalized.slice(1)}`;
  }

  if (normalized.startsWith('628') && normalized.length >= 10 && normalized.length <= 15) {
    return {
      digits,
      picWa: normalized,
      phoneType: 'WA_VALID',
      label: `Valid WA (${normalized})`,
    };
  }

  return {
    digits,
    picWa: '',
    phoneType: 'OFFICE_NON_WA',
    label: 'Telepon Kantor (Non-WA)',
  };
}

export function validatePhoneInput(rawPhone: string): string | null {
  const trimmed = rawPhone.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 8) {
    return 'Nomor telepon terlalu pendek. Masukkan minimal 8 digit angka, contoh: 0812-3456-7890.';
  }
  return null;
}

export function validateEmailInput(rawEmail: string): string | null {
  const trimmed = rawEmail.trim();
  if (!trimmed) return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return 'Format email tidak valid. Masukkan alamat email lengkap, contoh: pic@perusahaan.co.id.';
  }
  return null;
}

export function normalizeTelegramHandle(rawHandle: string): string {
  const trimmed = rawHandle.trim();
  if (!trimmed) return '';
  return trimmed.replace(/^@+/, '');
}
