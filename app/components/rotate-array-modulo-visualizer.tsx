export default function RotateArrayModuloVisualizer() {
  const pointerPositions = "24;82;140;198;256;314;372;24;82;140;198";
  const keyTimes = "0;0.1;0.2;0.3;0.4;0.5;0.6;0.7;0.8;0.9;1";

  return (
    <figure className="my-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        viewBox="0 0 420 160"
        role="img"
        aria-labelledby="rotate-mod-title rotate-mod-desc"
        className="h-40 w-full"
      >
        <title id="rotate-mod-title">Rotating beyond array length wraps around</title>
        <desc id="rotate-mod-desc">
          Pointer walks ten steps on a seven-slot array but finishes where a three-step rotation lands.
        </desc>
        <rect x="0" y="0" width="420" height="160" rx="24" fill="#eef2ff" />
        <text x="24" y="38" fill="#475569" fontSize="12" letterSpacing="0.12em">
          ROTATIONS
        </text>
        <text x="24" y="64" fill="#0f172a" fontSize="26" fontWeight={600}>
          k = 10
        </text>
        <text x="160" y="38" fill="#475569" fontSize="12" letterSpacing="0.12em">
          ARRAY LENGTH
        </text>
        <text x="160" y="64" fill="#0f172a" fontSize="26" fontWeight={600}>
          n = 7
        </text>
        <text x="300" y="38" fill="#0f766e" fontSize="12" letterSpacing="0.12em">
          EFFECTIVE
        </text>
        <text x="300" y="64" fill="#0f766e" fontSize="26" fontWeight={600}>
          k % n = 3
        </text>
        <g transform="translate(20 90)">
          <text x="0" y="-14" fill="#94a3b8" fontSize="11" letterSpacing="0.2em">
            INDICES
          </text>
          <g fill="#f8fafc" stroke="#cbd5f5" strokeWidth="1.5">
            <rect x="0" y="0" width="48" height="48" rx="10" />
            <rect x="58" y="0" width="48" height="48" rx="10" />
            <rect x="116" y="0" width="48" height="48" rx="10" />
            <rect x="174" y="0" width="48" height="48" rx="10" fill="#ecfccb" stroke="#bef264" />
            <rect x="232" y="0" width="48" height="48" rx="10" />
            <rect x="290" y="0" width="48" height="48" rx="10" />
            <rect x="348" y="0" width="48" height="48" rx="10" />
          </g>
          <g fill="#0f172a" fontSize="18" fontWeight={600} dominantBaseline="middle" textAnchor="middle">
            <text x="24" y="24">0</text>
            <text x="82" y="24">1</text>
            <text x="140" y="24">2</text>
            <text x="198" y="24" fill="#15803d">
              3
            </text>
            <text x="256" y="24">4</text>
            <text x="314" y="24">5</text>
            <text x="372" y="24">6</text>
          </g>
          <circle id="rotate-mod-pointer" cx="24" cy="-20" r="10" fill="#6366f1" />
          <animate
            xlinkHref="#rotate-mod-pointer"
            attributeName="cx"
            dur="6s"
            repeatCount="indefinite"
            values={pointerPositions}
            keyTimes={keyTimes}
          />
          <animate
            xlinkHref="#rotate-mod-pointer"
            attributeName="fill"
            dur="6s"
            repeatCount="indefinite"
            values="#6366f1;#6366f1;#6366f1;#6366f1;#6366f1;#6366f1;#6366f1;#6366f1;#6366f1;#6366f1;#fbbf24"
            keyTimes={keyTimes}
          />
        </g>
      </svg>
      <figcaption className="mt-3 text-center text-sm text-slate-500">
        Ten right rotations on a length-seven array land on index three &mdash; the same as rotating three steps (`k % n`).
      </figcaption>
    </figure>
  );
}