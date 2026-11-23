import {
  CleanedTransaction,
  CleaningReport,
  ClusteredCustomer,
  ClusterPersonaSummary,
  CustomerBadge,
  CustomerRFM,
  DatasetStats,
  ElbowPoint,
  FunFact,
  PCALoadings,
  PCAResult,
  PersonalityIconKey,
  RawTransaction,
  SegmentationResult,
} from './types';

const CLUSTER_PALETTE: Array<{ color: string; glow: string }> = [
  { color: '#A855F7', glow: 'rgba(168, 85, 247, 0.35)' }, // Violet
  { color: '#3B82F6', glow: 'rgba(59, 130, 246, 0.35)' }, // Electric Blue
  { color: '#EC4899', glow: 'rgba(236, 72, 153, 0.35)' }, // Magenta Pink
  { color: '#14B8A6', glow: 'rgba(20, 184, 166, 0.35)' }, // Teal
  { color: '#F59E0B', glow: 'rgba(245, 158, 11, 0.35)' }, // Amber
  { color: '#6366F1', glow: 'rgba(99, 102, 241, 0.35)' }, // Indigo
  { color: '#06B6D4', glow: 'rgba(6, 182, 212, 0.35)' }, // Cyan
  { color: '#F43F5E', glow: 'rgba(244, 63, 94, 0.35)' }, // Rose
];

function parseDateTimestamp(raw: string): number {
  const cleaned = raw.trim();
  if (!cleaned) return NaN;
  const isoCandidate = cleaned.includes('T') ? cleaned : cleaned.replace(' ', 'T');
  let ms = Date.parse(isoCandidate);
  if (!Number.isNaN(ms)) return ms;

  // Handle DD/MM/YYYY HH:mm or MM/DD/YYYY HH:mm formats from Excel exports
  const match = cleaned.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (match) {
    const p1 = Number(match[1]);
    const p2 = Number(match[2]);
    let year = Number(match[3]);
    if (year < 100) year += 2000;
    const hour = match[4] ? Number(match[4]) : 12;
    const min = match[5] ? Number(match[5]) : 0;
    // Assume DD/MM/YYYY if p1 > 12, else default UCI style MM/DD or DD/MM cleanly
    const month = p1 > 12 ? p2 - 1 : p2 > 12 ? p1 - 1 : p1 - 1;
    const day = p1 > 12 ? p1 : p2 > 12 ? p2 : p2;
    ms = Date.UTC(year, month, day, hour, min);
    return ms;
  }
  return NaN;
}

export function preprocessDataset(rawRows: RawTransaction[]): {
  cleanedTransactions: CleanedTransaction[];
  cleaningReport: CleaningReport;
  customers: CustomerRFM[];
  stats: DatasetStats;
} {
  let missingCustomerIdCount = 0;
  let cancelledInvoiceCount = 0;
  let nonPositiveQuantityOrPriceCount = 0;
  let invalidDateCount = 0;

  const cleanedTransactions: CleanedTransaction[] = [];

  for (const row of rawRows) {
    const custId = (row.CustomerID ?? '').trim();
    if (!custId) {
      missingCustomerIdCount++;
      continue;
    }

    const inv = (row.InvoiceNo ?? '').trim();
    if (!inv || inv.toUpperCase().startsWith('C')) {
      cancelledInvoiceCount++;
      continue;
    }

    if (!Number.isFinite(row.Quantity) || !Number.isFinite(row.UnitPrice) || row.Quantity <= 0 || row.UnitPrice <= 0) {
      nonPositiveQuantityOrPriceCount++;
      continue;
    }

    const parsedDate = parseDateTimestamp(row.InvoiceDate);
    if (Number.isNaN(parsedDate)) {
      invalidDateCount++;
      continue;
    }

    cleanedTransactions.push({
      ...row,
      InvoiceNo: inv,
      CustomerID: custId,
      parsedDate,
      TotalPrice: Number((row.Quantity * row.UnitPrice).toFixed(2)),
    });
  }

  if (cleanedTransactions.length === 0) {
    return {
      cleanedTransactions: [],
      cleaningReport: {
        rawRowCount: rawRows.length,
        missingCustomerIdCount,
        cancelledInvoiceCount,
        nonPositiveQuantityOrPriceCount,
        invalidDateCount,
        cleanedRowCount: 0,
        uniqueCustomers: 0,
        uniqueInvoices: 0,
        uniqueProducts: 0,
        uniqueCountries: 0,
      },
      customers: [],
      stats: {
        totalRevenue: 0,
        avgOrderValue: 0,
        medianCustomerSpend: 0,
        avgRecencyDays: 0,
        avgFrequency: 0,
        avgMonetary: 0,
        minDateIso: '',
        maxDateIso: '',
        referenceDateIso: '',
        topCountries: [],
      },
    };
  }

  let minDate = Infinity;
  let maxDate = -Infinity;
  const uniqueInvoicesSet = new Set<string>();
  const uniqueProductsSet = new Set<string>();
  const uniqueCountriesSet = new Set<string>();

  interface CustAccum {
    invoices: Set<string>;
    monetary: number;
    totalItems: number;
    lastPurchaseMs: number;
    countryCounts: Map<string, number>;
  }

  const customerMap = new Map<string, CustAccum>();
  const countryRevenue = new Map<string, { revenue: number; customers: Set<string> }>();

  for (const tx of cleanedTransactions) {
    if (tx.parsedDate < minDate) minDate = tx.parsedDate;
    if (tx.parsedDate > maxDate) maxDate = tx.parsedDate;
    uniqueInvoicesSet.add(tx.InvoiceNo);
    uniqueProductsSet.add(tx.StockCode);
    uniqueCountriesSet.add(tx.Country);

    let acc = customerMap.get(tx.CustomerID);
    if (!acc) {
      acc = {
        invoices: new Set<string>(),
        monetary: 0,
        totalItems: 0,
        lastPurchaseMs: tx.parsedDate,
        countryCounts: new Map<string, number>(),
      };
      customerMap.set(tx.CustomerID, acc);
    }

    acc.invoices.add(tx.InvoiceNo);
    acc.monetary += tx.TotalPrice;
    acc.totalItems += tx.Quantity;
    if (tx.parsedDate > acc.lastPurchaseMs) {
      acc.lastPurchaseMs = tx.parsedDate;
    }
    acc.countryCounts.set(tx.Country, (acc.countryCounts.get(tx.Country) ?? 0) + 1);

    let cStat = countryRevenue.get(tx.Country);
    if (!cStat) {
      cStat = { revenue: 0, customers: new Set<string>() };
      countryRevenue.set(tx.Country, cStat);
    }
    cStat.revenue += tx.TotalPrice;
    cStat.customers.add(tx.CustomerID);
  }

  // Reference date for Recency = max invoice date + 1 day (standard UCI RFM convention)
  const referenceMs = maxDate + 24 * 60 * 60 * 1000;
  const msPerDay = 24 * 60 * 60 * 1000;

  const customers: CustomerRFM[] = [];
  let totalRevenue = 0;

  for (const [customerId, acc] of customerMap.entries()) {
    let primaryCountry = 'United Kingdom';
    let bestCount = -1;
    for (const [country, cnt] of acc.countryCounts.entries()) {
      if (cnt > bestCount) {
        bestCount = cnt;
        primaryCountry = country;
      }
    }

    const frequency = acc.invoices.size;
    const monetary = Number(acc.monetary.toFixed(2));
    const recency = Math.max(1, Math.round((referenceMs - acc.lastPurchaseMs) / msPerDay));
    const avgOrderValue = Number((monetary / Math.max(1, frequency)).toFixed(2));

    totalRevenue += monetary;

    customers.push({
      customerId,
      country: primaryCountry,
      recency,
      frequency,
      monetary,
      avgOrderValue,
      totalItems: acc.totalItems,
      lastPurchaseIso: new Date(acc.lastPurchaseMs).toISOString().slice(0, 10),
    });
  }

  customers.sort((a, b) => b.monetary - a.monetary);

  const sortedSpends = customers.map((c) => c.monetary).sort((a, b) => a - b);
  const mid = Math.floor(sortedSpends.length / 2);
  const medianCustomerSpend =
    sortedSpends.length % 2 === 0
      ? (sortedSpends[mid - 1] + sortedSpends[mid]) / 2
      : sortedSpends[mid];

  const avgRecencyDays =
    customers.reduce((sum, c) => sum + c.recency, 0) / customers.length;
  const avgFrequency =
    customers.reduce((sum, c) => sum + c.frequency, 0) / customers.length;
  const avgMonetary = totalRevenue / customers.length;
  const avgOrderValue = totalRevenue / Math.max(1, uniqueInvoicesSet.size);

  const topCountries = Array.from(countryRevenue.entries())
    .map(([country, val]) => ({
      country,
      revenue: Number(val.revenue.toFixed(2)),
      customers: val.customers.size,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  return {
    cleanedTransactions,
    cleaningReport: {
      rawRowCount: rawRows.length,
      missingCustomerIdCount,
      cancelledInvoiceCount,
      nonPositiveQuantityOrPriceCount,
      invalidDateCount,
      cleanedRowCount: cleanedTransactions.length,
      uniqueCustomers: customers.length,
      uniqueInvoices: uniqueInvoicesSet.size,
      uniqueProducts: uniqueProductsSet.size,
      uniqueCountries: uniqueCountriesSet.size,
    },
    customers,
    stats: {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      avgOrderValue: Number(avgOrderValue.toFixed(2)),
      medianCustomerSpend: Number(medianCustomerSpend.toFixed(2)),
      avgRecencyDays: Number(avgRecencyDays.toFixed(1)),
      avgFrequency: Number(avgFrequency.toFixed(2)),
      avgMonetary: Number(avgMonetary.toFixed(2)),
      minDateIso: new Date(minDate).toISOString().slice(0, 10),
      maxDateIso: new Date(maxDate).toISOString().slice(0, 10),
      referenceDateIso: new Date(referenceMs).toISOString().slice(0, 10),
      topCountries,
    },
  };
}

/**
 * StandardScaler: Optional log1p skewness correction followed by z-score normalization.
 */
function standardizeRFM(
  customers: CustomerRFM[],
  useLogTransform: boolean
): {
  scaled: Array<[number, number, number]>;
  means: [number, number, number];
  stds: [number, number, number];
} {
  const n = customers.length;
  const rawFeatures: Array<[number, number, number]> = customers.map((c) =>
    useLogTransform
      ? [Math.log1p(c.recency), Math.log1p(c.frequency), Math.log1p(c.monetary)]
      : [c.recency, c.frequency, c.monetary]
  );

  const means: [number, number, number] = [0, 0, 0];
  for (const row of rawFeatures) {
    means[0] += row[0];
    means[1] += row[1];
    means[2] += row[2];
  }
  means[0] /= n;
  means[1] /= n;
  means[2] /= n;

  const vars: [number, number, number] = [0, 0, 0];
  for (const row of rawFeatures) {
    vars[0] += (row[0] - means[0]) ** 2;
    vars[1] += (row[1] - means[1]) ** 2;
    vars[2] += (row[2] - means[2]) ** 2;
  }

  const stds: [number, number, number] = [
    Math.sqrt(vars[0] / Math.max(1, n)) || 1,
    Math.sqrt(vars[1] / Math.max(1, n)) || 1,
    Math.sqrt(vars[2] / Math.max(1, n)) || 1,
  ];

  const scaled: Array<[number, number, number]> = rawFeatures.map((row) => [
    (row[0] - means[0]) / stds[0],
    (row[1] - means[1]) / stds[1],
    (row[2] - means[2]) / stds[2],
  ]);

  return { scaled, means, stds };
}

/**
 * Exact Jacobi Eigenvalue Algorithm for a 3x3 symmetric covariance matrix.
 */
function jacobiEigen3x3(mat: number[][]): {
  eigenvalues: number[];
  eigenvectors: number[][];
} {
  const a = mat.map((r) => [...r]);
  const v = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];

  for (let iter = 0; iter < 50; iter++) {
    let p = 0;
    let q = 1;
    let maxVal = Math.abs(a[0][1]);

    if (Math.abs(a[0][2]) > maxVal) {
      maxVal = Math.abs(a[0][2]);
      p = 0;
      q = 2;
    }
    if (Math.abs(a[1][2]) > maxVal) {
      maxVal = Math.abs(a[1][2]);
      p = 1;
      q = 2;
    }

    if (maxVal < 1e-12) break;

    const app = a[p][p];
    const aqq = a[q][q];
    const apq = a[p][q];

    const phi = 0.5 * Math.atan2(2 * apq, aqq - app);
    const c = Math.cos(phi);
    const s = Math.sin(phi);

    for (let i = 0; i < 3; i++) {
      if (i !== p && i !== q) {
        const aip = a[i][p];
        const aiq = a[i][q];
        a[i][p] = c * aip - s * aiq;
        a[p][i] = a[i][p];
        a[i][q] = s * aip + c * aiq;
        a[q][i] = a[i][q];
      }
    }

    a[p][p] = c * c * app - 2 * c * s * apq + s * s * aqq;
    a[q][q] = s * s * app + 2 * c * s * apq + c * c * aqq;
    a[p][q] = 0;
    a[q][p] = 0;

    for (let i = 0; i < 3; i++) {
      const vip = v[i][p];
      const viq = v[i][q];
      v[i][p] = c * vip - s * viq;
      v[i][q] = s * vip + c * viq;
    }
  }

  return {
    eigenvalues: [a[0][0], a[1][1], a[2][2]],
    eigenvectors: v,
  };
}

function computePCA(
  scaled: Array<[number, number, number]>,
  means: [number, number, number],
  stds: [number, number, number]
): PCAResult {
  const n = scaled.length;
  const cov = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];

  for (const x of scaled) {
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        cov[i][j] += x[i] * x[j];
      }
    }
  }
  const denom = Math.max(1, n - 1);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      cov[i][j] /= denom;
    }
  }

  const { eigenvalues, eigenvectors } = jacobiEigen3x3(cov);

  const pairs = [0, 1, 2]
    .map((idx) => ({
      val: Math.max(0, eigenvalues[idx]),
      vec: [eigenvectors[0][idx], eigenvectors[1][idx], eigenvectors[2][idx]],
    }))
    .sort((a, b) => b.val - a.val);

  // Enforce consistent deterministic sign orientation: Monetary loading positive on PC1
  if (pairs[0].vec[2] < 0) {
    pairs[0].vec = pairs[0].vec.map((x) => -x);
  }
  if (pairs[1].vec[0] < 0) {
    pairs[1].vec = pairs[1].vec.map((x) => -x);
  }

  const totalVar = pairs[0].val + pairs[1].val + pairs[2].val || 1;
  const explainedVarianceRatio: [number, number, number] = [
    pairs[0].val / totalVar,
    pairs[1].val / totalVar,
    pairs[2].val / totalVar,
  ];

  const projected3D: Array<[number, number, number]> = scaled.map((x) => [
    x[0] * pairs[0].vec[0] + x[1] * pairs[0].vec[1] + x[2] * pairs[0].vec[2],
    x[0] * pairs[1].vec[0] + x[1] * pairs[1].vec[1] + x[2] * pairs[1].vec[2],
    x[0] * pairs[2].vec[0] + x[1] * pairs[2].vec[1] + x[2] * pairs[2].vec[2],
  ]);

  const projected2D: Array<[number, number]> = projected3D.map(([p1, p2]) => [p1, p2]);

  const featureNames: Array<'Recency' | 'Frequency' | 'Monetary'> = [
    'Recency',
    'Frequency',
    'Monetary',
  ];
  const loadings: PCALoadings[] = featureNames.map((feature, fIdx) => ({
    feature,
    pc1: Number(pairs[0].vec[fIdx].toFixed(3)),
    pc2: Number(pairs[1].vec[fIdx].toFixed(3)),
    pc3: Number(pairs[2].vec[fIdx].toFixed(3)),
  }));

  return {
    projected2D,
    projected3D,
    explainedVarianceRatio,
    cumulative2DVariance: explainedVarianceRatio[0] + explainedVarianceRatio[1],
    loadings,
    means,
    stds,
  };
}

function sqDist(a: [number, number, number], b: [number, number, number]): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return dx * dx + dy * dy + dz * dz;
}

function seededRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function runKMeansSingle(
  data: Array<[number, number, number]>,
  k: number,
  seed: number,
  maxIter = 100
): {
  labels: number[];
  centroids: Array<[number, number, number]>;
  inertia: number;
  iterations: number;
} {
  const n = data.length;
  const rng = seededRng(seed);
  const centroids: Array<[number, number, number]> = [];

  // K-Means++ initialization
  const firstIdx = Math.floor(rng() * n);
  centroids.push([...data[firstIdx]]);

  const dists = new Float64Array(n).fill(Infinity);
  for (let c = 1; c < k; c++) {
    let totalDist = 0;
    for (let i = 0; i < n; i++) {
      const d = sqDist(data[i], centroids[c - 1]);
      if (d < dists[i]) dists[i] = d;
      totalDist += dists[i];
    }

    if (totalDist === 0) {
      centroids.push([...data[c % n]]);
      continue;
    }

    let target = rng() * totalDist;
    let chosen = 0;
    for (let i = 0; i < n; i++) {
      target -= dists[i];
      if (target <= 0) {
        chosen = i;
        break;
      }
    }
    centroids.push([...data[chosen]]);
  }

  const labels = new Array<number>(n).fill(0);
  let iterations = 0;
  let inertia = 0;

  for (let iter = 0; iter < maxIter; iter++) {
    iterations = iter + 1;
    let changed = false;
    inertia = 0;

    for (let i = 0; i < n; i++) {
      let bestC = 0;
      let bestD = Infinity;
      for (let c = 0; c < k; c++) {
        const d = sqDist(data[i], centroids[c]);
        if (d < bestD) {
          bestD = d;
          bestC = c;
        }
      }
      if (labels[i] !== bestC) {
        labels[i] = bestC;
        changed = true;
      }
      inertia += bestD;
    }

    const sums: Array<[number, number, number]> = Array.from({ length: k }, () => [0, 0, 0]);
    const counts = new Array<number>(k).fill(0);

    for (let i = 0; i < n; i++) {
      const c = labels[i];
      counts[c]++;
      sums[c][0] += data[i][0];
      sums[c][1] += data[i][1];
      sums[c][2] += data[i][2];
    }

    let maxShift = 0;
    for (let c = 0; c < k; c++) {
      if (counts[c] === 0) continue;
      const nx: [number, number, number] = [
        sums[c][0] / counts[c],
        sums[c][1] / counts[c],
        sums[c][2] / counts[c],
      ];
      const shift = sqDist(nx, centroids[c]);
      if (shift > maxShift) maxShift = shift;
      centroids[c] = nx;
    }

    if (!changed || maxShift < 1e-7) break;
  }

  return { labels, centroids, inertia, iterations };
}

function runBestKMeans(data: Array<[number, number, number]>, k: number) {
  let best = runKMeansSingle(data, k, 101);
  // 5 deterministic restarts (equivalent to n_init=5) to guarantee global optimum
  for (const seed of [202, 303, 404, 505]) {
    const candidate = runKMeansSingle(data, k, seed);
    if (candidate.inertia < best.inertia) {
      best = candidate;
    }
  }
  return best;
}

function computeElbow(
  data: Array<[number, number, number]>,
  kMin = 2,
  kMax = 8
): { curve: ElbowPoint[]; recommendedK: number } {
  const maxAllowed = Math.min(kMax, Math.max(2, data.length - 1));
  const curve: ElbowPoint[] = [];

  for (let k = kMin; k <= maxAllowed; k++) {
    const res = runBestKMeans(data, k);
    curve.push({ k, inertia: Number(res.inertia.toFixed(2)) });
  }

  if (curve.length < 3) {
    return { curve, recommendedK: curve[0]?.k ?? 4 };
  }

  // Perpendicular distance from line connecting first & last point (Kneedle / L-method geometry)
  const p1 = curve[0];
  const p2 = curve[curve.length - 1];
  const dx = p2.k - p1.k;
  const dy = p2.inertia - p1.inertia;
  const lineLen = Math.hypot(dx, dy) || 1;

  let bestK = curve[0].k;
  let maxDist = -1;
  for (const pt of curve) {
    const dist =
      Math.abs(dy * pt.k - dx * pt.inertia + p2.k * p1.inertia - p2.inertia * p1.k) /
      lineLen;
    if (dist > maxDist) {
      maxDist = dist;
      bestK = pt.k;
    }
  }

  return { curve, recommendedK: bestK };
}

function computeSilhouettes(
  data: Array<[number, number, number]>,
  labels: number[],
  k: number
): { meanScore: number; perPoint: number[] } {
  const n = data.length;
  if (k <= 1 || n <= k) {
    return { meanScore: 0, perPoint: new Array(n).fill(0) };
  }

  // Group indices by cluster
  const clusterIndices: number[][] = Array.from({ length: k }, () => []);
  for (let i = 0; i < n; i++) {
    clusterIndices[labels[i]].push(i);
  }

  // For massive uploaded CSVs (>1,200 customers), sample up to 600 points evenly across clusters for exact-grade O(N*M) speed
  const maxSample = 600;
  const step = n > maxSample ? Math.ceil(n / maxSample) : 1;

  const perPoint = new Array<number>(n).fill(0);
  let sumSil = 0;
  let evaluated = 0;

  for (let i = 0; i < n; i++) {
    if (step > 1 && i % step !== 0) {
      perPoint[i] = 0;
      continue;
    }
    const ownCluster = labels[i];
    const ownPeers = clusterIndices[ownCluster];

    if (ownPeers.length <= 1) {
      perPoint[i] = 0;
      evaluated++;
      continue;
    }

    let aSum = 0;
    for (const j of ownPeers) {
      if (i === j) continue;
      aSum += Math.sqrt(sqDist(data[i], data[j]));
    }
    const a = aSum / (ownPeers.length - 1);

    let b = Infinity;
    for (let c = 0; c < k; c++) {
      if (c === ownCluster || clusterIndices[c].length === 0) continue;
      let cSum = 0;
      for (const j of clusterIndices[c]) {
        cSum += Math.sqrt(sqDist(data[i], data[j]));
      }
      const meanDist = cSum / clusterIndices[c].length;
      if (meanDist < b) b = meanDist;
    }

    const sil = b === Infinity ? 0 : (b - a) / Math.max(a, b, 1e-9);
    perPoint[i] = Number(sil.toFixed(4));
    sumSil += sil;
    evaluated++;
  }

  // Fill non-sampled points with their cluster average silhouette for display consistency
  if (step > 1) {
    for (let c = 0; c < k; c++) {
      const sampledVals = clusterIndices[c]
        .filter((idx) => idx % step === 0)
        .map((idx) => perPoint[idx]);
      const avgC =
        sampledVals.length > 0
          ? sampledVals.reduce((s, v) => s + v, 0) / sampledVals.length
          : 0;
      for (const idx of clusterIndices[c]) {
        if (idx % step !== 0) perPoint[idx] = Number(avgC.toFixed(4));
      }
    }
  }

  return {
    meanScore: Number((sumSil / Math.max(1, evaluated)).toFixed(4)),
    perPoint,
  };
}

function buildPersonaDetails(
  stats: {
    avgRecency: number;
    avgFrequency: number;
    avgMonetary: number;
    globalRecency: number;
    globalFrequency: number;
    globalMonetary: number;
  },
  rankByValue: number,
  totalClusters: number,
  usedTitles: Set<string>
): {
  title: string;
  personalityName: string;
  personalityTagline: string;
  iconKey: PersonalityIconKey;
  subtitle: string;
  characteristics: string[];
  marketingStrategy: string[];
} {
  const relRecencyPct = Math.round(
    ((stats.avgRecency - stats.globalRecency) / Math.max(1, stats.globalRecency)) * 100
  );
  const relFreqPct = Math.round(
    ((stats.avgFrequency - stats.globalFrequency) / Math.max(0.1, stats.globalFrequency)) * 100
  );
  const relMonPct = Math.round(
    ((stats.avgMonetary - stats.globalMonetary) / Math.max(1, stats.globalMonetary)) * 100
  );

  const recencyText =
    relRecencyPct <= -15
      ? `Shops very recently (${Math.abs(relRecencyPct)}% fresher than cohort average)`
      : relRecencyPct >= 25
        ? `Long gap since last order (${relRecencyPct}% older than cohort average)`
        : `Moderate recency (${stats.avgRecency.toFixed(0)} days since last purchase)`;

  const freqText =
    relFreqPct >= 30
      ? `High repeat cadence (${relFreqPct}% above average order frequency)`
      : relFreqPct <= -25
        ? `Infrequent buyer (${Math.abs(relFreqPct)}% below average purchase count)`
        : `Steady purchase frequency (${stats.avgFrequency.toFixed(1)} orders per customer)`;

  const monText =
    relMonPct >= 30
      ? `High lifetime spend (${relMonPct}% above cohort average)`
      : relMonPct <= -25
        ? `Price-sensitive spend (${Math.abs(relMonPct)}% below cohort average)`
        : `Balanced basket spend (£${stats.avgMonetary.toFixed(0)} mean spend)`;

  let title = 'Regular Customers';
  let personalityName = 'The Steady Navigator';
  let personalityTagline = 'Consistent repeat shopper who anchors monthly store rhythm.';
  let iconKey: PersonalityIconKey = 'compass';
  let subtitle = 'Consistent repeat buyers with healthy engagement';
  let strategy: string[] = [
    'Offer tiered loyalty milestones to nudge basket size upward',
    'Send curated cross-sell bundles based on past top SKUs',
    'Maintain predictable seasonal restock reminders',
  ];

  const isHighestValue = rankByValue === 0;
  const isDormant = stats.avgRecency > stats.globalRecency * 1.35 && !usedTitles.has('At-Risk Customers');

  if (isHighestValue && !usedTitles.has('VIP Customers')) {
    title = 'VIP Customers';
    personalityName = 'The Crowned Champion';
    personalityTagline = 'High-conviction loyalist who buys early, often, and in volume.';
    iconKey = 'crown';
    subtitle = 'Top-spending repeat champions driving core revenue';
    strategy = [
      'Provide priority inventory access and early seasonal previews',
      'Assign dedicated wholesale / VIP concierge perks and free express shipping',
      'Invite to referral & exclusivity tiers rather than discounting margins',
    ];
  } else if (isDormant) {
    title = 'At-Risk Customers';
    personalityName = 'The Sleeping Giant';
    personalityTagline = 'Quiet lately, yet holds proven historical buying power.';
    iconKey = 'moon';
    subtitle = 'Previously active accounts showing high recency churn risk';
    strategy = [
      'Trigger automated win-back campaign with time-limited incentive',
      'Highlight new arrivals or improved product lines since their last order',
      'Run short 1-click feedback survey to identify friction or price churn',
    ];
  } else if (
    (rankByValue === totalClusters - 1 || stats.avgMonetary < stats.globalMonetary * 0.75) &&
    !usedTitles.has('Budget Shoppers')
  ) {
    title = 'Budget Shoppers';
    personalityName = 'The Smart Treasure Hunter';
    personalityTagline = 'Selective value-seeker drawn to bundles and smart deals.';
    iconKey = 'tag';
    subtitle = 'Cost-conscious buyers with smaller order values';
    strategy = [
      'Promote multi-buy volume discounts and free-shipping threshold nudges',
      'Feature value packs and clearance bundles to lift average order value',
      'Use automated cart-abandonment reminders with low-friction checkout',
    ];
  } else if (!usedTitles.has('Regular Customers')) {
    title = 'Regular Customers';
    personalityName = 'The Steady Navigator';
    personalityTagline = 'Dependable repeat patron with balanced basket habits.';
    iconKey = 'compass';
    subtitle = 'Reliable core repeat shoppers with steady order cadence';
    strategy = [
      'Introduce subscription or recurring reorder reminders',
      'Reward repeat frequency with points convertible on 3rd/5th orders',
      'Test personalized recommendations across complementary categories',
    ];
  } else if (stats.avgRecency < stats.globalRecency * 0.85 && !usedTitles.has('Emerging Loyalists')) {
    title = 'Emerging Loyalists';
    personalityName = 'The Rising Spark';
    personalityTagline = 'Freshly engaged buyer building rapid repeat momentum.';
    iconKey = 'zap';
    subtitle = 'Recent shoppers building repeat purchase momentum';
    strategy = [
      'Send 2nd/3rd order onboarding sequence within 14 days of purchase',
      'Showcase top-rated catalog bestsellers to anchor habit formation',
    ];
  } else if (stats.avgMonetary >= stats.globalMonetary && !usedTitles.has('High-Value Occasional')) {
    title = 'High-Value Occasional';
    personalityName = 'The Seasonal Strategist';
    personalityTagline = 'Strikes infrequently with standout, high-ticket carts.';
    iconKey = 'gem';
    subtitle = 'Large basket size with lower visit frequency';
    strategy = [
      'Schedule seasonal bulk-order reminders aligned with prior purchase month',
      'Offer volume-tier rebates to increase annual order cadence',
    ];
  } else if (!usedTitles.has('Dormant Low-Spend')) {
    title = 'Dormant Low-Spend';
    personalityName = 'The Quiet Drifter';
    personalityTagline = 'Low-frequency visitor from earlier seasons.';
    iconKey = 'flame';
    subtitle = 'One-time or lapsed low-value accounts';
    strategy = [
      'Include only in low-cost automated seasonal reactivation blasts',
      'Focus acquisition spend elsewhere once win-back window expires',
    ];
  } else {
    title = `Segment ${rankByValue + 1}`;
    personalityName = `The Persona ${rankByValue + 1}`;
    personalityTagline = 'Distinct purchasing rhythm discovered by K-Means.';
    iconKey = 'sparkles';
    subtitle = 'Distinct behavioral group identified by K-Means';
  }

  usedTitles.add(title);

  return {
    title,
    personalityName,
    personalityTagline,
    iconKey,
    subtitle,
    characteristics: [recencyText, freqText, monText],
    marketingStrategy: strategy,
  };
}

function assignCustomerBadges(
  customer: CustomerRFM,
  thresholds: {
    top10Spend: number;
    top15Freq: number;
    avgOrderValue: number;
    avgRecency: number;
  }
): CustomerBadge[] {
  const badges: CustomerBadge[] = [];

  if (customer.monetary >= thresholds.top10Spend) {
    badges.push({
      id: 'whale',
      label: 'Top 10% Spender',
      reason: `Lifetime spend £${customer.monetary.toLocaleString()} ranks in top 10%`,
      tone: 'violet',
    });
  }

  if (customer.frequency >= thresholds.top15Freq) {
    badges.push({
      id: 'frequent',
      label: 'Repeat Champion',
      reason: `${customer.frequency} distinct invoices placed`,
      tone: 'blue',
    });
  }

  if (customer.recency <= 14) {
    badges.push({
      id: 'fresh',
      label: 'Active This Fortnight',
      reason: `Ordered ${customer.recency} day(s) before snapshot`,
      tone: 'emerald',
    });
  }

  if (customer.avgOrderValue >= thresholds.avgOrderValue * 1.45 && badges.length < 3) {
    badges.push({
      id: 'basket',
      label: 'Big Basket',
      reason: `£${customer.avgOrderValue.toFixed(0)} avg order (${(customer.avgOrderValue / Math.max(1, thresholds.avgOrderValue)).toFixed(1)}x mean)`,
      tone: 'pink',
    });
  }

  if (customer.recency >= Math.max(150, thresholds.avgRecency * 1.5) && badges.length < 3) {
    badges.push({
      id: 'comeback',
      label: 'Win-Back Target',
      reason: `${customer.recency} days since last transaction`,
      tone: 'amber',
    });
  }

  if (badges.length === 0) {
    badges.push({
      id: 'steady',
      label: 'Core Shopper',
      reason: `${customer.frequency} order(s) totaling £${customer.monetary.toFixed(0)}`,
      tone: 'blue',
    });
  }

  return badges.slice(0, 3);
}

function computeFunFacts(
  customers: ClusteredCustomer[],
  stats: DatasetStats,
  personas: ClusterPersonaSummary[]
): FunFact[] {
  if (customers.length === 0) return [];

  const sortedBySpend = [...customers].sort((a, b) => b.monetary - a.monetary);
  const topSpender = sortedBySpend[0];
  const spendMultiplier = (topSpender.monetary / Math.max(1, stats.avgMonetary)).toFixed(1);

  const sortedByFreq = [...customers].sort((a, b) => b.frequency - a.frequency);
  const mostFrequent = sortedByFreq[0];

  const sortedByAov = [...customers].sort((a, b) => b.avgOrderValue - a.avgOrderValue);
  const biggestBasket = sortedByAov[0];

  const topDecileCount = Math.max(1, Math.ceil(customers.length * 0.1));
  const topDecileRevenue = sortedBySpend
    .slice(0, topDecileCount)
    .reduce((sum, c) => sum + c.monetary, 0);
  const paretoShare = ((topDecileRevenue / Math.max(1, stats.totalRevenue)) * 100).toFixed(1);

  const repeatCount = customers.filter((c) => c.frequency >= 2).length;
  const repeatPct = ((repeatCount / customers.length) * 100).toFixed(1);

  const freshCount = customers.filter((c) => c.recency <= 30).length;
  const freshPct = ((freshCount / customers.length) * 100).toFixed(1);

  const topPersona = personas[0];
  const topCountry = stats.topCountries[0];
  const topCountryShare = topCountry
    ? ((topCountry.revenue / Math.max(1, stats.totalRevenue)) * 100).toFixed(1)
    : '0';

  const facts: FunFact[] = [
    {
      id: 'top-spender',
      label: 'Top Spender Spotlight',
      headline: `Customer #${topSpender.customerId} spent ${spendMultiplier}× the cohort average`,
      detail: `At £${topSpender.monetary.toLocaleString(undefined, { maximumFractionDigits: 0 })} across ${topSpender.frequency} orders (${topSpender.country}), vs. £${stats.avgMonetary.toFixed(0)} cohort mean.`,
    },
    {
      id: 'pareto-share',
      label: 'Revenue Concentration',
      headline: `Top 10% of buyers generate ${paretoShare}% of total revenue`,
      detail: `${topDecileCount} highest-spending customers account for £${topDecileRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} of £${stats.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}.`,
    },
    {
      id: 'loyalty-leader',
      label: 'Most Frequent Buyer',
      headline: `Customer #${mostFrequent.customerId} placed ${mostFrequent.frequency} separate orders`,
      detail: `Averaging £${mostFrequent.avgOrderValue.toFixed(0)} per checkout and assigned to ${mostFrequent.personaTitle}.`,
    },
    {
      id: 'repeat-rate',
      label: 'Repeat Purchase Rate',
      headline: `${repeatPct}% of customers returned for 2 or more orders`,
      detail: `${repeatCount} repeat buyers out of ${customers.length} total segmented accounts.`,
    },
    {
      id: 'fresh-window',
      label: '30-Day Active Pulse',
      headline: `${freshPct}% of customers purchased within the final 30 days`,
      detail: `${freshCount} accounts stayed active right up to ${stats.maxDateIso}.`,
    },
    {
      id: 'biggest-basket',
      label: 'Largest Average Basket',
      headline: `Customer #${biggestBasket.customerId} averages £${biggestBasket.avgOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} per order`,
      detail: `Placed ${biggestBasket.frequency} order(s) from ${biggestBasket.country}.`,
    },
  ];

  if (topPersona) {
    facts.push({
      id: 'top-segment',
      label: 'Dominant Value Segment',
      headline: `${topPersona.personalityName} drives ${topPersona.revenueSharePct}% of revenue`,
      detail: `${topPersona.title} make up ${topPersona.customerSharePct}% of users (${topPersona.customerCount}) with £${topPersona.avgMonetary.toLocaleString(undefined, { maximumFractionDigits: 0 })} average spend.`,
    });
  }

  if (topCountry) {
    facts.push({
      id: 'top-market',
      label: 'Leading Geographic Market',
      headline: `${topCountry.country} contributes ${topCountryShare}% of revenue`,
      detail: `${topCountry.customers} active buyers generating £${topCountry.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}.`,
    });
  }

  return facts;
}

export function runSegmentationPipeline(
  customers: CustomerRFM[],
  stats: DatasetStats,
  k: number,
  useLogTransform = true
): SegmentationResult {
  const safeK = Math.max(2, Math.min(k, Math.max(2, customers.length - 1)));
  const { scaled, means, stds } = standardizeRFM(customers, useLogTransform);
  const pca = computePCA(scaled, means, stds);
  const { labels, inertia, iterations } = runBestKMeans(scaled, safeK);
  const { curve: elbowCurve, recommendedK } = computeElbow(scaled, 2, 8);
  const { meanScore: silhouetteScore, perPoint } = computeSilhouettes(
    scaled,
    labels,
    safeK
  );

  // Aggregate raw cluster stats first so we can rank clusters by business value & assign authentic personas
  const rawClusters = Array.from({ length: safeK }, (_, cid) => ({
    cid,
    indices: [] as number[],
    sumRecency: 0,
    sumFrequency: 0,
    sumMonetary: 0,
    sumAov: 0,
    sumPc1: 0,
    sumPc2: 0,
    sumSil: 0,
    countries: new Map<string, number>(),
  }));

  for (let i = 0; i < customers.length; i++) {
    const cid = labels[i];
    const c = customers[i];
    const bucket = rawClusters[cid];
    bucket.indices.push(i);
    bucket.sumRecency += c.recency;
    bucket.sumFrequency += c.frequency;
    bucket.sumMonetary += c.monetary;
    bucket.sumAov += c.avgOrderValue;
    bucket.sumPc1 += pca.projected2D[i][0];
    bucket.sumPc2 += pca.projected2D[i][1];
    bucket.sumSil += perPoint[i];
    bucket.countries.set(c.country, (bucket.countries.get(c.country) ?? 0) + 1);
  }

  // Score each cluster by composite RFM value (high M, high F, low R) for consistent color/rank ordering
  const rankedClusters = [...rawClusters]
    .filter((b) => b.indices.length > 0)
    .sort((a, b) => {
      const avgMa = a.sumMonetary / a.indices.length;
      const avgMb = b.sumMonetary / b.indices.length;
      return avgMb - avgMa;
    });

  // Compute cohort quantile thresholds for behavioral customer badges
  const spendSorted = [...customers].map((c) => c.monetary).sort((a, b) => a - b);
  const freqSorted = [...customers].map((c) => c.frequency).sort((a, b) => a - b);
  const top10Spend = spendSorted[Math.max(0, Math.floor(spendSorted.length * 0.9) - 1)] ?? 0;
  const top15Freq = Math.max(
    4,
    freqSorted[Math.max(0, Math.floor(freqSorted.length * 0.85) - 1)] ?? 4
  );

  const badgeThresholds = {
    top10Spend,
    top15Freq,
    avgOrderValue: stats.avgOrderValue,
    avgRecency: stats.avgRecencyDays,
  };

  const usedTitles = new Set<string>();
  const cidToTitle = new Map<number, string>();
  const personas: ClusterPersonaSummary[] = [];

  rankedClusters.forEach((bucket, rankIdx) => {
    const count = bucket.indices.length;
    const avgRecency = Number((bucket.sumRecency / count).toFixed(1));
    const avgFrequency = Number((bucket.sumFrequency / count).toFixed(2));
    const avgMonetary = Number((bucket.sumMonetary / count).toFixed(2));
    const avgOrderValue = Number((bucket.sumAov / count).toFixed(2));
    const totalRevenue = Number(bucket.sumMonetary.toFixed(2));

    const details = buildPersonaDetails(
      {
        avgRecency,
        avgFrequency,
        avgMonetary,
        globalRecency: stats.avgRecencyDays,
        globalFrequency: stats.avgFrequency,
        globalMonetary: stats.avgMonetary,
      },
      rankIdx,
      rankedClusters.length,
      usedTitles
    );

    cidToTitle.set(bucket.cid, details.title);
    const palette = CLUSTER_PALETTE[rankIdx % CLUSTER_PALETTE.length];

    const topCountries = Array.from(bucket.countries.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([country]) => country);

    const clusterCustomers: ClusteredCustomer[] = bucket.indices
      .map((idx) => ({
        ...customers[idx],
        clusterId: rankIdx,
        personaTitle: details.title,
        personalityName: details.personalityName,
        badges: assignCustomerBadges(customers[idx], badgeThresholds),
        pc1: Number(pca.projected3D[idx][0].toFixed(4)),
        pc2: Number(pca.projected3D[idx][1].toFixed(4)),
        pc3: Number(pca.projected3D[idx][2].toFixed(4)),
        silhouette: perPoint[idx],
        zRecency: Number(scaled[idx][0].toFixed(3)),
        zFrequency: Number(scaled[idx][1].toFixed(3)),
        zMonetary: Number(scaled[idx][2].toFixed(3)),
      }))
      .sort((a, b) => b.monetary - a.monetary);

    personas.push({
      clusterId: rankIdx,
      title: details.title,
      personalityName: details.personalityName,
      personalityTagline: details.personalityTagline,
      iconKey: details.iconKey,
      subtitle: details.subtitle,
      color: palette.color,
      glowColor: palette.glow,
      customerCount: count,
      customerSharePct: Number(((count / customers.length) * 100).toFixed(1)),
      totalRevenue,
      revenueSharePct: Number(
        ((totalRevenue / Math.max(1, stats.totalRevenue)) * 100).toFixed(1)
      ),
      avgRecency,
      avgFrequency,
      avgMonetary,
      avgOrderValue,
      centroidPCA: [
        Number((bucket.sumPc1 / count).toFixed(3)),
        Number((bucket.sumPc2 / count).toFixed(3)),
      ],
      meanSilhouette: Number((bucket.sumSil / count).toFixed(3)),
      characteristics: details.characteristics,
      marketingStrategy: details.marketingStrategy,
      topCountries,
      topCustomers: clusterCustomers,
    });
  });

  const allClusteredCustomers = personas.flatMap((p) => p.topCustomers);
  const topTenCustomers = [...allClusteredCustomers]
    .sort((a, b) => b.monetary - a.monetary)
    .slice(0, 10);
  const funFacts = computeFunFacts(allClusteredCustomers, stats, personas);

  return {
    k: rankedClusters.length,
    useLogTransform,
    iterations,
    inertia: Number(inertia.toFixed(2)),
    silhouetteScore,
    recommendedK,
    elbowCurve,
    pca,
    customers: allClusteredCustomers,
    topTenCustomers,
    personas,
    funFacts,
    trainedAtIso: new Date().toISOString(),
  };
}
