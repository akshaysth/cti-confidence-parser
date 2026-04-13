import { useState } from 'react';
import type { ModelConfig } from '../types';

const STORAGE_KEY = 'wel-model-config';

const DEFAULT_CONFIG: ModelConfig = {
  backend: 'ollama',
  endpoint: 'http://localhost:11434',
  model: 'llama3.1',
  apiKey: '',
};

function loadConfig(): ModelConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
  } catch {
    // ignore
  }
  return { ...DEFAULT_CONFIG };
}

export function useModelConfig() {
  const [config, setConfig] = useState<ModelConfig>(loadConfig);

  const updateConfig = (updates: Partial<ModelConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  return { config, updateConfig };
}
