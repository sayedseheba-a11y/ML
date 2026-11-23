import { ChevronDown, ChevronUp, Sparkles, Users } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { AnimatedNumber } from '../components/AnimatedNumber';
import {
  CustomerBadgeList,
  PersonalityIcon,
} from '../components/PersonalityAndBadges';
import { ClusterPersonaSummary, SegmentationResult } from '../ml/types';

interface PersonasPageProps {
  hasData: boolean;
  segmentation: SegmentationResult | null;
  onGoToSegmentation: () => void;
  onLoadSample: () => void;
}

function PersonaCard({
  persona,
  forceRevealed,
}: {
  persona: ClusterPersonaSummary;
  forceRevealed: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setRevealed(forceRevealed);
  }, [forceRevealed]);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl glass-surface glass-surface-hover p-6 space-y-5"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
            style={{
              backgroundColor: `${persona.color}18`,
              borderColor: `${persona.color}4D`,
            }}
          >
            <PersonalityIcon
              iconKey={persona.iconKey}
              className="w-5 h-5"
              color={persona.color}
            />
          </div>
          <div className="space-y-1 min-w-0">
            <h3 className="font-display text-xl font-semibold text-white">
              {persona.title}
            </h3>
            <p className="text-xs text-slate-400">{persona.subtitle}</p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="font-mono text-sm font-semibold text-white tabular-nums">
            <AnimatedNumber value={persona.customerCount} /> users
          </div>
          <div className="text-xs text-slate-400 tabular-nums">
            {persona.customerSharePct}% of cohort · {persona.revenueSharePct}% revenue
          </div>
        </div>
      </div>

      {/* Customer Personality Reveal Interactive Banner */}
      <div className="rounded-xl bg-[#070B19]/75 border border-white/10 p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <AnimatePresence mode="wait">
              {revealed ? (
                <motion.div
                  key="revealed"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-0.5"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-semibold"
                      style={{ color: persona.color }}
                    >
                      {persona.personalityName}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    {persona.personalityTagline}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-slate-400"
                >
                  Segment Personality Archetype ready to reveal from RFM centroid
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={() => setRevealed((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-white/10 hover:bg-white/15 border border-white/15 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-300" />
            <span>{revealed ? 'Hide Personality' : 'Reveal Personality'}</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-3 py-4 border-y border-white/10">
        <div>
          <div className="text-xs text-slate-400">Average Spending</div>
          <div className="font-mono text-lg font-bold text-white mt-0.5 tabular-nums">
            £{persona.avgMonetary.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Purchase Frequency</div>
          <div className="font-mono text-lg font-bold text-blue-300 mt-0.5 tabular-nums">
            {persona.avgFrequency.toFixed(1)} orders
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Avg Recency</div>
          <div className="font-mono text-lg font-bold text-pink-300 mt-0.5 tabular-nums">
            {persona.avgRecency.toFixed(0)} days
          </div>
        </div>
      </div>

      {/* Characteristics & Marketing Strategy */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
        <div className="space-y-2">
          <div className="font-semibold text-slate-200">Customer Characteristics</div>
          <ul className="space-y-1.5 text-slate-400 leading-relaxed">
            {persona.characteristics.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-violet-400 mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <div className="font-semibold text-slate-200">Suggested Marketing Strategy</div>
          <ul className="space-y-1.5 text-slate-300 leading-relaxed">
            {persona.marketingStrategy.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-pink-400 mt-0.5">→</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Expandable Customer Profile Cards */}
      <div className="pt-2 border-t border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            Top markets: {persona.topCountries.join(', ')} · Mean Silhouette:{' '}
            <span className="font-mono text-slate-200 tabular-nums">
              {persona.meanSilhouette.toFixed(3)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-violet-200 bg-violet-500/15 hover:bg-violet-500/25 border border-violet-400/30 transition-colors cursor-pointer"
          >
            <span>
              {expanded
                ? 'Hide Customer Profiles'
                : `Inspect Top Profiles (${Math.min(6, persona.topCustomers.length)})`}
            </span>
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                {persona.topCustomers.slice(0, 6).map((cust) => (
                  <div
                    key={cust.customerId}
                    className="rounded-xl bg-[#070B19]/75 border border-white/10 p-3.5 space-y-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold text-white">
                        #{cust.customerId}
                      </span>
                      <span className="text-slate-400 truncate max-w-[140px]">
                        {cust.country}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <div className="text-[11px] text-slate-400">Recency</div>
                        <div className="font-mono text-slate-200 tabular-nums">
                          {cust.recency}d
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400">Orders</div>
                        <div className="font-mono text-slate-200 tabular-nums">
                          {cust.frequency}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400">Spend</div>
                        <div className="font-mono text-violet-300 tabular-nums">
                          £{cust.monetary.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                    </div>
                    <CustomerBadgeList badges={cust.badges} compact />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  );
}

export function PersonasPage({
  hasData,
  segmentation,
  onGoToSegmentation,
  onLoadSample,
}: PersonasPageProps) {
  const [revealAll, setRevealAll] = useState(true);

  if (!hasData || !segmentation) {
    return (
      <section className="rounded-2xl glass-surface p-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-violet-500/15 border border-violet-400/25 flex items-center justify-center mx-auto">
          <Users className="w-6 h-6 text-violet-300" />
        </div>
        <h3 className="font-display text-lg font-semibold text-white">
          No Personas Generated Yet
        </h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          {hasData
            ? 'Train the K-Means clustering model to generate real customer persona profiles from your dataset.'
            : 'Load a dataset and train the segmentation model to discover customer personas.'}
        </p>
        <button
          type="button"
          onClick={hasData ? onGoToSegmentation : onLoadSample}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:brightness-110 transition-all cursor-pointer"
        >
          {hasData ? 'Go to AI Segmentation' : 'Load UCI Sample & Segment'}
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
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-white">
            Identified Customer Personas ({segmentation.personas.length} Clusters)
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Each cluster reveals a distinct personality archetype, icon, color, and customer behavior badges derived from K-Means centroids.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setRevealAll((prev) => !prev)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-pink-600 hover:brightness-110 transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{revealAll ? 'Collapse Personalities' : 'Reveal All Personalities'}</span>
          </button>

          <button
            type="button"
            onClick={onGoToSegmentation}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-200 bg-white/8 hover:bg-white/12 border border-white/15 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Adjust Clusters (k = {segmentation.k})
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {segmentation.personas.map((persona) => (
          <PersonaCard
            key={persona.clusterId}
            persona={persona}
            forceRevealed={revealAll}
          />
        ))}
      </div>
    </motion.div>
  );
}
