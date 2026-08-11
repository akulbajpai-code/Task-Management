export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_DOCUMENT_TYPES = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/plain': '.txt',
};

export const DOCUMENT_ACCEPT = '.pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain';

export function documentMimeType(file) {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'pdf') return 'application/pdf';
  if (extension === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (extension === 'txt') return 'text/plain';
  return file.type || 'application/octet-stream';
}

export function validateDocument(file) {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const typeIsAllowed = Boolean(ACCEPTED_DOCUMENT_TYPES[file.type]) || ['pdf', 'docx', 'txt'].includes(extension);
  if (!typeIsAllowed) throw new Error(`${file.name} is not supported. Upload a PDF, DOCX, or TXT file.`);
  if (file.size > MAX_DOCUMENT_BYTES) throw new Error(`${file.name} is larger than 10 MB.`);
}

function cleanText(text) {
  return String(text || '')
    .replace(/\u0000/g, '')
    .replace(/\s{3,}/g, ' ')
    .trim()
    .slice(0, 30000);
}

export async function extractDocumentText(file) {
  validateDocument(file);
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (file.type === 'text/plain' || extension === 'txt') {
    return cleanText(await file.text());
  }

  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || extension === 'docx') {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return cleanText(result.value);
  }

  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).toString();
  }
  const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str || '').join(' '));
  }
  return cleanText(pages.join('\n'));
}

export function safeFilename(name) {
  return String(name || 'document')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120);
}
