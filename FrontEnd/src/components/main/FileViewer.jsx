import { useRef, useState, useEffect, useCallback } from 'react';
import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";
import * as zip from "@zip.js/zip.js";
import { renderAsync } from 'docx-preview';
import * as XLSX from 'xlsx';
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

  const getFileType = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (['pdf'].includes(ext)) return 'pdf';
    if (['doc', 'docx'].includes(ext)) return 'word';
    if (['xls', 'xlsx'].includes(ext)) return 'excel';
    if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext)) return 'image';
    return 'text';
  };

  const loadZipContents = useCallback(async (url) => {
    setLoadingZip(true);
    setZipError(null);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch zip file');
      const blob = await response.blob();
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
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch ${type} file`);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();

      if (type === 'word') {
        if (docxRef.current) {
          docxRef.current.innerHTML = '';
          await renderAsync(arrayBuffer, docxRef.current);
        }
      } else if (type === 'excel') {
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
      const response = await fetch(url);
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
      if (data?.type === 'zip' && data.url) {
        loadZipContents(data.url);
      } else if ((data?.type === 'word' || data?.type === 'excel') && data.url) {
        loadOfficeDoc(data.url, data.type);
      } else if (data?.type === 'text' && data.url) {
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
        <style dangerouslySetInnerHTML={{ __html: `
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
    // PDF is now handled by PdfViewer
    if (data.type === 'pdf' && data.url) {
      return <PdfViewer key={data.id} url={data.url} />;
    }

    // Only use DocViewer for Images. Text is handled natively.
    const isDocViewerSupported = ['image'].includes(data.type);

    if (isDocViewerSupported && data.url) {
      const docs = [{ uri: data.url, fileName: data.title }];
      return (
        <div className="doc-viewer-wrapper" style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <DocViewer 
            documents={docs} 
            pluginRenderers={DocViewerRenderers}
            theme={{
              primary: "#3498db",
              secondary: "#ffffff",
              tertiary: "#f5f5f5",
              textPrimary: "#2c3e50",
              textSecondary: "#7f8c8d",
              textTertiary: "#bdc3c7",
              disableThemeScrollbar: true,
            }}
            config={{
              header: {
                disableHeader: true,
                disableFileName: true,
                retainURLParams: false,
              },
            }}
            style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          />
        </div>
      );
    }

    if (loadingOffice || loadingText) {
      return <div className="loading-state">Loading document...</div>;
    }

    if (officeError || textError) {
      return <div className="error-state">{officeError || textError}</div>;
    }

    switch (data.type) {
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
                    <div className={`zip-icon \${file.type}`}>
                      {file.type === 'pdf' && <FileText size={16} color="#e74c3c" />}
                      {file.type === 'word' && <FileText size={16} color="#3498db" />}
                      {file.type === 'excel' && <FileText size={16} color="#2ecc71" />}
                      {file.type === 'image' && <ImageIcon size={16} color="#f1c40f" />}
                      {file.type === 'text' && <FileText size={16} color="#95a5a6" />}
                    </div>
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
    <div ref={viewerRef} className={`document-viewer solid-panel \${isFullscreen ? 'fullscreen' : ''}`}>
      <div className="viewer-header">
        <div className="header-left">
          <span className="viewer-title">{data.title}</span>
          <div className={`doc-tag \${data.type}`}>{data.type.toUpperCase()}</div>
        </div>
        <div className="header-actions">
          <button className="action-btn" title="Download"><Download size={18} /></button>
          <button className="action-btn" title="Print"><Printer size={18} /></button>
          <button className="action-btn" onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>
      <div className="viewer-content">
        {renderPreviewContent()}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
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
        .zip-icon.pdf { background: #e74c3c22; border: 1px solid #e74c3c44; }
        .zip-icon.image { background: #f1c40f22; border: 1px solid #f1c40f44; }
        .zip-icon.excel { background: #2ecc7122; border: 1px solid #2ecc7144; }
        .zip-icon.word { background: #3498db22; border: 1px solid #3498db44; }
        .zip-icon.text { background: #95a5a622; border: 1px solid #95a5a644; }
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
