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
  ImageIcon,
  Code,
  Eye,
  Edit3,
  Save,
  X,
  BarChart3
} from 'lucide-react';
import { config } from '../../config';
import { AnimatedDocIcon, AnimatedFolderIcon } from '../AnimatedIcons';

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

const FileViewer = ({ data, notifyOperation, onFileUpdated }) => {
  const viewerRef = useRef(null);
  const docxRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zipContents, setZipContents] = useState([]);
  const [loadingZip, setLoadingZip] = useState(false);
  const [zipError, setZipError] = useState(null);
  const [excelData, setExcelData] = useState(null);
  const [excelSheets, setExcelSheets] = useState({});
  const [excelSheetNames, setExcelSheetNames] = useState([]);
  const [currentSheetName, setCurrentSheetName] = useState('');
  const [excelImages, setExcelImages] = useState([]);
  const [showMediaPanel, setShowMediaPanel] = useState(false);
  const [chartConfig, setChartConfig] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [loadingOffice, setLoadingOffice] = useState(false);
  const [officeError, setOfficeError] = useState(null);
  const [textContent, setTextContent] = useState(null);
  const [loadingText, setLoadingText] = useState(false);
  const [textError, setTextError] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [htmlViewMode, setHtmlViewMode] = useState('preview');

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

      contents.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

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
        const workbook = XLSX.read(arrayBuffer, { cellStyles: true, cellFormulas: true, cellNF: true });
        
        // Extract embedded images and styles from zip
        const embeddedImages = [];
        const parsedXmlStyles = { fonts: [], fills: [], xfs: [] };
        const sheetStylesMaps = {};

        try {
          const zip = await import("@zip.js/zip.js");
          const reader = new zip.ZipReader(new zip.BlobReader(blob));
          const entries = await reader.getEntries();
          
          // 1. Extract Images
          for (const entry of entries) {
            if (entry.filename.startsWith('xl/media/')) {
              const imageBlob = await entry.getData(new zip.BlobWriter());
              const objectUrl = URL.createObjectURL(imageBlob);
              embeddedImages.push({
                name: entry.filename.split('/').pop(),
                url: objectUrl
              });
            }
          }

          // 2. Parse styles.xml
          const stylesEntry = entries.find(e => e.filename === 'xl/styles.xml');
          if (stylesEntry) {
            const stylesText = await stylesEntry.getData(new zip.TextWriter());
            const dom = new DOMParser().parseFromString(stylesText, "text/xml");
            
            // Fonts (namespace-independent)
            const fontNodes = dom.getElementsByTagNameNS('*', 'font');
            for (let i = 0; i < fontNodes.length; i++) {
              const node = fontNodes[i];
              const bold = node.getElementsByTagNameNS('*', 'b').length > 0;
              const italic = node.getElementsByTagNameNS('*', 'i').length > 0;
              const colorNode = node.getElementsByTagNameNS('*', 'color')[0];
              let color = null;
              if (colorNode) {
                color = colorNode.getAttribute('rgb') || null;
              }
              parsedXmlStyles.fonts.push({ bold, italic, color });
            }

            // Fills (namespace-independent)
            const fillNodes = dom.getElementsByTagNameNS('*', 'fill');
            for (let i = 0; i < fillNodes.length; i++) {
              const node = fillNodes[i];
              const fgColorNode = node.getElementsByTagNameNS('*', 'fgColor')[0];
              let bgColor = null;
              if (fgColorNode) {
                bgColor = fgColorNode.getAttribute('rgb') || null;
              }
              parsedXmlStyles.fills.push({ bgColor });
            }

            // Cell Formats (XFs - namespace-independent)
            const xfNodes = dom.getElementsByTagNameNS('*', 'xf');
            for (let i = 0; i < xfNodes.length; i++) {
              const node = xfNodes[i];
              const fontId = parseInt(node.getAttribute('fontId') || '0', 10);
              const fillId = parseInt(node.getAttribute('fillId') || '0', 10);
              parsedXmlStyles.xfs.push({ fontId, fillId });
            }
          }

          // 3. Map sheet names to XML file paths inside zip
          const sheetNameToXmlPath = {};
          const workbookEntry = entries.find(e => e.filename === 'xl/workbook.xml');
          const workbookRelsEntry = entries.find(e => e.filename === 'xl/_rels/workbook.xml.rels');
          
          if (workbookEntry && workbookRelsEntry) {
            try {
              const workbookText = await workbookEntry.getData(new zip.TextWriter());
              const workbookRelsText = await workbookRelsEntry.getData(new zip.TextWriter());
              
              const workbookDom = new DOMParser().parseFromString(workbookText, "text/xml");
              const workbookRelsDom = new DOMParser().parseFromString(workbookRelsText, "text/xml");
              
              const relsMap = {};
              const relNodes = workbookRelsDom.getElementsByTagNameNS('*', 'Relationship');
              for (let i = 0; i < relNodes.length; i++) {
                const node = relNodes[i];
                const id = node.getAttribute('Id');
                const target = node.getAttribute('Target');
                if (id && target) {
                  relsMap[id] = target.startsWith('xl/') ? target : `xl/${target}`;
                }
              }

              const sheetNodes = workbookDom.getElementsByTagNameNS('*', 'sheet');
              for (let i = 0; i < sheetNodes.length; i++) {
                const node = sheetNodes[i];
                const name = node.getAttribute('name');
                const rId = node.getAttribute('r:id') || node.getAttribute('id');
                if (name && rId && relsMap[rId]) {
                  sheetNameToXmlPath[name] = relsMap[rId];
                }
              }
            } catch (relErr) {
              console.error("Failed to map sheets to relationship targets:", relErr);
            }
          }

          // 4. Parse cell style indices for each sheet
          for (let sheetIndex = 0; sheetIndex < workbook.SheetNames.length; sheetIndex++) {
            const sheetName = workbook.SheetNames[sheetIndex];
            const xmlPath = sheetNameToXmlPath[sheetName] || `xl/worksheets/sheet${sheetIndex + 1}.xml`;
            const sheetXmlEntry = entries.find(e => e.filename === xmlPath);
            if (sheetXmlEntry) {
              sheetStylesMaps[sheetName] = {};
              try {
                const sheetText = await sheetXmlEntry.getData(new zip.TextWriter());
                const dom = new DOMParser().parseFromString(sheetText, "text/xml");
                const cellNodes = dom.getElementsByTagNameNS('*', 'c');
                for (let i = 0; i < cellNodes.length; i++) {
                  const node = cellNodes[i];
                  const cellRef = node.getAttribute('r');
                  const styleIdx = node.getAttribute('s');
                  if (cellRef && styleIdx) {
                    sheetStylesMaps[sheetName][cellRef] = parseInt(styleIdx, 10);
                  }
                }
              } catch (sheetErr) {
                console.error(`Failed to parse sheet ${sheetName} xml:`, sheetErr);
              }
            }
          }

          await reader.close();
        } catch (zipErr) {
          console.error("Failed to parse excel zip assets:", zipErr);
        }
        setExcelImages(embeddedImages);

        const formatExcelColor = (hex) => {
          if (!hex) return null;
          if (hex.length === 8) {
            return '#' + hex.substring(2);
          }
          if (hex.length === 6) {
            return '#' + hex;
          }
          return null;
        };

        const sheets = {};
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          if (!worksheet || !worksheet['!ref']) {
            // Generate a default empty sheet layout (A-F, rows 1-15)
            const cols = ['A', 'B', 'C', 'D', 'E', 'F'];
            const rows = [];
            for (let r = 0; r < 15; r++) {
              const row = [];
              for (let c = 0; c < 6; c++) {
                row.push({ 
                  r, 
                  c, 
                  v: '', 
                  f: '', 
                  cellRef: `${cols[c]}${r + 1}`,
                  rowSpan: 1, 
                  colSpan: 1, 
                  isCovered: false 
                });
              }
              rows.push(row);
            }
            sheets[sheetName] = { rows, cols, startRowNumber: 1 };
            return;
          }

          const range = XLSX.utils.decode_range(worksheet['!ref']);
          const merges = worksheet['!merges'] || [];
          
          // Generate columns array starting from 0 (column A) up to range.e.c
          const cols = [];
          for (let c = 0; c <= range.e.c; c++) {
            cols.push(XLSX.utils.encode_col(c));
          }

          // Generate 2D rows array starting from 0 (row 1) up to range.e.r
          const rows = [];
          for (let r = 0; r <= range.e.r; r++) {
            const row = [];
            for (let c = 0; c <= range.e.c; c++) {
              row.push({
                r,
                c,
                v: '',
                f: '',
                cellRef: XLSX.utils.encode_cell({ r, c }),
                rowSpan: 1,
                colSpan: 1,
                isCovered: false
              });
            }
            rows.push(row);
          }

          // Populate values from coordinate 0,0 & apply styles
          const cellStylesMap = sheetStylesMaps[sheetName] || {};
          for (let r = 0; r <= range.e.r; r++) {
            for (let c = 0; c <= range.e.c; c++) {
              const cellRef = XLSX.utils.encode_cell({ r, c });
              const cell = worksheet[cellRef];
              const gridCell = rows[r][c];
              
              if (cell) {
                gridCell.v = cell.w || (cell.v !== undefined ? String(cell.v) : '');
                gridCell.f = cell.f || '';
              }

              // Apply styles parsed from XML
              const styleIdx = cellStylesMap[cellRef];
              if (styleIdx !== undefined && parsedXmlStyles.xfs[styleIdx]) {
                const xf = parsedXmlStyles.xfs[styleIdx];
                const cellStyle = {};
                
                // Font details
                if (parsedXmlStyles.fonts[xf.fontId]) {
                  const font = parsedXmlStyles.fonts[xf.fontId];
                  if (font.bold) cellStyle.fontWeight = 'bold';
                  if (font.italic) cellStyle.fontStyle = 'italic';
                  const textColor = formatExcelColor(font.color);
                  if (textColor) cellStyle.color = textColor;
                }

                // Fill background
                if (parsedXmlStyles.fills[xf.fillId]) {
                  const fill = parsedXmlStyles.fills[xf.fillId];
                  const bgColor = formatExcelColor(fill.bgColor);
                  if (bgColor && bgColor !== '#000000' && bgColor !== '#FFFFFF') {
                    cellStyle.backgroundColor = bgColor;
                  }
                }
                
                gridCell.s = cellStyle;
              }
            }
          }

          // Apply merges using absolute cell coordinates
          merges.forEach(merge => {
            const startRow = merge.s.r;
            const startCol = merge.s.c;
            const endRow = merge.e.r;
            const endCol = merge.e.c;

            if (startRow >= 0 && startRow < rows.length && startCol >= 0 && startCol < rows[0].length) {
              const originCell = rows[startRow][startCol];
              originCell.rowSpan = endRow - startRow + 1;
              originCell.colSpan = endCol - startCol + 1;

              for (let r = startRow; r <= endRow; r++) {
                for (let c = startCol; c <= endCol; c++) {
                  if (r === startRow && c === startCol) continue;
                  if (r >= 0 && r < rows.length && c >= 0 && c < rows[0].length) {
                    rows[r][c].isCovered = true;
                  }
                }
              }
            }
          });

          sheets[sheetName] = { rows, cols, startRowNumber: 1 };
        });

        setExcelSheets(sheets);
        setExcelSheetNames(workbook.SheetNames);
        setCurrentSheetName(workbook.SheetNames[0]);
        setExcelData(sheets[workbook.SheetNames[0]]?.rows || []);
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
      setEditContent(text);
    } catch (err) {
      console.error("Error reading text:", err);
      setTextError("Could not read text contents");
    } finally {
      setLoadingText(false);
    }
  }, []);

  const handleCellClick = (r, c, cellRef, val, formula) => {
    setSelectedCell({ r, c, ref: cellRef, v: val, f: formula });
  };

  const handleGenerateChart = () => {
    const currentSheet = excelSheets[currentSheetName];
    if (!currentSheet || !currentSheet.rows.length) return;

    // Scan columns to find labels column (usually col 0 or 1) and value column
    let labelColIdx = 0;
    let valColIdx = -1;

    // Find the first column with numeric values
    for (let c = 0; c < currentSheet.cols.length; c++) {
      let numericCount = 0;
      let totalCount = 0;
      currentSheet.rows.forEach(row => {
        const cell = row[c];
        if (cell && cell.v) {
          totalCount++;
          if (!isNaN(parseFloat(cell.v))) {
            numericCount++;
          }
        }
      });
      if (numericCount > 0 && numericCount >= totalCount * 0.5) {
        valColIdx = c;
        break;
      }
    }

    if (valColIdx === -1) {
      valColIdx = currentSheet.cols.length > 1 ? 1 : 0;
    }

    if (valColIdx === labelColIdx && valColIdx > 0) {
      labelColIdx = 0;
    }

    // Extract series data
    const labels = [];
    const values = [];
    currentSheet.rows.forEach(row => {
      const labelCell = row[labelColIdx];
      const valCell = row[valColIdx];
      
      const val = valCell ? parseFloat(valCell.v) : NaN;
      if (!isNaN(val)) {
        labels.push(labelCell ? String(labelCell.v) : `Row ${labels.length + 1}`);
        values.push(val);
      }
    });

    if (values.length > 0) {
      setChartConfig({
        title: `${currentSheetName} - Column ${currentSheet.cols[valColIdx]} Data`,
        labels,
        values,
        type: 'bar'
      });
    } else {
      if (notifyOperation) {
        notifyOperation("Chart Generator", "No numeric data columns found to generate a chart.", false);
      }
    }
  };

  const renderExcelChart = () => {
    if (!chartConfig) return null;
    const { title, labels, values, type } = chartConfig;
    const maxVal = Math.max(...values, 10);
    const minVal = Math.min(...values, 0);
    const valRange = maxVal - minVal || 10;

    const width = 500;
    const height = 300;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    return (
      <div className="excel-chart-panel" style={{
        background: '#f9f9f9',
        border: '1px solid #ddd',
        borderRadius: '6px',
        padding: '16px',
        margin: '20px',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ margin: 0, color: '#333' }}>{title}</h4>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button 
              onClick={() => setChartConfig({ ...chartConfig, type: 'bar' })}
              style={{
                padding: '4px 8px', fontSize: '11px', border: '1px solid #ccc',
                background: type === 'bar' ? '#217346' : '#fff',
                color: type === 'bar' ? '#fff' : '#333', cursor: 'pointer', borderRadius: '3px'
              }}
            >
              Bar
            </button>
            <button 
              onClick={() => setChartConfig({ ...chartConfig, type: 'line' })}
              style={{
                padding: '4px 8px', fontSize: '11px', border: '1px solid #ccc',
                background: type === 'line' ? '#217346' : '#fff',
                color: type === 'line' ? '#fff' : '#333', cursor: 'pointer', borderRadius: '3px'
              }}
            >
              Line
            </button>
            <button 
              onClick={() => setChartConfig(null)}
              style={{
                padding: '4px 8px', fontSize: '11px', border: '1px solid #ccc',
                background: '#fff', color: '#666', cursor: 'pointer', borderRadius: '3px'
              }}
            >
              Close
            </button>
          </div>
        </div>

        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: '#fff', borderRadius: '4px', border: '1px solid #eee' }}>
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
            const y = padding + chartHeight * (1 - ratio);
            const val = minVal + valRange * ratio;
            return (
              <g key={index}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#f0f0f0" strokeWidth="1" />
                <text x={padding - 8} y={y + 4} fontSize="9" fill="#999" textAnchor="end">{val.toFixed(0)}</text>
              </g>
            );
          })}

          {type === 'bar' && values.map((val, idx) => {
            const barWidth = (chartWidth / values.length) * 0.6;
            const gap = (chartWidth / values.length) * 0.4;
            const x = padding + idx * (barWidth + gap) + gap / 2;
            const valRatio = (val - minVal) / valRange;
            const barHeight = chartHeight * valRatio;
            const y = padding + chartHeight - barHeight;

            return (
              <g key={idx}>
                <rect 
                  x={x} 
                  y={y} 
                  width={barWidth} 
                  height={barHeight} 
                  fill="#217346" 
                  rx="2"
                  opacity="0.85"
                >
                  <title>{`${labels[idx]}: ${val}`}</title>
                </rect>
                <text 
                  x={x + barWidth / 2} 
                  y={padding + chartHeight + 14} 
                  fontSize="8" 
                  fill="#666" 
                  textAnchor="middle"
                >
                  {labels[idx]?.length > 8 ? `${labels[idx].substring(0, 6)}..` : labels[idx]}
                </text>
              </g>
            );
          })}

          {type === 'line' && (
            <g>
              {(() => {
                const points = values.map((val, idx) => {
                  const step = chartWidth / (values.length - 1 || 1);
                  const x = padding + idx * step;
                  const valRatio = (val - minVal) / valRange;
                  const y = padding + chartHeight - (chartHeight * valRatio);
                  return { x, y };
                });

                const pathData = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

                return (
                  <>
                    <path d={pathData} fill="none" stroke="#217346" strokeWidth="2.5" strokeLinecap="round" />
                    {points.map((p, idx) => (
                      <circle key={idx} cx={p.x} cy={p.y} r="4" fill="#217346" stroke="#fff" strokeWidth="1.5">
                        <title>{`${labels[idx]}: ${values[idx]}`}</title>
                      </circle>
                    ))}
                    {points.map((p, idx) => (
                      <text 
                        key={`lbl-${idx}`} 
                        x={p.x} 
                        y={padding + chartHeight + 14} 
                        fontSize="8" 
                        fill="#666" 
                        textAnchor="middle"
                      >
                        {labels[idx]?.length > 8 ? `${labels[idx].substring(0, 6)}..` : labels[idx]}
                      </text>
                    ))}
                  </>
                );
              })()}
            </g>
          )}
        </svg>
      </div>
    );
  };

  const renderExcelImagesPanel = () => {
    if (!showMediaPanel || !excelImages.length) return null;
    return (
      <div className="excel-media-panel" style={{
        background: '#f9f9f9',
        borderBottom: '1px solid #ddd',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0, color: '#333', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <ImageIcon size={14} />
            <span>Embedded Images ({excelImages.length})</span>
          </h4>
          <button 
            onClick={() => setShowMediaPanel(false)}
            style={{ border: 'none', background: 'transparent', color: '#999', cursor: 'pointer', fontSize: '18px', padding: '0 4px' }}
          >
            &times;
          </button>
        </div>
        <div className="excel-images-grid" style={{
          display: 'flex',
          gap: '12px',
          overflowX: 'auto',
          paddingBottom: '8px'
        }}>
          {excelImages.map((img, idx) => (
            <div key={idx} className="excel-media-card" style={{
              flexShrink: 0,
              background: '#fff',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              padding: '6px',
              textAlign: 'center',
              width: '120px'
            }}>
              <img 
                src={img.url} 
                alt={img.name} 
                style={{ maxWidth: '100px', maxHeight: '80px', objectFit: 'contain', borderRadius: '2px' }} 
              />
              <div style={{ fontSize: '10px', color: '#666', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={img.name}>
                {img.name}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

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
      // Reset edit and view states on file switch
      setIsEditing(false);
      setEditContent('');
      setHtmlViewMode('preview');
      setExcelImages([]);
      setShowMediaPanel(false);
      setChartConfig(null);
      setSelectedCell(null);

      if (resolvedType === 'zip' && data.url) {
        loadZipContents(data.url);
      } else if ((resolvedType === 'word' || resolvedType === 'excel') && data.url) {
        loadOfficeDoc(data.url, resolvedType);
      } else if ((resolvedType === 'text' || resolvedType === 'html') && data.url) {
        loadTextContent(data.url);
      } else {
        setZipContents([]);
        setZipError(null);
        setExcelData(null);
        setExcelSheets({});
        setExcelSheetNames([]);
        setCurrentSheetName('');
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

  const handleSaveContent = async () => {
    if (!data || !data.id) return;
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'text/plain',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${config.API_BASE_URL || ''}/api/files/${data.id}/content`, {
        method: 'PUT',
        headers,
        body: editContent
      });

      if (res.ok) {
        setTextContent(editContent);
        setIsEditing(false);
        if (notifyOperation) {
          notifyOperation("File Saved", `"${data.title}" content updated successfully.`, true);
        }
        if (onFileUpdated) {
          onFileUpdated();
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        if (notifyOperation) {
          notifyOperation("Save Failed", errorData.error || "Failed to update file contents.", false);
        }
      }
    } catch (err) {
      console.error("Save content error:", err);
      if (notifyOperation) {
        notifyOperation("Save Failed", "Network/Server error while saving file.", false);
      }
    } finally {
      setIsSaving(false);
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
        if (htmlViewMode === 'preview') {
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
        } else {
          if (isEditing) {
            return (
              <div className="editor-wrapper" style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
                <textarea
                  className="editor-textarea"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'var(--solid-bg)',
                    color: 'var(--text-main)',
                    border: 'none',
                    padding: '20px',
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    resize: 'none',
                    outline: 'none',
                    flex: 1
                  }}
                />
              </div>
            );
          } else {
            return (
              <div className="text-preview-wrapper">
                <pre className="text-content">
                  {textContent}
                </pre>
              </div>
            );
          }
        }
      case 'text':
        if (isEditing) {
          return (
            <div className="editor-wrapper" style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
              <textarea
                className="editor-textarea"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'var(--solid-bg)',
                  color: 'var(--text-main)',
                  border: 'none',
                  padding: '20px',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  resize: 'none',
                  outline: 'none',
                  flex: 1
                }}
              />
            </div>
          );
        } else {
          return (
            <div className="text-preview-wrapper">
              <pre className="text-content">
                {textContent}
              </pre>
            </div>
          );
        }
      case 'word':
        return (
          <div className="docx-preview-wrapper" style={{ height: '100%', overflow: 'auto', padding: '20px', background: 'white' }}>
            <div ref={docxRef}></div>
          </div>
        );
      case 'excel':
        const currentSheet = excelSheets[currentSheetName];
        return (
          <div className="excel-preview-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'white' }}>
            {/* Toolbar */}
            <div className="excel-toolbar" style={{
              display: 'flex',
              alignItems: 'center',
              background: '#f3f3f3',
              borderBottom: '1px solid #ddd',
              padding: '6px 12px',
              gap: '12px',
              flexWrap: 'wrap',
              flexShrink: 0
            }}>
              {excelImages.length > 0 && (
                <button
                  onClick={() => setShowMediaPanel(!showMediaPanel)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 10px',
                    fontSize: '12px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    background: showMediaPanel ? '#e2f0e6' : '#fff',
                    color: '#333',
                    cursor: 'pointer'
                  }}
                >
                  <ImageIcon size={14} />
                  <span>Images ({excelImages.length})</span>
                </button>
              )}

              <button
                onClick={handleGenerateChart}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 10px',
                  fontSize: '12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  background: chartConfig ? '#e2f0e6' : '#fff',
                  color: '#333',
                  cursor: 'pointer'
                }}
              >
                <BarChart3 size={14} />
                <span>Create Chart</span>
              </button>
            </div>

            {/* Embedded media drawer */}
            {renderExcelImagesPanel()}

            {/* Dynamic Interactive SVG Chart */}
            {renderExcelChart()}

            {/* Formula Bar */}
            <div className="excel-formula-bar" style={{
              display: 'flex',
              alignItems: 'center',
              background: '#f9f9f9',
              borderBottom: '1px solid #ddd',
              padding: '6px 12px',
              gap: '8px',
              fontFamily: 'sans-serif',
              fontSize: '13px',
              flexShrink: 0
            }}>
              <div className="excel-name-box" style={{
                background: 'white',
                border: '1px solid #ccc',
                padding: '3px 8px',
                minWidth: '50px',
                textAlign: 'center',
                fontWeight: '600',
                color: '#333',
                borderRadius: '3px',
                minHeight: '20px'
              }}>
                {selectedCell ? selectedCell.ref : ''}
              </div>
              <div style={{ color: '#217346', fontStyle: 'italic', fontWeight: 'bold', userSelect: 'none' }}>fx</div>
              <input
                type="text"
                className="excel-formula-input"
                value={selectedCell ? (selectedCell.f ? `=${selectedCell.f}` : selectedCell.v) : ''}
                readOnly
                placeholder="Select a cell to view formula or contents"
                style={{
                  flex: 1,
                  border: '1px solid #ccc',
                  padding: '3px 8px',
                  borderRadius: '3px',
                  outline: 'none',
                  background: 'white',
                  color: '#333',
                  fontSize: '12px'
                }}
              />
            </div>

            {/* Spreadsheet Table Grid */}
            <div className="excel-table-wrapper" style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
              {currentSheet && (
                <table className="excel-table">
                  <thead>
                    <tr>
                      <th className="excel-header-coord"></th>
                      {currentSheet.cols && currentSheet.cols.map((colName, index) => (
                        <th key={index} className="excel-header-col">{colName}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentSheet.rows && currentSheet.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        <th className="excel-header-row">{rowIndex + 1}</th>
                        {row.map((cell, cellIndex) => {
                          if (cell.isCovered) return null;
                          const cellRef = cell.cellRef;
                          const isSelected = selectedCell && selectedCell.r === cell.r && selectedCell.c === cell.c;
                          
                          // Get inline cell styles if available (e.g. bold, color, etc.)
                          const cellStyle = cell.s || {};

                          return (
                            <td 
                              key={cellIndex} 
                              rowSpan={cell.rowSpan} 
                              colSpan={cell.colSpan}
                              onClick={() => handleCellClick(cell.r, cell.c, cellRef, cell.v, cell.f)}
                              style={{
                                ...cellStyle,
                                border: isSelected ? '2px solid #217346' : '1px solid #d4d4d4',
                                backgroundColor: isSelected ? '#e2f0e6' : cellStyle.backgroundColor || 'white',
                                position: 'relative',
                                cursor: 'pointer'
                              }}
                            >
                              {cell.v}
                              {cell.f && (
                                <span style={{
                                  position: 'absolute',
                                  top: 0,
                                  right: 0,
                                  width: 0,
                                  height: 0,
                                  borderStyle: 'solid',
                                  borderWidth: '0 5px 5px 0',
                                  borderColor: 'transparent #217346 transparent transparent'
                                }} title={`Formula: =${cell.f}`} />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Sheets Selector */}
            {excelSheetNames.length > 1 && (
              <div className="excel-tabs" style={{
                display: 'flex',
                background: '#f3f3f3',
                borderTop: '1px solid #ddd',
                padding: '4px 10px',
                gap: '4px',
                flexShrink: 0
              }}>
                {excelSheetNames.map((name) => (
                  <button
                    key={name}
                    className={`excel-tab ${currentSheetName === name ? 'active' : ''}`}
                    onClick={() => {
                      setCurrentSheetName(name);
                      setSelectedCell(null);
                    }}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      border: 'none',
                      background: currentSheetName === name ? 'white' : 'transparent',
                      color: currentSheetName === name ? '#217346' : '#555',
                      fontWeight: currentSheetName === name ? '600' : 'normal',
                      borderTop: currentSheetName === name ? '2px solid #217346' : '2px solid transparent',
                      cursor: 'pointer',
                      borderRadius: '2px 2px 0 0',
                      transition: 'all 0.15s'
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
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
                      <div className="zip-icon folder-icon">
                        <AnimatedFolderIcon size={20} />
                      </div>
                    ) : (
                      <div className="zip-icon file-icon">
                        <AnimatedDocIcon type={file.type} size={20} />
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
          {isEditing ? (
            <>
              <button className="action-btn save-btn" onClick={handleSaveContent} disabled={isSaving} title="Save" style={{ color: '#2ecc71' }}>
                <Save size={18} />
              </button>
              <button className="action-btn cancel-btn" onClick={() => { setIsEditing(false); setEditContent(textContent); }} title="Cancel" style={{ color: '#e74c3c' }}>
                <X size={18} />
              </button>
            </>
          ) : (
            <>
              {resolvedType === 'html' && (
                <>
                  <button 
                    className={`action-btn ${htmlViewMode === 'code' ? 'active-mode' : ''}`} 
                    onClick={() => { setHtmlViewMode('code'); setIsEditing(false); }} 
                    title="Code"
                  >
                    <Code size={18} />
                  </button>
                  <button 
                    className={`action-btn ${htmlViewMode === 'preview' ? 'active-mode' : ''}`} 
                    onClick={() => { setHtmlViewMode('preview'); setIsEditing(false); }} 
                    title="Preview"
                  >
                    <Eye size={18} />
                  </button>
                </>
              )}

              {((resolvedType === 'text') || (resolvedType === 'html' && htmlViewMode === 'code')) && (
                <button className="action-btn" onClick={() => setIsEditing(true)} title="Edit">
                  <Edit3 size={18} />
                </button>
              )}

              <button className="action-btn" onClick={handleDownload} title="Download"><Download size={18} /></button>
              {resolvedType !== 'video' && resolvedType !== 'image' && resolvedType !== 'zip' && resolvedType !== 'html' && (
                <button className="action-btn" onClick={handlePrint} title="Print"><Printer size={18} /></button>
              )}
            </>
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
        .action-btn.active-mode {
          background: rgba(52, 152, 219, 0.1);
          color: var(--accent);
          border: 1px solid rgba(52, 152, 219, 0.2);
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
          border-collapse: collapse;
          font-size: 11px;
          color: #333;
          background: #fff;
          border: 1px solid #c0c0c0;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .excel-table th {
          background-color: #f3f3f3;
          border: 1px solid #c0c0c0;
          padding: 4px 6px;
          font-weight: normal;
          color: #555;
          text-align: center;
          user-select: none;
        }
        .excel-header-coord {
          background-color: #e4e4e4 !important;
          width: 40px;
          min-width: 40px;
        }
        .excel-header-row {
          background-color: #f3f3f3;
          width: 40px;
          min-width: 40px;
          font-weight: normal;
          text-align: center;
          border: 1px solid #c0c0c0;
        }
        .excel-header-col {
          min-width: 80px;
          border: 1px solid #c0c0c0;
        }
        .excel-table td {
          border: 1px solid #d4d4d4;
          padding: 6px 10px;
          min-width: 80px;
          background: #fff;
          color: #222;
          vertical-align: middle;
        }
        .excel-table tr:hover td {
          background-color: #f5f8fa;
        }

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
          margin-right: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
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
