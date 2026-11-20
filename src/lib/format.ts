/* Fungsi pemformatan tunggal untuk tanggal Indonesia, jam WIB, dan angka desimal. */

const BULAN_INDONESIA = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export function formatTanggalIndonesia(isoDate: string): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return 'Tanggal tidak lengkap';
  }
  const [yearStr, monthStr, dayStr] = isoDate.split('-');
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const day = Number(dayStr);
  if (monthIndex < 0 || monthIndex > 11 || !Number.isFinite(day)) {
    return isoDate;
  }
  return `${day} ${BULAN_INDONESIA[monthIndex]} ${year}`;
}

export function formatWaktuWib(isoTimestamp: string): string {
  if (!isoTimestamp) return '-';
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return '-';

  const wibMs = date.getTime() + 7 * 60 * 60 * 1000;
  const wibDate = new Date(wibMs);
  const day = wibDate.getUTCDate();
  const month = BULAN_INDONESIA[wibDate.getUTCMonth()];
  const year = wibDate.getUTCFullYear();
  const hours = String(wibDate.getUTCHours()).padStart(2, '0');
  const minutes = String(wibDate.getUTCMinutes()).padStart(2, '0');

  return `${day} ${month} ${year}, ${hours}.${minutes} WIB`;
}

export function formatDesimal(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.round(value * 100) / 100;
  return String(rounded).replace('.', ',');
}

export function getTodayWibIso(now: Date = new Date()): string {
  const wibMs = now.getTime() + 7 * 60 * 60 * 1000;
  const wibDate = new Date(wibMs);
  const y = wibDate.getUTCFullYear();
  const m = String(wibDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(wibDate.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
