/**
 * Telegram Receipt & SMS Screenshot Generator
 * Generates ultra-realistic SVG Data URLs replicating the authentic images from Screenshot_20260915-145508.png:
 * 1. SMS Notification Screenshot:
 *    - Top Android status / header with "Unread • Today • 2:21 PM"
 *    - Authentic CBE SMS copy: "Dear [Name] You have received ETB [Amount] from account [PayerAccount] ([PayerName]) into your account [ReceiverAccount]..."
 *    - Feedback link and mreceipt URL
 *    - Bottom Android soft navigation bar
 * 2. Mobile Browser CBE Web Receipt Screenshot:
 *    - Top Chrome/Phoenix browser URL bar: "apps.cbe.com.et:100/?id=[Ref]" with lock icon and refresh
 *    - Commercial Bank of Ethiopia header & customer info
 *    - Payment / Transaction Informations table (Payer, Account, Receiver, Account, Date, Ref, Amount)
 *    - Official CBE Purple Circular Rubber Stamp with Ethiopian & English text and CBE crest!
 *    - Bottom PDF download button
 */

export interface TransactionMockData {
  payerName?: string;
  payerAccount?: string;
  receiverName: string;
  receiverAccount?: string;
  amount: number;
  balance?: number;
  referenceNo?: string;
  dateTimeStr?: string;
  bankName?: string;
}

// Generate the authentic CBE purple rubber stamp SVG markup
export function generateCbeRubberStampSvg(): string {
  return `
    <g transform="translate(190, 480) rotate(-14)">
      <!-- Double outer purple ink circle -->
      <circle cx="0" cy="0" r="78" fill="none" stroke="%23461066" stroke-width="4.5" stroke-dasharray="120, 2" opacity="0.9" />
      <circle cx="0" cy="0" r="72" fill="none" stroke="%23461066" stroke-width="2" opacity="0.85" />
      
      <!-- Upper Amharic arc text -->
      <path id="stamp-arc-top" d="M -58,0 A 58,58 0 0,1 58,0" fill="none" />
      <text font-size="12" font-family="'Nyala', 'Geez', sans-serif" font-weight="900" fill="%23461066" letter-spacing="1.5">
        <textPath href="%23stamp-arc-top" startOffset="50%" text-anchor="middle">የኢትዮጵያ ንግድ ባንክ</textPath>
      </text>

      <!-- Lower English arc text -->
      <path id="stamp-arc-bot" d="M -58,0 A 58,58 0 0,0 58,0" fill="none" />
      <text font-size="8.5" font-family="sans-serif" font-weight="900" fill="%23461066" letter-spacing="0.8">
        <textPath href="%23stamp-arc-bot" startOffset="50%" text-anchor="middle">COMMERCIAL BANK OF ETHIOPIA • 9.1.6</textPath>
      </text>

      <!-- Inner boundary ring -->
      <circle cx="0" cy="0" r="46" fill="none" stroke="%23461066" stroke-width="2.2" opacity="0.9" />

      <!-- Center tilted oval medallion & CBE letters -->
      <ellipse cx="0" cy="-4" rx="28" ry="18" fill="none" stroke="%23461066" stroke-width="2" transform="rotate(-15)" />
      <text x="0" y="2" font-size="16" font-family="'Impact', 'Arial Black', sans-serif" font-weight="900" fill="%23461066" text-anchor="middle">CBE</text>

      <!-- Realistic ink splatter dots -->
      <circle cx="-18" cy="18" r="1.5" fill="%23461066" opacity="0.7"/>
      <circle cx="24" cy="-14" r="1.2" fill="%23461066" opacity="0.6"/>
      <circle cx="34" cy="22" r="1.8" fill="%23461066" opacity="0.65"/>
      <circle cx="-32" cy="-20" r="1.4" fill="%23461066" opacity="0.75"/>
    </g>
  `;
}

/**
 * Generate SMS Notification Screenshot (Left image in user screenshot)
 */
export function generateSmsScreenshotDataUrl(data: TransactionMockData): string {
  const payer = data.payerName || 'Global Online Market';
  const payerAcc = data.payerAccount || '*******6671';
  const receiver = data.receiverName || 'Leul Degsew Alemayehu';
  const receiverAcc = data.receiverAccount || '1********6450';
  const amountStr = Number(data.amount || 200000).toFixed(2);
  const balanceVal = data.balance ? Number(data.balance) : (Number(data.amount || 200000) + 1000);
  const balanceStr = Number(balanceVal).toFixed(2);
  const ref = data.referenceNo || 'FT267561AI79';
  const timeStr = data.dateTimeStr || '2:21 PM';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="640" viewBox="0 0 360 640">
    <defs>
      <linearGradient id="smsBg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="%23f8fafc"/>
        <stop offset="100%" stop-color="%23eef2f6"/>
      </linearGradient>
    </defs>
    
    <!-- Phone Screen Background -->
    <rect width="360" height="640" fill="url(%23smsBg)"/>

    <!-- App Header Divider / Date pill -->
    <rect x="0" y="0" width="360" height="42" fill="%23f1f5f9" opacity="0.8"/>
    <text x="180" y="26" fill="%2364748b" font-size="12" font-family="sans-serif" font-weight="600" text-anchor="middle">Unread</text>
    <line x1="20" y1="48" x2="140" y2="48" stroke="%23cbd5e1" stroke-width="1"/>
    <text x="180" y="52" fill="%2364748b" font-size="11" font-family="sans-serif" text-anchor="middle">Today • ${timeStr}</text>
    <line x1="220" y1="48" x2="340" y2="48" stroke="%23cbd5e1" stroke-width="1"/>

    <!-- SMS Message Card Bubble -->
    <g transform="translate(14, 75)">
      <rect width="332" height="410" rx="14" fill="%23ffffff" stroke="%23e2e8f0" stroke-width="1" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.04))"/>
      
      <!-- SMS Body Text -->
      <text x="16" y="32" fill="%231e293b" font-size="14" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="500">
        <tspan x="16" dy="0">Dear <tspan font-weight="700">${receiver}</tspan> You have</tspan>
        <tspan x="16" dy="22">received <tspan font-weight="800">ETB ${amountStr}</tspan> from account</tspan>
        <tspan x="16" dy="22"><tspan font-weight="700">${payerAcc}</tspan> (${payer})</tspan>
        <tspan x="16" dy="22">into your account <tspan font-weight="700">${receiverAcc}</tspan>. Your</tspan>
        <tspan x="16" dy="22">current balance is <tspan font-weight="700">ETB${balanceStr}</tspan>.</tspan>
        <tspan x="16" dy="24">Thanks for Banking with CBE.</tspan>
      </text>

      <!-- Links section -->
      <text x="16" y="200" font-size="13" font-family="sans-serif">
        <tspan x="16" dy="0" fill="%230284c7" text-decoration="underline">https://mreceipt.cbe.com.et/v2-hfHCx</tspan>
        <tspan x="16" dy="20" fill="%230284c7" text-decoration="underline">/${ref}</tspan>
        <tspan x="16" dy="24" fill="%23475569">for feedback:</tspan>
        <tspan x="16" dy="22" fill="%230284c7" text-decoration="underline">https://forms.gle/kGNGQpG3mQCCk3iD</tspan>
      </text>

      <!-- Timestamp inside SMS bubble -->
      <text x="316" y="390" fill="%2394a3b8" font-size="11" font-family="sans-serif" text-anchor="end">${timeStr}</text>
    </g>

    <!-- Bottom Ethio Telecom footer notice -->
    <g transform="translate(14, 500)">
      <text x="166" y="20" fill="%2364748b" font-size="11" font-family="sans-serif" text-anchor="middle">
        <tspan>${timeStr} • Ethio telecom</tspan>
      </text>
      <rect x="10" y="36" width="312" height="42" rx="8" fill="%23f8fafc" stroke="%23e2e8f0"/>
      <text x="166" y="54" fill="%23475569" font-size="10.5" font-family="sans-serif" text-anchor="middle">
        <tspan x="166" dy="0">Sender can't accept replies. Contact them directly.</tspan>
        <tspan x="166" dy="16" fill="%230284c7" text-decoration="underline" font-weight="600">Learn more</tspan>
      </text>
    </g>

    <!-- Android Bottom System Navigation Bar -->
    <g transform="translate(0, 598)">
      <rect width="360" height="42" fill="%23f1f5f9"/>
      <!-- Square / Circle / Back Triangle -->
      <rect x="68" y="14" width="14" height="14" rx="2" fill="none" stroke="%2394a3b8" stroke-width="2"/>
      <circle cx="180" cy="21" r="8" fill="none" stroke="%2394a3b8" stroke-width="2"/>
      <path d="M 285,14 L 273,21 L 285,28 Z" fill="none" stroke="%2394a3b8" stroke-width="2"/>
    </g>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Generate Mobile Web Receipt Screenshot (Right image in user screenshot)
 */
export function generateCbeWebReceiptScreenshotDataUrl(data: TransactionMockData): string {
  const payer = data.payerName || 'Global Online Market';
  const payerAcc = data.payerAccount || '1****6671';
  const receiver = data.receiverName || 'Leul Degsew Alemayehu';
  const receiverAcc = data.receiverAccount || '1****6450';
  const amountStr = Number(data.amount || 200000).toFixed(2);
  const ref = data.referenceNo || 'FT267561AI79';
  const dateStr = data.dateTimeStr || 'Sep 11, 2026, 2:21 PM';

  const stampSvg = generateCbeRubberStampSvg();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="640" viewBox="0 0 360 640">
    <!-- White background -->
    <rect width="360" height="640" fill="%23ffffff"/>

    <!-- Mobile Browser Chrome URL Bar -->
    <rect width="360" height="48" fill="%231e293b"/>
    <g transform="translate(12, 8)">
      <rect width="336" height="32" rx="16" fill="%230f172a"/>
      <!-- Lock Icon -->
      <path d="M12 18 v-3 a3 3 0 0 1 6 0 v3 m-7 0 h8 a2 2 0 0 1 2 2 v6 a2 2 0 0 1 -2 2 h-8 a2 2 0 0 1 -2 -2 v-6 a2 2 0 0 1 2 -2" stroke="%2394a3b8" stroke-width="1.6" fill="none"/>
      <text x="28" y="21" fill="%23e2e8f0" font-size="12" font-family="sans-serif">apps.cbe.com.et:100/?id=${ref.substring(0, 7)}...</text>
      <!-- Refresh Icon -->
      <g transform="translate(310, 8)">
        <circle cx="8" cy="8" r="6" fill="none" stroke="%2394a3b8" stroke-width="1.8" stroke-dasharray="28, 6"/>
        <path d="M14 6 l2 2 l-2 2" fill="%2394a3b8"/>
      </g>
    </g>

    <!-- CBE Receipt Document Container -->
    <g transform="translate(10, 56)">
      <!-- Top header table -->
      <text x="4" y="20" fill="%231e293b" font-size="14" font-family="sans-serif" font-weight="900">Commercial Bank of Ethiopia</text>
      <text x="4" y="34" fill="%2364748b" font-size="10" font-family="sans-serif">(CBE)</text>

      <!-- Customer details table -->
      <g transform="translate(0, 42)">
        <text x="4" y="12" fill="%23334155" font-size="9" font-family="sans-serif">Country: Ethiopia</text>
        <text x="170" y="12" fill="%23334155" font-size="9" font-family="sans-serif" font-weight="bold">Customer: ${payer}</text>
        <text x="4" y="24" fill="%23334155" font-size="9" font-family="sans-serif">City: Addis Ababa</text>
        <text x="170" y="24" fill="%23334155" font-size="9" font-family="sans-serif">Region: Addis Ababa</text>
        <text x="4" y="36" fill="%23334155" font-size="8.5" font-family="sans-serif">Address: Ras Desta Damtew St, 01, Kirkos</text>
        <text x="4" y="48" fill="%23334155" font-size="8.5" font-family="sans-serif">Postal code: 255 | Branch: Gulele</text>
        <text x="4" y="60" fill="%23334155" font-size="8.5" font-family="sans-serif">SWIFT Code: CBETETAA</text>
        <text x="170" y="60" fill="%23334155" font-size="8.5" font-family="sans-serif" font-weight="bold">Receipt: ${ref}</text>
      </g>

      <!-- Payment / Transaction Informations Header -->
      <rect x="0" y="120" width="340" height="24" fill="%23f1f5f9"/>
      <text x="170" y="136" fill="%230f172a" font-size="11" font-family="sans-serif" font-weight="bold" text-anchor="middle">Payment / Transaction Informations</text>

      <!-- Details Rows -->
      <g transform="translate(8, 154)">
        <!-- Row 1: Payer -->
        <text x="0" y="0" fill="%2364748b" font-size="9" font-family="sans-serif">Payer:</text>
        <text x="210" y="0" fill="%230f172a" font-size="9" font-family="sans-serif" font-weight="bold">${payer}</text>

        <!-- Row 2: Payer Account -->
        <text x="0" y="18" fill="%2364748b" font-size="9" font-family="sans-serif">Account:</text>
        <text x="210" y="18" fill="%230f172a" font-size="9" font-family="sans-serif" font-weight="bold">${payerAcc}</text>

        <!-- Row 3: Receiver -->
        <text x="0" y="36" fill="%2364748b" font-size="9" font-family="sans-serif">Receiver:</text>
        <text x="210" y="36" fill="%230f172a" font-size="9" font-family="sans-serif" font-weight="bold">${receiver}</text>

        <!-- Row 4: Receiver Account -->
        <text x="0" y="54" fill="%2364748b" font-size="9" font-family="sans-serif">Account:</text>
        <text x="210" y="54" fill="%230f172a" font-size="9" font-family="sans-serif" font-weight="bold">${receiverAcc}</text>

        <!-- Row 5: Payment Type -->
        <text x="0" y="72" fill="%2364748b" font-size="9" font-family="sans-serif">Payment Type:</text>
        <text x="210" y="72" fill="%230f172a" font-size="9" font-family="sans-serif" font-weight="bold">A2A (Account to Account)</text>

        <!-- Row 6: Payment Date & Time -->
        <text x="0" y="90" fill="%2364748b" font-size="9" font-family="sans-serif">Payment Date &amp; Time:</text>
        <text x="210" y="90" fill="%230f172a" font-size="9" font-family="sans-serif" font-weight="bold">${dateStr}</text>

        <!-- Row 7: Reference No. -->
        <text x="0" y="108" fill="%2364748b" font-size="9" font-family="sans-serif">Reference No.:</text>
        <text x="210" y="108" fill="%230f172a" font-size="9" font-family="sans-serif" font-weight="bold">${ref}</text>

        <!-- Row 8: Transferred Amount -->
        <text x="0" y="132" fill="%230f172a" font-size="10" font-family="sans-serif" font-weight="bold">Transferred Amount:</text>
        <text x="210" y="132" fill="%230f172a" font-size="11" font-family="sans-serif" font-weight="900">${amountStr} ETB</text>

        <!-- Row 9: Service Charge & VAT -->
        <text x="0" y="152" fill="%2364748b" font-size="8.5" font-family="sans-serif">Service Charge (inc. VAT):</text>
        <text x="210" y="152" fill="%23334155" font-size="9" font-family="sans-serif">3.00 ETB</text>
      </g>
    </g>

    <!-- Authentic Circular Purple Rubber Stamp Overlay -->
    ${stampSvg}

    <!-- Bottom Download Button -->
    <g transform="translate(100, 580)">
      <rect width="160" height="34" rx="17" fill="%237e22ce"/>
      <path d="M60 14 l0 8 m-4 -4 l4 4 l4 -4 m-6 8 h12" stroke="%23ffffff" stroke-width="2" fill="none" stroke-linecap="round"/>
      <text x="76" y="22" fill="%23ffffff" font-size="12" font-family="sans-serif" font-weight="bold">Download</text>
    </g>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Generate Default Leul Seged Avatar Data URL matching the screenshot
 */
export function getLeulSegedAvatarDataUrl(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
    <defs>
      <linearGradient id="avBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="%23ef4444"/>
        <stop offset="50%" stop-color="%23f97316"/>
        <stop offset="100%" stop-color="%232563eb"/>
      </linearGradient>
      <clipPath id="circleClip">
        <circle cx="60" cy="60" r="54"/>
      </clipPath>
    </defs>
    <!-- Border ring badge with colors matching screenshot banner -->
    <circle cx="60" cy="60" r="58" fill="url(%23avBg)"/>
    <circle cx="60" cy="60" r="54" fill="%23ffffff"/>
    
    <!-- Avatar inner -->
    <g clip-path="url(%23circleClip)">
      <rect width="120" height="120" fill="%23f8fafc"/>
      <!-- Stylized head and body silhouette with warm skin tone -->
      <circle cx="60" cy="48" r="26" fill="%23d97706"/>
      <ellipse cx="60" cy="100" rx="38" ry="30" fill="%231e293b"/>
      <!-- Ethiopian Flag Ribbon Accent -->
      <rect x="0" y="104" width="120" height="6" fill="%2316a34a"/>
      <rect x="0" y="110" width="120" height="6" fill="%23eab308"/>
      <rect x="0" y="116" width="120" height="6" fill="%23dc2626"/>
      <!-- Text badge overlay -->
      <rect x="18" y="70" width="84" height="18" rx="4" fill="%23dc2626" opacity="0.9"/>
      <text x="60" y="83" fill="%23ffffff" font-size="9" font-family="'Nyala', sans-serif" font-weight="900" text-anchor="middle">ተሸላሚው እኔ ነኝ</text>
    </g>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Generate GOM Customer Service (Global Online Market) Avatar
 * Replicating the authentic circular blue & gold logo from Screenshot_20260915-151140.png
 */
export function getGOMAvatarDataUrl(): string {
  // Generate 24 gear teeth around the perimeter
  const teeth = Array.from({ length: 24 })
    .map((_, i) => `<rect x="58" y="1" width="4" height="6" rx="1.5" fill="%23fbbf24" transform="rotate(${i * 15} 60 60)"/>`)
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
    <defs>
      <linearGradient id="gomGold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="%23fde047"/>
        <stop offset="50%" stop-color="%23f59e0b"/>
        <stop offset="100%" stop-color="%23b45309"/>
      </linearGradient>
      <linearGradient id="gomBlue" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="%23112d54"/>
        <stop offset="100%" stop-color="%2309192f"/>
      </linearGradient>
      <path id="textArcTop" d="M 20,60 A 40,40 0 0,1 100,60" fill="none"/>
      <path id="textArcBottom" d="M 22,60 A 38,38 0 0,0 98,60" fill="none"/>
    </defs>

    <!-- Outer Gold Gear Ring Teeth -->
    ${teeth}

    <!-- Outer Gold Border -->
    <circle cx="60" cy="60" r="56" fill="url(%23gomGold)"/>
    <circle cx="60" cy="60" r="51.5" fill="url(%23gomBlue)"/>
    <circle cx="60" cy="60" r="47" fill="none" stroke="%23fbbf24" stroke-width="1.2" stroke-dasharray="3, 2"/>

    <!-- Arc text TOP: GLOBAL ONLINE MARKET -->
    <text font-size="7.5" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" fill="%23fbbf24" letter-spacing="0.8">
      <textPath href="%23textArcTop" startOffset="50%" text-anchor="middle">GLOBAL ONLINE MARKET</textPath>
    </text>

    <!-- Center Globe Wireframe (meridian and parallel lines) -->
    <g transform="translate(60, 60)" stroke="%2338bdf8" stroke-width="1" fill="none" opacity="0.85">
      <circle cx="0" cy="0" r="23" stroke="%23fbbf24" stroke-width="1.5"/>
      <ellipse cx="0" cy="0" rx="23" ry="11" />
      <ellipse cx="0" cy="0" rx="12" ry="23" />
      <line x1="-23" y1="0" x2="23" y2="0" />
      <line x1="0" y1="-23" x2="0" y2="23" />
    </g>

    <!-- Center GOM Monogram Plaque -->
    <rect x="30" y="52" width="60" height="18" rx="5" fill="%2309192f" stroke="%23fbbf24" stroke-width="1.8"/>
    <text x="60" y="66" fill="%23fbbf24" font-size="14" font-family="'Impact', 'Arial Black', sans-serif" font-weight="900" text-anchor="middle" letter-spacing="2">GOM</text>

    <!-- Arc text BOTTOM: SHOP • EARN • GROW -->
    <text font-size="6.5" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" fill="%23fef08a" letter-spacing="0.8">
      <textPath href="%23textArcBottom" startOffset="50%" text-anchor="middle">★ SHOP • EARN • GROW ★</textPath>
    </text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Generate GOM Order Task Page Screenshot
 */
export function generateGomOrderTaskScreenshot(orderIndex: number = 1, totalOrders: number = 15): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="520" viewBox="0 0 360 520">
    <defs>
      <linearGradient id="gomHeader" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="%231e3a8a"/>
        <stop offset="100%" stop-color="%230f172a"/>
      </linearGradient>
    </defs>
    <rect width="360" height="520" fill="%23f8fafc"/>
    <rect width="360" height="56" fill="url(%23gomHeader)"/>
    <text x="20" y="34" fill="%23fbbf24" font-size="14" font-family="sans-serif" font-weight="800">GLOBAL ONLINE MARKET</text>
    <text x="340" y="34" fill="%23ffffff" font-size="12" font-family="sans-serif" text-anchor="end">Order Cycle: ${orderIndex}/${totalOrders}</text>
    
    <g transform="translate(16, 70)">
      <rect width="328" height="74" rx="12" fill="%23ffffff" stroke="%23e2e8f0" stroke-width="1"/>
      <text x="16" y="26" fill="%2364748b" font-size="11" font-family="sans-serif">Current Assignment Progress</text>
      <text x="312" y="26" fill="%232563eb" font-size="12" font-family="sans-serif" font-weight="700" text-anchor="end">${orderIndex} of ${totalOrders} Orders</text>
      <rect x="16" y="38" width="296" height="8" rx="4" fill="%23e2e8f0"/>
      <rect x="16" y="38" width="${Math.max(20, (orderIndex / totalOrders) * 296)}" height="8" rx="4" fill="%233b82f6"/>
      <text x="16" y="60" fill="%2394a3b8" font-size="10" font-family="sans-serif">System generated automatic matching</text>
    </g>

    <g transform="translate(16, 158)">
      <rect width="328" height="250" rx="14" fill="%23ffffff" stroke="%23cbd5e1" stroke-width="1"/>
      <rect x="16" y="16" width="96" height="22" rx="6" fill="%23dbeafe"/>
      <text x="64" y="31" fill="%231d4ed8" font-size="9.5" font-family="sans-serif" font-weight="700" text-anchor="middle">ASSIGNED ORDER</text>
      
      <text x="16" y="62" fill="%231e293b" font-size="14" font-family="sans-serif" font-weight="800">Digital Product Review &amp; Boost</text>
      <text x="16" y="80" fill="%2364748b" font-size="11" font-family="sans-serif">Order ID: ORD-20260915-${1000 + orderIndex}</text>

      <line x1="16" y1="96" x2="312" y2="96" stroke="%23f1f5f9" stroke-width="1.5"/>

      <text x="16" y="122" fill="%2364748b" font-size="12" font-family="sans-serif">Order Value:</text>
      <text x="312" y="122" fill="%230f172a" font-size="13" font-family="sans-serif" font-weight="700" text-anchor="end">ETB ${(1200 + orderIndex * 450).toLocaleString('en-US')}.00</text>

      <text x="16" y="152" fill="%2364748b" font-size="12" font-family="sans-serif">Commission Rate:</text>
      <text x="312" y="152" fill="%2316a34a" font-size="13" font-family="sans-serif" font-weight="700" text-anchor="end">15.0%</text>

      <text x="16" y="182" fill="%2364748b" font-size="12" font-family="sans-serif">Estimated Earning:</text>
      <text x="312" y="182" fill="%232563eb" font-size="14" font-family="sans-serif" font-weight="800" text-anchor="end">+ETB ${(180 + orderIndex * 67.5).toFixed(2)}</text>

      <rect x="16" y="200" width="296" height="38" rx="8" fill="%232563eb"/>
      <text x="164" y="224" fill="%23ffffff" font-size="13" font-family="sans-serif" font-weight="700" text-anchor="middle">Confirm &amp; Submit Order</text>
    </g>

    <text x="180" y="440" fill="%2394a3b8" font-size="10" font-family="sans-serif" text-anchor="middle">Review order details carefully before confirming.</text>
    <rect x="0" y="470" width="360" height="50" fill="%23ffffff" stroke="%23e2e8f0" stroke-width="1"/>
    <text x="45" y="500" fill="%2394a3b8" font-size="10" font-family="sans-serif" text-anchor="middle">Home</text>
    <text x="135" y="500" fill="%232563eb" font-size="10" font-family="sans-serif" font-weight="700" text-anchor="middle">● Orders</text>
    <text x="225" y="500" fill="%2394a3b8" font-size="10" font-family="sans-serif" text-anchor="middle">History</text>
    <text x="315" y="500" fill="%2394a3b8" font-size="10" font-family="sans-serif" text-anchor="middle">Wallet</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Generate GOM Order History Page Screenshot
 */
export function generateGomOrderHistoryScreenshot(completedCount: number = 1, totalOrders: number = 15): string {
  const isFinal = completedCount >= totalOrders;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="560" viewBox="0 0 360 560">
    <defs>
      <linearGradient id="histHeader" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="%230f284e"/>
        <stop offset="100%" stop-color="%231e3a8a"/>
      </linearGradient>
    </defs>
    <rect width="360" height="560" fill="%23f1f5f9"/>
    <rect width="360" height="54" fill="url(%23histHeader)"/>
    <text x="20" y="34" fill="%23ffffff" font-size="14" font-family="sans-serif" font-weight="700">Order History</text>
    <text x="340" y="34" fill="%23fbbf24" font-size="11" font-family="sans-serif" text-anchor="end">Cycle 1 (Sep 15)</text>

    <g transform="translate(16, 68)">
      <rect width="328" height="64" rx="10" fill="${isFinal ? '%23dcfce7' : '%23ffffff'}" stroke="${isFinal ? '%2386efac' : '%23cbd5e1'}" stroke-width="1"/>
      <text x="16" y="26" fill="${isFinal ? '%2315803d' : '%230f172a'}" font-size="13" font-family="sans-serif" font-weight="800">
        ${isFinal ? '🎉 All 15 Orders Completed!' : `Progress: ${completedCount} of ${totalOrders} Completed`}
      </text>
      <text x="16" y="48" fill="%2364748b" font-size="11" font-family="sans-serif">
        Total Commission Earned: ETB ${(completedCount * 1233.33).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </text>
    </g>

    ${[1, 2, 3].map((num, i) => {
      const isDone = num <= completedCount;
      const y = 146 + i * 92;
      return `
        <g transform="translate(16, ${y})">
          <rect width="328" height="82" rx="10" fill="%23ffffff" stroke="%23e2e8f0" stroke-width="1"/>
          <text x="14" y="24" fill="%231e293b" font-size="12" font-family="sans-serif" font-weight="700">Order #${num} - Digital Task</text>
          <rect x="242" y="10" width="72" height="20" rx="6" fill="${isDone ? '%23dcfce7' : '%23fef3c7'}"/>
          <text x="278" y="24" fill="${isDone ? '%2315803d' : '%23b45309'}" font-size="9.5" font-family="sans-serif" font-weight="700" text-anchor="middle">
            ${isDone ? '✓ Completed' : 'Pending'}
          </text>
          <text x="14" y="46" fill="%2364748b" font-size="11" font-family="sans-serif">Amount: ETB ${(1200 + num * 450).toLocaleString('en-US')}.00</text>
          <text x="14" y="66" fill="%2316a34a" font-size="11" font-family="sans-serif" font-weight="700">Commission: +ETB ${(180 + num * 67.5).toFixed(2)}</text>
          <text x="314" y="66" fill="%2394a3b8" font-size="10" font-family="sans-serif" text-anchor="end">2026-09-15</text>
        </g>
      `;
    }).join('')}

    <rect x="0" y="510" width="360" height="50" fill="%23ffffff" stroke="%23e2e8f0" stroke-width="1"/>
    <text x="45" y="540" fill="%2394a3b8" font-size="10" font-family="sans-serif" text-anchor="middle">Home</text>
    <text x="135" y="540" fill="%2394a3b8" font-size="10" font-family="sans-serif" text-anchor="middle">Orders</text>
    <text x="225" y="540" fill="%232563eb" font-size="10" font-family="sans-serif" font-weight="700" text-anchor="middle">● History</text>
    <text x="315" y="540" fill="%2394a3b8" font-size="10" font-family="sans-serif" text-anchor="middle">Wallet</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Generate GOM Tutorial Screenshot
 */
export function generateGomTutorialScreenshot(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="500" viewBox="0 0 360 500">
    <defs>
      <linearGradient id="tutGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="%231e3a8a"/>
        <stop offset="100%" stop-color="%230f172a"/>
      </linearGradient>
    </defs>
    <rect width="360" height="500" fill="%230f172a"/>
    <rect x="10" y="10" width="340" height="480" rx="16" fill="%23f8fafc"/>
    <rect x="10" y="10" width="340" height="46" rx="16" fill="url(%23tutGrad)"/>
    <text x="30" y="38" fill="%23fbbf24" font-size="13" font-family="sans-serif" font-weight="800">GOM PLATFORM GUIDE</text>
    
    <g transform="translate(26, 70)">
      <rect width="308" height="340" rx="12" fill="%23ffffff" stroke="%23cbd5e1" stroke-width="1"/>
      <text x="20" y="34" fill="%231e293b" font-size="14" font-family="sans-serif" font-weight="800">How to find your Order History</text>
      <text x="20" y="60" fill="%2364748b" font-size="12" font-family="sans-serif">1. Look at the bottom navigation menu.</text>
      <text x="20" y="85" fill="%2364748b" font-size="12" font-family="sans-serif">2. Tap the highlighted "Order History" icon.</text>
      <text x="20" y="110" fill="%2364748b" font-size="12" font-family="sans-serif">3. View all completed assignments &amp; profit.</text>

      <g transform="translate(154, 210)">
        <path d="M 0,-30 L 0,40" stroke="%23ef4444" stroke-width="3" stroke-dasharray="6,4"/>
        <polygon points="-8,40 8,40 0,56" fill="%23ef4444"/>
        <rect x="-80" y="-70" width="160" height="32" rx="6" fill="%23ef4444"/>
        <text x="0" y="-50" fill="%23ffffff" font-size="11" font-family="sans-serif" font-weight="700" text-anchor="middle">Tap Order History Here</text>
      </g>
    </g>

    <rect x="10" y="430" width="340" height="60" rx="16" fill="%23ffffff" stroke="%23cbd5e1" stroke-width="1"/>
    <text x="50" y="465" fill="%2394a3b8" font-size="10" font-family="sans-serif" text-anchor="middle">Home</text>
    <text x="125" y="465" fill="%2394a3b8" font-size="10" font-family="sans-serif" text-anchor="middle">Orders</text>
    
    <rect x="165" y="440" width="76" height="40" rx="10" fill="%23fee2e2" stroke="%23ef4444" stroke-width="2"/>
    <text x="203" y="464" fill="%23b91c1c" font-size="10" font-family="sans-serif" font-weight="800" text-anchor="middle">★ History</text>

    <text x="290" y="465" fill="%2394a3b8" font-size="10" font-family="sans-serif" text-anchor="middle">Wallet</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Generate GOM Account Summary Screenshot
 */
export function generateGomAccountSummaryScreenshot(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="520" viewBox="0 0 360 520">
    <defs>
      <linearGradient id="walletCard" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="%231e3a8a"/>
        <stop offset="100%" stop-color="%23091322"/>
      </linearGradient>
    </defs>
    <rect width="360" height="520" fill="%23f8fafc"/>
    <rect width="360" height="52" fill="%230f172a"/>
    <text x="20" y="32" fill="%23ffffff" font-size="14" font-family="sans-serif" font-weight="700">Account Summary</text>
    <text x="340" y="32" fill="%23fbbf24" font-size="11" font-family="sans-serif" text-anchor="end">VIP Level 2</text>

    <g transform="translate(16, 68)">
      <rect width="328" height="154" rx="16" fill="url(%23walletCard)"/>
      <text x="20" y="32" fill="%2394a3b8" font-size="11" font-family="sans-serif">Total Account Assets (ETB)</text>
      <text x="20" y="68" fill="%23ffffff" font-size="28" font-family="sans-serif" font-weight="800">200,000.00</text>
      <text x="20" y="92" fill="%2334d399" font-size="11" font-family="sans-serif">● All 15 Cycle Orders Cleared</text>
      
      <line x1="20" y1="108" x2="308" y2="108" stroke="%23334155" stroke-width="1"/>
      
      <text x="20" y="132" fill="%2394a3b8" font-size="11" font-family="sans-serif">Available Balance:</text>
      <text x="130" y="132" fill="%23fbbf24" font-size="12" font-family="sans-serif" font-weight="700">ETB 200,000.00</text>
      
      <text x="200" y="132" fill="%2394a3b8" font-size="11" font-family="sans-serif">Profit:</text>
      <text x="308" y="132" fill="%2334d399" font-size="12" font-family="sans-serif" font-weight="700" text-anchor="end">+18,500.00</text>
    </g>

    <g transform="translate(16, 238)">
      <rect width="328" height="180" rx="14" fill="%23ffffff" stroke="%23cbd5e1" stroke-width="1"/>
      
      <text x="16" y="32" fill="%2364748b" font-size="12" font-family="sans-serif">User ID:</text>
      <text x="312" y="32" fill="%230f172a" font-size="12" font-family="sans-serif" font-weight="700" text-anchor="end">GOM-8827163</text>
      
      <line x1="16" y1="48" x2="312" y2="48" stroke="%23f1f5f9" stroke-width="1"/>

      <text x="16" y="76" fill="%2364748b" font-size="12" font-family="sans-serif">Account Name:</text>
      <text x="312" y="76" fill="%230f172a" font-size="12" font-family="sans-serif" font-weight="700" text-anchor="end">Leul Degsew Alemayehu</text>

      <line x1="16" y1="92" x2="312" y2="92" stroke="%23f1f5f9" stroke-width="1"/>

      <text x="16" y="120" fill="%2364748b" font-size="12" font-family="sans-serif">Bound Bank:</text>
      <text x="312" y="120" fill="%230f172a" font-size="12" font-family="sans-serif" font-weight="700" text-anchor="end">Commercial Bank of Ethiopia (CBE)</text>

      <line x1="16" y1="136" x2="312" y2="136" stroke="%23f1f5f9" stroke-width="1"/>

      <text x="16" y="162" fill="%2364748b" font-size="12" font-family="sans-serif">Account Number:</text>
      <text x="312" y="162" fill="%230f172a" font-size="12" font-family="sans-serif" font-weight="700" text-anchor="end">1000638276450</text>
    </g>

    <g transform="translate(16, 434)">
      <rect width="156" height="42" rx="10" fill="%232563eb"/>
      <text x="78" y="26" fill="%23ffffff" font-size="12" font-family="sans-serif" font-weight="700" text-anchor="middle">Withdraw Funds</text>
      
      <rect x="172" y="0" width="156" height="42" rx="10" fill="%23ffffff" stroke="%23cbd5e1" stroke-width="1"/>
      <text x="250" y="26" fill="%230f172a" font-size="12" font-family="sans-serif" font-weight="700" text-anchor="middle">History Records</text>
    </g>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Generate GOM Withdrawal Request Page Screenshot
 */
export function generateGomWithdrawalFormScreenshot(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="520" viewBox="0 0 360 520">
    <rect width="360" height="520" fill="%23f8fafc"/>
    <rect width="360" height="52" fill="%231e3a8a"/>
    <text x="20" y="32" fill="%23ffffff" font-size="14" font-family="sans-serif" font-weight="700">Wallet → Withdraw</text>

    <g transform="translate(16, 68)">
      <rect width="328" height="380" rx="14" fill="%23ffffff" stroke="%23cbd5e1" stroke-width="1"/>

      <text x="16" y="28" fill="%2364748b" font-size="11" font-family="sans-serif">Withdrawal Method:</text>
      <rect x="16" y="38" width="296" height="38" rx="8" fill="%23f1f5f9" stroke="%23cbd5e1" stroke-width="1"/>
      <text x="28" y="62" fill="%230f172a" font-size="12" font-family="sans-serif" font-weight="700">Commercial Bank of Ethiopia (CBE)</text>

      <text x="16" y="100" fill="%2364748b" font-size="11" font-family="sans-serif">Account Holder Name:</text>
      <rect x="16" y="110" width="296" height="38" rx="8" fill="%23f1f5f9" stroke="%23cbd5e1" stroke-width="1"/>
      <text x="28" y="134" fill="%230f172a" font-size="12" font-family="sans-serif" font-weight="700">Leul Degsew Alemayehu</text>

      <text x="16" y="172" fill="%2364748b" font-size="11" font-family="sans-serif">Account Number:</text>
      <rect x="16" y="182" width="296" height="38" rx="8" fill="%23f1f5f9" stroke="%23cbd5e1" stroke-width="1"/>
      <text x="28" y="206" fill="%230f172a" font-size="12" font-family="sans-serif" font-weight="700">1000638276450</text>

      <text x="16" y="244" fill="%2364748b" font-size="11" font-family="sans-serif">Withdrawal Amount (ETB):</text>
      <rect x="16" y="254" width="296" height="38" rx="8" fill="%23f1f5f9" stroke="%23cbd5e1" stroke-width="1"/>
      <text x="28" y="278" fill="%232563eb" font-size="14" font-family="sans-serif" font-weight="800">200,000.00</text>

      <text x="16" y="310" fill="%2394a3b8" font-size="10" font-family="sans-serif">Max limit: ETB 200,000.00 • Handling Fee: 0.00</text>

      <rect x="16" y="326" width="296" height="42" rx="10" fill="%2316a34a"/>
      <text x="164" y="352" fill="%23ffffff" font-size="13" font-family="sans-serif" font-weight="700" text-anchor="middle">Confirm &amp; Submit Withdrawal</text>
    </g>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Generate GOM Withdrawal History Record Screenshot
 */
export function generateGomWithdrawalHistoryScreenshot(status: 'Pending' | 'Completed' = 'Completed'): string {
  const isDone = status === 'Completed';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="520" viewBox="0 0 360 520">
    <rect width="360" height="520" fill="%23f8fafc"/>
    <rect width="360" height="52" fill="%230f172a"/>
    <text x="20" y="32" fill="%23ffffff" font-size="14" font-family="sans-serif" font-weight="700">Wallet → Withdrawal History</text>

    <g transform="translate(16, 70)">
      <rect width="328" height="260" rx="14" fill="%23ffffff" stroke="%23cbd5e1" stroke-width="1"/>
      
      <rect x="236" y="16" width="76" height="24" rx="8" fill="${isDone ? '%23dcfce7' : '%23fef3c7'}"/>
      <text x="274" y="32" fill="${isDone ? '%2315803d' : '%23b45309'}" font-size="11" font-family="sans-serif" font-weight="700" text-anchor="middle">
        ${isDone ? '✓ Completed' : '⏳ Pending'}
      </text>

      <text x="16" y="34" fill="%2364748b" font-size="11" font-family="sans-serif">Withdrawal Record</text>
      <text x="16" y="68" fill="%230f172a" font-size="22" font-family="sans-serif" font-weight="800">ETB 200,000.00</text>

      <line x1="16" y1="88" x2="312" y2="88" stroke="%23f1f5f9" stroke-width="1.5"/>

      <text x="16" y="112" fill="%2364748b" font-size="11" font-family="sans-serif">Transaction Ref:</text>
      <text x="312" y="112" fill="%230f172a" font-size="11" font-family="sans-serif" font-weight="700" text-anchor="end">FT267561AI79</text>

      <text x="16" y="142" fill="%2364748b" font-size="11" font-family="sans-serif">Payout Method:</text>
      <text x="312" y="142" fill="%230f172a" font-size="11" font-family="sans-serif" font-weight="700" text-anchor="end">CBE Direct Transfer</text>

      <text x="16" y="172" fill="%2364748b" font-size="11" font-family="sans-serif">Recipient Account:</text>
      <text x="312" y="172" fill="%230f172a" font-size="11" font-family="sans-serif" font-weight="700" text-anchor="end">1000638276450</text>

      <text x="16" y="202" fill="%2364748b" font-size="11" font-family="sans-serif">Recipient Name:</text>
      <text x="312" y="202" fill="%230f172a" font-size="11" font-family="sans-serif" font-weight="700" text-anchor="end">Leul Degsew Alemayehu</text>

      <text x="16" y="232" fill="%2364748b" font-size="11" font-family="sans-serif">Completed Time:</text>
      <text x="312" y="232" fill="%2316a34a" font-size="11" font-family="sans-serif" font-weight="700" text-anchor="end">2026-09-15 14:18:22</text>
    </g>

    <text x="180" y="360" fill="%2394a3b8" font-size="11" font-family="sans-serif" text-anchor="middle">
      ${isDone ? 'Funds have been credited to your bank account.' : 'Your request is currently being processed by the system.'}
    </text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}


