import { Cpu, Eye, Loader2, Play, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { AnimatedNumber } from '../components/AnimatedNumber';
import {
  BeforeAfterComparisonChart,
  ElbowChart,
  PCAScatterPlot,
} from '../components/Charts';
import { CustomerBadgeList } from '../components/PersonalityAndBadges';
import { AppSection, ClusteredCustomer, SegmentationResult } from '../ml/types';

interface SegmentationPageProps {
  hasData: boolean;
  selectedK: number;
  useLogTransform: boolean;
  isTraining: boolean;
  segmentation: SegmentationResult | null;
  onChangeK: (k: number) => void;
  onToggleLogTransform: (val: boolean) => void;
  onTrainModel: (kOverride?: number, logOverride?: boolean) => void;
  onNavigate: (section: AppSection) => void;
  onLoadSample: () => void;
}

export function SegmentationPage({
  hasData,
  selectedK,
  useLogTransform,
  isTraining,
  segmentation,
  onChangeK,
  onToggleLogTransform,
  onTrainModel,
  onNavigate,
  onLoadSample,
}: SegmentationPageProps) {
  const [showBiplot, setShowBiplot] = useState(true);
  const [inspectedCustomer, setInspectedCustomer] = useState<ClusteredCustomer | null>(
    null
  );

  if (!hasData) {
    return (
      <section className="rounded-2xl glass-surface p-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-violet-500/15 border border-violet-400/25 flex items-center justify-center mx-auto">
          <Cpu className="w-6 h-6 text-violet-300" />
        </div>
        <h3 className="font-display text-lg font-semibold text-white">
          Dataset Required Before Training
        </h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Load the UCI Online Retail sample or upload a transaction CSV first so StandardScaler, PCA, and K-Means can run on real customer RFM features.
        </p>
        <button
          type="button"
          onClick={onLoadSample}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:brightness-110 transition-all cursor-pointer"
        >
          Load Sample & Train Model
        </button>
      </section>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Model Hyperparameter Controls */}
      <section className="rounded-2xl glass-surface p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-white">
              PCA + K-Means Clustering Studio
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Configure cluster count and feature scaling, then train K-Means on standardized RFM vectors.
            </p>
          </div>
          <button
            type="button"
            disabled={isTraining}
            onClick={() => onTrainModel()}
            className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 via-blue-600 to-pink-600 hover:brightness-110 disabled:opacity-60 transition-all shadow-lg shadow-violet-700/25 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isTraining ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Training Model...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Train Model (k = {selectedK})</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-2 border-t border-white/10">
          {/* Cluster Count Slider & Quick Buttons */}
          <div className="md:col-span-7 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="cluster-k-slider" className="font-medium text-slate-200">
                Number of Clusters (k)
              </label>
              <span className="font-mono text-violet-300 font-semibold tabular-nums">
                k = {selectedK}
                {segmentation && selectedK === segmentation.recommendedK
                  ? ' · Optimal Elbow'
                  : ''}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input
                id="cluster-k-slider"
                type="range"
                min={2}
                max={8}
                step={1}
                value={selectedK}
                onChange={(e) => onChangeK(Number(e.target.value))}
                className="flex-1 min-w-[160px] accent-violet-500 cursor-pointer"
              />
              <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-white/5 border border-white/10">
                {[2, 3, 4, 5, 6, 7, 8].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      onChangeK(val);
                      onTrainModel(val, useLogTransform);
                    }}
                    className={`w-7 h-7 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                      selectedK === val
                        ? 'bg-violet-600 text-white font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preprocessing Toggle */}
          <div className="md:col-span-5 flex flex-col justify-between gap-2 p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-medium text-white">
                  Log1p Skewness Transform + StandardScaler
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Compresses extreme retail spend outliers before z-scoring
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={useLogTransform}
                onClick={() => {
                  const next = !useLogTransform;
                  onToggleLogTransform(next);
                  onTrainModel(selectedK, next);
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                  useLogTransform ? 'bg-violet-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    useLogTransform ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </section>

      {segmentation && (
        <>
          {/* Evaluation Metrics Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl glass-surface p-5 space-y-1.5">
              <div className="text-xs text-slate-400">Silhouette Score</div>
              <div className="font-mono text-2xl font-bold text-violet-300 tabular-nums">
                <AnimatedNumber value={segmentation.silhouetteScore} decimals={3} />
              </div>
              <div className="text-[11px] text-slate-400">
                {segmentation.silhouetteScore >= 0.45
                  ? 'Strong cluster separation'
                  : segmentation.silhouetteScore >= 0.3
                    ? 'Moderate cluster separation'
                    : 'Overlapping segments'}
              </div>
            </div>

            <div className="rounded-2xl glass-surface p-5 space-y-1.5">
              <div className="text-xs text-slate-400">2D PCA Variance Retained</div>
              <div className="font-mono text-2xl font-bold text-blue-300 tabular-nums">
                <AnimatedNumber
                  value={segmentation.pca.cumulative2DVariance * 100}
                  decimals={1}
                  suffix="%"
                />
              </div>
              <div className="text-[11px] text-slate-400">
                PC1 {(segmentation.pca.explainedVarianceRatio[0] * 100).toFixed(1)}% · PC2{' '}
                {(segmentation.pca.explainedVarianceRatio[1] * 100).toFixed(1)}%
              </div>
            </div>

            <div className="rounded-2xl glass-surface p-5 space-y-1.5">
              <div className="text-xs text-slate-400">WCSS Inertia</div>
              <div className="font-mono text-2xl font-bold text-pink-300 tabular-nums">
                <AnimatedNumber value={segmentation.inertia} decimals={1} />
              </div>
              <div className="text-[11px] text-slate-400">
                Converged in {segmentation.iterations} iterations
              </div>
            </div>

            <div className="rounded-2xl glass-surface p-5 space-y-1.5">
              <div className="text-xs text-slate-400">Recommended Elbow k</div>
              <div className="font-mono text-2xl font-bold text-white tabular-nums">
                k = {segmentation.recommendedK}
              </div>
              <div className="text-[11px] text-slate-400">
                <button
                  type="button"
                  onClick={() => onNavigate('personas')}
                  className="text-violet-300 hover:text-violet-200 cursor-pointer"
                >
                  Inspect {segmentation.k} Persona Cards →
                </button>
              </div>
            </div>
          </div>

          {/* PCA Scatter Plot (Primary Focal Anchor) */}
          <section className="rounded-2xl glass-surface p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold text-white">
                  PCA 2D Cluster Projection
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Hover or click any customer point to inspect RFM metrics and principal component coordinates. Crosshairs mark K-Means centroids.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowBiplot((prev) => !prev)}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  showBiplot
                    ? 'bg-pink-500/20 text-pink-200 border border-pink-400/35'
                    : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showBiplot ? 'Hide RFM Vectors' : 'Show RFM Vectors'}</span>
              </button>
            </div>

            <PCAScatterPlot
              customers={segmentation.customers}
              personas={segmentation.personas}
              explainedVarianceRatio={segmentation.pca.explainedVarianceRatio}
              loadings={segmentation.pca.loadings}
              showBiplot={showBiplot}
              selectedCustomerId={inspectedCustomer?.customerId ?? null}
              onSelectCustomer={(c) => setInspectedCustomer(c)}
            />

            {inspectedCustomer && (
              <div className="rounded-xl bg-white/[0.04] border border-white/10 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs text-slate-400">
                      Selected Customer · {inspectedCustomer.country} · {inspectedCustomer.personalityName}
                    </div>
                    <div className="text-sm font-semibold text-white">
                      Customer #{inspectedCustomer.customerId} —{' '}
                      <span className="text-violet-300">
                        {inspectedCustomer.personaTitle}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-6 text-xs">
                    <div>
                      <div className="text-slate-400">Recency</div>
                      <div className="font-mono text-white tabular-nums">
                        {inspectedCustomer.recency} days
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">Frequency</div>
                      <div className="font-mono text-white tabular-nums">
                        {inspectedCustomer.frequency} orders
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">Monetary</div>
                      <div className="font-mono text-white tabular-nums">
                        £{inspectedCustomer.monetary.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">PCA (PC1, PC2)</div>
                      <div className="font-mono text-blue-300 tabular-nums">
                        ({inspectedCustomer.pc1.toFixed(2)}, {inspectedCustomer.pc2.toFixed(2)})
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">Point Silhouette</div>
                      <div className="font-mono text-pink-300 tabular-nums">
                        {inspectedCustomer.silhouette.toFixed(3)}
                      </div>
                    </div>
                  </div>
                </div>
                <CustomerBadgeList badges={inspectedCustomer.badges} />
              </div>
            )}
          </section>

          {/* Before vs After Clustering Comparison */}
          <section className="rounded-2xl glass-surface p-6">
            <BeforeAfterComparisonChart
              customers={segmentation.customers}
              personas={segmentation.personas}
              explainedVarianceRatio={segmentation.pca.explainedVarianceRatio}
            />
          </section>

          {/* Elbow Method & PCA Component Loadings */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-7 rounded-2xl glass-surface p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold text-white">
                  Elbow Method (WCSS Inertia)
                </h3>
                <span className="inline-flex items-center gap-1.5 text-xs text-pink-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Best k = {segmentation.recommendedK}</span>
                </span>
              </div>
              <ElbowChart
                curve={segmentation.elbowCurve}
                selectedK={segmentation.k}
                recommendedK={segmentation.recommendedK}
                onSelectK={(kVal) => {
                  onChangeK(kVal);
                  onTrainModel(kVal, useLogTransform);
                }}
              />
            </section>

            <section className="lg:col-span-5 rounded-2xl glass-surface p-6 space-y-4">
              <div>
                <h3 className="font-display text-lg font-semibold text-white">
                  PCA Feature Loadings Matrix
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Contribution of standardized RFM features to each principal component axis.
                </p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-white/[0.04] text-slate-300 border-b border-white/10">
                      <th className="py-3 px-4 font-semibold">Feature</th>
                      <th className="py-3 px-4 font-semibold text-right">PC1</th>
                      <th className="py-3 px-4 font-semibold text-right">PC2</th>
                      <th className="py-3 px-4 font-semibold text-right">PC3</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {segmentation.pca.loadings.map((row) => (
                      <tr key={row.feature} className="hover:bg-white/[0.03]">
                        <td className="py-3 px-4 font-medium text-white">
                          {row.feature}
                        </td>
                        <td className="py-3 px-4 font-mono text-right text-blue-300 tabular-nums">
                          {row.pc1 >= 0 ? `+${row.pc1.toFixed(3)}` : row.pc1.toFixed(3)}
                        </td>
                        <td className="py-3 px-4 font-mono text-right text-violet-300 tabular-nums">
                          {row.pc2 >= 0 ? `+${row.pc2.toFixed(3)}` : row.pc2.toFixed(3)}
                        </td>
                        <td className="py-3 px-4 font-mono text-right text-slate-400 tabular-nums">
                          {row.pc3 >= 0 ? `+${row.pc3.toFixed(3)}` : row.pc3.toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-xs text-slate-400 leading-relaxed">
                Positive PC1 values indicate higher purchase frequency and monetary spend; PC2 primarily captures recency contrast across buyer segments.
              </div>
            </section>
          </div>
        </>
      )}
    </motion.div>
  );
}
