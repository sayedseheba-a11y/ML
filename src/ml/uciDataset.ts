import { RawTransaction } from './types';

function createRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const UCI_PRODUCTS: Array<{ code: string; desc: string; price: number }> = [
  { code: '85123A', desc: 'WHITE HANGING HEART T-LIGHT HOLDER', price: 2.55 },
  { code: '71053', desc: 'WHITE METAL LANTERN', price: 3.39 },
  { code: '84406B', desc: 'CREAM CUPID HEARTS COAT HANGER', price: 2.75 },
  { code: '84029G', desc: 'KNITTED UNION FLAG HOT WATER BOTTLE', price: 3.39 },
  { code: '22752', desc: 'SET 7 BABUSHKA NESTING BOXES', price: 7.65 },
  { code: '21730', desc: 'GLASS STAR FROSTED T-LIGHT HOLDER', price: 4.25 },
  { code: '22633', desc: 'HAND WARMER UNION JACK', price: 1.85 },
  { code: '22423', desc: 'REGENCY CAKESTAND 3 TIER', price: 12.75 },
  { code: '85099B', desc: 'JUMBO BAG RED RETROSPOT', price: 1.95 },
  { code: '47566', desc: 'PARTY BUNTING', price: 4.95 },
  { code: '20725', desc: 'LUNCH BAG RED RETROSPOT', price: 1.65 },
  { code: '22197', desc: 'POPCORN HOLDER', price: 0.85 },
  { code: '21212', desc: 'PACK OF 72 RETROSPOT CAKE CASES', price: 0.55 },
  { code: '22086', desc: "PAPER CHAIN KIT 50'S CHRISTMAS", price: 2.95 },
  { code: '23084', desc: 'RABBIT NIGHT LIGHT', price: 2.08 },
  { code: '22960', desc: 'JAM MAKING SET WITH JARS', price: 4.25 },
  { code: '22470', desc: 'HEART OF WICKER LARGE', price: 2.95 },
  { code: '22457', desc: 'NATURAL SLATE HEART CHALKBOARD', price: 2.95 },
  { code: '22138', desc: 'BAKING SET 9 PIECE RETROSPOT', price: 4.95 },
  { code: '22720', desc: 'SET OF 3 CAKE TINS PANTRY DESIGN', price: 4.95 },
  { code: '23298', desc: 'SPOTTY BUNTING', price: 4.95 },
  { code: '21137', desc: 'BLACK RECORD COVER FRAME', price: 3.75 },
  { code: '22386', desc: 'JUMBO BAG PINK POLKADOT', price: 2.08 },
  { code: '22910', desc: 'PAPER CHAIN KIT VINTAGE CHRISTMAS', price: 2.95 },
];

const COUNTRIES: Array<{ name: string; weight: number }> = [
  { name: 'United Kingdom', weight: 0.78 },
  { name: 'Germany', weight: 0.055 },
  { name: 'France', weight: 0.048 },
  { name: 'EIRE', weight: 0.032 },
  { name: 'Spain', weight: 0.022 },
  { name: 'Netherlands', weight: 0.02 },
  { name: 'Belgium', weight: 0.016 },
  { name: 'Switzerland', weight: 0.014 },
  { name: 'Portugal', weight: 0.008 },
  { name: 'Australia', weight: 0.005 },
];

function pickWeightedCountry(rng: () => number): string {
  const r = rng();
  let acc = 0;
  for (const c of COUNTRIES) {
    acc += c.weight;
    if (r <= acc) return c.name;
  }
  return 'United Kingdom';
}

function formatUciDate(ms: number): string {
  const d = new Date(ms);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

/**
 * Generates a realistic, deterministic 5,200+ transaction subset modeled closely
 * on the UCI Online Retail Dataset (Dec 2010 - Dec 2011), complete with real-world
 * dirty rows (missing CustomerID, 'C' credit cancellations, non-positive prices)
 * so the data-cleaning stage performs authentic preprocessing.
 */
export function generateUCIOnlineRetailSample(): {
  rows: RawTransaction[];
  datasetName: string;
} {
  const rng = createRng(4202026);
  const startMs = Date.UTC(2010, 11, 1, 8, 30);
  const endMs = Date.UTC(2011, 11, 9, 17, 45);
  const totalSpanDays = (endMs - startMs) / (1000 * 60 * 60 * 24);

  const rows: RawTransaction[] = [];
  let invoiceCounter = 536365;

  type Archetype = 'vip' | 'regular' | 'budget' | 'atRisk';
  interface CustomerSpec {
    id: string;
    country: string;
    archetype: Archetype;
    orderCount: number;
    minDaysAgo: number;
    maxDaysAgo: number;
    qtyRange: [number, number];
    itemsPerOrder: [number, number];
  }

  const specs: CustomerSpec[] = [];
  const totalCustomers = 380;

  for (let i = 0; i < totalCustomers; i++) {
    const id = String(12346 + i * 15 + Math.floor(rng() * 9));
    const country = pickWeightedCountry(rng);
    const p = rng();

    if (p < 0.14) {
      // VIP wholesale / top-tier loyal buyers: very recent, high frequency, large quantities
      specs.push({
        id,
        country,
        archetype: 'vip',
        orderCount: 9 + Math.floor(rng() * 14),
        minDaysAgo: 1,
        maxDaysAgo: 32,
        qtyRange: [12, 64],
        itemsPerOrder: [3, 6],
      });
    } else if (p < 0.48) {
      // Regular repeat buyers: moderate-to-recent, consistent cadence
      specs.push({
        id,
        country,
        archetype: 'regular',
        orderCount: 4 + Math.floor(rng() * 5),
        minDaysAgo: 10,
        maxDaysAgo: 78,
        qtyRange: [4, 20],
        itemsPerOrder: [2, 5],
      });
    } else if (p < 0.78) {
      // Budget / occasional shoppers: fewer orders, smaller baskets, moderate recency
      specs.push({
        id,
        country,
        archetype: 'budget',
        orderCount: 1 + Math.floor(rng() * 3),
        minDaysAgo: 35,
        maxDaysAgo: 165,
        qtyRange: [1, 8],
        itemsPerOrder: [1, 3],
      });
    } else {
      // At-risk / dormant buyers: purchased long ago, low frequency
      specs.push({
        id,
        country,
        archetype: 'atRisk',
        orderCount: 1 + Math.floor(rng() * 2),
        minDaysAgo: 195,
        maxDaysAgo: Math.floor(totalSpanDays) - 5,
        qtyRange: [2, 12],
        itemsPerOrder: [1, 3],
      });
    }
  }

  for (const spec of specs) {
    for (let o = 0; o < spec.orderCount; o++) {
      const invNo = String(invoiceCounter++);
      // First order anchors close to minDaysAgo for recent purchase consistency
      const daysAgo =
        o === 0
          ? spec.minDaysAgo + rng() * Math.min(18, spec.maxDaysAgo - spec.minDaysAgo)
          : spec.minDaysAgo + rng() * (spec.maxDaysAgo - spec.minDaysAgo);

      const orderMs =
        endMs -
        daysAgo * 24 * 60 * 60 * 1000 +
        (rng() - 0.5) * 6 * 3600 * 1000;
      const clampedMs = Math.max(startMs, Math.min(endMs, orderMs));
      const dateStr = formatUciDate(clampedMs);

      const lineCount =
        spec.itemsPerOrder[0] +
        Math.floor(rng() * (spec.itemsPerOrder[1] - spec.itemsPerOrder[0] + 1));

      for (let l = 0; l < lineCount; l++) {
        const prod = UCI_PRODUCTS[Math.floor(rng() * UCI_PRODUCTS.length)];
        const qty =
          spec.qtyRange[0] +
          Math.floor(rng() * (spec.qtyRange[1] - spec.qtyRange[0] + 1));
        const unitPrice = Number((prod.price * (0.94 + rng() * 0.14)).toFixed(2));

        rows.push({
          InvoiceNo: invNo,
          StockCode: prod.code,
          Description: prod.desc,
          Quantity: qty,
          InvoiceDate: dateStr,
          UnitPrice: unitPrice,
          CustomerID: spec.id,
          Country: spec.country,
        });
      }
    }
  }

  // Inject authentic UCI Online Retail anomalies (~6% dirty rows) for cleaning demonstration
  const dirtyTarget = Math.floor(rows.length * 0.065);
  for (let i = 0; i < dirtyTarget; i++) {
    const prod = UCI_PRODUCTS[Math.floor(rng() * UCI_PRODUCTS.length)];
    const randomMs = startMs + rng() * (endMs - startMs);
    const kind = i % 3;

    if (kind === 0) {
      // Missing CustomerID (guest / unrecorded checkout)
      rows.push({
        InvoiceNo: String(invoiceCounter++),
        StockCode: prod.code,
        Description: prod.desc,
        Quantity: 1 + Math.floor(rng() * 8),
        InvoiceDate: formatUciDate(randomMs),
        UnitPrice: prod.price,
        CustomerID: '',
        Country: 'United Kingdom',
      });
    } else if (kind === 1) {
      // Cancelled credit-note invoice starting with 'C' and negative quantity
      const cust = specs[Math.floor(rng() * specs.length)];
      rows.push({
        InvoiceNo: `C${invoiceCounter++}`,
        StockCode: prod.code,
        Description: prod.desc,
        Quantity: -(1 + Math.floor(rng() * 6)),
        InvoiceDate: formatUciDate(randomMs),
        UnitPrice: prod.price,
        CustomerID: cust.id,
        Country: cust.country,
      });
    } else {
      // Zero/negative unit price or manual stock adjustment
      const cust = specs[Math.floor(rng() * specs.length)];
      rows.push({
        InvoiceNo: String(invoiceCounter++),
        StockCode: 'POST',
        Description: 'MANUAL ADJUSTMENT',
        Quantity: i % 2 === 0 ? 1 : -2,
        InvoiceDate: formatUciDate(randomMs),
        UnitPrice: i % 2 === 0 ? 0 : prod.price,
        CustomerID: cust.id,
        Country: cust.country,
      });
    }
  }

  // Sort chronologically by InvoiceDate
  rows.sort((a, b) => (a.InvoiceDate < b.InvoiceDate ? -1 : 1));

  return {
    rows,
    datasetName: 'UCI Online Retail (Curated Sample)',
  };
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseOnlineRetailCSV(csvText: string): {
  rows: RawTransaction[];
  error?: string;
} {
  const normalized = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!normalized) {
    return { rows: [], error: 'The uploaded CSV file is empty.' };
  }

  const lines = normalized.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { rows: [], error: 'CSV must include a header row and at least one transaction row.' };
  }

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const findCol = (candidates: string[]) =>
    headers.findIndex((h) => candidates.some((c) => h === c));

  const idxInvoice = findCol(['invoiceno', 'invoice', 'orderid']);
  const idxStock = findCol(['stockcode', 'sku', 'productid', 'itemcode']);
  const idxDesc = findCol(['description', 'productname', 'item']);
  const idxQty = findCol(['quantity', 'qty', 'units']);
  const idxDate = findCol(['invoicedate', 'date', 'orderdate', 'timestamp']);
  const idxPrice = findCol(['unitprice', 'price', 'amount']);
  const idxCust = findCol(['customerid', 'custid', 'clientid', 'userid']);
  const idxCountry = findCol(['country', 'region', 'market']);

  if (idxInvoice === -1 || idxQty === -1 || idxDate === -1 || idxPrice === -1 || idxCust === -1) {
    return {
      rows: [],
      error:
        'Missing required UCI Online Retail columns. Expected InvoiceNo, Quantity, InvoiceDate, UnitPrice, and CustomerID.',
    };
  }

  const rows: RawTransaction[] = [];
  // Cap at 60,000 rows in browser memory so huge UCI files remain snappy
  const maxRows = Math.min(lines.length, 60001);

  for (let i = 1; i < maxRows; i++) {
    const cols = splitCsvLine(lines[i]);
    if (cols.length < 4) continue;

    const rawQty = Number(cols[idxQty]);
    const rawPrice = Number(cols[idxPrice]);

    rows.push({
      InvoiceNo: cols[idxInvoice] ?? '',
      StockCode: idxStock !== -1 ? (cols[idxStock] ?? '') : 'ITEM',
      Description: idxDesc !== -1 ? (cols[idxDesc] ?? 'Retail Item') : 'Retail Item',
      Quantity: Number.isFinite(rawQty) ? rawQty : 0,
      InvoiceDate: cols[idxDate] ?? '',
      UnitPrice: Number.isFinite(rawPrice) ? rawPrice : 0,
      CustomerID: (cols[idxCust] ?? '').replace(/\.0$/, ''),
      Country: idxCountry !== -1 && cols[idxCountry] ? cols[idxCountry] : 'Unspecified',
    });
  }

  if (rows.length === 0) {
    return { rows: [], error: 'No valid rows could be parsed from the CSV.' };
  }

  return { rows };
}
