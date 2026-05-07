export const COUNTRY_STANDARDS = {
  ZW: { country_name: 'Zimbabwe',          standard_format: 'EAN13', prefix: '977' },
  US: { country_name: 'United States',     standard_format: 'UPCA',  prefix: '0-5' },
  EU: { country_name: 'European Union',    standard_format: 'EAN13', prefix: '400-440' },
  UK: { country_name: 'United Kingdom',    standard_format: 'EAN13', prefix: '50' },
  ZA: { country_name: 'South Africa',      standard_format: 'EAN13', prefix: '600-601' },
  AU: { country_name: 'Australia',         standard_format: 'EAN13', prefix: '93' },
  JP: { country_name: 'Japan',             standard_format: 'JAN',   prefix: '45-49' },
  IN: { country_name: 'India',             standard_format: 'EAN13', prefix: '890' },
  CN: { country_name: 'China',             standard_format: 'EAN13', prefix: '690-695' },
  CA: { country_name: 'Canada',            standard_format: 'UPCA',  prefix: '0-5' },
  MX: { country_name: 'Mexico',            standard_format: 'EAN13', prefix: '750' },
  BR: { country_name: 'Brazil',            standard_format: 'EAN13', prefix: '789' },
};

export const COUNTRY_INFO = {
  ZW: {
    title: 'Zimbabwe Barcode Standard (EAN-13)',
    details: [
      { key: 'Format',       value: '13-digit EAN-13' },
      { key: 'Country Prefix', value: '977' },
      { key: 'Standard Size',  value: '38mm × 25mm' },
      { key: 'Minimum Size',   value: '30mm × 20mm (80% of standard)' },
      { key: 'Placement',      value: 'Flat surface, visible location' },
      { key: 'Usage',          value: 'Retail products, accepted globally' },
      { key: 'Example',        value: '977XXXXXXXXX✓ (12 digits + 1 check digit)' },
    ],
  },
  US: {
    title: 'USA Barcode Standard (UPC-A)',
    details: [
      { key: 'Format',        value: '12-digit UPC-A' },
      { key: 'Country Prefix', value: '0-5' },
      { key: 'Standard Size',  value: 'Variable' },
      { key: 'Minimum Size',   value: '80% of standard' },
      { key: 'Usage',          value: 'Retail products in North America' },
      { key: 'Example',        value: '0XXXXXXXXXX✓ (11 digits + 1 check digit)' },
    ],
  },
  EU: {
    title: 'European Union Standard (EAN-13)',
    details: [
      { key: 'Format',        value: '13-digit EAN-13' },
      { key: 'Country Prefix', value: '400-440 (Germany)' },
      { key: 'Standard Size',  value: '38mm × 25mm' },
      { key: 'Usage',          value: 'Retail products across Europe' },
      { key: 'Example',        value: '4XXXXXXXXXXXX✓ (12 digits + 1 check digit)' },
    ],
  },
  ZA: {
    title: 'South Africa Standard (EAN-13)',
    details: [
      { key: 'Format',        value: '13-digit EAN-13' },
      { key: 'Country Prefix', value: '600-601' },
      { key: 'Standard Size',  value: '38mm × 25mm' },
      { key: 'Usage',          value: 'Retail products in South Africa' },
      { key: 'Example',        value: '60XXXXXXXXXXX✓ (12 digits + 1 check digit)' },
    ],
  },
};

// Exact port of PHP calculateEAN13CheckDigit()
export function calculateEAN13CheckDigit(barcode12) {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(barcode12[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  return (10 - (sum % 10)) % 10;
}

// Exact port of PHP generateZimbabweEAN13()
export function generateZimbabweEAN13() {
  const prefix = '977';
  const random = String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0');
  const barcode12 = prefix + random;
  const checkDigit = calculateEAN13CheckDigit(barcode12);
  return barcode12 + String(checkDigit);
}

// Generates EAN-13 for any country (ports PHP generateEAN13())
export function generateEAN13(countryCode = 'ZW') {
  const standard = COUNTRY_STANDARDS[countryCode] ?? COUNTRY_STANDARDS.ZW;
  const prefixStr = standard.prefix;

  let prefixNum;
  if (prefixStr.includes('-')) {
    const [start, end] = prefixStr.split('-').map(Number);
    prefixNum = Math.floor(Math.random() * (end - start + 1)) + start;
  } else {
    prefixNum = parseInt(prefixStr, 10);
  }

  const prefix = String(prefixNum).padStart(3, '0');
  const unique = String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0');
  const barcode12 = prefix + unique;
  const checkDigit = calculateEAN13CheckDigit(barcode12);
  return barcode12 + String(checkDigit);
}

// Format EAN-13 display: "9 771234 567890" style
export function formatEAN13Display(barcode) {
  if (barcode && barcode.length === 13) {
    return `${barcode[0]}    ${barcode.slice(1, 7)}    ${barcode.slice(7)}`;
  }
  return barcode;
}

export const VARIATION_EXAMPLES = {
  weight:  'e.g., 200g, 500g, 1kg, 2.5kg',
  volume:  'e.g., 250ml, 500ml, 1L, 2L',
  flavor:  'e.g., Strawberry, Chocolate, Vanilla, Mixed',
  color:   'e.g., Red, Green, Yellow, Blue',
  mixture: 'e.g., Broccoli/Cauliflower Mix, Fruit Salad Mix',
  other:   'e.g., Organic, Premium, Family Pack',
};
