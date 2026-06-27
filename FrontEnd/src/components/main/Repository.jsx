import { useState, useEffect, useCallback, useRef } from 'react';
import { FolderPlus, Upload, Edit, Trash, FolderOpen, X } from 'lucide-react';
import ReactDOM from 'react-dom';
import ContextMenu from './ContextMenu';
import { config } from '../../config';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  const modalContent = (
    <div className="modal-overlay">
      <div className="modal-content glass-panel">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="close-btn" onClick={onCancel}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          backdrop-filter: blur(4px);
        }
        .modal-content {
          width: 350px;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          animation: slideUp 0.2s ease-out;
          background: var(--solid-bg);
          color: var(--text-main);
          border: 1px solid var(--glass-border);
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .modal-header {
          padding: 15px 20px;
          border-bottom: 1px solid var(--glass-border);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .modal-header h3 { margin: 0; font-size: 16px; color: var(--text-main); }
        .close-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; }
        .modal-body { padding: 20px; color: var(--text-muted); font-size: 14px; line-height: 1.5; }
        .modal-footer {
          padding: 15px 20px;
          background: rgba(0,0,0,0.2);
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        .btn-cancel {
          background: transparent;
          border: 1px solid var(--glass-border);
          color: var(--text-main);
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
        }
        .btn-danger {
          background: #e74c3c;
          border: none;
          color: white;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
        }
      `}} />
    </div>
  );
  return ReactDOM.createPortal(modalContent, document.body);
};

const Repository = ({ onCollapse, onFolderSelect, selectedFolderId, onFileUpload, onFileDrop, showToast, notifyOperation }) => {
  const [repositories, setRepositories] = useState([]);
  const fileInputRef = useRef(null);
  const [uploadTargetId, setUploadTargetId] = useState(null);
  
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, name: '' });
  
  // State to track which parent folder is currently displaying the "New Folder" inline input
  const [creatingNodeParentId, setCreatingNodeParentId] = useState(null);

  const fetchFolders = useCallback(() => {
    fetch(`${config.FILE_API_BASE_URL || ''}/api/folders`)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data)) {
          const buildTree = (folders, parentId = null) => {
            return folders
              .filter(f => f.parentId === parentId)
              .map(f => ({
                id: f.id,
                label: f.name,
                type: parentId === null ? 'root' : 'folder',
                children: buildTree(folders, f.id)
              }));
          };
          setRepositories(buildTree(data, null));
        }
      })
      .catch(err => {
        console.warn("Backend not reachable. Ensure Docker containers are running.", err);
      });
  }, []);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const initiateCreateFolder = (parentId) => {
    setCreatingNodeParentId(parentId);
  };

  const submitCreateFolder = async (parentId, name) => {
    setCreatingNodeParentId(null); // Remove inline input regardless of outcome
    
    if (!name || name.trim() === '') return;

    try {
      const res = await fetch(`${config.FILE_API_BASE_URL || ''}/api/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), parentId: parentId })
      });
      
      if (res.ok) {
        fetchFolders();
        if (notifyOperation) notifyOperation("Folder Created", `Folder "${name}" created successfully.`, true);
      } else {
        const err = await res.json();
        if (notifyOperation) notifyOperation("Folder Action Failed", "Failed to create folder: " + err.error, false);
      }
    } catch (e) {
      console.error("Create folder error", e);
      if (notifyOperation) notifyOperation("Folder Action Failed", "Network error while creating folder.", false);
    }
  };

  const cancelCreateFolder = () => {
    setCreatingNodeParentId(null);
  };

  const handleRenameFolder = async (id, newName) => {
    try {
      const res = await fetch(`${config.FILE_API_BASE_URL || ''}/api/folders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      if (res.ok) {
        fetchFolders();
        if (notifyOperation) notifyOperation("Folder Renamed", `Folder renamed to "${newName}" successfully.`, true);
      } else {
        const err = await res.json();
        if (notifyOperation) notifyOperation("Folder Action Failed", "Failed to rename folder: " + err.error, false);
      }
    } catch (e) {
      console.error("Rename folder error", e);
      if (notifyOperation) notifyOperation("Folder Action Failed", "Network error while renaming folder.", false);
    }
  };

  const requestDeleteFolder = (id, name) => {
    setDeleteModal({ isOpen: true, id, name });
  };

  const confirmDeleteFolder = async () => {
    const { id, name } = deleteModal;
    setDeleteModal({ isOpen: false, id: null, name: '' });
    try {
      const res = await fetch(`${config.FILE_API_BASE_URL || ''}/api/folders/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchFolders();
        if (selectedFolderId === id) {
           onFolderSelect(null);
        }
        if (notifyOperation) notifyOperation("Folder Deleted", `Folder "${name}" deleted permanently.`, true);
      } else {
        const err = await res.json();
        if (notifyOperation) notifyOperation("Folder Action Failed", "Failed to delete folder: " + err.error, false);
      }
    } catch (e) {
      console.error("Delete folder error", e);
      if (notifyOperation) notifyOperation("Folder Action Failed", "Network error while deleting folder.", false);
    }
  };

  const handleUploadClick = (folderId) => {
    setUploadTargetId(folderId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      // Allow multi-file selection from input by changing input attributes later
      // For now, handling single file from array
      onFileUpload(Array.from(e.target.files), uploadTargetId);
      e.target.value = null;
    }
  };

  return (
    <div className="repositories-section glass-panel">
      <div className="section-header">
        <span>Repositories</span>
        <button className="collapse-btn" onClick={onCollapse}>«</button>
      </div>
      <div className="tree-container">
        {repositories.length === 0 ? (
          <div style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center' }}>
            Loading repository tree...<br/>
            <span style={{fontSize: '11px', opacity: 0.7}}>Ensure backend is running.</span>
          </div>
        ) : (
          <RepoTree 
            data={repositories} 
            onFolderSelect={onFolderSelect}
            selectedFolderId={selectedFolderId}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={requestDeleteFolder}
            onUploadClick={handleUploadClick}
            creatingNodeParentId={creatingNodeParentId}
            onInitiateCreate={initiateCreateFolder}
            onSubmitCreate={submitCreateFolder}
            onCancelCreate={cancelCreateFolder}
            onFileDrop={onFileDrop}
            onFileUpload={onFileUpload}
          />
        )}
      </div>
      <input 
        type="file" 
        multiple
        ref={fileInputRef} 
        onChange={handleFileChange} 
        style={{ display: 'none' }} 
      />
      
      <ConfirmModal 
        isOpen={deleteModal.isOpen}
        title="Delete Folder"
        message={`Are you sure you want to permanently delete "${deleteModal.name}" and all its contents?`}
        onConfirm={confirmDeleteFolder}
        onCancel={() => setDeleteModal({ isOpen: false, id: null, name: '' })}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        .repositories-section {
          height: 100%;
          display: flex;
          flex-direction: column;
          color: var(--text-main);
          border-right: 1px solid var(--glass-border);
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 15px;
          font-weight: 600;
          font-size: 14px;
          border-bottom: 1px solid var(--glass-border);
          background: rgba(255, 255, 255, 0.05);
        }
        .collapse-btn {
          background: none;
          border: none;
          color: var(--text-main);
          cursor: pointer;
          font-size: 16px;
          opacity: 0.7;
          transition: opacity 0.2s;
        }
        .collapse-btn:hover {
          opacity: 1;
        }
        .tree-container {
          flex: 1;
          overflow-y: auto;
          padding: 5px 10px;
        }
      `}} />
    </div>
  );
};

const RepoTree = ({ data, onFolderSelect, selectedFolderId, onCreateFolder, onRenameFolder, onDeleteFolder, onUploadClick, creatingNodeParentId, onInitiateCreate, onSubmitCreate, onCancelCreate, onFileDrop, onFileUpload }) => {
  return (
    <div className="repo-tree">
      {data.map(node => (
        <TreeNode 
          key={node.id} 
          node={node} 
          depth={0} 
          onFolderSelect={onFolderSelect}
          selectedFolderId={selectedFolderId}
          onCreateFolder={onCreateFolder}
          onRenameFolder={onRenameFolder}
          onDeleteFolder={onDeleteFolder}
          onUploadClick={onUploadClick}
          creatingNodeParentId={creatingNodeParentId}
          onInitiateCreate={onInitiateCreate}
          onSubmitCreate={onSubmitCreate}
          onCancelCreate={onCancelCreate}
          onFileDrop={onFileDrop}
          onFileUpload={onFileUpload}
        />
      ))}
    </div>
  );
};

// Component for the temporary inline creation input
const GhostNode = ({ depth, onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onSubmit(name);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="tree-node" style={{ marginLeft: depth * 15 }}>
      <div className="tree-row">
        <span className="toggle-spacer" />
        <span className="node-icon">📁</span>
        <input
          ref={inputRef}
          type="text"
          className="inline-edit-input"
          placeholder="New Folder..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => onSubmit(name)}
          onKeyDown={handleKeyDown}
        />
      </div>
    </div>
  );
};

const TreeNode = ({ node, depth, onFolderSelect, selectedFolderId, onCreateFolder, onRenameFolder, onDeleteFolder, onUploadClick, creatingNodeParentId, onInitiateCreate, onSubmitCreate, onCancelCreate, onFileDrop, onFileUpload }) => {
  // Requirement 4: All folders collapsed by default
  const [isOpen, setIsOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  
  // Requirement 2: Inline Rename
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(node.label);
  const inputRef = useRef(null);
  const hoverTimerRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Set drop effect
    e.dataTransfer.dropEffect = 'copy';

    if (!isOpen && !hoverTimerRef.current) {
      hoverTimerRef.current = setTimeout(() => {
        setIsOpen(true);
        hoverTimerRef.current = null;
      }, 800); // 800ms hover delay
    }
  };

  const handleDragLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }

    try {
      // Local files drop
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        if (onFileUpload) {
          onFileUpload(Array.from(e.dataTransfer.files), node.id);
        }
        return;
      }

      const dragData = JSON.parse(e.dataTransfer.getData("application/json") || "{}");
      if (dragData.type === 'file') {
        if (onFileDrop) {
          if (dragData.files && dragData.files.length > 0) {
            onFileDrop(
              dragData.files.map(f => f.id),
              dragData.files.map(f => f.title).join(', '),
              node.id,
              node.label
            );
          } else {
            onFileDrop([dragData.id], dragData.title, node.id, node.label);
          }
        }
      } else if (dragData.type === 'folder') {
        if (dragData.id === node.id) return; // Cannot drop onto itself
        if (onFileDrop) {
          // Pass the dragData type inside file drop so App.jsx knows it's a folder copy/move
          onFileDrop([dragData.id], `Folder: ${dragData.label}`, node.id, node.label, 'folder');
        }
      }
    } catch (err) {
      console.error("Error drop file", err);
    }
  };

  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedFolderId === node.id;
  const isCreatingChildHere = creatingNodeParentId === node.id;

  // Auto-expand if a child is being created here
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isCreatingChildHere && !isOpen) {
        setIsOpen(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [isCreatingChildHere, isOpen]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const options = [
      { label: 'Open', icon: <FolderOpen size={14} />, onClick: () => { onFolderSelect(node.id); setIsOpen(true); } },
      { label: 'New Folder', icon: <FolderPlus size={14} />, onClick: () => onInitiateCreate(node.id) },
      { label: 'Upload Files', icon: <Upload size={14} />, onClick: () => onUploadClick(node.id) },
      { label: 'Rename', icon: <Edit size={14} />, onClick: () => setIsEditing(true) },
      { label: 'Delete', icon: <Trash size={14} />, onClick: () => onDeleteFolder(node.id, node.label) },
    ];

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      options
    });
  };

  const handleRenameSubmit = () => {
    setIsEditing(false);
    if (editName.trim() !== '' && editName !== node.label) {
      onRenameFolder(node.id, editName.trim());
    } else {
      setEditName(node.label); // Revert
    }
  };

  const handleRenameKeyDown = (e) => {
    if (e.key === 'Enter') handleRenameSubmit();
    if (e.key === 'Escape') {
      setEditName(node.label);
      setIsEditing(false);
    }
  };

  return (
    <div className="tree-node" style={{ marginLeft: depth * 15 }}>
      <div 
        className={`tree-row ${isSelected ? 'selected' : ''}`}
        onContextMenu={handleContextMenu}
        onClick={() => {
          if (!isEditing) onFolderSelect(node.id);
        }}
        onDoubleClick={() => {
          if (!isEditing) setIsOpen(!isOpen);
        }}
        draggable={node.type === 'folder' ? 'true' : 'false'}
        onDragStart={(e) => {
          if (node.type === 'folder') {
            e.dataTransfer.setData("application/json", JSON.stringify({
              type: 'folder',
              id: node.id,
              label: node.label
            }));
            e.dataTransfer.effectAllowed = "copyMove";
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <span className="toggle" onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}>
          {hasChildren || isCreatingChildHere ? (isOpen ? '⌄' : '›') : <span className="toggle-spacer" />}
        </span>
        <span className="node-icon">
          {node.type === 'root' ? '🗄️' : node.type === 'folder' ? '📁' : '📄'}
        </span>
        
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            className="inline-edit-input"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={handleRenameKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="node-label">{node.label}</span>
        )}
      </div>
      
      {isOpen && (
        <div className="node-children">
          {isCreatingChildHere && (
            <GhostNode 
              depth={depth + 1} 
              onSubmit={(name) => onSubmitCreate(node.id, name)} 
              onCancel={onCancelCreate} 
            />
          )}
          {hasChildren && node.children.map(child => (
            <TreeNode 
              key={child.id} 
              node={child} 
              depth={depth + 1} 
              onFolderSelect={onFolderSelect}
              selectedFolderId={selectedFolderId}
              onCreateFolder={onCreateFolder}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
              onUploadClick={onUploadClick}
              creatingNodeParentId={creatingNodeParentId}
              onInitiateCreate={onInitiateCreate}
              onSubmitCreate={onSubmitCreate}
              onCancelCreate={onCancelCreate}
              onFileDrop={onFileDrop}
              onFileUpload={onFileUpload}
            />
          ))}
        </div>
      )}

      {contextMenu && (
        <ContextMenu 
          x={contextMenu.x} 
          y={contextMenu.y} 
          options={contextMenu.options} 
          onClose={() => setContextMenu(null)} 
        />
      )}
      <style dangerouslySetInnerHTML={{ __html: `
        .tree-row {
          display: flex;
          align-items: center;
          padding: 4px 6px;
          cursor: pointer;
          border-radius: 4px;
          font-size: 13px;
          gap: 6px;
          color: var(--text-main);
          transition: background 0.2s;
        }
        .tree-row:hover {
          background: rgba(0, 0, 0, 0.05);
        }
        body.dark-mode .tree-row:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .tree-row.selected {
          background: rgba(52, 152, 219, 0.2);
          font-weight: 500;
        }
        .toggle {
          width: 14px;
          display: inline-block;
          text-align: center;
          color: var(--text-muted);
        }
        .toggle-spacer {
          width: 14px;
          display: inline-block;
        }
        .inline-edit-input {
          flex: 1;
          background: var(--solid-bg);
          border: 1px solid var(--accent);
          color: var(--text-main);
          border-radius: 3px;
          padding: 2px 4px;
          font-size: 13px;
          outline: none;
        }
      `}} />
    </div>
  );
};

export default Repository;
