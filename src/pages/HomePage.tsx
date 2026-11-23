import { ArrowRight, Layers, Sparkles, TrendingUp, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { SurpriseInsightCard } from '../components/PersonalityAndBadges';
import { AppSection, CleaningReport, DatasetStats, SegmentationResult } from '../ml/types';

interface HomePageProps {
  hasData: boolean;
  datasetName: string;
  cleaningReport: CleaningReport | null;
  stats: DatasetStats | null;
  segmentation: SegmentationResult | null;
  onNavigate: (section: AppSection) => void;
  onLoadSample: () => void;
}

export function HomePage({
  hasData,
  datasetName,
  cleaningReport,
  stats,
  segmentation,
  onNavigate,
  onLoadSample,
}: HomePageProps) {
  const totalCustomers = stats ? cleaningReport?.uniqueCustomers ?? 0 : 0;
  const totalRevenue = stats?.totalRevenue ?? 0;
  const clusterCount = segmentation?.k ?? 0;

  return (
    <div className="space-y-8">
      {/* Animated Welcome Hero */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-2xl glass-surface p-7 sm:p-10"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-gradient-to-br from-violet-600/30 via-blue-500/20 to-pink-500/25 blur-3xl"
        />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-violet-300 font-medium">
              <span>Customer Intelligence Platform</span>
              <span aria-hidden="true" className="text-slate-500">·</span>
              <span className="text-slate-300">PCA + K-Means Clustering</span>
              {hasData && (
                <>
                  <span aria-hidden="true" className="text-slate-500">·</span>
                  <span className="text-slate-400">{datasetName}</span>
                </>
              )}
            </div>

            <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.12] [text-wrap:balance]">
              Turn Raw Retail Transactions Into{' '}
              <span className="bg-gradient-to-r from-violet-300 via-blue-300 to-pink-300 bg-clip-text text-transparent">
                Actionable Customer Personas
              </span>
            </h1>

            <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl">
              PersonaPulse cleans real transaction records, engineers Recency, Frequency,
              and Monetary (RFM) features, reduces dimensionality with Principal Component
              Analysis, and discovers distinct buyer segments using K-Means clustering.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => onNavigate('data')}
                className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 via-blue-600 to-pink-600 hover:brightness-110 transition-all shadow-lg shadow-violet-700/30 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Explore Customers</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {hasData ? (
                <button
                  type="button"
                  onClick={() => onNavigate('segmentation')}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium text-slate-200 bg-white/8 hover:bg-white/12 border border-white/15 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Open AI Segmentation</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onLoadSample}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium text-slate-200 bg-white/8 hover:bg-white/12 border border-white/15 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Load UCI Sample Data</span>
                </button>
              )}
            </div>
          </div>

          {/* Mini Live Model Summary Panel */}
          <div className="lg:col-span-4 rounded-xl bg-[#070B19]/70 border border-white/10 p-5 space-y-4">
            <div className="text-xs font-medium text-slate-400">
              Active Pipeline Snapshot
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-white/10">
                <span className="text-slate-400">2D PCA Variance</span>
                <span className="font-mono text-white tabular-nums">
                  {segmentation
                    ? `${(segmentation.pca.cumulative2DVariance * 100).toFixed(1)}%`
                    : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/10">
                <span className="text-slate-400">Silhouette Score</span>
                <span className="font-mono text-violet-300 tabular-nums">
                  {segmentation ? segmentation.silhouetteScore.toFixed(3) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/10">
                <span className="text-slate-400">Cleaned Orders</span>
                <span className="font-mono text-white tabular-nums">
                  {cleaningReport
                    ? cleaningReport.uniqueInvoices.toLocaleString()
                    : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-400">Date Span</span>
                <span className="font-mono text-xs text-slate-200 tabular-nums">
                  {stats ? `${stats.minDateIso} to ${stats.maxDateIso}` : 'No dataset'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Primary KPI Strip */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="rounded-2xl glass-surface glass-surface-hover p-6 space-y-3"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-sm font-medium">Total Customers</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="font-display text-3xl sm:text-4xl font-bold text-white">
            <AnimatedNumber value={totalCustomers} />
          </div>
          <p className="text-xs text-slate-400">
            {hasData
              ? `Aggregated from ${cleaningReport?.cleanedRowCount.toLocaleString()} valid transactions`
              : 'Upload a CSV or load the UCI Online Retail sample'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="rounded-2xl glass-surface glass-surface-hover p-6 space-y-3"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-sm font-medium">Total Revenue</span>
            <TrendingUp className="w-4 h-4 text-pink-400" />
          </div>
          <div className="font-display text-3xl sm:text-4xl font-bold text-white">
            <AnimatedNumber value={totalRevenue} prefix="£" decimals={0} />
          </div>
          <p className="text-xs text-slate-400">
            {stats
              ? `Mean order value £${stats.avgOrderValue.toFixed(2)} across ${cleaningReport?.uniqueCountries} countries`
              : 'Calculated after removing cancellations and invalid rows'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="rounded-2xl glass-surface glass-surface-hover p-6 space-y-3"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-sm font-medium">Customer Groups</span>
            <Layers className="w-4 h-4 text-violet-400" />
          </div>
          <div className="font-display text-3xl sm:text-4xl font-bold text-white">
            <AnimatedNumber value={clusterCount} />
          </div>
          <p className="text-xs text-slate-400">
            {segmentation
              ? `Optimal Elbow recommendation: k = ${segmentation.recommendedK}`
              : 'Train K-Means to discover distinct buyer personas'}
          </p>
        </motion.div>
      </section>

      {/* Surprise Insight + Fun Customer Facts */}
      {segmentation && segmentation.funFacts.length > 0 && (
        <section className="space-y-5">
          <SurpriseInsightCard facts={segmentation.funFacts} />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {segmentation.funFacts.slice(0, 3).map((fact) => (
              <div
                key={fact.id}
                className="rounded-2xl glass-surface p-5 space-y-2"
              >
                <div className="text-xs font-medium text-violet-300">
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
      )}

      {/* Pipeline Overview */}
      <section className="rounded-2xl glass-surface p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-white">
              How the Machine Learning Pipeline Works
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Four transparent stages executed directly on your retail transaction data.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('personas')}
            className="inline-flex items-center gap-2 text-xs font-medium text-violet-300 hover:text-violet-200 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>View Identified Personas</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-2">
          {[
            {
              step: '01. Data Preprocessing',
              desc: 'Filters missing CustomerIDs, credit cancellations (C*), and non-positive quantities or unit prices.',
              target: 'data' as AppSection,
            },
            {
              step: '02. RFM Engineering',
              desc: 'Aggregates customer Recency (days), Frequency (orders), and Monetary (£ spend) metrics.',
              target: 'data' as AppSection,
            },
            {
              step: '03. StandardScaler + PCA',
              desc: 'Applies log1p scaling, z-score normalization, and eigendecomposition into PC1 & PC2 axes.',
              target: 'segmentation' as AppSection,
            },
            {
              step: '04. K-Means & Personas',
              desc: 'Groups customers using K-Means++, validates with Elbow & Silhouette, and builds marketing profiles.',
              target: 'personas' as AppSection,
            },
          ].map((stage) => (
            <button
              key={stage.step}
              type="button"
              onClick={() => onNavigate(stage.target)}
              className="text-left p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 transition-colors space-y-2 cursor-pointer"
            >
              <div className="text-sm font-semibold text-white">{stage.step}</div>
              <p className="text-xs text-slate-400 leading-relaxed">{stage.desc}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
