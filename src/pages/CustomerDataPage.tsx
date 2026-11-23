import {
  AlertCircle,
  ArrowUpDown,
  CheckCircle2,
  Database,
  RotateCcw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { motion } from 'motion/react';
import { ChangeEvent, useMemo, useRef, useState } from 'react';
import { AnimatedNumber } from '../components/AnimatedNumber';
import {
  CleanedTransaction,
  CleaningReport,
  CustomerRFM,
  DatasetStats,
} from '../ml/types';

interface CustomerDataPageProps {
  hasData: boolean;
  datasetName: string;
  uploadError: string | null;
  cleaningReport: CleaningReport | null;
  stats: DatasetStats | null;
  transactions: CleanedTransaction[];
  customers: CustomerRFM[];
  onUploadCSV: (file: File) => void;
  onLoadSample: () => void;
  onClearData: () => void;
  onGoToSegmentation: () => void;
}

export function CustomerDataPage({
  hasData,
  datasetName,
  uploadError,
  cleaningReport,
  stats,
  transactions,
  customers,
  onUploadCSV,
  onLoadSample,
  onClearData,
  onGoToSegmentation,
}: CustomerDataPageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewMode, setViewMode] = useState<'rfm' | 'transactions'>('rfm');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<'monetary' | 'frequency' | 'recency'>('monetary');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadCSV(file);
      e.target.value = '';
    }
  };

  const handleSort = (key: 'monetary' | 'frequency' | 'recency') => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'recency' ? 'asc' : 'desc');
    }
  };

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = q
      ? customers.filter(
          (c) =>
            c.customerId.toLowerCase().includes(q) ||
            c.country.toLowerCase().includes(q)
        )
      : customers;

    return [...list]
      .sort((a, b) => {
        const diff = a[sortKey] - b[sortKey];
        return sortDir === 'asc' ? diff : -diff;
      })
      .slice(0, 60);
  }, [customers, searchQuery, sortKey, sortDir]);

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = q
      ? transactions.filter(
          (t) =>
            t.InvoiceNo.toLowerCase().includes(q) ||
            t.CustomerID.toLowerCase().includes(q) ||
            t.Description.toLowerCase().includes(q) ||
            t.Country.toLowerCase().includes(q)
        )
      : transactions;
    return list.slice(0, 60);
  }, [transactions, searchQuery]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Upload & Dataset Control Bar */}
      <section className="rounded-2xl glass-surface p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-white">
              UCI Online Retail Dataset & Preprocessing
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Upload any CSV with standard UCI Online Retail columns or inspect the curated sample dataset.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onLoadSample}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-slate-200 bg-white/8 hover:bg-white/12 border border-white/15 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Load UCI Sample</span>
            </button>
            {hasData && (
              <button
                type="button"
                onClick={onClearData}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Dataset</span>
              </button>
            )}
          </div>
        </div>

        {/* Drag & Drop Upload Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            const file = e.dataTransfer.files?.[0];
            if (file) onUploadCSV(file);
          }}
          className={`rounded-xl border border-dashed p-6 transition-colors flex flex-col sm:flex-row items-center justify-between gap-4 ${
            dragActive
              ? 'border-violet-400 bg-violet-500/10'
              : 'border-white/20 bg-[#070B19]/60 hover:border-violet-400/50'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-violet-500/15 border border-violet-400/30 flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5 text-violet-300" />
            </div>
            <div>
              <div className="text-sm font-medium text-white">
                Drop a UCI Online Retail CSV file here
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Required columns: InvoiceNo, Quantity, InvoiceDate, UnitPrice, CustomerID (optional: StockCode, Description, Country)
              </div>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:brightness-110 transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            Choose CSV File
          </button>
        </div>

        {uploadError && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl bg-rose-500/10 border border-rose-500/30 p-4 text-sm text-rose-200"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">Could not parse uploaded CSV</div>
              <div className="text-xs text-rose-300/90 mt-0.5">{uploadError}</div>
            </div>
          </div>
        )}
      </section>

      {/* Empty State */}
      {!hasData || !cleaningReport || !stats ? (
        <section className="rounded-2xl glass-surface p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-violet-500/15 border border-violet-400/25 flex items-center justify-center mx-auto">
            <Database className="w-6 h-6 text-violet-300" />
          </div>
          <h3 className="font-display text-lg font-semibold text-white">
            No Customer Dataset Loaded
          </h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Upload your own retail transaction CSV above or load the built-in UCI Online Retail dataset to inspect data cleaning and RFM engineering.
          </p>
          <button
            type="button"
            onClick={onLoadSample}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:brightness-110 transition-all cursor-pointer"
          >
            Load UCI Online Retail Sample
          </button>
        </section>
      ) : (
        <>
          {/* Data Cleaning Summary & Simple Statistics */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-6 rounded-2xl glass-surface p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold text-white">
                  Data Cleaning Summary
                </h3>
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{datasetName}</span>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-1">
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="text-xs text-slate-400">Raw Rows</div>
                  <div className="font-mono text-lg font-semibold text-white mt-1 tabular-nums">
                    <AnimatedNumber value={cleaningReport.rawRowCount} />
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="text-xs text-slate-400">Missing CustomerID</div>
                  <div className="font-mono text-lg font-semibold text-amber-300 mt-1 tabular-nums">
                    −<AnimatedNumber value={cleaningReport.missingCustomerIdCount} />
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="text-xs text-slate-400">Cancelled (C*)</div>
                  <div className="font-mono text-lg font-semibold text-rose-300 mt-1 tabular-nums">
                    −<AnimatedNumber value={cleaningReport.cancelledInvoiceCount} />
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="text-xs text-slate-400">Invalid Qty / Price</div>
                  <div className="font-mono text-lg font-semibold text-rose-300 mt-1 tabular-nums">
                    −<AnimatedNumber value={cleaningReport.nonPositiveQuantityOrPriceCount} />
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="text-xs text-slate-400">Valid Transactions</div>
                  <div className="font-mono text-lg font-semibold text-emerald-300 mt-1 tabular-nums">
                    <AnimatedNumber value={cleaningReport.cleanedRowCount} />
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-violet-500/10 border border-violet-400/25">
                  <div className="text-xs text-violet-200">Unique Customers</div>
                  <div className="font-mono text-lg font-semibold text-white mt-1 tabular-nums">
                    <AnimatedNumber value={cleaningReport.uniqueCustomers} />
                  </div>
                </div>
              </div>
            </section>

            <section className="lg:col-span-6 rounded-2xl glass-surface p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold text-white">
                  RFM & Cohort Statistics
                </h3>
                <button
                  type="button"
                  onClick={onGoToSegmentation}
                  className="text-xs font-medium text-violet-300 hover:text-violet-200 cursor-pointer"
                >
                  Run AI Segmentation →
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-1">
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="text-xs text-slate-400">Total Revenue</div>
                  <div className="font-mono text-lg font-semibold text-white mt-1 tabular-nums">
                    £{stats.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="text-xs text-slate-400">Avg Order Value</div>
                  <div className="font-mono text-lg font-semibold text-white mt-1 tabular-nums">
                    £{stats.avgOrderValue.toFixed(2)}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="text-xs text-slate-400">Median Spend</div>
                  <div className="font-mono text-lg font-semibold text-white mt-1 tabular-nums">
                    £{stats.medianCustomerSpend.toFixed(0)}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="text-xs text-slate-400">Mean Recency</div>
                  <div className="font-mono text-lg font-semibold text-blue-300 mt-1 tabular-nums">
                    {stats.avgRecencyDays} days
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="text-xs text-slate-400">Mean Frequency</div>
                  <div className="font-mono text-lg font-semibold text-violet-300 mt-1 tabular-nums">
                    {stats.avgFrequency} orders
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="text-xs text-slate-400">Unique Products</div>
                  <div className="font-mono text-lg font-semibold text-pink-300 mt-1 tabular-nums">
                    {cleaningReport.uniqueProducts.toLocaleString()} SKUs
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Dataset Preview Table */}
          <section className="rounded-2xl glass-surface p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
                <button
                  type="button"
                  onClick={() => setViewMode('rfm')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    viewMode === 'rfm'
                      ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Customer RFM Features ({customers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('transactions')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    viewMode === 'transactions'
                      ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Cleaned Transactions ({transactions.length.toLocaleString()})
                </button>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    viewMode === 'rfm'
                      ? 'Search CustomerID or Country...'
                      : 'Search Invoice, SKU, or Product...'
                  }
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#070B19]/80 border border-white/12 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-violet-400"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/10">
              {viewMode === 'rfm' ? (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-white/[0.04] text-slate-300 border-b border-white/10">
                      <th className="py-3 px-4 font-semibold">CustomerID</th>
                      <th className="py-3 px-4 font-semibold">Country</th>
                      <th className="py-3 px-4 font-semibold text-right">
                        <button
                          type="button"
                          onClick={() => handleSort('recency')}
                          className="inline-flex items-center gap-1 hover:text-white cursor-pointer"
                        >
                          <span>Recency (days)</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="py-3 px-4 font-semibold text-right">
                        <button
                          type="button"
                          onClick={() => handleSort('frequency')}
                          className="inline-flex items-center gap-1 hover:text-white cursor-pointer"
                        >
                          <span>Frequency</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="py-3 px-4 font-semibold text-right">
                        <button
                          type="button"
                          onClick={() => handleSort('monetary')}
                          className="inline-flex items-center gap-1 hover:text-white cursor-pointer"
                        >
                          <span>Monetary (£)</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="py-3 px-4 font-semibold text-right">Avg Basket</th>
                      <th className="py-3 px-4 font-semibold text-right">Last Order</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {filteredCustomers.map((c) => (
                      <tr key={c.customerId} className="hover:bg-white/[0.03]">
                        <td className="py-2.5 px-4 font-mono text-violet-300">
                          {c.customerId}
                        </td>
                        <td className="py-2.5 px-4 text-slate-200">{c.country}</td>
                        <td className="py-2.5 px-4 font-mono text-right text-slate-200 tabular-nums">
                          {c.recency}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-right text-slate-200 tabular-nums">
                          {c.frequency}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-right text-white font-medium tabular-nums">
                          £{c.monetary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-right text-slate-300 tabular-nums">
                          £{c.avgOrderValue.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-right text-slate-400 tabular-nums">
                          {c.lastPurchaseIso}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-white/[0.04] text-slate-300 border-b border-white/10">
                      <th className="py-3 px-4 font-semibold">InvoiceNo</th>
                      <th className="py-3 px-4 font-semibold">CustomerID</th>
                      <th className="py-3 px-4 font-semibold">Description</th>
                      <th className="py-3 px-4 font-semibold">Country</th>
                      <th className="py-3 px-4 font-semibold text-right">Qty</th>
                      <th className="py-3 px-4 font-semibold text-right">UnitPrice</th>
                      <th className="py-3 px-4 font-semibold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {filteredTransactions.map((tx, idx) => (
                      <tr key={`${tx.InvoiceNo}-${tx.StockCode}-${idx}`} className="hover:bg-white/[0.03]">
                        <td className="py-2.5 px-4 font-mono text-blue-300">{tx.InvoiceNo}</td>
                        <td className="py-2.5 px-4 font-mono text-violet-300">{tx.CustomerID}</td>
                        <td className="py-2.5 px-4 text-slate-200 max-w-xs truncate">
                          {tx.Description}
                        </td>
                        <td className="py-2.5 px-4 text-slate-300">{tx.Country}</td>
                        <td className="py-2.5 px-4 font-mono text-right text-slate-200 tabular-nums">
                          {tx.Quantity}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-right text-slate-300 tabular-nums">
                          £{tx.UnitPrice.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-right text-white tabular-nums">
                          £{tx.TotalPrice.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="text-xs text-slate-400">
              Showing top 60 matching records · Reference date for Recency calculation: {stats.referenceDateIso}
            </div>
          </section>
        </>
      )}
    </motion.div>
  );
}
