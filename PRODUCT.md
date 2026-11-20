# Dokumen Produk — Sistem Informasi Pengingat Masa Berlaku ISR (SI-ISR)

Sumber: `public/assets/aistudio/prd_sistem_pengingat_isr_si_isr_5c816186.md`

## Daftar Fitur

| Kode | Nama Fitur | Prioritas | Ketergantungan | Status |
| :--- | :--- | :--- | :--- | :--- |
| FT-01 | Import & Upsert Laporan SIMS (`.xlsx`/`.csv`) | Must | Fondasi (`src/config.ts`) | Selesai |
| FT-02 | Manajemen Direktori Klien & Kontak PIC | Must | FT-01 | Selesai |
| FT-03 | Pemindaian Otomatis H-1, H-3, dan H-7 di Browser | Must | FT-01, FT-02 | Selesai |
| FT-04 | Pengirim Notifikasi Multi-Kanal (`wa.me`, `mailto:`, Telegram) | Must | FT-02, FT-03 | Selesai |
| FT-05 | Dasbor Pemantauan & Filter Status | Must | FT-01, FT-02, FT-03 | Selesai |
| FT-06 | Manajemen Template Pesan & Pengaturan Rentang Pengingat | Must | FT-04 | Selesai |
| FT-07 | Audit Log Notifikasi & Kirim Ulang Manual | Should | FT-04 | Selesai |
| FT-08 | Pembaruan Status Tindak Lanjut & Catatan Operator | Should | FT-05 | Selesai |

## Keputusan Penyesuaian Arsitektur & Hal Ambigu

1. **Penyesuaian Aplikasi Web Murni di Browser (Bagian 5)**
   - PRD menyebut backend server, database, cron job latar belakang pukul 08.00 WIB, serta penyimpanan kredensial API (Token WA Gateway, SMTP Password, Telegram Bot Token).
   - Sesuai batasan teknologi, aplikasi dibangun sepenuhnya di browser tanpa server, database eksternal, panggilan API eksternal, polling, maupun formulir kredensial API.
   - Pengganti yang dipakai: satu kunci `localStorage` (`si_isr_state_v1`) untuk penyimpanan data, pemindaian dan pemrosesan antrean otomatis saat aplikasi dibuka atau data diperbarui (tanpa polling), serta tautan resmi `https://wa.me/...`, `mailto:...`, dan `https://t.me/...` (plus salin rekap grup Telegram).
   - Rentang pengingat diperluas sesuai permintaan pengguna menjadi tahap **H-7, H-3, dan H-1** dengan pencegahan duplikasi per tahap (`curr_lic_num + target_date + channel + tahap`).

2. **Penentuan Tanggal Jatuh Tempo (`BL-02`)**
   - Kolom `MASA_LAKU` diprioritaskan sebagai `target_expired_date`; jika kosong, sistem memakai `VALIDITY_DATE`.
   - Jika keduanya kosong, izin ditandai `Data Tanggal Tidak Lengkap` dan tidak masuk antrean pengingat H-7.
   - Selisih hari dihitung dengan `Sisa_Hari = target_expired_date - tanggal_referensi` pada zona waktu kalender lokal (WIB) tanpa pergeseran jam.

3. **Pengelompokan Baris Perangkat (`BL-01`)**
   - Baris dengan `STATUS_SIMF` bernilai `Granted` atau `Granted (Under modification)` dianggap aktif; status `Prelim. Canceled` atau lainnya disimpan sebagai arsip non-aktif dan diabaikan dari antrean pengingat.
   - Beberapa baris dengan `CURR_LIC_NUM` sama digabungkan menjadi satu data izin dengan daftar frekuensi dan stasiun yang diringkas.

4. **Normalisasi Nomor Telepon (`BL-04`)**
   - Seluruh karakter selain angka dihapus. Nomor berawalan `08`, `628`, atau `+628` disimpan sebagai `628...` dan ditandai valid WhatsApp.
   - Nomor telepon kantor/rumah berkode area (seperti `021-5215445`) ditandai sebagai `Telepon Kantor (Non-WA)` dan dilewati oleh kanal WhatsApp (`SKIPPED - No Valid WA`).

5. **Siklus Status Tindak Lanjut (`BL-05`)**
   - Saat sinkronisasi atau pemindaian: `Sisa_Hari <= 0` menjadi `Expired`, `1 <= Sisa_Hari <= 7` menjadi `Warning_H7`, dan `Sisa_Hari > 7` menjadi `Active` (kecuali operator menandai `In_Renewal` atau `Not_Renewed`).
   - Jika file SIMS baru memperbarui `target_expired_date` sehingga `Sisa_Hari > 7`, status `Warning_H7`, `In_Renewal`, atau `Expired` otomatis kembali menjadi `Active`.
