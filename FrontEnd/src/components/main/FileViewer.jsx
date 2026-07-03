import { useRef, useState, useEffect, useCallback } from 'react';
import PdfViewer from './PdfViewer';
import {
  FileSearch,
  Download,
  Printer,
  Maximize2,
  Minimize2,
  FileText,
  Archive,
  ImageIcon
} from 'lucide-react';
import { config } from '../../config';

const getFileType = (filename) => {
  if (!filename) return 'unknown';
  const ext = filename.split('.').pop().toLowerCase();
  if (['pdf'].includes(ext)) return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'word';
  if (['xls', 'xlsx'].includes(ext)) return 'excel';
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext)) return 'video';
  if (['zip', 'rar'].includes(ext)) return 'zip';
  if (['txt', 'md', 'csv'].includes(ext)) return 'text';
  if (['html', 'htm'].includes(ext)) return 'html';
  return 'unknown';
};

const getMimeType = (filename) => {
  if (!filename) return 'application/octet-stream';
  const ext = filename.split('.').pop().toLowerCase();
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'svg': return 'image/svg+xml';
    case 'webp': return 'image/webp';
    case 'mp4': return 'video/mp4';
    case 'webm': return 'video/webm';
    case 'ogg': return 'video/ogg';
    case 'mov': return 'video/quicktime';
    case 'avi': return 'video/x-msvideo';
    case 'txt': return 'text/plain';
    case 'md': return 'text/markdown';
    case 'csv': return 'text/csv';
    default: return 'application/octet-stream';
  }
};

const FileViewer = ({ data }) => {
  const viewerRef = useRef(null);
  const docxRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zipContents, setZipContents] = useState([]);
  const [loadingZip, setLoadingZip] = useState(false);
  const [zipError, setZipError] = useState(null);
  const [excelData, setExcelData] = useState(null);
  const [loadingOffice, setLoadingOffice] = useState(false);
  const [officeError, setOfficeError] = useState(null);
  const [textContent, setTextContent] = useState(null);
  const [loadingText, setLoadingText] = useState(false);
  const [textError, setTextError] = useState(null);

  const resolvedType = data?.type && data.type !== 'unknown' ? data.type : getFileType(data?.title);

  const getStreamUrl = (url) => {
    if (!url) return '';
    const token = localStorage.getItem('token');
    return token ? `${url}?token=${encodeURIComponent(token)}` : url;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      viewerRef.current?.requestFullscreen().catch(err => {
        console.error("Error attempting to enable full-screen mode:", err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // getFileType is now defined globally

  const loadZipContents = useCallback(async (url) => {
    setLoadingZip(true);
    setZipError(null);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error('Failed to fetch zip file');
      const blob = await response.blob();
      const zip = await import("@zip.js/zip.js");
      const reader = new zip.ZipReader(new zip.BlobReader(blob));
      const entries = await reader.getEntries();

      const contents = entries.map(entry => ({
        name: entry.filename,
        size: formatBytes(entry.uncompressedSize),
        isDirectory: entry.directory,
        type: getFileType(entry.filename)
      }));

      setZipContents(contents);
      await reader.close();
    } catch (err) {
      console.error("Error reading zip:", err);
      setZipError("Could not read zip contents");
    } finally {
      setLoadingZip(false);
    }
  }, []);

  const loadOfficeDoc = useCallback(async (url, type) => {
    setLoadingOffice(true);
    setOfficeError(null);
    setExcelData(null);

    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error(`Failed to fetch ${type} file`);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();

      if (type === 'word') {
        if (docxRef.current) {
          docxRef.current.innerHTML = '';
          const { renderAsync } = await import("docx-preview");
          await renderAsync(arrayBuffer, docxRef.current);
        }
      } else if (type === 'excel') {
        const XLSX = await import("xlsx");
        const workbook = XLSX.read(arrayBuffer);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        setExcelData(jsonData);
      }
    } catch (err) {
      console.error(`Error loading ${type}:`, err);
      setOfficeError(`Could not preview ${type} document.`);
    } finally {
      setLoadingOffice(false);
    }
  }, []);

  const loadTextContent = useCallback(async (url) => {
    setLoadingText(true);
    setTextError(null);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error('Failed to fetch text file');
      const text = await response.text();
      setTextContent(text);
    } catch (err) {
      console.error("Error reading text:", err);
      setTextError("Could not read text contents");
    } finally {
      setLoadingText(false);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const resolvedType = data?.type && data.type !== 'unknown' ? data.type : getFileType(data?.title);
      if (resolvedType === 'zip' && data.url) {
        loadZipContents(data.url);
      } else if ((resolvedType === 'word' || resolvedType === 'excel') && data.url) {
        loadOfficeDoc(data.url, resolvedType);
      } else if (resolvedType === 'text' && data.url) {
        loadTextContent(data.url);
      } else {
        setZipContents([]);
        setZipError(null);
        setExcelData(null);
        setOfficeError(null);
        setTextContent(null);
        setTextError(null);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [data, loadZipContents, loadOfficeDoc, loadTextContent]);

  const handleDownload = () => {
    if (!data || !data.id) return;

    const downloadUrl = getStreamUrl(`${config.API_BASE_URL || ''}/api/files/${data.id}/download`);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = data.title; // Provide a fallback filename
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    if (!data) return;

    if (resolvedType === 'pdf') {
      const printUrl = getStreamUrl(data.url);
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.src = printUrl;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          setTimeout(() => document.body.removeChild(iframe), 1000);
        } catch (e) {
          console.error("PDF Print failed", e);
          window.open(printUrl, '_blank');
          document.body.removeChild(iframe);
        }
      };
      return;
    }

    // For other document types, print the rendered preview HTML inside the iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const previewEl = document.querySelector('.viewer-content');
    const contentHtml = previewEl ? previewEl.innerHTML : '';

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <html>
        <head>
          <title>${data.title}</title>
          <style>
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 20px;
              color: #333;
              background: white;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              font-size: 12px;
            }
            td, th {
              border: 1px solid #ddd;
              padding: 8px;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            pre {
              white-space: pre-wrap;
              word-wrap: break-word;
              font-family: monospace;
              font-size: 13px;
              background: #f8f9fa;
              padding: 15px;
              border-radius: 6px;
              border: 1px solid #e9ecef;
            }
          </style>
        </head>
        <body>
          <h2>${data.title}</h2>
          <hr />
          <div>${contentHtml}</div>
        </body>
      </html>
    `);
    doc.close();

    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    } catch (e) {
      console.error("Print failed", e);
      document.body.removeChild(iframe);
    }
  };

  if (!data) {
    return (
      <div className="document-viewer empty solid-panel">
        <div className="empty-state">
          <div className="empty-icon-container">
            <FileSearch size={48} strokeWidth={1.5} />
          </div>
          <h3>No File Selected</h3>
          <p>Select a document from the list to preview its contents here.</p>
        </div>
        <style dangerouslySetInnerHTML={{
          __html: `
          .document-viewer.empty {
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            border-left: 1px solid var(--glass-border);
          }
          .empty-state {
            text-align: center;
            color: var(--text-muted);
            max-width: 250px;
          }
          .empty-icon-container {
            margin-bottom: 20px;
            opacity: 0.3;
            display: flex;
            justify-content: center;
          }
          .empty-state h3 {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 8px;
            color: var(--text-main);
          }
          .empty-state p {
            font-size: 13px;
            line-height: 1.5;
          }
        `}} />
      </div>
    );
  }

  const renderPreviewContent = () => {
    if (loadingOffice || loadingText) {
      return <div className="loading-state">Loading document...</div>;
    }

    if (officeError || textError) {
      return <div className="error-state">{officeError || textError}</div>;
    }

    // PDF is now handled by PdfViewer
    if (resolvedType === 'pdf' && data.url) {
      return <PdfViewer key={data.id} url={getStreamUrl(data.url)} />;
    }

    switch (resolvedType) {
      case 'image':
        return (
          <div className="image-preview-wrapper" style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <img src={getStreamUrl(data.url)} alt={data.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          </div>
        );
      case 'video':
        return (
          <div className="video-preview-wrapper" style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'var(--solid-bg)' }}>
            <video controls src={getStreamUrl(data.url)} style={{ width: '100%', height: '100%', objectFit: 'contain' }}>
              Your browser does not support the video tag.
            </video>
          </div>
        );
      case 'html':
        return (
          <div className="html-preview-wrapper" style={{ height: '100%', width: '100%' }}>
            <iframe
              src={getStreamUrl(data.url)}
              title={data.title}
              style={{ width: '100%', height: '100%', border: 'none', background: 'white' }}
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        );
      case 'text':
        return (
          <div className="text-preview-wrapper">
            <pre className="text-content">
              {textContent}
            </pre>
          </div>
        );
      case 'word':
        return (
          <div className="docx-preview-wrapper" style={{ height: '100%', overflow: 'auto', padding: '20px', background: 'white' }}>
            <div ref={docxRef}></div>
          </div>
        );
      case 'excel':
        return (
          <div className="excel-preview-wrapper" style={{ height: '100%', overflow: 'auto', padding: '20px', background: 'white' }}>
            {excelData && (
              <table className="excel-table">
                <tbody>
                  {excelData.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => <td key={j}>{cell}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      case 'zip':
        return (
          <div className="zip-preview">
            <div className="zip-header">
              <Archive size={20} />
              <span>Archive Contents ({data.title})</span>
            </div>
            <div className="zip-contents">
              {loadingZip ? (
                <div className="loading-zip">Loading archive contents...</div>
              ) : zipError ? (
                <div className="zip-error">{zipError}</div>
              ) : zipContents.length > 0 ? (
                zipContents.map((file, index) => (
                  <div key={index} className="zip-item">
                    {file.isDirectory ? (
                      <div className="zip-icon folder-icon">📁</div>
                    ) : (
                      <div className={`zip-icon ${file.type}`}>
                        {file.type === 'pdf' && <FileText size={16} color="#e74c3c" />}
                        {file.type === 'word' && <FileText size={16} color="#3498db" />}
                        {file.type === 'excel' && <FileText size={16} color="#2ecc71" />}
                        {file.type === 'image' && <ImageIcon size={16} color="#f1c40f" />}
                        {file.type === 'text' && <FileText size={16} color="#95a5a6" />}
                        {file.type === 'video' && <FileText size={16} color="#e67e22" />}
                      </div>
                    )}
                    <span className="zip-name">{file.name}</span>
                    <span className="zip-size">{file.isDirectory ? 'Directory' : file.size}</span>
                  </div>
                ))
              ) : (
                <div className="empty-zip">Archive is empty.</div>
              )}
            </div>
          </div>
        );
      default:
        return (
          <div className="generic-preview">
            <div className="empty-state">
              <FileText size={48} strokeWidth={1} />
              <p>Preview not available for this file type.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div ref={viewerRef} className={`document-viewer solid-panel ${isFullscreen ? 'fullscreen' : ''}`}>
      <div className="viewer-header">
        <div className="header-left">
          <span className="viewer-title">{data.title}</span>
          <div className={`doc-tag ${resolvedType}`}>{resolvedType.toUpperCase()}</div>
        </div>
        <div className="header-actions">
          <button className="action-btn" onClick={handleDownload} title="Download"><Download size={18} /></button>
          {resolvedType !== 'video' && resolvedType !== 'image' && resolvedType !== 'zip' && (
            <button className="action-btn" onClick={handlePrint} title="Print"><Printer size={18} /></button>
          )}
          <button className="action-btn" onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>
      <div className="viewer-content">
        {renderPreviewContent()}
      </div>
      <style dangerouslySetInnerHTML={{
        __html: `
        .document-viewer {
          height: 100%;
          display: flex;
          flex-direction: column;
          color: var(--text-main);
          border-left: 1px solid var(--glass-border);
          position: relative;
          z-index: 20;
          overflow: hidden;
        }
        .document-viewer.fullscreen {
          background: var(--solid-bg);
          width: 100vw;
          height: 100vh;
        }
        .viewer-header {
          padding: 12px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--glass-border);
          background: var(--solid-bg);
          flex-shrink: 0;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .viewer-title {
          font-size: 15px;
          font-weight: 600;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .doc-tag {
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 9px;
          font-weight: bold;
          color: white;
          text-transform: uppercase;
        }
        .doc-tag.pdf { background: #e74c3c; }
        .doc-tag.word { background: #3498db; }
        .doc-tag.image { background: #f1c40f; }
        .doc-tag.excel { background: #2ecc71; }
        .doc-tag.zip { background: #9b59b6; }
        .doc-tag.video { background: #e67e22; }

        .header-actions {
          display: flex;
          gap: 8px;
        }
        .action-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .action-btn:hover {
          background: rgba(0,0,0,0.05);
          color: var(--text-main);
        }
        body.dark-mode .action-btn:hover {
          background: rgba(255,255,255,0.1);
        }

        .viewer-content {
          flex: 1;
          overflow: hidden;
          background: rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
        }
        body.dark-mode .viewer-content {
          background: rgba(255,255,255,0.02);
        }

        .doc-viewer-wrapper {
          overflow: auto;
        }

        .loading-state, .error-state {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--text-muted);
        }

        /* Excel Table */
        .excel-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          color: #333;
        }
        .excel-table td {
          border: 1px solid #ddd;
          padding: 8px;
          min-width: 60px;
        }
        .excel-table tr:nth-child(even) { background-color: #f9f9f9; }

        /* Zip Preview */
        .zip-preview {
          height: 100%;
          padding: 20px;
          overflow-y: auto;
        }
        .zip-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          font-weight: 600;
          color: var(--text-main);
        }
        .zip-contents {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .zip-item {
          display: flex;
          align-items: center;
          padding: 10px 15px;
          background: var(--solid-bg);
          border-radius: 8px;
          border: 1px solid var(--glass-border);
          transition: transform 0.2s;
        }
        .zip-item:hover { transform: translateX(5px); background: rgba(0,0,0,0.02); }
        .zip-icon {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          margin-right: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .zip-icon.folder-icon { 
          font-size: 16px;
          filter: sepia(1) hue-rotate(-50deg) saturate(3) brightness(1.2);
        }
        .zip-icon.pdf { background: #e74c3c22; border: 1px solid #e74c3c44; }
        .zip-icon.image { background: #f1c40f22; border: 1px solid #f1c40f44; }
        .zip-icon.excel { background: #2ecc7122; border: 1px solid #2ecc7144; }
        .zip-icon.word { background: #3498db22; border: 1px solid #3498db44; }
        .zip-icon.text { background: #95a5a622; border: 1px solid #95a5a644; }
        .zip-icon.video { background: #e67e2222; border: 1px solid #e67e2244; }
        .zip-name { flex: 1; font-size: 13px; }
        .zip-size { font-size: 11px; color: var(--text-muted); }

        .loading-zip, .zip-error, .empty-zip {
          padding: 20px;
          text-align: center;
          color: var(--text-muted);
        }

        .generic-preview {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
        }

        /* Text Preview */
        .text-preview-wrapper {
          height: 100%;
          overflow: auto;
          padding: 20px;
          background: var(--solid-bg);
        }
        .text-content {
          white-space: pre-wrap;
          word-wrap: break-word;
          font-family: monospace;
          font-size: 14px;
          color: var(--text-main);
          line-height: 1.5;
          margin: 0;
        }
      `}} />
    </div>
  );
};

export default FileViewer;
