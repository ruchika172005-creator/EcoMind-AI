# EcoMind AI — Frontend Dashboard

High-aesthetic enterprise energy sustainability dashboard built with **React**, **TypeScript**, **Vite**, **Tailwind CSS**, and **Recharts**.

---

## 🎨 Design System

- **Color Palette**: Dark slate/navy sidebar (`#0F172A`), neutral clean background (`#F8FAFC`), emerald sustainability accents (`#10B981`), amber anomaly highlights (`#F59E0B`).
- **Typography**: Google Font Inter.
- **Charts**: High-performance interactive visualizations via Recharts (Area charts, Composed dual-axis charts, Diurnal load profiles, Period breakdown bar charts, Anomaly scatter overlays).
- **Icons**: Lucide React.
- **Form Handling & Validation**: React Hook Form with Zod schemas.

---

## 🚀 Running the Frontend

Navigate to `frontend/`:

```bash
cd frontend

# Install dependencies (respecting peer dependencies)
npm install --legacy-peer-deps

# Start Vite development server
npm run dev
```

The frontend will run at: **`http://localhost:5173`** (or `http://127.0.0.1:5173`).

---

## 🧪 Testing and Building

```bash
# Run Vitest unit tests
npm test

# Build for production
npm run build
```

---

## 📄 Application Pages

1. **Dashboard (`/`)**: Executive sustainability overview, 6 KPI cards, 4 interactive charts, dataset switcher.
2. **Data Management (`/data`)**: CSV upload, column mapping, data quality assessment, and dataset table.
3. **Energy Analytics (`/analytics`)**: Dual-axis weather & load profile, 24-hour diurnal patterns, and periodic aggregations.
4. **Consumption Forecasting (`/forecasting`)**: Model selector (XGBoost, Random Forest, Seasonal Naive), multi-step horizons (24h to 336h), confidence intervals, and validation benchmarks (MAE, RMSE, WAPE, R²).
5. **Anomaly Detection (`/anomalies`)**: Isolation Forest sensitivity slider, scatter anomaly plot, severity filters, and diagnostic root-cause inspector modal.
6. **Carbon Analytics (`/carbon`)**: Standard emission factor presets (EPA eGRID, UK Defra, EU-27), custom factor recalculation, and EPA GHG equivalencies (trees, gasoline, vehicles).
7. **AI Recommendations (`/recommendations`)**: Data-backed energy conservation measures, priority filters, evidence breakdowns, suggested engineering actions, and status trackers.
8. **Reports & Exports (`/reports`)**: Direct CSV download for all 5 modules and printable executive sustainability audit.
9. **Settings & Status (`/settings`)**: Live API health checks, ORM dialect, ML runtime inspection, and global factor configurations.
10. **AI Sustainability Assistant**: Persistent conversational drawer with verified data citations and follow-up prompts.
