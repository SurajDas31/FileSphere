import { useState } from 'react';
import { ChevronDown, FileText, Edit, Copy, Trash, ExternalLink, Eye, EyeOff } from 'lucide-react';
import ContextMenu from './ContextMenu';

const FileList = ({ data, selectedId, onDocClick, isPreviewVisible, setIsPreviewVisible }) => {
  const [contextMenu, setContextMenu] = useState(null);

  const handleContextMenu = (e, doc) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      options: [
        { label: 'Open', icon: <ExternalLink size={14} />, onClick: () => console.log('Open', doc.title) },
        { label: 'Edit', icon: <Edit size={14} />, onClick: () => console.log('Edit', doc.title) },
        { label: 'Copy', icon: <Copy size={14} />, onClick: () => console.log('Copy', doc.title) },
        { label: 'Delete', icon: <Trash size={14} />, onClick: () => console.log('Delete', doc.title) },
      ]
    });
  };

  return (
    <div className="document-list glass-panel">
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
        <table className="doc-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}><input type="checkbox" /></th>
              <th>Title <ChevronDown size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /></th>
              <th style={{ width: '100px' }}>Tags</th>
              <th style={{ width: '100px' }}>Owner</th>
              <th style={{ width: '160px' }}>Date modified <ChevronDown size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /></th>
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? data.map(doc => (
              <tr 
                key={doc.id} 
                className={selectedId === doc.id ? 'selected' : ''}
                onClick={() => onDocClick(doc.id)}
                onContextMenu={(e) => handleContextMenu(e, doc)}
              >
                <td><input type="checkbox" checked={selectedId === doc.id} readOnly /></td>
                <td className="title-cell">
                  <div className="title-cell-content">
                    <div className={`doc-icon ${doc.type}`}>
                      {doc.type === 'pdf' ? 'PDF' : doc.type === 'word' ? 'DOC' : doc.type === 'image' ? 'IMG' : doc.type === 'excel' ? 'XLS' : doc.type === 'zip' ? 'ZIP' : 'TXT'}
                    </div>
                    <span className="doc-title">{doc.title}</span>
                    {doc.isPrivate && <span className="private-tag">private</span>}
                  </div>
                </td>
                <td><span className="tag-pill">{doc.tags}</span></td>
                <td>{doc.owner}</td>
                <td>{doc.dateModified}</td>
              </tr>
            )) : (
              <tr>
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
      </div>

      {contextMenu && (
        <ContextMenu 
          x={contextMenu.x} 
          y={contextMenu.y} 
          options={contextMenu.options} 
          onClose={() => setContextMenu(null)} 
        />
      )}

      <style dangerouslySetInnerHTML={{ __html: `
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
        .doc-table tr {
          cursor: pointer;
          transition: background 0.1s;
        }
        .doc-table tr:hover {
          background: rgba(0, 0, 0, 0.02);
        }
        body.dark-mode .doc-table tr:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .doc-table tr.selected {
          background: rgba(52, 152, 219, 0.15);
        }
        .empty-list-cell {
          height: 300px !important;
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
      `}} />
    </div>
  );
};

export default FileList;
