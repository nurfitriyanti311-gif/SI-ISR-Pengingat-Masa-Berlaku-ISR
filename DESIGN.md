# Dokumen Desain — Sistem Informasi Pengingat Masa Berlaku ISR (SI-ISR)

Dokumen ini mencatat keputusan desain visual untuk seluruh antarmuka SI-ISR.

## Keputusan Desain (Tahap 2)

| Keputusan | Pilihan Dipakai | Alasan |
| :--- | :--- | :--- |
| Kesan visual | Formal dan tenang (`IBM Plex Sans`) | Sesuai konteks pemantauan perizinan spektrum frekuensi radio yang resmi dan padat angka. |
| Warna aksen | Biru (`blue-700` / `blue-800` / `blue-50`) | Memberi penanda fokus dan aksi utama yang jelas dengan kontras tinggi. |
| Sapaan pengguna | Anda | Sesuai nada resmi pengingat perizinan di PRD. |
| Susunan halaman | Satu halaman dengan navigasi menu utama | Memudahkan perpindahan antara Dasbor, Klien PIC, Pengiriman & Log, dan Template tanpa memutus alur. |
| Posisi aksi utama | Terlihat di bagian atas dasbor dan akhir formulir | Pada layar 360 × 740 px, tombol unggah data dan pindai H-7 langsung terlihat tanpa menggulir. |
| Gambar | Gambar dari tim (Logo Komdigi, DJID, dan Balmon Bengkulu) serta garis gelombang frekuensi datar | Memakai 3 berkas logo resmi dari tim dengan teks alternatif berbahasa Indonesia. |

## Token Visual

- **Latar halaman:** `bg-neutral-50`
- **Permukaan panel/kartu:** `bg-white` dengan sudut `rounded-2xl` dan batas `border border-neutral-200` (tanpa kartu di dalam kartu)
- **Tombol & input:** sudut `rounded-xl`, tinggi area sentuh minimal 44 px, ukuran teks input minimal 16 px
- **Tipografi:** `@fontsource/ibm-plex-sans` ketebalan `400`, `500`, `600`; angka memakai `tabular-nums`
- **Warna teks:** utama `text-neutral-900`, pendukung `text-neutral-600`, placeholder `text-neutral-500`
- **Warna aksen:** tombol utama `bg-blue-700 hover:bg-blue-800 text-white`, item terpilih `border-blue-700 bg-blue-50 text-blue-700`, cincin fokus `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700`
- **Warna status (selalu disertai ikon dan label teks):**
  - Berhasil / Aman: `bg-emerald-50 text-emerald-800`
  - Peringatan H-7: `bg-amber-50 text-amber-800`
  - Gagal / Kedaluwarsa: `bg-red-50 text-red-800`
  - Netral / Arsip / Dilewati: `bg-neutral-100 text-neutral-800`

## Pilihan Tampilan Per Fitur

- **FT-01 (Import SIMS):** Panel unggah drag-and-drop atau pilih berkas `.xlsx`/`.csv`, ringkasan pratinjau hasil pengelompokan sebelum atau sesudah simpan, plus tombol unduh contoh berkas.
- **FT-02 (Direktori Klien & PIC):** Daftar perusahaan di sisi atas/tabel ringkas dengan kolom pencarian, dan formulir edit kontak PIC di panel samping/modal bersih agar seluruh stasiun di bawah `CLNT_ID` langsung terhubung.
- **FT-03 & FT-04 (Pemindaian H-7 & Pengiriman):** Bilah ringkas pemindaian harian dengan tanggal acuan yang dapat disesuaikan untuk uji H-7, daftar antrean ISR H-7 dengan tombol kirim langsung per kanal (`wa.me`, `mailto:`, salin/buka Telegram) serta tombol rekap Telegram internal.
- **FT-05 & FT-08 (Dasbor & Tindak Lanjut):** 4 ringkasan angka sejajar (`Total Aktif`, `Jatuh Tempo H-7`, `Kritis <= 7 Hari`, `Kedaluwarsa`), filter cepat + pencarian, tabel data dengan tombol tindak lanjut untuk mengubah status dan catatan operator.
- **FT-06 (Template & Aturan):** Form edit template WA, subjek & isi Email, template rekap Telegram dengan tombol sisipkan variabel, serta input jumlah hari pengingat (bawaan 7 hari) dan jam jadwal acuan (`08.00 WIB`).
- **FT-07 (Audit Log):** Tabel riwayat pengiriman dengan filter status (`Semua`, `SUCCESS`, `FAILED`, `SKIPPED`) dan tombol `Kirim Ulang` untuk baris `FAILED` atau uji coba pengiriman.
