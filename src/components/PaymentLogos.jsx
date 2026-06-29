// Inline SVG brand logos — no external dependencies, no icon libraries

export const VisaLogo = ({ height = 28 }) => (
  <svg height={height} viewBox="0 0 60 28" xmlns="http://www.w3.org/2000/svg" aria-label="Visa" role="img">
    <rect width="60" height="28" rx="4" fill="#1A1F71"/>
    <text x="30" y="20" fontFamily="'Arial Black', Arial, sans-serif" fontSize="16" fontWeight="900" fontStyle="italic" fill="white" textAnchor="middle" letterSpacing="1.5">VISA</text>
  </svg>
);

export const MastercardLogo = ({ height = 28 }) => {
  // Two overlapping circles with lens overlap
  return (
    <svg height={height} viewBox="0 0 52 28" xmlns="http://www.w3.org/2000/svg" aria-label="Mastercard" role="img">
      <circle cx="19" cy="14" r="13" fill="#EB001B"/>
      <circle cx="33" cy="14" r="13" fill="#F79E1B"/>
      {/* Lens overlap: centers (19,14) & (33,14) r=13 → intersect at (26, ~3.25) & (26, ~24.75) */}
      <path d="M26 3.25 A13 13 0 0 1 26 24.75 A13 13 0 0 0 26 3.25 Z" fill="#FF5F00"/>
    </svg>
  );
};

export const EcoCashLogo = ({ height = 28 }) => (
  <svg height={height} viewBox="0 0 90 28" xmlns="http://www.w3.org/2000/svg" aria-label="EcoCash" role="img">
    <rect width="90" height="28" rx="4" fill="#E31E24"/>
    <text x="45" y="19" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="700" fill="white" textAnchor="middle">EcoCash</text>
  </svg>
);

export const OneMoneyLogo = ({ height = 28 }) => (
  <svg height={height} viewBox="0 0 92 28" xmlns="http://www.w3.org/2000/svg" aria-label="OneMoney" role="img">
    <rect width="92" height="28" rx="4" fill="#F5A623"/>
    <text x="46" y="19" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="700" fill="white" textAnchor="middle">OneMoney</text>
  </svg>
);

export const PaynowLogo = ({ height = 28 }) => (
  <svg height={height} viewBox="0 0 82 28" xmlns="http://www.w3.org/2000/svg" aria-label="Paynow" role="img">
    <rect width="82" height="28" rx="4" fill="#003087"/>
    <text x="28" y="19" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="700" fill="white" textAnchor="middle">Pay</text>
    <text x="58" y="19" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="700" fill="#F5A623" textAnchor="middle">now</text>
  </svg>
);

export const InnBucksLogo = ({ height = 28 }) => (
  <svg height={height} viewBox="0 0 88 28" xmlns="http://www.w3.org/2000/svg" aria-label="InnBucks" role="img">
    <rect width="88" height="28" rx="4" fill="#10b981"/>
    <text x="44" y="19" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="700" fill="white" textAnchor="middle">InnBucks</text>
  </svg>
);

export const ZipitLogo = ({ height = 28 }) => (
  <svg height={height} viewBox="0 0 68 28" xmlns="http://www.w3.org/2000/svg" aria-label="ZIPIT" role="img">
    <rect width="68" height="28" rx="4" fill="#1e40af"/>
    <text x="34" y="19" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="700" fill="white" textAnchor="middle" letterSpacing="1">ZIPIT</text>
  </svg>
);

export const AmexLogo = ({ height = 28 }) => (
  <svg height={height} viewBox="0 0 60 28" xmlns="http://www.w3.org/2000/svg" aria-label="American Express" role="img">
    <rect width="60" height="28" rx="4" fill="#2E77BC"/>
    <text x="30" y="19" fontFamily="Arial, sans-serif" fontSize="9" fontWeight="700" fill="white" textAnchor="middle" letterSpacing="0.3">AMERICAN</text>
    <text x="30" y="27" fontFamily="Arial, sans-serif" fontSize="7" fontWeight="600" fill="white" textAnchor="middle" letterSpacing="0.5">EXPRESS</text>
  </svg>
);
