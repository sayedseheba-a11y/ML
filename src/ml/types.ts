export type AppSection =
  | 'home'
  | 'data'
  | 'segmentation'
  | 'personas'
  | 'insights';

export interface RawTransaction {
  InvoiceNo: string;
  StockCode: string;
  Description: string;
  Quantity: number;
  InvoiceDate: string;
  UnitPrice: number;
  CustomerID: string;
  Country: string;
}

export interface CleanedTransaction extends RawTransaction {
  parsedDate: number;
  TotalPrice: number;
}

export interface CleaningReport {
  rawRowCount: number;
  missingCustomerIdCount: number;
  cancelledInvoiceCount: number;
  nonPositiveQuantityOrPriceCount: number;
  invalidDateCount: number;
  cleanedRowCount: number;
  uniqueCustomers: number;
  uniqueInvoices: number;
  uniqueProducts: number;
  uniqueCountries: number;
}

export interface DatasetStats {
  totalRevenue: number;
  avgOrderValue: number;
  medianCustomerSpend: number;
  avgRecencyDays: number;
  avgFrequency: number;
  avgMonetary: number;
  minDateIso: string;
  maxDateIso: string;
  referenceDateIso: string;
  topCountries: Array<{ country: string; revenue: number; customers: number }>;
}

export interface CustomerRFM {
  customerId: string;
  country: string;
  recency: number;
  frequency: number;
  monetary: number;
  avgOrderValue: number;
  totalItems: number;
  lastPurchaseIso: string;
}

export interface PCALoadings {
  feature: 'Recency' | 'Frequency' | 'Monetary';
  pc1: number;
  pc2: number;
  pc3: number;
}

export interface PCAResult {
  projected2D: Array<[number, number]>;
  projected3D: Array<[number, number, number]>;
  explainedVarianceRatio: [number, number, number];
  cumulative2DVariance: number;
  loadings: PCALoadings[];
  means: [number, number, number];
  stds: [number, number, number];
}

export interface ElbowPoint {
  k: number;
  inertia: number;
}

export type PersonalityIconKey =
  | 'crown'
  | 'compass'
  | 'tag'
  | 'moon'
  | 'zap'
  | 'gem'
  | 'flame'
  | 'sparkles';

export interface CustomerBadge {
  id: string;
  label: string;
  reason: string;
  tone: 'violet' | 'blue' | 'pink' | 'emerald' | 'amber';
}

export interface FunFact {
  id: string;
  label: string;
  headline: string;
  detail: string;
}

export interface ClusteredCustomer extends CustomerRFM {
  clusterId: number;
  personaTitle: string;
  personalityName: string;
  badges: CustomerBadge[];
  pc1: number;
  pc2: number;
  pc3: number;
  silhouette: number;
  zRecency: number;
  zFrequency: number;
  zMonetary: number;
}

export interface ClusterPersonaSummary {
  clusterId: number;
  title: string;
  personalityName: string;
  personalityTagline: string;
  iconKey: PersonalityIconKey;
  subtitle: string;
  color: string;
  glowColor: string;
  customerCount: number;
  customerSharePct: number;
  totalRevenue: number;
  revenueSharePct: number;
  avgRecency: number;
  avgFrequency: number;
  avgMonetary: number;
  avgOrderValue: number;
  centroidPCA: [number, number];
  meanSilhouette: number;
  characteristics: string[];
  marketingStrategy: string[];
  topCountries: string[];
  topCustomers: ClusteredCustomer[];
}

export interface SegmentationResult {
  k: number;
  useLogTransform: boolean;
  iterations: number;
  inertia: number;
  silhouetteScore: number;
  recommendedK: number;
  elbowCurve: ElbowPoint[];
  pca: PCAResult;
  customers: ClusteredCustomer[];
  topTenCustomers: ClusteredCustomer[];
  personas: ClusterPersonaSummary[];
  funFacts: FunFact[];
  trainedAtIso: string;
}
