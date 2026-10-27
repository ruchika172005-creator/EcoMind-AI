import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Dataset } from '../types';
import { api } from '../api/client';

interface DatasetContextType {
  datasets: Dataset[];
  selectedDataset: Dataset | null;
  setSelectedDataset: (dataset: Dataset | null) => void;
  loading: boolean;
  refreshDatasets: () => Promise<void>;
  loadDemo: () => Promise<void>;
}

const DatasetContext = createContext<DatasetContextType | undefined>(undefined);

export const DatasetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshDatasets = async () => {
    try {
      setLoading(true);
      const list = await api.getDatasets();
      setDatasets(list);
      if (list.length > 0) {
        // Keep current selected if it still exists, else pick first
        setSelectedDataset((prev) => {
          if (prev && list.some((d) => d.id === prev.id)) {
            return list.find((d) => d.id === prev.id) || list[0];
          }
          return list[0];
        });
      } else {
        setSelectedDataset(null);
      }
    } catch (err) {
      console.error('Error fetching datasets:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDemo = async () => {
    setLoading(true);
    try {
      const demo = await api.loadDemoDataset();
      await refreshDatasets();
      setSelectedDataset(demo);
    } catch (err) {
      console.error('Failed to load demo dataset:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshDatasets();
  }, []);

  return (
    <DatasetContext.Provider
      value={{
        datasets,
        selectedDataset,
        setSelectedDataset,
        loading,
        refreshDatasets,
        loadDemo,
      }}
    >
      {children}
    </DatasetContext.Provider>
  );
};

export const useDataset = () => {
  const context = useContext(DatasetContext);
  if (!context) {
    throw new Error('useDataset must be used within a DatasetProvider');
  }
  return context;
};
