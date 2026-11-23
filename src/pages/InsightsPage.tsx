import { BarChart3, Code2, Download, FileSpreadsheet, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import {
  ClusterComparisonChart,
  DistributionChart,
  PCAScatterPlot,
} from '../components/Charts';
import {
  CustomerBadgeList,
  PersonalityIcon,
  SurpriseInsightCard,
} from '../components/PersonalityAndBadges';
import {
  downloadPythonReferenceScript,
  downloadSegmentedCSV,
  downloadSummaryReport,
} from '../ml/exportReport';
import {
  CleaningReport,
  DatasetStats,
  SegmentationResult,
} from '../ml/types';

interface InsightsPageProps {
  hasData: boolean;
  datasetName: string;
  cleaningReport: CleaningReport | null;
  stats: DatasetStats | null;
  segmentation: SegmentationResult | null;
  onGoToSegmentation: () => void;
  onLoadSample: () => void;
}

export function InsightsPage({
  hasData,
  datasetName,
  cleaningReport,
  stats,
  segmentation,
  onGoToSegmentation,
  onLoadSample,
}: InsightsPageProps) {
  if (!hasData || !cleaningReport || !stats || !segmentation) {
    return (
      <section className="rounded-2xl glass-surface p-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-violet-500/15 border border-violet-400/25 flex items-center justify-center mx-auto">
          <BarChart3 className="w-6 h-6 text-violet-300" />
        </div>
        <h3 className="font-display text-lg font-semibold text-white">
          Insights Ready After Segmentation
        </h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Run the PCA + K-Means segmentation pipeline to unlock revenue concentration charts, the Top 10 Leaderboard, Fun Facts, and downloadable reports.
        </p>
        <button
          type="button"
          onClick={hasData ? onGoToSegmentation : onLoadSample}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:brightness-110 transition-all cursor-pointer"
        >
          {hasData ? 'Train Model Now' : 'Load UCI Sample Data'}
        </button>
      </section>
    );
  }

  const topPersona = segmentation.personas[0];
  const highestRiskPersona = [...segmentation.personas].sort(
    (a, b) => b.avgRecency - a.avgRecency
  )[0];
  const personaById = new Map(
    segmentation.personas.map((p) => [p.clusterId, p])
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Download & Export Header */}
      <section className="rounded-2xl glass-surface p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-white">
            Executive Insights & Report Export
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {topPersona.title} ({topPersona.customerSharePct}% of users) generate{' '}
            <strong className="text-white">{topPersona.revenueSharePct}%</strong> of total cohort revenue (£
            {topPersona.totalRevenue.toLocaleString()}).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() =>
              downloadSummaryReport(
                datasetName,
                cleaningReport,
                stats,
                segmentation
              )
            }
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-600 via-blue-600 to-pink-600 hover:brightness-110 transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Summary Report</span>
          </button>

          <button
            type="button"
            onClick={() => downloadSegmentedCSV(segmentation)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-200 bg-white/8 hover:bg-white/12 border border-white/15 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Clusters CSV</span>
          </button>

          <button
            type="button"
            onClick={() =>
              downloadPythonReferenceScript(
                segmentation.k,
                segmentation.useLogTransform
              )
            }
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-200 bg-white/8 hover:bg-white/12 border border-white/15 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Python Sklearn Script</span>
          </button>
        </div>
      </section>

      {/* Surprise Insight Interactive Card */}
      <SurpriseInsightCard facts={segmentation.funFacts} />

      {/* Top 10 Customers Leaderboard + Behavioral Badges */}
      <section className="rounded-2xl glass-surface p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-amber-300 shrink-0" />
            <div>
              <h3 className="font-display text-lg font-semibold text-white">
                Customer Leaderboard — Top 10 by Spending
              </h3>
              <p className="text-xs text-slate-400">
                Ranked from actual Monetary totals with automatically assigned behavioral badges.
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono tabular-nums">
            Showing #1 – #{segmentation.topTenCustomers.length}
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-white/[0.04] text-slate-300 border-b border-white/10">
                <th className="py-3 px-4 font-semibold">Rank</th>
                <th className="py-3 px-4 font-semibold">CustomerID</th>
                <th className="py-3 px-4 font-semibold">Segment Personality</th>
                <th className="py-3 px-4 font-semibold">Badges</th>
                <th className="py-3 px-4 font-semibold text-right">Orders</th>
                <th className="py-3 px-4 font-semibold text-right">Recency</th>
                <th className="py-3 px-4 font-semibold text-right">Total Spend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {segmentation.topTenCustomers.map((cust, idx) => {
                const persona = personaById.get(cust.clusterId);
                return (
                  <tr key={cust.customerId} className="hover:bg-white/[0.03]">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-200 tabular-nums">
                      #{idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono font-semibold text-white">
                        #{cust.customerId}
                      </div>
                      <div className="text-[11px] text-slate-400">{cust.country}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {persona && (
                          <PersonalityIcon
                            iconKey={persona.iconKey}
                            className="w-3.5 h-3.5 shrink-0"
                            color={persona.color}
                          />
                        )}
                        <div>
                          <div className="font-medium text-slate-100">
                            {cust.personalityName}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {cust.personaTitle}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <CustomerBadgeList badges={cust.badges} compact />
                    </td>
                    <td className="py-3 px-4 font-mono text-right text-slate-200 tabular-nums">
                      {cust.frequency}
                    </td>
                    <td className="py-3 px-4 font-mono text-right text-slate-300 tabular-nums">
                      {cust.recency}d
                    </td>
                    <td className="py-3 px-4 font-mono text-right font-semibold text-violet-300 tabular-nums">
                      £{cust.monetary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Automatically Calculated Fun Customer Facts */}
      <section className="space-y-3">
        <h3 className="font-display text-lg font-semibold text-white">
          Fun Customer Facts
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {segmentation.funFacts.slice(0, 6).map((fact) => (
            <div
              key={fact.id}
              className="rounded-2xl glass-surface p-5 space-y-1.5"
            >
              <div className="text-xs font-medium text-blue-300">
                {fact.label}
              </div>
              <div className="text-sm font-semibold text-white leading-snug">
                {fact.headline}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {fact.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Cluster Comparison & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-6 rounded-2xl glass-surface p-6 space-y-4">
          <h3 className="font-display text-lg font-semibold text-white">
            Customer Spending Patterns
          </h3>
          <ClusterComparisonChart personas={segmentation.personas} />
        </section>

        <section className="lg:col-span-6 rounded-2xl glass-surface p-6 space-y-4">
          <h3 className="font-display text-lg font-semibold text-white">
            Customer Distribution vs. Revenue Share
          </h3>
          <DistributionChart personas={segmentation.personas} />
        </section>
      </div>

      {/* PCA Recap + Marketing Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 rounded-2xl glass-surface p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-white">
              PCA Cluster Separation Overview
            </h3>
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              Silhouette {segmentation.silhouetteScore.toFixed(3)} · Variance{' '}
              {(segmentation.pca.cumulative2DVariance * 100).toFixed(1)}%
            </span>
          </div>
          <PCAScatterPlot
            customers={segmentation.customers}
            personas={segmentation.personas}
            explainedVarianceRatio={segmentation.pca.explainedVarianceRatio}
            loadings={segmentation.pca.loadings}
            height={340}
          />
        </section>

        <section className="lg:col-span-5 rounded-2xl glass-surface p-6 space-y-5">
          <div>
            <h3 className="font-display text-lg font-semibold text-white">
              Marketing Recommendations
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Prioritized actions derived from cluster size, spend, and churn recency.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5">
              <div className="text-xs font-semibold text-violet-300">
                1. Protect Core Revenue ({topPersona.title})
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {topPersona.customerCount} customers average £
                {topPersona.avgMonetary.toLocaleString(undefined, { maximumFractionDigits: 0 })}{' '}
                across {topPersona.avgFrequency.toFixed(1)} orders. Prioritize VIP retention perks over margin-eroding coupons.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5">
              <div className="text-xs font-semibold text-pink-300">
                2. Win-Back Dormant Revenue ({highestRiskPersona.title})
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Mean recency has reached {highestRiskPersona.avgRecency.toFixed(0)} days across{' '}
                {highestRiskPersona.customerCount} accounts (£
                {highestRiskPersona.totalRevenue.toLocaleString()} historical value). Deploy automated reactivation incentives.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5">
              <div className="text-xs font-semibold text-blue-300">
                3. Cross-Market Expansion
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Top revenue markets:{' '}
                {stats.topCountries
                  .slice(0, 3)
                  .map((c) => `${c.country} (£${c.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })})`)
                  .join(', ')}
                . Localize seasonal bundles for high-AOV regional cohorts.
              </p>
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  );
}
