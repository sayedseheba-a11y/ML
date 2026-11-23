import { useMemo, useState } from 'react';
import {
  ClusteredCustomer,
  ClusterPersonaSummary,
  ElbowPoint,
  PCALoadings,
} from '../ml/types';

interface PCAScatterPlotProps {
  customers: ClusteredCustomer[];
  personas: ClusterPersonaSummary[];
  explainedVarianceRatio: [number, number, number];
  loadings: PCALoadings[];
  showBiplot?: boolean;
  selectedCustomerId?: string | null;
  onSelectCustomer?: (customer: ClusteredCustomer) => void;
  height?: number;
}

export function PCAScatterPlot({
  customers,
  personas,
  explainedVarianceRatio,
  loadings,
  showBiplot = false,
  selectedCustomerId = null,
  onSelectCustomer,
  height = 420,
}: PCAScatterPlotProps) {
  const [hovered, setHovered] = useState<ClusteredCustomer | null>(null);
  const [activeClusterFilter, setActiveClusterFilter] = useState<number | null>(null);

  const width = 760;
  const pad = { top: 28, right: 28, bottom: 48, left: 56 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const { xMin, xMax, yMin, yMax } = useMemo(() => {
    if (customers.length === 0) {
      return { xMin: -3, xMax: 3, yMin: -3, yMax: 3 };
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const c of customers) {
      if (c.pc1 < minX) minX = c.pc1;
      if (c.pc1 > maxX) maxX = c.pc1;
      if (c.pc2 < minY) minY = c.pc2;
      if (c.pc2 > maxY) maxY = c.pc2;
    }

    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    return {
      xMin: minX - spanX * 0.1,
      xMax: maxX + spanX * 0.1,
      yMin: minY - spanY * 0.12,
      yMax: maxY + spanY * 0.12,
    };
  }, [customers]);

  const toX = (val: number) =>
    pad.left + ((val - xMin) / Math.max(1e-6, xMax - xMin)) * plotW;
  const toY = (val: number) =>
    pad.top + plotH - ((val - yMin) / Math.max(1e-6, yMax - yMin)) * plotH;

  const personaByCluster = useMemo(() => {
    const map = new Map<number, ClusterPersonaSummary>();
    for (const p of personas) map.set(p.clusterId, p);
    return map;
  }, [personas]);

  const xTicks = useMemo(() => {
    const count = 5;
    return Array.from({ length: count }, (_, i) => xMin + ((xMax - xMin) * i) / (count - 1));
  }, [xMin, xMax]);

  const yTicks = useMemo(() => {
    const count = 5;
    return Array.from({ length: count }, (_, i) => yMin + ((yMax - yMin) * i) / (count - 1));
  }, [yMin, yMax]);

  const loadingScale = Math.min(xMax - xMin, yMax - yMin) * 0.34;
  const zeroX = toX(0);
  const zeroY = toY(0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveClusterFilter(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeClusterFilter === null
                ? 'bg-violet-500/20 text-violet-200 border border-violet-400/40'
                : 'bg-white/5 text-slate-400 border border-white/10 hover:text-slate-200'
            }`}
          >
            All Clusters ({customers.length})
          </button>
          {personas.map((p) => {
            const active = activeClusterFilter === p.clusterId;
            return (
              <button
                key={p.clusterId}
                type="button"
                onClick={() =>
                  setActiveClusterFilter(active ? null : p.clusterId)
                }
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-white/12 text-white border border-white/30'
                    : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/8'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: p.color }}
                />
                <span>{p.title}</span>
                <span className="font-mono text-slate-400 tabular-nums">
                  {p.customerCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative w-full overflow-hidden rounded-xl bg-[#070B19]/80 border border-white/10">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto block select-none"
          role="img"
          aria-label="PCA Customer Segmentation Scatter Plot"
        >
          <defs>
            <radialGradient id="pcaGlowBg" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="rgba(124, 58, 237, 0.12)" />
              <stop offset="100%" stopColor="rgba(7, 11, 25, 0)" />
            </radialGradient>
            <marker
              id="biplotArrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#F472B6" />
            </marker>
          </defs>

          <rect x={pad.left} y={pad.top} width={plotW} height={plotH} fill="url(#pcaGlowBg)" />

          {/* Grid lines */}
          {xTicks.map((t, idx) => {
            const x = toX(t);
            return (
              <g key={`xt-${idx}`}>
                <line
                  x1={x}
                  y1={pad.top}
                  x2={x}
                  y2={pad.top + plotH}
                  stroke="rgba(148, 163, 184, 0.1)"
                  strokeDasharray="3 4"
                />
                <text
                  x={x}
                  y={pad.top + plotH + 18}
                  textAnchor="middle"
                  className="fill-slate-400 text-[11px] font-mono tabular-nums"
                >
                  {t.toFixed(1)}
                </text>
              </g>
            );
          })}

          {yTicks.map((t, idx) => {
            const y = toY(t);
            return (
              <g key={`yt-${idx}`}>
                <line
                  x1={pad.left}
                  y1={y}
                  x2={pad.left + plotW}
                  y2={y}
                  stroke="rgba(148, 163, 184, 0.1)"
                  strokeDasharray="3 4"
                />
                <text
                  x={pad.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 text-[11px] font-mono tabular-nums"
                >
                  {t.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Origin axes */}
          {zeroX >= pad.left && zeroX <= pad.left + plotW && (
            <line
              x1={zeroX}
              y1={pad.top}
              x2={zeroX}
              y2={pad.top + plotH}
              stroke="rgba(148, 163, 184, 0.22)"
            />
          )}
          {zeroY >= pad.top && zeroY <= pad.top + plotH && (
            <line
              x1={pad.left}
              y1={zeroY}
              x2={pad.left + plotW}
              y2={zeroY}
              stroke="rgba(148, 163, 184, 0.22)"
            />
          )}

          {/* Customer Points */}
          {customers.map((c) => {
            const p = personaByCluster.get(c.clusterId);
            const color = p?.color ?? '#A855F7';
            const dimmed =
              activeClusterFilter !== null && c.clusterId !== activeClusterFilter;
            const isSelected = selectedCustomerId === c.customerId;
            const isHovered = hovered?.customerId === c.customerId;
            const cx = toX(c.pc1);
            const cy = toY(c.pc2);

            return (
              <circle
                key={c.customerId}
                cx={cx}
                cy={cy}
                r={isSelected || isHovered ? 6.5 : 4.1}
                fill={color}
                fillOpacity={dimmed ? 0.14 : isSelected || isHovered ? 1 : 0.78}
                stroke={isSelected || isHovered ? '#FFFFFF' : 'rgba(7, 10, 23, 0.7)'}
                strokeWidth={isSelected || isHovered ? 2 : 0.8}
                className="transition-all duration-150 cursor-pointer"
                onMouseEnter={() => setHovered(c)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onSelectCustomer?.(c)}
              />
            );
          })}

          {/* Centroids */}
          {personas.map((p) => {
            const dimmed =
              activeClusterFilter !== null && p.clusterId !== activeClusterFilter;
            const cx = toX(p.centroidPCA[0]);
            const cy = toY(p.centroidPCA[1]);
            return (
              <g
                key={`centroid-${p.clusterId}`}
                style={{ opacity: dimmed ? 0.25 : 1 }}
                className="pointer-events-none"
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={12}
                  fill={p.glowColor}
                  stroke={p.color}
                  strokeWidth={1.5}
                />
                <path
                  d={`M ${cx - 5} ${cy} L ${cx + 5} ${cy} M ${cx} ${cy - 5} L ${cx} ${cy + 5}`}
                  stroke="#FFFFFF"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                />
              </g>
            );
          })}

          {/* Optional PCA Biplot Feature Loadings */}
          {showBiplot &&
            loadings.map((l) => {
              const ox = Math.min(Math.max(zeroX, pad.left + 40), pad.left + plotW - 40);
              const oy = Math.min(Math.max(zeroY, pad.top + 40), pad.top + plotH - 40);
              const tx = toX(l.pc1 * loadingScale);
              const ty = toY(l.pc2 * loadingScale);
              return (
                <g key={l.feature} className="pointer-events-none">
                  <line
                    x1={ox}
                    y1={oy}
                    x2={tx}
                    y2={ty}
                    stroke="#F472B6"
                    strokeWidth={2}
                    markerEnd="url(#biplotArrow)"
                  />
                  <text
                    x={tx + (l.pc1 >= 0 ? 8 : -8)}
                    y={ty + (l.pc2 >= 0 ? -6 : 14)}
                    textAnchor={l.pc1 >= 0 ? 'start' : 'end'}
                    className="fill-pink-300 text-[11px] font-semibold"
                  >
                    {l.feature}
                  </text>
                </g>
              );
            })}

          {/* Axis Labels */}
          <text
            x={pad.left + plotW / 2}
            y={height - 10}
            textAnchor="middle"
            className="fill-slate-300 text-[12px] font-medium"
          >
            PC1 ({(explainedVarianceRatio[0] * 100).toFixed(1)}% variance)
          </text>
          <text
            x={16}
            y={pad.top + plotH / 2}
            textAnchor="middle"
            transform={`rotate(-90 16 ${pad.top + plotH / 2})`}
            className="fill-slate-300 text-[12px] font-medium"
          >
            PC2 ({(explainedVarianceRatio[1] * 100).toFixed(1)}% variance)
          </text>
        </svg>

        {/* Interactive Hover Tooltip */}
        {hovered && (
          <div
            className="pointer-events-none absolute top-3 right-3 w-64 rounded-xl bg-[#0B1026]/95 border border-white/15 p-3.5 shadow-2xl backdrop-blur-md"
          >
            <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-white/10">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{
                    backgroundColor:
                      personaByCluster.get(hovered.clusterId)?.color ?? '#A855F7',
                  }}
                />
                <span className="text-xs font-semibold text-white truncate">
                  Customer #{hovered.customerId}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 truncate">
                {hovered.country}
              </span>
            </div>
            <div className="text-xs text-violet-300 font-medium mb-2">
              {hovered.personaTitle}
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <div>
                <div className="text-slate-400">Recency</div>
                <div className="font-mono text-slate-100 tabular-nums">
                  {hovered.recency}d
                </div>
              </div>
              <div>
                <div className="text-slate-400">Frequency</div>
                <div className="font-mono text-slate-100 tabular-nums">
                  {hovered.frequency}x
                </div>
              </div>
              <div>
                <div className="text-slate-400">Monetary</div>
                <div className="font-mono text-slate-100 tabular-nums">
                  £{hovered.monetary.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ElbowChartProps {
  curve: ElbowPoint[];
  selectedK: number;
  recommendedK: number;
  onSelectK: (k: number) => void;
}

export function ElbowChart({
  curve,
  selectedK,
  recommendedK,
  onSelectK,
}: ElbowChartProps) {
  const [hoveredK, setHoveredK] = useState<number | null>(null);
  const width = 520;
  const height = 270;
  const pad = { top: 24, right: 24, bottom: 42, left: 60 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  if (curve.length === 0) return null;

  const minK = curve[0].k;
  const maxK = curve[curve.length - 1].k;
  const maxInertia = Math.max(...curve.map((c) => c.inertia));
  const minInertia = Math.min(...curve.map((c) => c.inertia)) * 0.85;

  const toX = (k: number) =>
    pad.left + ((k - minK) / Math.max(1, maxK - minK)) * plotW;
  const toY = (val: number) =>
    pad.top + plotH - ((val - minInertia) / Math.max(1, maxInertia - minInertia)) * plotH;

  const linePath = curve
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${toX(pt.k)} ${toY(pt.inertia)}`)
    .join(' ');
  const areaPath = `${linePath} L ${toX(maxK)} ${pad.top + plotH} L ${toX(minK)} ${
    pad.top + plotH
  } Z`;

  const yTicks = [0, 0.33, 0.66, 1].map(
    (ratio) => minInertia + ratio * (maxInertia - minInertia)
  );

  const activePoint =
    curve.find((c) => c.k === (hoveredK ?? selectedK)) ?? curve[0];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>
          Click any k-node to re-train · Suggested elbow:{' '}
          <strong className="text-pink-300 font-mono">k = {recommendedK}</strong>
        </span>
        <span className="font-mono text-slate-200 tabular-nums">
          k={activePoint.k}: WCSS {activePoint.inertia.toLocaleString()}
        </span>
      </div>
      <div className="rounded-xl bg-[#070B19]/80 border border-white/10 overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto block">
          <defs>
            <linearGradient id="elbowAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(168, 85, 247, 0.35)" />
              <stop offset="100%" stopColor="rgba(59, 130, 246, 0.0)" />
            </linearGradient>
            <linearGradient id="elbowLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="50%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>
          </defs>

          {yTicks.map((val, idx) => {
            const y = toY(val);
            return (
              <g key={idx}>
                <line
                  x1={pad.left}
                  y1={y}
                  x2={pad.left + plotW}
                  y2={y}
                  stroke="rgba(148, 163, 184, 0.1)"
                  strokeDasharray="3 4"
                />
                <text
                  x={pad.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-mono tabular-nums"
                >
                  {Math.round(val)}
                </text>
              </g>
            );
          })}

          <path d={areaPath} fill="url(#elbowAreaGrad)" />
          <path
            d={linePath}
            fill="none"
            stroke="url(#elbowLineGrad)"
            strokeWidth={2.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {curve.map((pt) => {
            const cx = toX(pt.k);
            const cy = toY(pt.inertia);
            const isSelected = pt.k === selectedK;
            const isElbow = pt.k === recommendedK;

            return (
              <g
                key={pt.k}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredK(pt.k)}
                onMouseLeave={() => setHoveredK(null)}
                onClick={() => onSelectK(pt.k)}
              >
                {isElbow && (
                  <line
                    x1={cx}
                    y1={pad.top}
                    x2={cx}
                    y2={pad.top + plotH}
                    stroke="rgba(236, 72, 153, 0.35)"
                    strokeDasharray="4 4"
                  />
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isSelected ? 7.5 : 5.5}
                  fill={isSelected ? '#EC4899' : isElbow ? '#A855F7' : '#3B82F6'}
                  stroke="#FFFFFF"
                  strokeWidth={isSelected ? 2.2 : 1.2}
                />
                <text
                  x={cx}
                  y={pad.top + plotH + 20}
                  textAnchor="middle"
                  className={`text-[11px] font-mono tabular-nums ${
                    isSelected ? 'fill-white font-semibold' : 'fill-slate-400'
                  }`}
                >
                  k={pt.k}
                </text>
              </g>
            );
          })}

          <text
            x={16}
            y={pad.top + plotH / 2}
            textAnchor="middle"
            transform={`rotate(-90 16 ${pad.top + plotH / 2})`}
            className="fill-slate-400 text-[11px]"
          >
            WCSS Inertia
          </text>
        </svg>
      </div>
    </div>
  );
}

interface ClusterComparisonChartProps {
  personas: ClusterPersonaSummary[];
}

export function ClusterComparisonChart({ personas }: ClusterComparisonChartProps) {
  const [metric, setMetric] = useState<'avgMonetary' | 'avgFrequency' | 'avgRecency'>(
    'avgMonetary'
  );

  const maxVal = Math.max(
    1,
    ...personas.map((p) => p[metric])
  );

  const metricLabel =
    metric === 'avgMonetary'
      ? 'Average Customer Spend (£)'
      : metric === 'avgFrequency'
        ? 'Average Purchase Frequency (Orders)'
        : 'Average Recency (Days Since Last Order)';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-400">{metricLabel}</div>
        <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-white/5 border border-white/10">
          {(
            [
              { id: 'avgMonetary', label: 'Monetary' },
              { id: 'avgFrequency', label: 'Frequency' },
              { id: 'avgRecency', label: 'Recency' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMetric(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                metric === tab.id
                  ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3.5">
        {personas.map((p) => {
          const val = p[metric];
          const pct = Math.max(4, (val / maxVal) * 100);
          const formatted =
            metric === 'avgMonetary'
              ? `£${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
              : metric === 'avgFrequency'
                ? `${val.toFixed(1)} orders`
                : `${val.toFixed(0)} days`;

          return (
            <div key={p.clusterId} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-200 font-medium">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  <span>{p.title}</span>
                </div>
                <span className="font-mono text-slate-100 tabular-nums">
                  {formatted}
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${p.color}, rgba(236, 72, 153, 0.85))`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DistributionChart({
  personas,
}: {
  personas: ClusterPersonaSummary[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>Customer Headcount vs. Revenue Contribution</span>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
            Customers %
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-pink-500" />
            Revenue %
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {personas.map((p) => (
          <div key={p.clusterId} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-200">{p.title}</span>
              <span className="font-mono text-slate-400 tabular-nums">
                {p.customerSharePct}% users · {p.revenueSharePct}% revenue
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${Math.max(3, p.customerSharePct)}%` }}
                />
              </div>
              <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all duration-500"
                  style={{ width: `${Math.max(3, p.revenueSharePct)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BeforeAfterComparisonChart({
  customers,
  personas,
  explainedVarianceRatio,
}: {
  customers: ClusteredCustomer[];
  personas: ClusterPersonaSummary[];
  explainedVarianceRatio: [number, number, number];
}) {
  const [viewMode, setViewMode] = useState<'split' | 'before' | 'after'>('split');

  const w = 440;
  const h = 280;
  const pad = { top: 20, right: 20, bottom: 38, left: 54 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const personaColorMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of personas) map.set(p.clusterId, p.color);
    return map;
  }, [personas]);

  const rawBounds = useMemo(() => {
    if (customers.length === 0) {
      return { rMin: 0, rMax: 365, mMin: 0, mMax: 1000 };
    }
    const rMax = Math.max(...customers.map((c) => c.recency));
    const mMax = Math.max(...customers.map((c) => c.monetary));
    return {
      rMin: 0,
      rMax: Math.max(10, rMax * 1.05),
      mMin: 0,
      mMax: Math.max(10, mMax * 1.05),
    };
  }, [customers]);

  const pcaBounds = useMemo(() => {
    if (customers.length === 0) {
      return { xMin: -3, xMax: 3, yMin: -3, yMax: 3 };
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const c of customers) {
      if (c.pc1 < minX) minX = c.pc1;
      if (c.pc1 > maxX) maxX = c.pc1;
      if (c.pc2 < minY) minY = c.pc2;
      if (c.pc2 > maxY) maxY = c.pc2;
    }
    const sx = Math.max(1, maxX - minX);
    const sy = Math.max(1, maxY - minY);
    return {
      xMin: minX - sx * 0.08,
      xMax: maxX + sx * 0.08,
      yMin: minY - sy * 0.1,
      yMax: maxY + sy * 0.1,
    };
  }, [customers]);

  const toRawX = (r: number) =>
    pad.left + ((r - rawBounds.rMin) / (rawBounds.rMax - rawBounds.rMin)) * plotW;
  const toRawY = (m: number) =>
    pad.top + plotH - ((m - rawBounds.mMin) / (rawBounds.mMax - rawBounds.mMin)) * plotH;

  const toPcaX = (x: number) =>
    pad.left + ((x - pcaBounds.xMin) / (pcaBounds.xMax - pcaBounds.xMin)) * plotW;
  const toPcaY = (y: number) =>
    pad.top + plotH - ((y - pcaBounds.yMin) / (pcaBounds.yMax - pcaBounds.yMin)) * plotH;

  const beforeCard = (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-200">
          Before: Raw Unclustered RFM
        </span>
        <span className="text-slate-400">Skewed scales · No labels</span>
      </div>
      <div className="rounded-xl bg-[#070B19]/85 border border-white/10 overflow-hidden">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto block">
          {[0.25, 0.5, 0.75].map((ratio) => (
            <line
              key={ratio}
              x1={pad.left}
              y1={pad.top + plotH * ratio}
              x2={pad.left + plotW}
              y2={pad.top + plotH * ratio}
              stroke="rgba(148,163,184,0.09)"
              strokeDasharray="3 4"
            />
          ))}
          {customers.map((c) => (
            <circle
              key={`raw-${c.customerId}`}
              cx={toRawX(c.recency)}
              cy={toRawY(c.monetary)}
              r={3}
              fill="#94A3B8"
              fillOpacity={0.55}
            />
          ))}
          <text
            x={pad.left + plotW / 2}
            y={h - 10}
            textAnchor="middle"
            className="fill-slate-400 text-[11px]"
          >
            Raw Recency (0 – {Math.round(rawBounds.rMax)} days)
          </text>
          <text
            x={16}
            y={pad.top + plotH / 2}
            textAnchor="middle"
            transform={`rotate(-90 16 ${pad.top + plotH / 2})`}
            className="fill-slate-400 text-[11px]"
          >
            Raw Monetary (£)
          </text>
        </svg>
      </div>
    </div>
  );

  const afterCard = (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-violet-200">
          After: StandardScaler + PCA + K-Means
        </span>
        <span className="text-slate-400">
          {personas.length} distinct segments
        </span>
      </div>
      <div className="rounded-xl bg-[#070B19]/85 border border-violet-400/20 overflow-hidden">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto block">
          {[0.25, 0.5, 0.75].map((ratio) => (
            <line
              key={ratio}
              x1={pad.left}
              y1={pad.top + plotH * ratio}
              x2={pad.left + plotW}
              y2={pad.top + plotH * ratio}
              stroke="rgba(148,163,184,0.09)"
              strokeDasharray="3 4"
            />
          ))}
          {customers.map((c) => (
            <circle
              key={`pca-${c.customerId}`}
              cx={toPcaX(c.pc1)}
              cy={toPcaY(c.pc2)}
              r={3.2}
              fill={personaColorMap.get(c.clusterId) ?? '#A855F7'}
              fillOpacity={0.82}
            />
          ))}
          {personas.map((p) => (
            <circle
              key={`cent-${p.clusterId}`}
              cx={toPcaX(p.centroidPCA[0])}
              cy={toPcaY(p.centroidPCA[1])}
              r={7}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={1.6}
            />
          ))}
          <text
            x={pad.left + plotW / 2}
            y={h - 10}
            textAnchor="middle"
            className="fill-slate-300 text-[11px]"
          >
            PC1 ({(explainedVarianceRatio[0] * 100).toFixed(1)}% variance)
          </text>
          <text
            x={16}
            y={pad.top + plotH / 2}
            textAnchor="middle"
            transform={`rotate(-90 16 ${pad.top + plotH / 2})`}
            className="fill-slate-300 text-[11px]"
          >
            PC2 ({(explainedVarianceRatio[1] * 100).toFixed(1)}% variance)
          </text>
        </svg>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-white">
            Before vs. After Clustering
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare unscaled, ungrouped raw customer metrics against standardized PCA + K-Means segments.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
          {(
            [
              { id: 'split', label: 'Side by Side' },
              { id: 'before', label: 'Before (Raw)' },
              { id: 'after', label: 'After (Clustered)' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setViewMode(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                viewMode === tab.id
                  ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {viewMode === 'split' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {beforeCard}
          {afterCard}
        </div>
      ) : viewMode === 'before' ? (
        <div className="max-w-3xl mx-auto">{beforeCard}</div>
      ) : (
        <div className="max-w-3xl mx-auto">{afterCard}</div>
      )}
    </div>
  );
}

