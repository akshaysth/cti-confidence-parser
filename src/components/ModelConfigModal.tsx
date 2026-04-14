import { useState } from 'react';
import { Plug, CheckCircle, XCircle, Loader, RefreshCw } from 'lucide-react';
import type { ModelConfig, BackendType } from '../types';
import { testConnection, fetchModels } from '../lib/modelClient';
import { ThemeToggle } from './ThemeToggle';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface Props {
  config: ModelConfig;
  onSave: (updates: Partial<ModelConfig>) => void;
  onClose: () => void;
}

type TestState = 'idle' | 'testing' | 'ok' | 'fail';

const BACKEND_PRESETS: Record<BackendType, { endpoint: string; placeholder: string }> = {
  ollama: {
    endpoint: 'http://localhost:11434',
    placeholder: 'e.g. llama3.1, mistral, qwen2.5',
  },
  'openai-compatible': {
    endpoint: 'http://localhost:1234',
    placeholder: 'e.g. meta-llama-3.1-8b-instruct',
  },
};

export function ModelConfigModal({ config, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<ModelConfig>({ ...config });
  const [testState, setTestState] = useState<TestState>('idle');
  const [testMsg, setTestMsg] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const update = (field: keyof ModelConfig, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    setTestState('idle');
  };

  const handleBackendChange = (backend: BackendType) => {
    setDraft((prev) => ({
      ...prev,
      backend,
      endpoint: BACKEND_PRESETS[backend].endpoint,
    }));
    setAvailableModels([]);
    setTestState('idle');
  };

  const handleTest = async () => {
    setTestState('testing');
    const result = await testConnection(draft);
    setTestState(result.ok ? 'ok' : 'fail');
    setTestMsg(result.message);
  };

  const handleFetchModels = async () => {
    setFetchingModels(true);
    setFetchError('');
    try {
      const models = await fetchModels(draft);
      setAvailableModels(models);
      if (models.length === 0) setFetchError('No models found on this endpoint.');
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : String(err));
    } finally {
      setFetchingModels(false);
    }
  };

  const handleSave = () => {
    onSave(draft);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="mx-4">
        <DialogHeader>
          <DialogTitle>Model Settings</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 space-y-6">
          {/* Backend selector */}
          <div className="space-y-2">
            <Label>Backend</Label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {(['ollama', 'openai-compatible'] as BackendType[]).map((b) => (
                <button
                  key={b}
                  onClick={() => handleBackendChange(b)}
                  className={`px-3 py-2 rounded-md text-sm font-sans font-medium transition-colors border ${
                    draft.backend === b
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-border hover:text-foreground'
                  }`}
                >
                  {b === 'ollama' ? 'Ollama' : 'OpenAI-Compatible'}
                </button>
              ))}
            </div>
            {draft.backend === 'openai-compatible' && (
              <p className="text-xs font-meta text-muted-foreground">
                Works with LM Studio, llama.cpp, Unsloth, or any /v1/chat/completions endpoint.
              </p>
            )}
          </div>

          {/* Endpoint */}
          <div className="space-y-1.5">
            <Label htmlFor="endpoint">Endpoint URL</Label>
            <Input
              id="endpoint"
              type="text"
              value={draft.endpoint}
              onChange={(e) => update('endpoint', e.target.value)}
            />
          </div>

          {/* Model name + fetch */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="model">Model</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFetchModels}
                disabled={fetchingModels}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                {fetchingModels ? (
                  <Loader className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                Fetch available
              </Button>
            </div>

            {availableModels.length > 0 ? (
              <Select
                value={draft.model}
                onValueChange={(v) => update('model', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a model…" />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="model"
                type="text"
                value={draft.model}
                onChange={(e) => update('model', e.target.value)}
                placeholder={BACKEND_PRESETS[draft.backend].placeholder}
              />
            )}

            {fetchError && (
              <p className="text-xs font-meta text-destructive">{fetchError}</p>
            )}
          </div>

          {/* API Key */}
          {draft.backend === 'openai-compatible' && (
            <div className="space-y-1.5">
              <Label htmlFor="apikey">
                API Key{' '}
                <span className="normal-case font-normal opacity-50">(optional)</span>
              </Label>
              <Input
                id="apikey"
                type="password"
                value={draft.apiKey}
                onChange={(e) => update('apiKey', e.target.value)}
                placeholder="sk-…"
              />
            </div>
          )}

{/* Theme Toggle */}
      <ThemeToggle variant="select" />

      {/* Test result */}
      {testState !== 'idle' && (
        <div
          className={`flex items-start gap-2 px-3 py-2 rounded-md text-sm font-meta ${
            testState === 'testing'
            ? 'bg-muted text-muted-foreground'
            : testState === 'ok'
            ? 'bg-success/10 text-success'
            : 'bg-destructive/10 text-destructive'
          }`}
        >
          {testState === 'testing' && <Loader className="w-4 h-4 mt-0.5 animate-spin shrink-0" />}
          {testState === 'ok' && <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />}
          {testState === 'fail' && <XCircle className="w-4 h-4 mt-0.5 shrink-0" />}
          <span>{testState === 'testing' ? 'Testing connection…' : testMsg}</span>
        </div>
      )}
    </div>

    <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleTest} disabled={testState === 'testing'}>
            <Plug className="w-3.5 h-3.5" />
            Test Connection
          </Button>
          <Button size="sm" onClick={handleSave}>
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
