import {
  BarChart3,
  Cpu,
  Database,
  Home,
  Users,
  X,
} from 'lucide-react';
import { AppSection } from '../ml/types';

interface SidebarProps {
  activeSection: AppSection;
  onNavigate: (section: AppSection) => void;
  hasData: boolean;
  hasModel: boolean;
  customerCount: number;
  clusterCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: AppSection;
  label: string;
  subtitle: string;
  icon: typeof Home;
}> = [
  { id: 'home', label: 'Home', subtitle: 'Overview', icon: Home },
  { id: 'data', label: 'Customer Data', subtitle: 'UCI Dataset & RFM', icon: Database },
  { id: 'segmentation', label: 'AI Segmentation', subtitle: 'PCA + K-Means', icon: Cpu },
  { id: 'personas', label: 'Customer Personas', subtitle: 'Segment Profiles', icon: Users },
  { id: 'insights', label: 'Insights', subtitle: 'Patterns & Export', icon: BarChart3 },
];

export function Sidebar({
  activeSection,
  onNavigate,
  hasData,
  hasModel,
  customerCount,
  clusterCount,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const content = (
    <div className="flex flex-col h-full w-64 bg-[#090D21]/95 border-r border-white/10 backdrop-blur-xl">
      {/* Brand Lockup */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-white/10">
        <button
          type="button"
          onClick={() => {
            onNavigate('home');
            onCloseMobile();
          }}
          className="flex items-center gap-3 text-left cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 via-blue-500 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-600/30 shrink-0">
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="7" cy="12" r="2.2" />
              <circle cx="16.5" cy="7.5" r="2.2" />
              <circle cx="16.5" cy="16.5" r="2.2" />
              <path d="M9 11l5.5-2.6M9 13l5.5 2.6" />
            </svg>
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap">
            PersonaPulse
          </span>
        </button>

        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto" aria-label="Primary">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onNavigate(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer ${
                active
                  ? 'bg-gradient-to-r from-violet-600/25 via-blue-600/20 to-pink-600/15 text-white border border-violet-400/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  active ? 'text-violet-300' : 'text-slate-400'
                }`}
              />
              <div className="min-w-0">
                <div className="text-sm font-medium whitespace-nowrap truncate">
                  {item.label}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {item.subtitle}
                </div>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Active Dataset Summary Footer (clean unboxed metadata) */}
      <div className="px-5 py-4 border-t border-white/10 space-y-2 text-xs">
        <div className="text-slate-400 font-medium">Workspace State</div>
        <div className="flex items-center justify-between text-slate-300">
          <span>Customers</span>
          <span className="font-mono tabular-nums text-white">
            {hasData ? customerCount.toLocaleString() : '0'}
          </span>
        </div>
        <div className="flex items-center justify-between text-slate-300">
          <span>Clusters</span>
          <span className="font-mono tabular-nums text-white">
            {hasModel ? clusterCount : 'Not trained'}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block shrink-0">{content}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/65 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 h-full">{content}</div>
        </div>
      )}
    </>
  );
}
