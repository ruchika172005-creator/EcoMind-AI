import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Edit3,
  Calendar,
  Building2,
  Printer,
  FileSpreadsheet,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { esgApi } from '../api/advancedApi';
import { ESGIndicator, ESGIndicatorValue, ESGReport } from '../types/esg';

export const ESGReportsPage: React.FC = () => {
  const [indicators, setIndicators] = useState<ESGIndicator[]>([]);
  const [values, setValues] = useState<ESGIndicatorValue[]>([]);
  const [reports, setReports] = useState<ESGReport[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Environmental' | 'Social' | 'Governance'>('All');
  const [reportingPeriod, setReportingPeriod] = useState('2024-Annual');
  const [facilityId, setFacilityId] = useState('All Facilities');
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingValue, setEditingValue] = useState<ESGIndicatorValue | null>(null);
  const [editFormData, setEditFormData] = useState({
    numeric_value: '',
    text_value: '',
    provenance: 'User-Entered',
    data_source: 'Sustainability Officer Verification',
    notes: '',
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [inds, vals, reps] = await Promise.all([
        esgApi.getIndicators(),
        esgApi.getValues(facilityId, reportingPeriod),
        esgApi.getReports(),
      ]);
      setIndicators(inds);
      setValues(vals);
      setReports(reps);
    } catch (err: any) {
      console.error('Failed to load ESG data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [reportingPeriod, facilityId]);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      const report = await esgApi.generateReport({
        organization_name: 'EcoMind Enterprise Operations',
        facility_id: facilityId,
        reporting_period: reportingPeriod,
        framework_alignment: 'GRI Standards / ISSB S2',
      });
      setReports([report, ...reports]);
      alert(`ESG Report generated successfully! Stored as: ${report.pdf_filename}`);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to generate report.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenEdit = (val: ESGIndicatorValue) => {
    setEditingValue(val);
    setEditFormData({
      numeric_value: val.numeric_value != null ? val.numeric_value.toString() : '',
      text_value: val.text_value || '',
      provenance: val.provenance || 'User-Entered',
      data_source: val.data_source || 'Corporate Officer Input',
      notes: val.notes || '',
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingValue) return;
    try {
      const updated = await esgApi.updateValue({
        indicator_id: editingValue.indicator_id,
        facility_id: facilityId,
        reporting_period: reportingPeriod,
        numeric_value: editFormData.numeric_value ? parseFloat(editFormData.numeric_value) : null,
        text_value: editFormData.text_value || null,
        provenance: editFormData.provenance,
        data_source: editFormData.data_source,
        notes: editFormData.notes,
      });

      setValues(values.map((v) => (v.id === updated.id ? updated : v)));
      setEditModalOpen(false);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to update indicator value.');
    }
  };

  const filteredValues = values.filter((v) =>
    selectedCategory === 'All' ? true : v.category === selectedCategory
  );

  const totalCount = values.length;
  const verifiedCount = values.filter((v) => v.status === 'Verified').length;
  const completeness = totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">ESG Reporting & Disclosures</h1>
            <span className="rounded-full bg-emerald-50 text-emerald-700 text-xs px-2.5 py-0.5 border border-emerald-200 font-medium">
              GRI & ISSB Aligned
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Automated sustainability disclosures conforming to GRI Standards, ISSB S2, and CSDDD audit requirements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={esgApi.getCsvExportUrl(facilityId, reportingPeriod)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-sm"
            download
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Export CSV
          </a>
          <button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-all disabled:opacity-50"
          >
            <FileCheck className={`h-4 w-4 ${isGenerating ? 'animate-pulse' : ''}`} />
            {isGenerating ? 'Compiling PDF...' : 'Generate Official PDF'}
          </button>
        </div>
      </div>

      {/* Filter and Completeness Banner */}
      <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <select
              value={reportingPeriod}
              onChange={(e) => setReportingPeriod(e.target.value)}
              className="text-xs font-semibold rounded-lg border-slate-300 bg-white py-1.5 pl-3 pr-8 text-slate-800 shadow-sm"
            >
              <option value="2024-Annual">Reporting Period: 2024-Annual</option>
              <option value="2024-Q1">Reporting Period: 2024-Q1</option>
              <option value="2024-Q2">Reporting Period: 2024-Q2</option>
              <option value="2024-Q3">Reporting Period: 2024-Q3</option>
              <option value="2024-Q4">Reporting Period: 2024-Q4</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-400" />
            <select
              value={facilityId}
              onChange={(e) => setFacilityId(e.target.value)}
              className="text-xs font-semibold rounded-lg border-slate-300 bg-white py-1.5 pl-3 pr-8 text-slate-800 shadow-sm"
            >
              <option value="All Facilities">Boundary: All Operational Facilities</option>
              <option value="HQ-BLDG-01">HQ Campus Building 01</option>
              <option value="FACILITY-EAST-02">Eastern Distribution Hub</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-medium">Audit Completeness:</span>
          <div className="flex items-center gap-2">
            <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-2 rounded-full"
                style={{ width: `${completeness}%` }}
              />
            </div>
            <span className="text-xs font-bold text-slate-900">{completeness}%</span>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {(['All', 'Environmental', 'Social', 'Governance'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`pb-3 text-xs font-semibold transition-all border-b-2 px-3 ${
              selectedCategory === cat
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {cat} Disclosures
          </button>
        ))}
      </div>

      {/* Indicators Disclosure Table */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">GRI Code</th>
                <th className="py-3 px-3">Indicator Name</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Disclosed Value</th>
                <th className="py-3 px-3">Unit</th>
                <th className="py-3 px-3">Data Provenance</th>
                <th className="py-3 px-3">Verification Source</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredValues.map((val) => {
                const isNumeric = val.numeric_value != null;
                const displayVal = isNumeric
                  ? `${val.numeric_value?.toLocaleString()}`
                  : val.text_value || 'Not Disclosed';

                return (
                  <tr key={val.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{val.indicator_code}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{val.indicator_name}</td>
                    <td className="py-3 px-3">
                      <span className="rounded px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {val.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 max-w-xs truncate" title={displayVal}>
                      {displayVal}
                    </td>
                    <td className="py-3 px-3 text-slate-500">{val.unit}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          val.provenance === 'Measured'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : val.provenance === 'User-Entered'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {val.provenance}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 max-w-[180px] truncate" title={val.data_source}>
                      {val.data_source}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleOpenEdit(val)}
                        className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 justify-end ml-auto"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generated Reports History */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-1">Generated Publication Reports</h3>
        <p className="text-xs text-slate-500 mb-4">
          Download verifiable, stamped PDF reports for board submission and regulatory compliance.
        </p>

        {reports.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 border border-dashed rounded-xl">
            No published ESG reports yet. Click "Generate Official PDF" above to compile a disclosure package.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {reports.map((r) => (
              <div key={r.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{r.title}</h4>
                    <p className="text-[11px] text-slate-400">
                      {r.organization_name} • {r.reporting_period} • Completeness: {r.completeness_score}% • Version: {r.methodology_version}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-400">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                  <a
                    href={esgApi.getPdfUrl(r.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download PDF
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Indicator Value Modal */}
      {editModalOpen && editingValue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Edit ESG Metric Value</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{editingValue.indicator_code} — {editingValue.indicator_name}</p>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {editingValue.category !== 'Governance' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Numeric Value ({editingValue.unit})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editFormData.numeric_value}
                    onChange={(e) => setEditFormData({ ...editFormData, numeric_value: e.target.value })}
                    className="w-full text-xs rounded-lg border-slate-300 py-2 px-3 text-slate-900 shadow-sm"
                    placeholder="Enter reported figure"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Governance Status / Description
                  </label>
                  <input
                    type="text"
                    value={editFormData.text_value}
                    onChange={(e) => setEditFormData({ ...editFormData, text_value: e.target.value })}
                    className="w-full text-xs rounded-lg border-slate-300 py-2 px-3 text-slate-900 shadow-sm"
                    placeholder="e.g. Formal ESG Oversight Committee Chaired by Lead Director"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Data Provenance
                </label>
                <select
                  value={editFormData.provenance}
                  onChange={(e) => setEditFormData({ ...editFormData, provenance: e.target.value })}
                  className="w-full text-xs rounded-lg border-slate-300 py-2 px-3 text-slate-900 shadow-sm"
                >
                  <option value="Measured">Measured (Direct Meter / Sensor Reading)</option>
                  <option value="User-Entered">User-Entered (Corporate Officer Signed)</option>
                  <option value="Estimated">Estimated (Engineering Modeling)</option>
                  <option value="Simulated">Simulated (Sandbox Mode)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Verification / Assurance Source
                </label>
                <input
                  type="text"
                  value={editFormData.data_source}
                  onChange={(e) => setEditFormData({ ...editFormData, data_source: e.target.value })}
                  className="w-full text-xs rounded-lg border-slate-300 py-2 px-3 text-slate-900 shadow-sm"
                  placeholder="e.g. HR Demographics Audit / Board Minutes"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Audit Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className="w-full text-xs rounded-lg border-slate-300 py-2 px-3 text-slate-900 shadow-sm"
                  placeholder="Add scope assumptions or notes"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg"
                >
                  Save Disclosed Value
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
