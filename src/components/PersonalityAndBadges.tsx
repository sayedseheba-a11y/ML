import {
  Award,
  Clock,
  Compass,
  Crown,
  Flame,
  Gem,
  Moon,
  Repeat,
  RotateCcw,
  ShoppingBag,
  Shuffle,
  Sparkles,
  Tag,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { CustomerBadge, FunFact, PersonalityIconKey } from '../ml/types';

export function PersonalityIcon({
  iconKey,
  className = 'w-5 h-5',
  color,
}: {
  iconKey: PersonalityIconKey;
  className?: string;
  color?: string;
}) {
  const style = color ? { color } : undefined;
  switch (iconKey) {
    case 'crown':
      return <Crown className={className} style={style} />;
    case 'compass':
      return <Compass className={className} style={style} />;
    case 'tag':
      return <Tag className={className} style={style} />;
    case 'moon':
      return <Moon className={className} style={style} />;
    case 'zap':
      return <Zap className={className} style={style} />;
    case 'gem':
      return <Gem className={className} style={style} />;
    case 'flame':
      return <Flame className={className} style={style} />;
    default:
      return <Sparkles className={className} style={style} />;
  }
}

const BADGE_STYLES: Record<CustomerBadge['tone'], string> = {
  violet: 'text-violet-200 bg-violet-500/12 border-violet-400/25',
  blue: 'text-blue-200 bg-blue-500/12 border-blue-400/25',
  pink: 'text-pink-200 bg-pink-500/12 border-pink-400/25',
  emerald: 'text-emerald-200 bg-emerald-500/12 border-emerald-400/25',
  amber: 'text-amber-200 bg-amber-500/12 border-amber-400/25',
};

function BadgeIcon({ id }: { id: string }) {
  switch (id) {
    case 'whale':
      return <Crown className="w-3 h-3 shrink-0" />;
    case 'frequent':
      return <Repeat className="w-3 h-3 shrink-0" />;
    case 'fresh':
      return <Clock className="w-3 h-3 shrink-0" />;
    case 'basket':
      return <ShoppingBag className="w-3 h-3 shrink-0" />;
    case 'comeback':
      return <RotateCcw className="w-3 h-3 shrink-0" />;
    default:
      return <Award className="w-3 h-3 shrink-0" />;
  }
}

export function CustomerBadgeList({
  badges,
  compact = false,
}: {
  badges: CustomerBadge[];
  compact?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {badges.map((badge) => (
        <span
          key={badge.id}
          title={badge.reason}
          className={`inline-flex items-center gap-1 rounded-md border font-medium whitespace-nowrap ${
            BADGE_STYLES[badge.tone]
          } ${compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'}`}
        >
          <BadgeIcon id={badge.id} />
          <span>{badge.label}</span>
        </span>
      ))}
    </div>
  );
}

export function SurpriseInsightCard({ facts }: { facts: FunFact[] }) {
  const [index, setIndex] = useState(0);

  if (facts.length === 0) return null;

  const currentFact = facts[index % facts.length];

  const handleSurprise = () => {
    if (facts.length <= 1) return;
    let next = Math.floor(Math.random() * facts.length);
    if (next === index % facts.length) {
      next = (index + 1) % facts.length;
    }
    setIndex(next);
  };

  return (
    <div className="rounded-2xl glass-surface p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
      <div className="space-y-1.5 min-w-0 flex-1">
        <div className="text-xs font-medium text-pink-300">
          Surprise Insight · {currentFact.label}
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentFact.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="space-y-1"
          >
            <div className="font-display text-lg font-semibold text-white">
              {currentFact.headline}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {currentFact.detail}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={handleSurprise}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-pink-600 via-violet-600 to-blue-600 hover:brightness-110 transition-all shadow-lg shadow-violet-800/25 whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Shuffle className="w-3.5 h-3.5" />
        <span>Surprise Insight</span>
      </button>
    </div>
  );
}
