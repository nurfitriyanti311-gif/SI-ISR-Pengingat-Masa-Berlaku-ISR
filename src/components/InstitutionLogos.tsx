/* Komponen penampil tiga logo instansi resmi dari berkas tim: Komdigi, DJID, dan Balmon Bengkulu. */

export function InstitutionLogos() {
  return (
    <div className="flex items-center gap-3" aria-label="Identitas Instansi">
      <img
        src="/assets/aistudio/logo1.png_1906d54f.png"
        alt="Logo Kementerian Komunikasi dan Digital (Komdigi)"
        className="h-9 w-auto object-contain shrink-0"
      />
      <img
        src="/assets/aistudio/GKL17_DJID__Direktorat_Jenderal_Infrastruktur_Digital__-_koleksilogo.com_c6bf1b52.jpg"
        alt="Logo Direktorat Jenderal Infrastruktur Digital (DJID)"
        className="h-7 w-auto object-contain shrink-0 sm:h-8"
      />
      <img
        src="/assets/aistudio/logo_Balmon_Bengkulu_a2a11a9f.png"
        alt="Logo Balai Monitor Spektrum Frekuensi Radio Bengkulu"
        className="h-9 w-auto object-contain shrink-0 sm:h-10"
      />
    </div>
  );
}
