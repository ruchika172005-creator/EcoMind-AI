import React, { useState, useEffect } from 'react';
import {
  Network,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Database,
  Building,
  DollarSign,
  ShieldAlert,
  Sliders,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { erpApi } from '../api/advancedApi';
import { ERPConnector, ERPSyncRun, ERPUtilityRecord } from '../types/erp';

export const ERPIntegrationsPage: React.FC = () => {
  const [connectors, setConnectors] = useState<ERPConnector[]>([]);
  const [syncHistory, setSyncHistory] = useState<ERPSyncRun[]>([]);
  const [utilityRecords, setUtilityRecords] = useState<ERPUtilityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSyncingId, setActiveSyncingId] = useState<number | null>(null);
  const [activeTestingId, setActiveTestingId] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<{ id: number; success: boolean; message: string } | null>(null);
  const [selectedUtilityFilter, setSelectedUtilityFilter] = useState<string>('ALL');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [conns, history, records] = await Promise.all([
        erpApi.getConnectors(),
        erpApi.getSyncHistory(15),
        erpApi.getUtilityRecords(undefined, undefined, 50),
      ]);
      setConnectors(conns);
      setSyncHistory(history);
      setUtilityRecords(records);
    } catch (err: any) {
      console.error('Failed to load ERP integrations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTestConnection = async (id: number) => {
    setActiveTestingId(id);
    setTestResult(null);
    try {
      const res = await erpApi.testConnection(id);
      setTestResult({ id, success: res.success, message: res.message });
      const conns = await erpApi.getConnectors();
      setConnectors(conns);
    } catch (err: any) {
      setTestResult({ id, success: false, message: err?.response?.data?.detail || 'Test failed.' });
    } finally {
      setActiveTestingId(null);
    }
  };

  const handleSync = async (id: number) => {
    setActiveSyncingId(id);
    try {
      const res = await erpApi.syncConnector(id, false, 50);
      alert(`Sync completed! ${res.records_imported} imported, ${res.records_skipped} duplicate transactions skipped.`);
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Sync failed.');
    } finally {
      setActiveSyncingId(null);
    }
  };

  const handleConvertToAnalytics = async (connectorId: number) => {
    try {
      const res = await erpApi.convertToAnalytics(connectorId);
      alert(`Success! Converted ${res.converted_records_count} utility records into canonical energy analytics pipeline.`);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Conversion failed.');
    }
  };

  const filteredRecords = utilityRecords.filter((r) =>
    selectedUtilityFilter === 'ALL' ? true : r.utility_type === selectedUtilityFilter
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">ERP Integrations & Utility Ingestion</h1>
            <span className="rounded-full bg-blue-50 text-blue-700 text-xs px-2.5 py-0.5 border border-blue-200 font-medium">
              Enterprise Data Hub
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Connect corporate SAP, Oracle NetSuite, Microsoft Dynamics 365, and utility billing feeds to automate scope 1 and 2 resource accounting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh Feeds
          </button>
        </div>
      </div>

      {/* Security & SSRF Banner */}
      <div className="p-4 rounded-xl bg-slate-900 text-slate-300 text-xs border border-slate-800 flex items-start gap-3 shadow-md">
        <ShieldAlert className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-white">Enterprise Security & Secret Protection: </span>
          All credentials, access tokens, and OAuth keys are stored masked and encrypted on the server side.
          Outbound network calls enforce strict SSRF firewalls blocking loopback and private subnets.
        </div>
      </div>

      {/* Connectors Grid */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-3">Configured ERP Connectors</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {connectors.map((conn) => {
            const isSyncing = activeSyncingId === conn.id;
            const isTesting = activeTestingId === conn.id;

            return (
              <div
                key={conn.id}
                className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                        <Network className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{conn.name}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">{conn.connector_type}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {conn.is_simulated ? (
                        <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                          Simulated Sandbox
                        </span>
                      ) : (
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                          Production Gateway
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          conn.status === 'CONNECTED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : conn.status === 'CONFIGURED'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {conn.status}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 mt-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Endpoint:</span>
                      <span className="font-mono text-[11px] truncate max-w-[220px]" title={conn.endpoint_url || 'Local File Fallback'}>
                        {conn.endpoint_url || 'Local Ingest Mode'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Auth Token:</span>
                      <span className="font-mono text-[11px] text-slate-500">{conn.credentials_masked || 'None'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Last Sync:</span>
                      <span className="text-slate-700 font-medium">
                        {conn.last_sync_time ? new Date(conn.last_sync_time).toLocaleString() : 'Never'}
                        {conn.last_sync_status && ` (${conn.last_sync_status})`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Records Imported:</span>
                      <span className="font-bold text-slate-900">{conn.last_sync_records_count}</span>
                    </div>
                  </div>

                  {testResult && testResult.id === conn.id && (
                    <div
                      className={`mt-3 p-3 rounded-xl text-xs flex items-start gap-2 ${
                        testResult.success
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {testResult.success ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <span>{testResult.message}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleTestConnection(conn.id)}
                    disabled={isTesting}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {isTesting ? 'Testing...' : 'Test Connection'}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleConvertToAnalytics(conn.id)}
                      className="px-2.5 py-1.5 text-xs font-semibold rounded-lg text-emerald-700 hover:bg-emerald-50 border border-emerald-300 flex items-center gap-1"
                      title="Sync records into main forecasting & anomaly pipeline"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      Link to Analytics
                    </button>
                    <button
                      onClick={() => handleSync(conn.id)}
                      disabled={isSyncing}
                      className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white shadow-sm disabled:opacity-50 flex items-center gap-1"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      {isSyncing ? 'Syncing...' : 'Sync Now'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Utility Records Ingestion Table */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Synchronized Utility Records</h3>
            <p className="text-xs text-slate-500">
              Normalized corporate utility invoice entries (Electricity, Water, Natural Gas, Waste)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Filter Utility:</span>
            <select
              value={selectedUtilityFilter}
              onChange={(e) => setSelectedUtilityFilter(e.target.value)}
              className="text-xs font-semibold rounded-lg border-slate-300 py-1.5 pl-2.5 pr-8 bg-white"
            >
              <option value="ALL">All Utilities</option>
              <option value="ELECTRICITY">Electricity (kWh)</option>
              <option value="WATER">Water (m³)</option>
              <option value="NATURAL_GAS">Natural Gas (therms)</option>
              <option value="WASTE">Waste (kg)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">Invoice #</th>
                <th className="py-3 px-3">Utility Type</th>
                <th className="py-3 px-3">Billing Window</th>
                <th className="py-3 px-3">Billed Quantity</th>
                <th className="py-3 px-3">Total Cost</th>
                <th className="py-3 px-3">Facility</th>
                <th className="py-3 px-3">Provenance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No utility records synchronized yet. Click "Sync Now" on one of the ERP connectors above.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{r.invoice_number || r.external_transaction_id}</td>
                    <td className="py-3 px-3">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                        r.utility_type === 'ELECTRICITY'
                          ? 'bg-amber-50 text-amber-700'
                          : r.utility_type === 'WATER'
                          ? 'bg-blue-50 text-blue-700'
                          : r.utility_type === 'NATURAL_GAS'
                          ? 'bg-sky-50 text-sky-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {r.utility_type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {new Date(r.billing_period_start).toLocaleDateString()} — {new Date(r.billing_period_end).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-800">
                      {r.billed_quantity.toLocaleString()} {r.unit}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      ${r.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-slate-500">{r.facility_id}</td>
                    <td className="py-3 px-3">
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600">
                        {r.provenance}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Synchronization Audit Log */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-1">Synchronization Audit History</h3>
        <p className="text-xs text-slate-500 mb-4">
          Audit trail tracking idempotent payload synchronization, duplicate filtering, and connection status.
        </p>

        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
          {syncHistory.map((run) => (
            <div key={run.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50">
              <div className="flex items-center gap-3">
                <div
                  className={`h-2.5 w-2.5 rounded-full ${
                    run.status === 'SUCCESS' ? 'bg-emerald-500' : run.status === 'PARTIAL' ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                />
                <div>
                  <span className="font-bold text-slate-900">{run.connector_name}</span>
                  <span className="text-slate-400 ml-2">
                    {new Date(run.started_at).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-slate-600">
                  <b>{run.records_imported}</b> imported • <b>{run.records_skipped}</b> duplicates skipped
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                    run.status === 'SUCCESS'
                      ? 'bg-emerald-50 text-emerald-700'
                      : run.status === 'PARTIAL'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {run.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
