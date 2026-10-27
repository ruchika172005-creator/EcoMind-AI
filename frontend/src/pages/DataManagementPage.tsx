import React, { useState } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  ArrowRight,
  Database,
  Sparkles,
  Layers,
  Calendar,
  Zap,
} from 'lucide-react';
import { useDataset } from '../context/DatasetContext';
import { api } from '../api/client';
import type { CSVPreviewResponse, Dataset } from '../types';
import { Badge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const DataManagementPage: React.FC = () => {
  const { datasets, selectedDataset, setSelectedDataset, refreshDatasets, loadDemo, loading: contextLoading } = useDataset();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CSVPreviewResponse | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states for column mapping
  const [datasetName, setDatasetName] = useState<string>('');
  const [tsCol, setTsCol] = useState<string>('');
  const [energyCol, setEnergyCol] = useState<string>('');
  const [bldgCol, setBldgCol] = useState<string>('');
  const [tempCol, setTempCol] = useState<string>('');
  const [occCol, setOccCol] = useState<string>('');
  const [missingStrategy, setMissingStrategy] = useState<string>('interpolate');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!selected.name.endsWith('.csv')) {
      setError('Please select a valid CSV (.csv) file.');
      return;
    }

    setFile(selected);
    setError(null);
    setSuccess(null);
    setUploading(true);

    try {
      const res = await api.uploadPreview(selected);
      setPreview(res);
      setDatasetName(selected.name.replace('.csv', ''));
      setTsCol(res.suggested_timestamp_col || res.columns[0] || '');
      setEnergyCol(res.suggested_energy_col || res.columns[1] || '');
      setBldgCol(res.suggested_building_col || '');
      setTempCol(res.suggested_temperature_col || '');
      setOccCol(res.suggested_occupancy_col || '');
    } catch (err: any) {
      setError(err.message || 'Failed to inspect CSV file');
      setFile(null);
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleProcessAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview || !tsCol || !energyCol) {
      setError('Please specify both the Timestamp and Energy Consumption columns.');
      return;
    }

    setProcessing(true);
    setError(null);
    try {
      const newDs = await api.processDataset({
        temp_file_id: preview.temp_file_id,
        name: datasetName || 'Custom Energy Dataset',
        timestamp_column: tsCol,
        energy_column: energyCol,
        building_column: bldgCol || undefined,
        temperature_column: tempCol || undefined,
        occupancy_column: occCol || undefined,
        missing_value_strategy: missingStrategy,
      });

      setSuccess(`Dataset "${newDs.name}" successfully validated and persisted with ${newDs.row_count.toLocaleString()} observations.`);
      setPreview(null);
      setFile(null);
      await refreshDatasets();
      setSelectedDataset(newDs);
    } catch (err: any) {
      setError(err.message || 'Failed to process dataset');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this dataset? All associated forecasts and anomalies will be purged.')) {
      return;
    }

    try {
      await api.deleteDataset(id);
      await refreshDatasets();
    } catch (err: any) {
      setError(err.message || 'Failed to delete dataset');
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Energy Data Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Ingest meter telemetry, validate data quality, map timestamp schemas, and manage enterprise datasets.
          </p>
        </div>

        <button
          onClick={() => loadDemo()}
          disabled={contextLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800 shadow-2xs hover:bg-emerald-100 transition-colors disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4 text-emerald-600" />
          <span>{contextLoading ? 'Loading Demo Data...' : 'Load Demo Campus Dataset'}</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Upload Zone */}
      {!preview && (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-8 text-center hover:border-brand-500 transition-colors">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 mb-4">
            <Upload className="h-7 w-7" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">Upload Historical Energy CSV</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Drag and drop your electricity telemetry CSV, or click below. Supports hourly or daily timestamped energy consumption.
          </p>

          <label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors">
            <span>Select CSV File</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
          </label>

          {uploading && (
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-600">
              <LoadingSpinner size="sm" message="Analyzing CSV structure..." />
            </div>
          )}
        </div>
      )}

      {/* CSV Preview and Column Mapping Workflow */}
      {preview && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Preview & Field Mapping: {preview.filename}
              </h3>
              <p className="text-xs text-slate-500">
                {preview.total_rows_preview} sample rows loaded • Detected columns: {preview.columns.join(', ')}
              </p>
            </div>
            <button
              onClick={() => {
                setPreview(null);
                setFile(null);
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
          </div>

          {/* Data Quality Report Card */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-brand-600" />
              Automated Data Quality Assessment
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
              <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                <span className="text-slate-400 text-[10px] uppercase font-medium">Estimated Frequency</span>
                <p className="font-semibold text-slate-900">{preview.quality_report.detected_frequency}</p>
              </div>
              <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                <span className="text-slate-400 text-[10px] uppercase font-medium">Missing Timestamps</span>
                <p className="font-semibold text-slate-900">{preview.quality_report.missing_timestamp_count}</p>
              </div>
              <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                <span className="text-slate-400 text-[10px] uppercase font-medium">Missing Readings</span>
                <p className="font-semibold text-slate-900">{preview.quality_report.missing_value_count}</p>
              </div>
              <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                <span className="text-slate-400 text-[10px] uppercase font-medium">Negative Readings</span>
                <p className="font-semibold text-slate-900">{preview.quality_report.negative_values_count}</p>
              </div>
            </div>

            {preview.quality_report.issues.length > 0 && (
              <div className="space-y-1 mt-2">
                {preview.quality_report.issues.map((issue, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-[11px] text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>{issue.description}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mapping Form */}
          <form onSubmit={handleProcessAndSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Dataset Name *</label>
                <input
                  type="text"
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Timestamp Column *</label>
                <select
                  value={tsCol}
                  onChange={(e) => setTsCol(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-brand-500 focus:outline-none"
                  required
                >
                  <option value="">Select column...</option>
                  {preview.columns.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Energy Consumption (kWh) *</label>
                <select
                  value={energyCol}
                  onChange={(e) => setEnergyCol(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-brand-500 focus:outline-none"
                  required
                >
                  <option value="">Select column...</option>
                  {preview.columns.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Building/Meter ID (Optional)</label>
                <select
                  value={bldgCol}
                  onChange={(e) => setBldgCol(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-brand-500 focus:outline-none"
                >
                  <option value="">None</option>
                  {preview.columns.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Temperature (°C) (Optional)</label>
                <select
                  value={tempCol}
                  onChange={(e) => setTempCol(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-brand-500 focus:outline-none"
                >
                  <option value="">None</option>
                  {preview.columns.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Missing Value Strategy</label>
                <select
                  value={missingStrategy}
                  onChange={(e) => setMissingStrategy(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-brand-500 focus:outline-none"
                >
                  <option value="interpolate">Time-aware Linear Interpolation (Recommended)</option>
                  <option value="forward_fill">Forward Fill (Last Known Value)</option>
                  <option value="drop">Drop Incomplete Rows</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={processing}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                <span>{processing ? 'Processing & Persisting...' : 'Validate & Import Dataset'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Datasets Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Persisted Enterprise Datasets</h3>
            <p className="text-xs text-slate-500">
              Select any dataset to power the dashboard, forecasting, and anomaly detection.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
            {datasets.length} Datasets
          </span>
        </div>

        {datasets.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No datasets uploaded yet. Click "Load Demo Campus Dataset" above or upload your own CSV.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-3 px-4">Dataset Name</th>
                  <th className="py-3 px-4">Rows</th>
                  <th className="py-3 px-4">Frequency</th>
                  <th className="py-3 px-4">Total Energy (kWh)</th>
                  <th className="py-3 px-4">Hourly Avg (kWh)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {datasets.map((ds) => {
                  const isActive = selectedDataset?.id === ds.id;
                  return (
                    <tr
                      key={ds.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isActive ? 'bg-brand-50/40 font-medium' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <Database className={`h-4 w-4 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
                          <span className="font-semibold text-slate-900">{ds.name}</span>
                          {ds.is_demo && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                              Demo
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {ds.start_time?.split('T')[0] || ''} to {ds.end_time?.split('T')[0] || ''}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        {ds.row_count.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 capitalize">
                        {ds.data_frequency}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {ds.total_consumption_kwh.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {ds.avg_consumption_kwh.toFixed(1)}
                      </td>
                      <td className="py-3.5 px-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Inactive</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        {!isActive && (
                          <button
                            onClick={() => setSelectedDataset(ds)}
                            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:border-brand-500 hover:text-brand-600 transition-colors shadow-2xs"
                          >
                            Set Active
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(ds.id)}
                          className="rounded-md p-1 text-slate-400 hover:text-red-600 transition-colors"
                          title="Delete dataset"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
