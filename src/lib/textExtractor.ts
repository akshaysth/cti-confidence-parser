import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';

// Configure PDF.js worker via Vite asset URL
GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).href;

async function parsePDFBuffer(buffer: ArrayBuffer): Promise<string> {
  const pdf = await getDocument({ data: buffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    fullText += pageText + '\n';
  }
  return fullText.trim();
}

export async function extractFromPDF(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  return parsePDFBuffer(buffer);
}

export async function extractFromURL(url: string): Promise<string> {
  const proxyUrl = `/api/fetch-url?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxyUrl);

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Failed to fetch URL (${res.status}): ${msg}`);
  }

  const contentType = res.headers.get('content-type') ?? '';

  if (contentType.includes('application/pdf')) {
    const buffer = await res.arrayBuffer();
    return parsePDFBuffer(buffer);
  }

  const html = await res.text();
  return stripHTML(html);
}

function stripHTML(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ')
    .trim();
}
