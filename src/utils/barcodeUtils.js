export const COUNTRY_STANDARDS = {
  ZW: { country_name: 'Zimbabwe',          standard_format: 'EAN13', prefix: '977' },
  ZA: { country_name: 'South Africa',      standard_format: 'EAN13', prefix: '600-601' },
  NG: { country_name: 'Nigeria',           standard_format: 'EAN13', prefix: '615' },
  KE: { country_name: 'Kenya',             standard_format: 'EAN13', prefix: '616' },
  GH: { country_name: 'Ghana',             standard_format: 'EAN13', prefix: '603' },
  TZ: { country_name: 'Tanzania',          standard_format: 'EAN13', prefix: '619' },
  ZM: { country_name: 'Zambia',            standard_format: 'EAN13', prefix: '621' },
  US: { country_name: 'United States',     standard_format: 'UPCA',  prefix: '0-5' },
  CA: { country_name: 'Canada',            standard_format: 'UPCA',  prefix: '0-5' },
  EU: { country_name: 'European Union',    standard_format: 'EAN13', prefix: '400-440' },
  UK: { country_name: 'United Kingdom',    standard_format: 'EAN13', prefix: '50' },
  AU: { country_name: 'Australia',         standard_format: 'EAN13', prefix: '93' },
  NZ: { country_name: 'New Zealand',       standard_format: 'EAN13', prefix: '94' },
  JP: { country_name: 'Japan',             standard_format: 'EAN13', prefix: '45-49' },
  CN: { country_name: 'China',             standard_format: 'EAN13', prefix: '690-695' },
  IN: { country_name: 'India',             standard_format: 'EAN13', prefix: '890' },
  MX: { country_name: 'Mexico',            standard_format: 'EAN13', prefix: '750' },
  BR: { country_name: 'Brazil',            standard_format: 'EAN13', prefix: '789' },
};

export const COUNTRY_INFO = {
  ZW: {
    title: 'Zimbabwe Barcode Standard (EAN-13)',
    details: [
      { key: 'Format',         value: '13-digit EAN-13' },
      { key: 'Country Prefix', value: '977' },
      { key: 'Standard Size',  value: '38mm × 25mm' },
      { key: 'Minimum Size',   value: '30mm × 20mm (80% of standard)' },
      { key: 'Placement',      value: 'Flat surface, visible location' },
      { key: 'Usage',          value: 'Retail products, accepted globally' },
    ],
  },
  ZA: {
    title: 'South Africa Standard (EAN-13)',
    details: [
      { key: 'Format',         value: '13-digit EAN-13' },
      { key: 'Country Prefix', value: '600-601' },
      { key: 'Standard Size',  value: '38mm × 25mm' },
      { key: 'Usage',          value: 'Retail products in South Africa' },
    ],
  },
  US: {
    title: 'USA Barcode Standard (UPC-A)',
    details: [
      { key: 'Format',         value: '12-digit UPC-A' },
      { key: 'Country Prefix', value: '0-5' },
      { key: 'Standard Size',  value: '37.29mm × 25.91mm' },
      { key: 'Usage',          value: 'Retail products in North America' },
    ],
  },
  EU: {
    title: 'European Union Standard (EAN-13)',
    details: [
      { key: 'Format',         value: '13-digit EAN-13' },
      { key: 'Country Prefix', value: '400-440' },
      { key: 'Standard Size',  value: '38mm × 25mm' },
      { key: 'Usage',          value: 'Retail products across Europe' },
    ],
  },
};

// UPC-A check digit (same algorithm, but 12-digit)
function calculateUPCACheckDigit(barcode11) {
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    const d = parseInt(barcode11[i], 10);
    sum += i % 2 === 0 ? d * 3 : d;
  }
  return (10 - (sum % 10)) % 10;
}

// EAN-13 check digit (GS1 standard)
export function calculateEAN13CheckDigit(barcode12) {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = parseInt(barcode12[i], 10);
    sum += i % 2 === 0 ? d : d * 3;
  }
  return (10 - (sum % 10)) % 10;
}

export function generateZimbabweEAN13() {
  const prefix    = '977';
  const random    = String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0');
  const barcode12 = prefix + random;
  return barcode12 + String(calculateEAN13CheckDigit(barcode12));
}

// Generate barcode for any country standard
export function generateEAN13(countryCode = 'ZW') {
  const standard  = COUNTRY_STANDARDS[countryCode] ?? COUNTRY_STANDARDS.ZW;
  const prefixStr = standard.prefix;

  let prefixNum;
  if (prefixStr.includes('-')) {
    const [start, end] = prefixStr.split('-').map(Number);
    prefixNum = Math.floor(Math.random() * (end - start + 1)) + start;
  } else {
    prefixNum = parseInt(prefixStr, 10);
  }

  if (standard.standard_format === 'UPCA') {
    // UPC-A: 12 digits — prefix padded to 1–5 digits, rest random
    const pfx     = String(prefixNum).slice(0, 1);
    const unique  = String(Math.floor(Math.random() * 100_000_000_000)).padStart(11 - pfx.length, '0');
    const b11     = (pfx + unique).slice(0, 11);
    return b11 + String(calculateUPCACheckDigit(b11));
  }

  // EAN-13
  const prefix    = String(prefixNum).padStart(3, '0');
  const unique    = String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0');
  const barcode12 = prefix + unique;
  return barcode12 + String(calculateEAN13CheckDigit(barcode12));
}

// Format EAN-13 display matching GS1 retail label style: "9 771234 567890"
export function formatEAN13Display(barcode) {
  if (!barcode) return barcode;
  if (barcode.length === 13) {
    return `${barcode[0]}  ${barcode.slice(1, 7)}  ${barcode.slice(7)}`;
  }
  if (barcode.length === 12) {
    // UPC-A: X XXXXX XXXXX X
    return `${barcode[0]} ${barcode.slice(1, 6)} ${barcode.slice(6, 11)} ${barcode[11]}`;
  }
  return barcode;
}

export const VARIATION_EXAMPLES = {
  weight:  'e.g., 200g, 500g, 1kg, 2.5kg',
  volume:  'e.g., 250ml, 500ml, 1L, 2L',
  flavor:  'e.g., Strawberry, Chocolate, Vanilla, Mixed',
  color:   'e.g., Red, Green, Yellow, Blue',
  size:    'e.g., Small, Medium, Large, XL',
  mixture: 'e.g., Broccoli/Cauliflower Mix, Fruit Salad Mix',
  pack:    'e.g., 6-pack, 12-pack, Bulk 24-pack',
  other:   'e.g., Organic, Premium, Family Pack',
};
