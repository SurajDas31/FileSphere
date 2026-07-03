import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, FileText, Edit, Copy, Trash, ExternalLink, Eye, EyeOff } from 'lucide-react';
import ContextMenu from './ContextMenu';
import { config } from '../../config';

const getFileType = (filename, type) => {
  if (type && type !== 'unknown') return type;
  if (!filename) return 'unknown';
  const ext = filename.split('.').pop().toLowerCase();
  if (['pdf'].includes(ext)) return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'word';
  if (['xls', 'xlsx'].includes(ext)) return 'excel';
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext)) return 'video';
  if (['zip', 'rar'].includes(ext)) return 'zip';
  if (['txt', 'md', 'csv'].includes(ext)) return 'text';
  return 'unknown';
};

const FileList = ({
  data,
  selectedId,
  selectedDocIds = [],
  setSelectedDocIds,
  onDocClick,
  isPreviewVisible,
  setIsPreviewVisible,
  isLoading,
  onFileUpdated,
  onDeleteFiles,
  onCopyFiles,
  onMoveFiles,
  onFileUpload,
  currentFolderId,
  notifyOperation
}) => {
  const [contextMenu, setContextMenu] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [editingFileId, setEditingFileId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleRenameStart = (doc) => {
    setEditingFileId(doc.id);
    setEditingTitle(doc.title);
  };

  const handleRenameCancel = () => {
    setEditingFileId(null);
    setEditingTitle('');
  };

  const handleRenameSubmit = async (fileId) => {
    if (!editingTitle || editingTitle.trim() === '') {
      setEditingFileId(null);
      return;
    }
    try {
      const res = await fetch(`${config.API_BASE_URL || ''}/api/files/${fileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingTitle.trim() })
      });
      if (res.ok) {
        if (onFileUpdated) onFileUpdated();
        if (notifyOperation) notifyOperation("File Renamed", `File renamed to "${editingTitle.trim()}" successfully.`, true);
      } else {
        if (notifyOperation) notifyOperation("File Action Failed", "Failed to rename file.", false);
      }
    } catch (err) {
      console.error("Rename error", err);
      if (notifyOperation) notifyOperation("File Action Failed", "Network error while renaming file.", false);
    } finally {
      setEditingFileId(null);
    }
  };

  const triggerDelete = (doc) => {
    let targets = [doc];
    if (selectedDocIds.includes(doc.id)) {
      targets = data.filter(d => selectedDocIds.includes(d.id));
    }
    const filenamesString = targets.map(t => t.title).join(', ');
    const fileIds = targets.map(t => t.id);
    onDeleteFiles(fileIds, filenamesString);
  };

  const triggerCopy = (doc) => {
    let targets = [doc];
    if (selectedDocIds.includes(doc.id)) {
      targets = data.filter(d => selectedDocIds.includes(d.id));
    }
    const filenamesString = targets.map(t => t.title).join(', ');
    const fileIds = targets.map(t => t.id);
    onCopyFiles(fileIds, filenamesString);
  };

  const triggerMove = (doc) => {
    let targets = [doc];
    if (selectedDocIds.includes(doc.id)) {
      targets = data.filter(d => selectedDocIds.includes(d.id));
    }
    const filenamesString = targets.map(t => t.title).join(', ');
    const fileIds = targets.map(t => t.id);
    onMoveFiles(fileIds, filenamesString);
  };

  const handleContextMenu = (e, doc) => {
    e.preventDefault();
    e.stopPropagation();

    // If right-clicked document is not selected, select it exclusively
    if (!selectedDocIds.includes(doc.id)) {
      setSelectedDocIds([doc.id]);
      onDocClick(doc.id);
    }

    const isMulti = selectedDocIds.includes(doc.id) && selectedDocIds.length > 1;

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      options: [
        { label: 'Rename', icon: <Edit size={14} />, onClick: () => handleRenameStart(doc), disabled: isMulti },
        { label: 'Copy', icon: <Copy size={14} />, onClick: () => triggerCopy(doc) },
        { label: 'Move', icon: <ExternalLink size={14} />, onClick: () => triggerMove(doc) },
        { label: 'Delete', icon: <Trash size={14} />, onClick: () => triggerDelete(doc) },
      ]
    });
  };

  const handleContainerDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingOver(true);
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleContainerDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleContainerDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (onFileUpload && currentFolderId) {
        onFileUpload(Array.from(e.dataTransfer.files), currentFolderId);
      }
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedDocIds(data.map(doc => doc.id));
    } else {
      setSelectedDocIds([]);
    }
  };

  const handleSelectOne = (e, docId) => {
    e.stopPropagation();
    if (e.target.checked) {
      setSelectedDocIds(prev => [...prev, docId]);
    } else {
      setSelectedDocIds(prev => prev.filter(id => id !== docId));
    }
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = useMemo(() => {
    let sortableItems = [...data];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        // Handle date sorting properly
        if (sortConfig.key === 'dateModified') {
          // Basic string compare for local date string, for robustness you'd parse real dates
          // but since our dateModified is "DD/MM/YYYY" string, we'll just fall back to string compare
        }

        if (aVal < bVal) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [data, sortConfig]);

  const getSortIcon = (columnName) => {
    if (sortConfig.key !== columnName) {
      return <ChevronDown size={14} style={{ display: 'inline', verticalAlign: 'middle', opacity: 0.3 }} />;
    }
    return sortConfig.direction === 'asc'
      ? <ChevronUp size={14} style={{ display: 'inline', verticalAlign: 'middle', color: 'var(--accent)' }} />
      : <ChevronDown size={14} style={{ display: 'inline', verticalAlign: 'middle', color: 'var(--accent)' }} />;
  };

  return (
    <div
      className="document-list glass-panel"
      onDragOver={handleContainerDragOver}
      onDragLeave={handleContainerDragLeave}
      onDrop={handleContainerDrop}
      style={{ position: 'relative' }}
    >
      {isDraggingOver && (
        <div className="drag-drop-overlay">
          <div className="drag-drop-overlay-content">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" className="upload-glow-icon">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <h3 style={{ marginTop: '12px', fontWeight: 600 }}>Drop files to upload</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>Upload directly to current folder</p>
          </div>
        </div>
      )}

      <div className="list-toolbar">
        <div className="toolbar-group">
          <span>Display:</span>
          <div className="toolbar-dropdown">
            By type <ChevronDown size={14} />
          </div>
          <div className="toolbar-dropdown">
            New date <ChevronDown size={14} />
          </div>
          <div className="toolbar-dropdown">
            By date <ChevronDown size={14} />
          </div>
        </div>
        <div className="toolbar-group">
          <div
            className={`toolbar-toggle ${isPreviewVisible ? 'active' : ''}`}
            onClick={() => setIsPreviewVisible(!isPreviewVisible)}
            title={isPreviewVisible ? "Hide Preview" : "Show Preview"}
          >
            {isPreviewVisible ? <Eye size={18} /> : <EyeOff size={18} />}
          </div>
        </div>
      </div>

      <div className="table-container">
        {isLoading ? (
          <div className="loading-state">
            <p>Loading files...</p>
          </div>
        ) : (
          <table className={`doc-table ${sortedData.length === 0 ? 'empty' : ''}`}>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={data.length > 0 && selectedDocIds.length === data.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th onClick={() => requestSort('title')} style={{ cursor: 'pointer' }}>
                  Title {getSortIcon('title')}
                </th>
                <th onClick={() => requestSort('tags')} style={{ width: '100px', cursor: 'pointer' }}>
                  Tags {getSortIcon('tags')}
                </th>
                <th onClick={() => requestSort('owner')} style={{ width: '100px', cursor: 'pointer' }}>
                  Owner {getSortIcon('owner')}
                </th>
                <th onClick={() => requestSort('dateModified')} style={{ width: '160px', cursor: 'pointer' }}>
                  Date modified {getSortIcon('dateModified')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.length > 0 ? sortedData.map(doc => {
                const resolvedType = getFileType(doc.title, doc.type);
                const isSelected = selectedDocIds.includes(doc.id);
                return (
                  <tr
                    key={doc.id}
                    className={isSelected ? 'selected' : ''}
                    onClick={() => onDocClick(doc.id)}
                    onContextMenu={(e) => handleContextMenu(e, doc)}
                    draggable="true"
                    onDragStart={(e) => {
                      let draggedDocs = [doc];
                      if (selectedDocIds.includes(doc.id)) {
                        draggedDocs = data.filter(d => selectedDocIds.includes(d.id));
                      }

                      e.dataTransfer.setData("application/json", JSON.stringify({
                        type: 'file',
                        files: draggedDocs.map(d => ({ id: d.id, title: d.title }))
                      }));
                      e.dataTransfer.effectAllowed = "copyMove";

                      // Create beautiful custom glassmorphism drag ghost inheriting app styling and font
                      const dragImage = document.createElement('div');
                      dragImage.id = 'drag-image-ghost';
                      dragImage.style.position = 'absolute';
                      dragImage.style.top = '-1000px';
                      dragImage.style.left = '-1000px';
                      dragImage.style.padding = '10px 16px';
                      dragImage.style.borderRadius = '12px';
                      dragImage.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
                      dragImage.style.fontSize = '13px';
                      dragImage.style.fontWeight = '500';
                      dragImage.style.zIndex = '999999';

                      const isDarkMode = document.body.classList.contains('dark-mode');
                      const isGlassmorphic = document.body.classList.contains('glassmorphic-ui');

                      if (isGlassmorphic) {
                        if (isDarkMode) {
                          dragImage.style.background = 'rgba(15, 18, 25, 0.7)';
                          dragImage.style.border = '1px solid rgba(255, 255, 255, 0.15)';
                          dragImage.style.color = '#ffffff';
                        } else {
                          dragImage.style.background = 'rgba(255, 255, 255, 0.7)';
                          dragImage.style.border = '1px solid rgba(255, 255, 255, 0.3)';
                          dragImage.style.color = '#1a1a1a';
                        }
                        dragImage.style.backdropFilter = 'blur(10px)';
                        dragImage.style.webkitBackdropFilter = 'blur(10px)';
                        dragImage.style.boxShadow = '0 8px 32px 0 rgba(31, 38, 135, 0.15)';
                      } else {
                        if (isDarkMode) {
                          dragImage.style.background = '#1e1e1e';
                          dragImage.style.border = '1px solid rgba(255, 255, 255, 0.1)';
                          dragImage.style.color = '#ffffff';
                        } else {
                          dragImage.style.background = '#ffffff';
                          dragImage.style.border = '1px solid rgba(0, 0, 0, 0.15)';
                          dragImage.style.color = '#1a1a1a';
                        }
                        dragImage.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                      }

                      if (draggedDocs.length === 1) {
                        dragImage.innerText = `📄 ${draggedDocs[0].title}`;
                      } else {
                        dragImage.innerText = `🗂️ Dragging ${draggedDocs.length} files`;
                      }

                      document.body.appendChild(dragImage);
                      e.dataTransfer.setDragImage(dragImage, 10, 10);

                      setTimeout(() => {
                        if (document.body.contains(dragImage)) {
                          document.body.removeChild(dragImage);
                        }
                      }, 0);
                    }}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleSelectOne(e, doc.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="title-cell">
                      <div className="title-cell-content">
                        <div className={`doc-icon ${resolvedType}`}>
                          {resolvedType === 'pdf' ? 'PDF' : resolvedType === 'word' ? 'DOC' : resolvedType === 'image' ? 'IMG' : resolvedType === 'video' ? 'VID' : resolvedType === 'excel' ? 'XLS' : resolvedType === 'zip' ? 'ZIP' : resolvedType === 'text' ? 'TXT' : 'FILE'}
                        </div>
                        {editingFileId === doc.id ? (
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onBlur={() => handleRenameSubmit(doc.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameSubmit(doc.id);
                              if (e.key === 'Escape') handleRenameCancel();
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="file-rename-input"
                            autoFocus
                          />
                        ) : (
                          <span
                            className="doc-title"
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              handleRenameStart(doc);
                            }}
                          >
                            {doc.title}
                          </span>
                        )}
                        {doc.isPrivate && <span className="private-tag">private</span>}
                      </div>
                    </td>
                    <td><span className="tag-pill">{doc.tags}</span></td>
                    <td>{doc.owner}</td>
                    <td>{doc.dateModified}</td>
                  </tr>
                );
              }) : (
                <tr className="empty-row">
                  <td colSpan="5" className="empty-list-cell">
                    <div className="empty-list-content">
                      <FileText size={40} strokeWidth={1} />
                      <p>No files found in this folder</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          options={contextMenu.options}
          onClose={() => setContextMenu(null)}
        />
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        .document-list {
          height: 100%;
          display: flex;
          flex-direction: column;
          color: var(--text-main);
          border-left: 1px solid var(--glass-border);
          border-right: 1px solid var(--glass-border);
          overflow: hidden;
        }
        .list-toolbar {
          display: flex;
          justify-content: space-between;
          padding: 15px 20px;
          font-size: 13px;
          border-bottom: 1px solid var(--glass-border);
          background: rgba(255, 255, 255, 0.05);
          z-index: 2;
        }
        .toolbar-group {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .toolbar-dropdown {
          display: flex;
          align-items: center;
          gap: 5px;
          background: rgba(0, 0, 0, 0.05);
          padding: 4px 10px;
          border-radius: 4px;
          cursor: pointer;
          border: 1px solid var(--glass-border);
        }
        body.dark-mode .toolbar-dropdown {
          background: rgba(255, 255, 255, 0.1);
        }
        .toolbar-separator {
          width: 1px;
          height: 20px;
          background: var(--glass-border);
          margin: 0 5px;
        }
        .upload-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--accent);
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
        }
        .upload-btn:hover {
          background: #2980b9;
        }
        .toolbar-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          cursor: pointer;
          color: var(--text-muted);
          transition: all 0.2s;
          border: 1px solid transparent;
        }
        .toolbar-toggle:hover {
          background: rgba(0, 0, 0, 0.05);
          color: var(--text-main);
        }
        body.dark-mode .toolbar-toggle:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .toolbar-toggle.active {
          color: var(--accent);
          background: rgba(52, 152, 219, 0.1);
          border-color: rgba(52, 152, 219, 0.2);
        }
        .table-container {
          flex: 1;
          overflow-y: auto;
          position: relative;
        }
        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--text-muted);
        }
        .doc-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          table-layout: fixed;
        }
        .doc-table th {
          text-align: left;
          padding: 12px 20px;
          color: var(--text-muted);
          font-weight: 500;
          border-bottom: 1px solid var(--glass-border);
          position: sticky;
          top: 0;
          background: var(--solid-bg);
          z-index: 5; /* Lower than previewer */
        }
        .doc-table td {
          padding: 0 20px; /* Remove vertical padding to let flex handle it */
          height: 52px; /* Fixed height for consistency */
          border-bottom: 1px solid var(--glass-border);
          opacity: 0.9;
          vertical-align: middle;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .doc-table tr:not(.empty-row) {
          cursor: pointer;
          transition: background 0.1s;
        }
        .doc-table tr:not(.empty-row):hover {
          background: rgba(0, 0, 0, 0.02);
        }
        body.dark-mode .doc-table tr:not(.empty-row):hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .doc-table tr.selected {
          background: rgba(52, 152, 219, 0.15);
        }
        .doc-table.empty {
          height: 100%;
        }
        .empty-list-cell {
          height: 100% !important;
          text-align: center;
          border: none !important;
        }
        .empty-list-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 15px;
          color: var(--text-muted);
          opacity: 0.5;
          height: 100%;
        }
        .empty-list-content p {
          font-size: 14px;
        }
        .title-cell-content {
          display: flex;
          align-items: center;
          gap: 10px;
          height: 52px; /* Match td height */
        }
        .doc-icon {
          width: 24px;
          height: 24px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8px;
          font-weight: bold;
          color: white;
          flex-shrink: 0;
        }
        .doc-icon.pdf { background: #e74c3c; }
        .doc-icon.word { background: #3498db; }
        .doc-icon.image { background: #f1c40f; }
        .doc-icon.excel { background: #2ecc71; }
        .doc-icon.zip { background: #9b59b6; }
        .doc-icon.text { background: #7f8c8d; }
        .doc-icon.video { background: #e67e22; }
        .doc-icon.unknown { background: #95a5a6; }
        
        .private-tag {
          background: #34495e;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          margin-left: 8px;
          color: white;
        }
        .tag-pill {
          background: rgba(0, 0, 0, 0.05);
          padding: 2px 8px;
          border-radius: 4px;
          color: var(--accent);
          font-weight: 500;
        }
        body.dark-mode .tag-pill {
          background: rgba(255, 255, 255, 0.1);
        }
        .file-rename-input {
          background: rgba(255, 255, 255, 0.1) !important;
          border: 1px solid var(--accent) !important;
          color: var(--text-main) !important;
          border-radius: 4px !important;
          padding: 2px 6px !important;
          font-size: 13px !important;
          outline: none !important;
          width: 80% !important;
        }
        body.dark-mode .file-rename-input {
          background: rgba(0, 0, 0, 0.25) !important;
        }

        .drag-drop-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: var(--glass-blur, blur(10px));
          -webkit-backdrop-filter: var(--glass-blur, blur(10px));
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          border: 2px dashed var(--accent);
          border-radius: 12px;
          margin: 10px;
          animation: fadeIn 0.2s ease-out;
        }
        body.dark-mode .drag-drop-overlay {
          background: rgba(0, 0, 0, 0.4);
        }
        .drag-drop-overlay-content {
          text-align: center;
          color: var(--text-main);
          font-family: inherit;
        }
        .upload-glow-icon {
          color: var(--accent);
          margin-bottom: 15px;
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 0.8; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}} />
    </div>
  );
};

export default FileList;
