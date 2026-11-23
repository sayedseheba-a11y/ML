import { Menu, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { preprocessDataset, runSegmentationPipeline } from './ml/pipeline';
import {
  AppSection,
  CleanedTransaction,
  CleaningReport,
  CustomerRFM,
  DatasetStats,
  RawTransaction,
  SegmentationResult,
} from './ml/types';
import {
  generateUCIOnlineRetailSample,
  parseOnlineRetailCSV,
} from './ml/uciDataset';
import { CustomerDataPage } from './pages/CustomerDataPage';
import { HomePage } from './pages/HomePage';
import { InsightsPage } from './pages/InsightsPage';
import { PersonasPage } from './pages/PersonasPage';
import { SegmentationPage } from './pages/SegmentationPage';

const SECTION_TITLES: Record<AppSection, string> = {
  home: 'Home',
  data: 'Customer Data',
  segmentation: 'AI Segmentation',
  personas: 'Customer Personas',
  insights: 'Insights',
};

export default function App() {
  const [activeSection, setActiveSection] = useState<AppSection>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [datasetName, setDatasetName] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [cleaningReport, setCleaningReport] = useState<CleaningReport | null>(null);
  const [stats, setStats] = useState<DatasetStats | null>(null);
  const [transactions, setTransactions] = useState<CleanedTransaction[]>([]);
  const [customers, setCustomers] = useState<CustomerRFM[]>([]);

  const [selectedK, setSelectedK] = useState<number>(4);
  const [useLogTransform, setUseLogTransform] = useState<boolean>(true);
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [segmentation, setSegmentation] = useState<SegmentationResult | null>(null);

  const applyRawDataset = useCallback(
    (rawRows: RawTransaction[], name: string, kToUse: number, logTransform: boolean) => {
      const processed = preprocessDataset(rawRows);
      if (processed.customers.length < 3) {
        setUploadError(
          'Dataset produced fewer than 3 valid customers after cleaning missing IDs, cancelled invoices, and non-positive values.'
        );
        return;
      }

      setUploadError(null);
      setDatasetName(name);
      setCleaningReport(processed.cleaningReport);
      setStats(processed.stats);
      setTransactions(processed.cleanedTransactions);
      setCustomers(processed.customers);

      const result = runSegmentationPipeline(
        processed.customers,
        processed.stats,
        kToUse,
        logTransform
      );
      setSegmentation(result);
    },
    []
  );

  const handleLoadSample = useCallback(() => {
    const sample = generateUCIOnlineRetailSample();
    applyRawDataset(sample.rows, sample.datasetName, selectedK, useLogTransform);
  }, [applyRawDataset, selectedK, useLogTransform]);

  useEffect(() => {
    const sample = generateUCIOnlineRetailSample();
    applyRawDataset(sample.rows, sample.datasetName, 4, true);
  }, [applyRawDataset]);

  const handleUploadCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const parsed = parseOnlineRetailCSV(text);
      if (parsed.error) {
        setUploadError(parsed.error);
        return;
      }
      applyRawDataset(parsed.rows, file.name, selectedK, useLogTransform);
    };
    reader.onerror = () => {
      setUploadError('Unable to read the selected file.');
    };
    reader.readAsText(file);
  };

  const handleClearData = () => {
    setDatasetName('');
    setUploadError(null);
    setCleaningReport(null);
    setStats(null);
    setTransactions([]);
    setCustomers([]);
    setSegmentation(null);
  };

  const handleTrainModel = (kOverride?: number, logOverride?: boolean) => {
    if (!stats || customers.length < 3) return;
    const targetK = kOverride ?? selectedK;
    const targetLog = logOverride ?? useLogTransform;

    setIsTraining(true);
    window.setTimeout(() => {
      const result = runSegmentationPipeline(customers, stats, targetK, targetLog);
      setSegmentation(result);
      setIsTraining(false);
    }, 240);
  };

  const hasData = customers.length > 0 && stats !== null;

  return (
    <div className="relative min-h-screen flex bg-[#070A17] text-slate-100 overflow-x-hidden">
      {/* Subtle Ambient Animated Gradient Backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden z-0"
      >
        <div className="ambient-orb-1 absolute -top-40 left-1/4 w-[520px] h-[520px] rounded-full bg-violet-700/18 blur-[130px]" />
        <div className="ambient-orb-2 absolute bottom-[-160px] right-1/5 w-[480px] h-[480px] rounded-full bg-blue-700/16 blur-[130px]" />
        <div className="absolute top-1/3 right-[-120px] w-[360px] h-[360px] rounded-full bg-pink-600/10 blur-[120px]" />
      </div>

      {/* Sidebar */}
      <div className="relative z-20">
        <Sidebar
          activeSection={activeSection}
          onNavigate={setActiveSection}
          hasData={hasData}
          hasModel={segmentation !== null}
          customerCount={customers.length}
          clusterCount={segmentation?.k ?? 0}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />
      </div>

      {/* Main Content Shell */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract: Breadcrumb on left, 1 primary contextual action on right */}
        <header className="sticky top-0 z-30 h-16 px-4 sm:px-8 flex items-center justify-between gap-4 border-b border-white/10 bg-[#070A17]/80 backdrop-blur-xl">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-400 hidden sm:inline">PersonaPulse</span>
              <span aria-hidden="true" className="text-slate-600 hidden sm:inline">/</span>
              <span className="font-display font-semibold text-white truncate">
                {SECTION_TITLES[activeSection]}
              </span>
            </div>
          </div>

          <div className="shrink-0">
            {activeSection !== 'segmentation' ? (
              <button
                type="button"
                onClick={() => setActiveSection('segmentation')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:brightness-110 transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Segmentation</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveSection('insights')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-pink-600 hover:brightness-110 transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>View Insights</span>
              </button>
            )}
          </div>
        </header>

        {/* Active Section Viewport */}
        <main className="flex-1 p-4 sm:p-8 max-w-[1360px] w-full mx-auto">
          <AnimatePresence mode="wait">
            {activeSection === 'home' && (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                <HomePage
                  hasData={hasData}
                  datasetName={datasetName}
                  cleaningReport={cleaningReport}
                  stats={stats}
                  segmentation={segmentation}
                  onNavigate={setActiveSection}
                  onLoadSample={handleLoadSample}
                />
              </motion.div>
            )}

            {activeSection === 'data' && (
              <motion.div
                key="data"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                <CustomerDataPage
                  hasData={hasData}
                  datasetName={datasetName}
                  uploadError={uploadError}
                  cleaningReport={cleaningReport}
                  stats={stats}
                  transactions={transactions}
                  customers={customers}
                  onUploadCSV={handleUploadCSV}
                  onLoadSample={handleLoadSample}
                  onClearData={handleClearData}
                  onGoToSegmentation={() => setActiveSection('segmentation')}
                />
              </motion.div>
            )}

            {activeSection === 'segmentation' && (
              <motion.div
                key="segmentation"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                <SegmentationPage
                  hasData={hasData}
                  selectedK={selectedK}
                  useLogTransform={useLogTransform}
                  isTraining={isTraining}
                  segmentation={segmentation}
                  onChangeK={setSelectedK}
                  onToggleLogTransform={setUseLogTransform}
                  onTrainModel={handleTrainModel}
                  onNavigate={setActiveSection}
                  onLoadSample={handleLoadSample}
                />
              </motion.div>
            )}

            {activeSection === 'personas' && (
              <motion.div
                key="personas"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                <PersonasPage
                  hasData={hasData}
                  segmentation={segmentation}
                  onGoToSegmentation={() => setActiveSection('segmentation')}
                  onLoadSample={handleLoadSample}
                />
              </motion.div>
            )}

            {activeSection === 'insights' && (
              <motion.div
                key="insights"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                <InsightsPage
                  hasData={hasData}
                  datasetName={datasetName}
                  cleaningReport={cleaningReport}
                  stats={stats}
                  segmentation={segmentation}
                  onGoToSegmentation={() => setActiveSection('segmentation')}
                  onLoadSample={handleLoadSample}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
