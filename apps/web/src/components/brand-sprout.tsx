/** Sprout leve em SVG — substitui PNG de referência no hero. */
export function BrandSprout({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <ellipse cx="100" cy="198" rx="48" ry="10" fill="currentColor" opacity="0.12" />
      <path
        d="M100 190 V78"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M100 132 C72 118 48 96 42 68 C78 72 96 96 100 118"
        fill="currentColor"
        opacity="0.72"
      />
      <path
        d="M100 118 C128 104 152 82 158 54 C122 58 104 84 100 106"
        fill="currentColor"
        opacity="0.85"
      />
      <circle cx="100" cy="72" r="11" fill="currentColor" opacity="0.95" />
    </svg>
  );
}
