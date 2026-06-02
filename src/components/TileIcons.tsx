import type { SVGProps } from 'react';

const baseProps: SVGProps<SVGSVGElement> = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="m20 20-5-5" />
    </svg>
  );
}

export function SparkleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M12 3 13.6 9.2 19.8 10.8 13.6 12.4 12 18.6 10.4 12.4 4.2 10.8 10.4 9.2Z" />
      <path d="M19 4v3" />
      <path d="M17.5 5.5h3" />
    </svg>
  );
}

export function ChatIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 4v-4H6a2 2 0 0 1-2-2Z" />
      <path d="M8 9h8" />
      <path d="M8 12h5" />
    </svg>
  );
}

export function SchemaIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <rect x="3.5" y="4" width="17" height="16" rx="2" />
      <path d="M7 8h10" />
      <path d="M7 12h6" />
      <path d="M7 16h8" />
    </svg>
  );
}

export function GraphIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="6" cy="6" r="2.2" />
      <circle cx="18" cy="6" r="2.2" />
      <circle cx="12" cy="13" r="2.2" />
      <circle cx="6" cy="19" r="2.2" />
      <circle cx="18" cy="19" r="2.2" />
      <path d="m7.8 7.4 2.8 4.2" />
      <path d="m16.2 7.4-2.8 4.2" />
      <path d="m10.6 14.6-3 3" />
      <path d="m13.4 14.6 3 3" />
    </svg>
  );
}

export function PipelineIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <rect x="3" y="4" width="6" height="6" rx="1.5" />
      <rect x="15" y="4" width="6" height="6" rx="1.5" />
      <rect x="3" y="14" width="6" height="6" rx="1.5" />
      <rect x="15" y="14" width="6" height="6" rx="1.5" />
      <path d="M9 7h6" />
      <path d="M9 17h6" />
      <path d="M6 10v4" />
      <path d="M18 10v4" />
    </svg>
  );
}
