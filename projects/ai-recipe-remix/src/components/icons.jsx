/**
 * Small inline SVG icons (24x24, stroke = currentColor). All are decorative:
 * hidden from assistive tech, with meaning carried by visible text or labels.
 */
function Icon({ children, className = 'h-5 w-5', strokeWidth = 1.8, ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...props}
    >
      {children}
    </svg>
  );
}

/** Brand mark: a bowl with a sparkle (same drawing as public/favicon.svg). */
export function BowlMark({ className = 'h-8 w-8' }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" className={className} fill="currentColor">
      <path d="M16 1.5c.55 3.1 1.85 4.4 4.95 4.95-3.1.55-4.4 1.85-4.95 4.95-.55-3.1-1.85-4.4-4.95-4.95 3.1-.55 4.4-1.85 4.95-4.95Z" />
      <path
        opacity=".55"
        d="M24.5 6.25c.27 1.5.9 2.13 2.4 2.4-1.5.27-2.13.9-2.4 2.4-.27-1.5-.9-2.13-2.4-2.4 1.5-.27 2.13-.9 2.4-2.4Z"
      />
      <path d="M3 14.25h26c0 6.6-5.8 12-13 12S3 20.85 3 14.25Z" />
      <rect x="11" y="27.5" width="10" height="2.5" rx="1.25" />
    </svg>
  );
}

export const SparklesIcon = (props) => (
  <Icon {...props}>
    <path d="M10 3.5 11.6 8a2 2 0 0 0 1.3 1.3L17.5 11l-4.6 1.6a2 2 0 0 0-1.3 1.3L10 18.5l-1.6-4.6a2 2 0 0 0-1.3-1.3L2.5 11l4.6-1.6A2 2 0 0 0 8.4 8L10 3.5Z" />
    <path d="M18.5 14.5v5M16 17h5" />
  </Icon>
);

export const ClockIcon = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Icon>
);

export const ServingsIcon = (props) => (
  <Icon {...props}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
    <path d="M15.5 5.2a3 3 0 0 1 0 5.6M17.5 14.2a5 5 0 0 1 3 5.3" />
  </Icon>
);

/** Three bars; the first `level` are filled (1 easy, 2 medium, 3 hard). */
export function DifficultyIcon({ level = 1, className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={3 + i * 7}
          y={14 - i * 5}
          width="4.5"
          height={7 + i * 5}
          rx="1.2"
          fill="currentColor"
          opacity={i < level ? 1 : 0.25}
        />
      ))}
    </svg>
  );
}

export const CopyIcon = (props) => (
  <Icon {...props}>
    <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
    <path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" />
  </Icon>
);

export const CheckIcon = (props) => (
  <Icon {...props}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
);

export const CloseIcon = (props) => (
  <Icon {...props}>
    <path d="M7 7l10 10M17 7 7 17" />
  </Icon>
);

export const AlertIcon = (props) => (
  <Icon {...props}>
    <path d="M10.3 4.3 2.8 17.5A2 2 0 0 0 4.5 20.5h15a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9.5v4M12 17h.01" />
  </Icon>
);

export const InfoIcon = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5M12 8h.01" />
  </Icon>
);

export const RefreshIcon = (props) => (
  <Icon {...props}>
    <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
    <path d="M19.5 4.5v4h-4" />
  </Icon>
);

export const LightbulbIcon = (props) => (
  <Icon {...props}>
    <path d="M9 18h6M10 21h4" />
    <path d="M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2v.5h5V16c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3Z" />
  </Icon>
);

export const SwapIcon = (props) => (
  <Icon {...props}>
    <path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5" />
  </Icon>
);

export const BasketIcon = (props) => (
  <Icon {...props}>
    <path d="M3.5 10h17l-1.8 8.4A2 2 0 0 1 16.7 20H7.3a2 2 0 0 1-2-1.6L3.5 10Z" />
    <path d="M8 10 11 4M16 10l-3-6M9.5 14v2.5M14.5 14v2.5" />
  </Icon>
);

export const KitchenIcon = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m8.5 12.3 2.4 2.4 4.6-5" />
  </Icon>
);

export const JarIcon = (props) => (
  <Icon {...props}>
    <path d="M8 3.5h8M8.5 3.5v3M15.5 3.5v3" />
    <rect x="5.5" y="6.5" width="13" height="14" rx="3" />
    <path d="M9 12h6" />
  </Icon>
);

export const ChevronDownIcon = (props) => (
  <Icon {...props}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);

export const ArrowUpRightIcon = (props) => (
  <Icon {...props}>
    <path d="M7 17 17 7M8.5 7H17v8.5" />
  </Icon>
);

export const ImageOffIcon = (props) => (
  <Icon {...props}>
    <path d="M3 3l18 18" />
    <path d="M10.5 5.5H18a2.5 2.5 0 0 1 2.5 2.5v7.5M18.5 20.5H6A2.5 2.5 0 0 1 3.5 18V6.5" />
    <path d="m3.5 16 4-4 3 3M14 13.5l1.5-1.5 5 5" />
  </Icon>
);

export const SpinnerIcon = ({ className = 'h-5 w-5', ...props }) => (
  <Icon className={`animate-spin motion-reduce:animate-none ${className}`} {...props}>
    <circle cx="12" cy="12" r="8.5" opacity=".25" />
    <path d="M20.5 12A8.5 8.5 0 0 0 12 3.5" />
  </Icon>
);
