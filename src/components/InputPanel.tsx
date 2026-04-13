import { useState, useRef, useCallback } from 'react';
import { FileText, Link, ClipboardPaste, Upload, Loader, AlertCircle, Layers } from 'lucide-react';
import type { InputMode } from '../types';
import { extractFromPDF, extractFromURL } from '../lib/textExtractor';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { BatchUpload } from './BatchUpload';
import { BatchResults } from './BatchResults';
import { BatchProcessor, type BatchJob, type BatchProgress } from '../lib/batchProcessor';
import { useModelConfig } from '../hooks/useModelConfig';

interface AnalyzeMeta {
  sourceType: InputMode;
  sourceRef?: string;
}

interface Props {
  onAnalyze: (text: string, meta: AnalyzeMeta) => void;
  isAnalyzing: boolean;
}

export function InputPanel({ onAnalyze, isAnalyzing }: Props) {
  const { config } = useModelConfig();
  const [textValue, setTextValue] = useState('');
  const [urlValue, setUrlValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pdfName, setPdfName] = useState('');
  const [activeTab, setActiveTab] = useState<InputMode | 'batch'>('text');
  const fileRef = useRef<HTMLInputElement>(null);

  // Batch processing state
  const [batchProcessor] = useState(() => new BatchProcessor(config));
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
  const [batchProgress, setBatchProgress] = useState<BatchProgress>({
    total: 0,
    completed: 0,
    processing: 0,
    errors: 0,
  });
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [showBatchResults, setShowBatchResults] = useState(false);

  const clearError = () => setError('');

  const handleAnalyze = async () => {
    clearError();
    setLoading(true);
    try {
      let text = '';
      let meta: AnalyzeMeta = { sourceType: activeTab as InputMode };

      if (activeTab === 'text') {
        text = textValue.trim();
        if (!text) { setError('Paste some text first.'); return; }
      } else if (activeTab === 'pdf') {
        const file = fileRef.current?.files?.[0];
        if (!file) { setError('Select a PDF file.'); return; }
        text = await extractFromPDF(file);
        meta.sourceRef = file.name;
      } else {
        const url = urlValue.trim();
        if (!url) { setError('Enter a URL.'); return; }
        text = await extractFromURL(url);
        meta.sourceRef = url;
      }

      if (!text) { setError('No text could be extracted.'); return; }
      onAnalyze(text, meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || file.type !== 'application/pdf') {
      setError('Drop a PDF file.');
      return;
    }
    setPdfName(file.name);
    if (fileRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileRef.current.files = dt.files;
    }
  };

  // Batch processing handlers
  const handleAddBatchFiles = useCallback(async (files: File[]) => {
    clearError();
    const textFiles: File[] = [];

    for (const file of files) {
      if (file.type === 'application/pdf' || file.type === 'text/plain') {
        textFiles.push(file);
      }
    }

    if (textFiles.length === 0) {
      setError('Please upload PDF or text files only.');
      return;
    }

    // Extract text from each file and add to batch
    for (const file of textFiles) {
      try {
        let content = '';
        let type: InputMode = 'text';

        if (file.type === 'application/pdf') {
          content = await extractFromPDF(file);
          type = 'pdf';
        } else {
          content = await file.text();
          type = 'text';
        }

        if (content.trim()) {
          batchProcessor.addJob(file.name, type, content);
        }
      } catch (err) {
        console.error(`Failed to process ${file.name}:`, err);
      }
    }

    setBatchJobs(batchProcessor.getJobs());
    setBatchProgress(batchProcessor.getProgress());
    setShowBatchResults(false);
  }, [batchProcessor]);

  const handleRemoveBatchJob = useCallback((id: string) => {
    const jobs = batchProcessor.getJobs();
    const jobIndex = jobs.findIndex((j) => j.id === id);
    if (jobIndex > -1) {
      jobs.splice(jobIndex, 1);
      // Update the processor's internal state
      (batchProcessor as unknown as { jobs: BatchJob[] }).jobs = jobs;
      setBatchJobs([...jobs]);
      setBatchProgress(batchProcessor.getProgress());
    }
  }, [batchProcessor]);

  const handleStartBatchProcessing = useCallback(async () => {
    setIsBatchProcessing(true);
    setShowBatchResults(false);

    await batchProcessor.processAll(
      (job) => {
        // Update on each job completion
        setBatchJobs(batchProcessor.getJobs());
        setBatchProgress(batchProcessor.getProgress());
      },
      (progress) => {
        setBatchProgress(progress);
      }
    );

    setIsBatchProcessing(false);
    setShowBatchResults(true);
  }, [batchProcessor]);

  const handleClearBatch = useCallback(() => {
    batchProcessor.clear();
    setBatchJobs([]);
    setBatchProgress({ total: 0, completed: 0, processing: 0, errors: 0 });
    setShowBatchResults(false);
  }, [batchProcessor]);

  const isBusy = loading || isAnalyzing;

  return (
    <div className="bg-surface-low min-h-full">
      <div className="max-w-3xl mx-auto px-8 py-10">
        <Tabs
          value={activeTab}
          onValueChange={(v) => { setActiveTab(v as InputMode | 'batch'); clearError(); }}
        >
          <TabsList className="mb-3">
            <TabsTrigger value="text">
              <ClipboardPaste className="w-3.5 h-3.5" />
              Paste Text
            </TabsTrigger>
            <TabsTrigger value="pdf">
              <FileText className="w-3.5 h-3.5" />
              PDF Upload
            </TabsTrigger>
            <TabsTrigger value="url">
              <Link className="w-3.5 h-3.5" />
              URL
            </TabsTrigger>
            <TabsTrigger value="batch">
              <Layers className="w-3.5 h-3.5" />
              Batch
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-3 items-start">
            <div className="flex-1">
              <TabsContent value="text">
                <textarea
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !isBusy) {
                      handleAnalyze();
                    }
                  }}
                  placeholder="Paste a report, assessment, or any text containing estimative language…"
                  rows={4}
                  className="w-full bg-surface-lowest border-0 border-b-2 border-border focus:border-primary transition-colors rounded-t-sm px-4 py-3 text-sm font-serif text-foreground placeholder:text-muted-foreground placeholder:font-meta focus:outline-none resize-none"
                />
              </TabsContent>

              <TabsContent value="pdf">
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  onClick={() => fileRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && pdfName && !isBusy) {
                      e.preventDefault();
                      handleAnalyze();
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label="Upload PDF file"
                  className="w-full bg-surface-lowest border-0 border-b-2 border-dashed border-border hover:border-primary transition-colors rounded-t-sm px-4 py-8 text-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  <Upload className="w-7 h-7 text-muted-foreground/50 mx-auto mb-2" />
                  {pdfName ? (
                    <p className="text-sm font-meta text-foreground">{pdfName}</p>
                  ) : (
                    <>
                      <p className="text-sm font-meta text-muted-foreground">Drop a PDF or click to browse</p>
                      <p className="text-xs font-meta text-muted-foreground/60 mt-1">Text extracted client-side</p>
                    </>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setPdfName(f.name);
                      clearError();
                    }}
                  />
                </div>
              </TabsContent>

              <TabsContent value="url">
                <input
                  type="url"
                  value={urlValue}
                  onChange={(e) => setUrlValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !isBusy && handleAnalyze()}
                  placeholder="https://example.com/intelligence-report"
                  className="w-full bg-surface-lowest border-0 border-b-2 border-border focus:border-primary transition-colors rounded-t-sm px-4 py-3 text-sm font-meta text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </TabsContent>

              <TabsContent value="batch">
                {showBatchResults && batchProgress.completed > 0 ? (
                  <BatchResults jobs={batchJobs} />
                ) : (
                  <BatchUpload
                    isProcessing={isBatchProcessing}
                    jobs={batchJobs}
                    progress={batchProgress}
                    onAddFiles={handleAddBatchFiles}
                    onRemoveJob={handleRemoveBatchJob}
                    onStartProcessing={handleStartBatchProcessing}
                    onClearAll={handleClearBatch}
                  />
                )}
              </TabsContent>
            </div>

            {activeTab !== 'batch' && (
              <Button
                onClick={handleAnalyze}
                disabled={isBusy}
                className="shrink-0 mt-0.5"
              >
                {isBusy ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    {loading ? 'Extracting…' : 'Analyzing…'}
                  </>
                ) : (
                  'Analyze'
                )}
              </Button>
            )}
          </div>

          {error && (
            <div className="mt-2.5 flex items-center gap-1.5 text-xs font-meta text-destructive">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}
        </Tabs>
      </div>
    </div>
  );
}
