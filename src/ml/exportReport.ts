import { CleaningReport, DatasetStats, SegmentationResult } from './types';

function triggerDownload(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadSummaryReport(
  datasetName: string,
  cleaning: CleaningReport,
  stats: DatasetStats,
  seg: SegmentationResult
) {
  const lines: string[] = [
    '# PersonaPulse — Customer Segmentation Executive Report',
    `Generated: ${new Date(seg.trainedAtIso).toLocaleString()}`,
    `Dataset: ${datasetName}`,
    '',
    '## 1. Data Preprocessing & Cleaning Summary',
    `- Raw Transaction Rows: ${cleaning.rawRowCount.toLocaleString()}`,
    `- Removed Missing CustomerID Rows: ${cleaning.missingCustomerIdCount.toLocaleString()}`,
    `- Removed Cancelled Invoices (C*): ${cleaning.cancelledInvoiceCount.toLocaleString()}`,
    `- Removed Non-Positive Quantity/Price: ${cleaning.nonPositiveQuantityOrPriceCount.toLocaleString()}`,
    `- Valid Cleaned Transactions: ${cleaning.cleanedRowCount.toLocaleString()}`,
    `- Unique Segmented Customers: ${cleaning.uniqueCustomers.toLocaleString()}`,
    `- Date Window: ${stats.minDateIso} to ${stats.maxDateIso} (Reference: ${stats.referenceDateIso})`,
    `- Total Revenue: £${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    '',
    '## 2. Machine Learning Configuration & Evaluation',
    `- Feature Matrix: RFM (Recency, Frequency, Monetary)`,
    `- Scaling: ${seg.useLogTransform ? 'log1p + StandardScaler (z-score)' : 'StandardScaler (z-score)'}`,
    `- PCA Variance Explained: PC1 ${(seg.pca.explainedVarianceRatio[0] * 100).toFixed(1)}%, PC2 ${(seg.pca.explainedVarianceRatio[1] * 100).toFixed(1)}% (Cumulative 2D: ${(seg.pca.cumulative2DVariance * 100).toFixed(1)}%)`,
    `- K-Means Clusters (k): ${seg.k} (Recommended Elbow k = ${seg.recommendedK})`,
    `- Converged Iterations: ${seg.iterations}`,
    `- Final WCSS Inertia: ${seg.inertia.toLocaleString()}`,
    `- Mean Silhouette Score: ${seg.silhouetteScore.toFixed(4)}`,
    '',
    '## 3. Identified Customer Personas',
  ];

  for (const p of seg.personas) {
    lines.push('');
    lines.push(`### ${p.title} (${p.customerCount} customers · ${p.customerSharePct}% of base)`);
    lines.push(`- Revenue Contribution: £${p.totalRevenue.toLocaleString()} (${p.revenueSharePct}% of total revenue)`);
    lines.push(`- Avg Recency: ${p.avgRecency} days | Avg Frequency: ${p.avgFrequency} orders | Avg Spend: £${p.avgMonetary.toLocaleString()}`);
    lines.push(`- Silhouette Score: ${p.meanSilhouette}`);
    lines.push(`- Characteristics: ${p.characteristics.join('; ')}`);
    lines.push(`- Recommended Actions:`);
    for (const strat of p.marketingStrategy) {
      lines.push(`  * ${strat}`);
    }
  }

  triggerDownload(
    `personapulse_report_k${seg.k}.md`,
    lines.join('\n'),
    'text/markdown;charset=utf-8'
  );
}

export function downloadSegmentedCSV(seg: SegmentationResult) {
  const header = [
    'CustomerID',
    'Country',
    'ClusterID',
    'Persona',
    'Recency_Days',
    'Frequency_Orders',
    'Monetary_GBP',
    'AvgOrderValue_GBP',
    'PC1',
    'PC2',
    'SilhouetteScore',
  ].join(',');

  const rows = seg.customers.map((c) =>
    [
      `"${c.customerId}"`,
      `"${c.country}"`,
      c.clusterId,
      `"${c.personaTitle}"`,
      c.recency,
      c.frequency,
      c.monetary.toFixed(2),
      c.avgOrderValue.toFixed(2),
      c.pc1.toFixed(4),
      c.pc2.toFixed(4),
      c.silhouette.toFixed(4),
    ].join(',')
  );

  triggerDownload(
    `personapulse_customers_k${seg.k}.csv`,
    [header, ...rows].join('\n'),
    'text/csv;charset=utf-8'
  );
}

export function downloadPythonReferenceScript(k: number, useLogTransform: boolean) {
  const code = `"""
PersonaPulse — Customer Segmentation Pipeline (Python / Scikit-learn Reference)
Implements RFM Feature Engineering, StandardScaler, PCA, and K-Means Clustering
on the UCI Online Retail Dataset.
"""

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

# 1. Load & Clean UCI Online Retail Dataset
df = pd.read_csv("OnlineRetail.csv", encoding="ISO-8859-1")
df = df.dropna(subset=["CustomerID"])
df = df[~df["InvoiceNo"].astype(str).str.startswith("C")]
df = df[(df["Quantity"] > 0) & (df["UnitPrice"] > 0)]
df["InvoiceDate"] = pd.to_datetime(df["InvoiceDate"])
df["TotalPrice"] = df["Quantity"] * df["UnitPrice"]

# 2. RFM Feature Engineering
reference_date = df["InvoiceDate"].max() + pd.Timedelta(days=1)
rfm = df.groupby("CustomerID").agg(
    Recency=("InvoiceDate", lambda x: (reference_date - x.max()).days),
    Frequency=("InvoiceNo", "nunique"),
    Monetary=("TotalPrice", "sum"),
).reset_index()

# 3. Feature Scaling
features = rfm[["Recency", "Frequency", "Monetary"]].copy()
${
  useLogTransform
    ? 'features = np.log1p(features)  # Log-transform right-skewed retail distributions'
    : '# Using raw linear RFM features without log transform'
}
scaler = StandardScaler()
X_scaled = scaler.fit_transform(features)

# 4. PCA Dimensionality Reduction
pca = PCA(n_components=2, random_state=42)
X_pca = pca.fit_transform(X_scaled)
rfm["PC1"] = X_pca[:, 0]
rfm["PC2"] = X_pca[:, 1]
print("PCA Explained Variance Ratio:", pca.explained_variance_ratio_)

# 5. Elbow Method & K-Means Clustering (k=${k})
inertias = []
for k_val in range(2, 9):
    km = KMeans(n_clusters=k_val, init="k-means++", n_init=10, random_state=42)
    km.fit(X_scaled)
    inertias.append((k_val, km.inertia_))

model = KMeans(n_clusters=${k}, init="k-means++", n_init=10, random_state=42)
rfm["Cluster"] = model.fit_predict(X_scaled)
score = silhouette_score(X_scaled, rfm["Cluster"])
print(f"Silhouette Score (k=${k}): {score:.4f}")

# 6. Cluster Summary
print(rfm.groupby("Cluster")[["Recency", "Frequency", "Monetary"]].mean().round(2))
`;

  triggerDownload(
    `personapulse_sklearn_k${k}.py`,
    code,
    'text/x-python;charset=utf-8'
  );
}
