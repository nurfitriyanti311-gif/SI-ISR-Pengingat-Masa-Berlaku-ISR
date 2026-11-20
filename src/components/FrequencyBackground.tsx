/* Latar garis spektrum dan gelombang frekuensi radio datar tanpa gradasi, titik, atau efek glow. */

export function FrequencyBackground() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1200 220"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <path
        d="M0 150 Q 90 110, 180 150 T 360 150 T 540 150 T 720 150 T 900 150 T 1080 150 T 1200 150"
        fill="none"
        stroke="#e5e5e5"
        strokeWidth="1.25"
      />
      <path
        d="M0 128 Q 60 80, 120 128 T 240 128 T 360 128 T 480 128 T 600 128 T 720 128 T 840 128 T 960 128 T 1080 128 T 1200 128"
        fill="none"
        stroke="#f0f0f0"
        strokeWidth="1.25"
      />
      <path
        d="M720 190 L740 190 L748 162 L756 190 L772 190 L784 120 L796 190 L820 190 L828 148 L836 190 L868 190 L880 96 L892 190 L924 190 L934 152 L944 190 L988 190 L998 134 L1008 190 L1056 190 L1068 112 L1080 190 L1130 190 L1140 160 L1150 190 L1200 190"
        fill="none"
        stroke="#e5e5e5"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}
