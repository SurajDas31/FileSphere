import { useState, useEffect } from 'react';
import { Allotment } from 'allotment';
import Header from './components/headerbar/Header';
import Sidebar from './components/sidebar/Sidebar';
import FileList from './components/main/FileList';
import FileProperties from './components/main/FileProperties';
import FileViewer from './components/main/FileViewer';
import Repository from './components/main/Repository';
import SettingsModal from './components/sidebar/Settings';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import UploadManager from './components/main/UploadManager';
import { config } from './config';
import ReactDOM from 'react-dom';
import ToastContainer from './components/main/ToastContainer';

const CopyMoveModal = ({ isOpen, filename, foldername, folders, actionType, onCopy, onMove, onCancel }) => {
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [hasInitialized, setHasInitialized] = useState(false);
  
  useEffect(() => {
    if (!isOpen) {
      setHasInitialized(false);
      setSelectedFolderId('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !hasInitialized && folders && folders.length > 0) {
      setSelectedFolderId(folders[0].id);
      setHasInitialized(true);
    }
  }, [isOpen, folders, hasInitialized]);

  if (!isOpen) return null;

  const isDragDrop = !!foldername;

  const handleCopy = () => {
    if (isDragDrop) {
      onCopy();
    } else {
      onCopy(selectedFolderId);
    }
  };

  const handleMove = () => {
    if (isDragDrop) {
      onMove();
    } else {
      onMove(selectedFolderId);
    }
  };

  // Helper to build hierarchy display names
  const buildFolderDisplayNames = (foldersList) => {
    const map = {};
    foldersList.forEach(f => { map[f.id] = f; });

    const getPath = (folder) => {
      let path = folder.name;
      let curr = folder;
      while (curr.parentId && map[curr.parentId]) {
        curr = map[curr.parentId];
        path = curr.name + ' / ' + path;
      }
      return path;
    };

    return foldersList.map(f => ({
      id: f.id,
      path: getPath(f)
    })).sort((a, b) => a.path.localeCompare(b.path));
  };

  const folderPaths = buildFolderDisplayNames(folders || []);

  const modalContent = (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ width: '400px' }}>
        <div className="modal-header">
          <h3>{isDragDrop ? 'File Action' : actionType === 'move' ? 'Move File(s)' : 'Copy File(s)'}</h3>
          <button className="close-btn" onClick={onCancel}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div className="modal-body">
          {isDragDrop ? (
            <p>Would you like to copy or move <strong>{filename}</strong> to <strong>{foldername}</strong>?</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p>Select target destination folder to {actionType === 'move' ? 'move' : 'copy'} <strong>{filename}</strong>:</p>
              <select 
                value={selectedFolderId} 
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="modal-select-dropdown"
              >
                {folderPaths.map(fp => (
                  <option key={fp.id} value={fp.id}>
                    📁 {fp.path}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="modal-footer" style={{ gap: '12px', justifyContent: 'flex-end', display: 'flex' }}>
          <button className="btn-secondary" onClick={onCancel} style={{ marginRight: 'auto' }}>Cancel</button>
          {isDragDrop ? (
            <>
              <button className="btn-primary" onClick={handleCopy} style={{ background: '#3498db' }}>Copy</button>
              <button className="btn-primary" onClick={handleMove} style={{ background: '#2ecc71' }}>Move</button>
            </>
          ) : (
            <button 
              className="btn-primary" 
              onClick={actionType === 'move' ? handleMove : handleCopy} 
              style={{ background: actionType === 'move' ? '#2ecc71' : '#3498db' }}
            >
              Yes
            </button>
          )}
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          backdrop-filter: blur(8px);
        }
        .modal-content {
          width: 400px;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          background: var(--solid-bg-fallback, #ffffff);
          color: var(--text-main);
          border: 1px solid var(--glass-border);
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
        .modal-body { padding: 20px; color: var(--text-main); font-size: 14px; line-height: 1.5; }
        .modal-footer {
          padding: 15px 20px;
          background: rgba(0,0,0,0.2);
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        .btn-secondary {
          background: transparent;
          border: 1px solid var(--glass-border);
          color: var(--text-main);
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }
        .btn-primary {
          border: none;
          color: white;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }
        .modal-select-dropdown {
          background: var(--solid-bg-fallback, #ffffff);
          color: var(--text-main);
          border: 1px solid var(--glass-border);
          border-radius: 8px;
          padding: 8px 12px;
          font-family: inherit;
          font-size: 14px;
          outline: none;
          cursor: pointer;
          width: 100%;
        }
        .modal-select-dropdown option {
          background: var(--solid-bg-fallback, #ffffff);
          color: var(--text-main);
        }
      `}} />
    </div>
  );
  return ReactDOM.createPortal(modalContent, document.body);
};

const DeleteConfirmModal = ({ isOpen, filenamesString, onDelete, onCancel }) => {
  if (!isOpen) return null;
  const modalContent = (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ width: '400px' }}>
        <div className="modal-header">
          <h3>Confirm Delete</h3>
          <button className="close-btn" onClick={onCancel}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div className="modal-body">
          <p>Are you sure you want to permanently delete <strong>{filenamesString}</strong>? This action cannot be undone.</p>
        </div>
        <div className="modal-footer" style={{ gap: '12px', justifyContent: 'flex-end', display: 'flex' }}>
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" onClick={onDelete} style={{ background: '#e74c3c' }}>Delete</button>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          backdrop-filter: blur(8px);
        }
        .modal-content {
          width: 400px;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          background: var(--solid-bg-fallback, #ffffff);
          color: var(--text-main);
          border: 1px solid var(--glass-border);
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
        .modal-body { padding: 20px; color: var(--text-main); font-size: 14px; line-height: 1.5; }
        .modal-footer {
          padding: 15px 20px;
          background: rgba(0,0,0,0.2);
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        .btn-secondary {
          background: transparent;
          border: 1px solid var(--glass-border);
          color: var(--text-main);
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }
        .btn-primary {
          border: none;
          color: white;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }
      `}} />
    </div>
  );
  return ReactDOM.createPortal(modalContent, document.body);
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authView, setAuthView] = useState('login');
  const [activeView, setActiveView] = useState('home');
  const [isRepoExpanded, setIsRepoExpanded] = useState(true);
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  const [isResizing, setIsResizing] = useState(false);
  const [isSidebarMenuOpen, setIsSidebarMenuOpen] = useState(false);
  const [isSidebarAutoHide, setIsSidebarAutoHide] = useState(false);
  const [isHoveringLeft, setIsHoveringLeft] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsCategory, setSettingsCategory] = useState('general');
  
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [selectedFolderData, setSelectedFolderData] = useState(null);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  
  const [uploads, setUploads] = useState([]);
  const [foldersList, setFoldersList] = useState([]);
  const [toasts, setToasts] = useState([]);

  const [userProfile, setUserProfile] = useState(null);

  const handleLogout = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        await fetch(`${config.AUTH_API_BASE_URL || 'http://localhost:8081'}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (e) {
        console.warn("Logout request failed, invalidating locally", e);
      }
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUserProfile(null);
    setSelectedFolderId(null);
    setSelectedFolderData(null);
    setSelectedDocId(null);
    setSelectedDocIds([]);
    setDocuments([]);
    setFoldersList([]);
    setUploads([]);
    setIsAuthenticated(false);
  };

  const fetchUserProfile = async (token) => {
    try {
      const res = await fetch(`${config.AUTH_API_BASE_URL || 'http://localhost:8081'}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data);
        localStorage.setItem('user', JSON.stringify(data));
      }

      // Fetch user settings preferences
      const settingsRes = await fetch(`${config.AUTH_API_BASE_URL || 'http://localhost:8081'}/api/auth/user/settings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setIsSidebarAutoHide(settingsData.autoHideSidebar);
        if (settingsData.theme === 'dark') {
          document.body.classList.add('dark-mode');
        } else {
          document.body.classList.remove('dark-mode');
        }
        if (settingsData.glassmorphism) {
          document.body.classList.add('glassmorphic-ui');
        } else {
          document.body.classList.remove('glassmorphic-ui');
        }
      }
    } catch (e) {
      console.error("Failed to load user profile or settings", e);
    }
  };

  // Request browser notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    // Load Dark Mode configuration from localStorage
    const savedDark = localStorage.getItem('theme_dark_mode');
    if (savedDark === 'true') {
      document.body.classList.add('dark-mode');
    } else if (savedDark === 'false') {
      document.body.classList.remove('dark-mode');
    }

    // Auto-hide sidebar hover listener: trigger if mouse x coordinate is less than 30px, or if it stays over the sidebar
    const handleMouseMove = (e) => {
      if (e.clientX < 40) {
        setIsHoveringLeft(true);
      } else if (e.clientX > 100) {
        setIsHoveringLeft(false);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Handle OAuth2 Redirect callback & persistent authentication
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      localStorage.setItem('token', urlToken);
      setIsAuthenticated(true);
      fetchUserProfile(urlToken);
      // Clean up the URL query parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      showToast('Signed in successfully!', 'success');
    } else {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        setIsAuthenticated(true);
        // Load user from cache first, then fetch fresh copy
        const cachedUser = localStorage.getItem('user');
        if (cachedUser) {
          try {
            setUserProfile(JSON.parse(cachedUser));
          } catch { /* ignore */ }
        }
        fetchUserProfile(storedToken);
      }
    }
  }, []);

  const showToast = (message, type = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const triggerPushNotification = (title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, { body });
      } catch (err) {
        console.error("Push Notification failed", err);
      }
    }
  };

  const notifyOperation = (title, message, isSuccess = true) => {
    showToast(message, isSuccess ? 'success' : 'error');
    triggerPushNotification(title, message);
  };

  const [copyMoveModal, setCopyMoveModal] = useState({
    isOpen: false,
    fileIds: [],
    filename: '',
    targetFolderId: null,
    targetFolderName: '',
    dragType: 'file' // 'file' or 'folder'
  });

  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    fileIds: [],
    filenamesString: ''
  });

  const handleFileDrop = (fileIds, filenamesString, targetFolderId, targetFolderName, dragType = 'file') => {
    setCopyMoveModal({
      isOpen: true,
      fileIds,
      filename: filenamesString,
      targetFolderId,
      targetFolderName,
      dragType
    });
  };

  const openCopyMoveModalForContext = (fileIds, filenamesString) => {
    fetch(`${config.FILE_API_BASE_URL || ''}/api/folders`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setFoldersList(data);
        }
        setCopyMoveModal({
          isOpen: true,
          fileIds,
          filename: filenamesString,
          targetFolderId: null,
          targetFolderName: ''
        });
      })
      .catch(err => {
        console.error("Error fetching folders for modal", err);
        setCopyMoveModal({
          isOpen: true,
          fileIds,
          filename: filenamesString,
          targetFolderId: null,
          targetFolderName: ''
        });
      });
  };

  const handleConfirmCopy = async (chosenFolderId) => {
    const { fileIds, targetFolderId, dragType } = copyMoveModal;
    const destFolderId = chosenFolderId || targetFolderId;
    if (!destFolderId) {
      showToast("Please select a target folder.", "info");
      return;
    }
    setCopyMoveModal(prev => ({ ...prev, isOpen: false }));

    try {
      const isFolder = dragType === 'folder';
      showToast(isFolder ? "Copying folder structure..." : "Copying selected file(s)...", "info");
      triggerPushNotification(isFolder ? "Folder Copy Started" : "File Copy Started", "Copying items in background...");
      
      const promises = fileIds.map(id => {
        const url = isFolder 
          ? `${config.FILE_API_BASE_URL || ''}/api/folders/${id}/copy`
          : `${config.FILE_API_BASE_URL || ''}/api/files/${id}/copy`;
        return fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parentId: destFolderId, folderId: destFolderId })
        });
      });
      const results = await Promise.all(promises);
      if (results.every(res => res.ok)) {
        // Trigger page refresh or repo tree reload
        window.location.reload(); 
      } else {
        notifyOperation("Copy Failed", "Failed to copy some items.", false);
      }
    } catch (e) {
      console.error("Copy error", e);
      notifyOperation("Copy Failed", "Network error occurred while copying items.", false);
    }
  };

  const handleConfirmMove = async (chosenFolderId) => {
    const { fileIds, targetFolderId, dragType } = copyMoveModal;
    const destFolderId = chosenFolderId || targetFolderId;
    if (!destFolderId) {
      alert("Please select a target folder.");
      return;
    }
    setCopyMoveModal(prev => ({ ...prev, isOpen: false }));
    try {
      const isFolder = dragType === 'folder';
      showToast(isFolder ? "Moving folder..." : "Moving selected file(s)...", "info");
      triggerPushNotification(isFolder ? "Folder Move Started" : "File Move Started", "Moving items in background...");
      
      const promises = fileIds.map(id => {
        const url = isFolder 
          ? `${config.FILE_API_BASE_URL || ''}/api/folders/${id}/move`
          : `${config.FILE_API_BASE_URL || ''}/api/files/${id}`;
        
        // Go backend folder move accepts JSON struct with parentId
        // Go backend file update accepts JSON struct with folderId
        const bodyObj = isFolder 
          ? { parentId: destFolderId } 
          : { folderId: destFolderId };

        return fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyObj)
        });
      });
      const results = await Promise.all(promises);
      if (results.every(res => res.ok)) {
        window.location.reload();
      } else {
        notifyOperation("Move Failed", "Failed to move some items.", false);
      }
    } catch (e) {
      console.error("Move error", e);
      notifyOperation("Move Failed", "Network error occurred while moving items.", false);
    }
  };

  const handleRequestDelete = (fileIds, filenamesString) => {
    setDeleteModal({
      isOpen: true,
      fileIds,
      filenamesString
    });
  };

  const handleConfirmDelete = async () => {
    const { fileIds } = deleteModal;
    setDeleteModal(prev => ({ ...prev, isOpen: false }));
    try {
      showToast("Deleting selected file(s)...", "info");
      triggerPushNotification("File Deletion Started", "Deleting selected file(s) permanently...");
      
      const promises = fileIds.map(fileId =>
        fetch(`${config.FILE_API_BASE_URL || ''}/api/files/${fileId}`, {
          method: 'DELETE'
        })
      );
      const results = await Promise.all(promises);
      if (results.every(res => res.ok)) {
        setSelectedDocIds([]);
        handleFolderSelect(selectedFolderId);
        notifyOperation("Deletion Complete", "Selected file(s) deleted permanently.", true);
      } else {
        notifyOperation("Deletion Failed", "Failed to delete some files.", false);
      }
    } catch (e) {
      console.error("Delete error", e);
      notifyOperation("Deletion Failed", "Network error occurred while deleting files.", false);
    }
  };

  // Initialize Glassmorphism theme
  useEffect(() => {
    const isGlass = localStorage.getItem('ui_glassmorphism') !== 'false';
    if (isGlass) {
      document.body.classList.add('glassmorphic-ui');
    } else {
      document.body.classList.remove('glassmorphic-ui');
    }
  }, []);

  // Fetch files when a folder is selected
  const handleFolderSelect = async (folderId) => {
    setSelectedFolderId(folderId);
    setSelectedDocId(null);
    setSelectedDocIds([]);
    setSelectedFolderData(null);
    
    if (!folderId) {
      setDocuments([]);
      return;
    }

    // Fetch from real API
    setLoadingFiles(true);
    try {
      const res = await fetch(`${config.FILE_API_BASE_URL || ''}/api/folders/${folderId}`);
      if (res.ok) {
        const data = await res.json();
        
        // Save folder metadata for the properties panel
        setSelectedFolderData({
          id: data.id,
          title: data.name,
          type: 'folder',
          dateModified: new Date(data.createdAt).toLocaleDateString(),
          owner: 'Admin'
        });

        const mappedFiles = (data.files || []).map(f => ({
          id: f.id,
          folderId: f.folderId,
          title: f.title,
          type: f.type,
          size: f.size,
          owner: f.owner,
          tags: f.tags,
          dateModified: new Date(f.createdAt).toLocaleDateString(),
          url: `${config.FILE_API_BASE_URL || ''}/api/files/${f.id}/content`
        }));
        setDocuments(mappedFiles);
      } else {
        setDocuments([]);
      }
    } catch (e) {
      console.error("Failed to fetch folder details. Using empty array.", e);
      setDocuments([]);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleDocClick = (id) => {
    setSelectedDocId(selectedDocId === id ? null : id);
    setSelectedDocIds([id]);
  };

  const handleTogglePreview = () => {
    setIsResizing(true);
    setIsPreviewVisible(!isPreviewVisible);
    setTimeout(() => setIsResizing(false), 450);
  };

  const handleFileUpload = (filesArray, targetFolderId) => {
    if (!targetFolderId) {
      alert("No target folder specified for upload.");
      return;
    }

    showToast(`Uploading ${filesArray.length} file(s)...`, "info");
    triggerPushNotification("Upload Started", `Uploading ${filesArray.length} file(s)...`);

    const newUploads = filesArray.map(file => {
      const CHUNK_SIZE = 5 * 1024 * 1024;
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      return {
        id: Math.random().toString(36).substr(2, 9),
        uploadId: crypto.randomUUID(), // Need a unique ID for the backend temp folder
        file: file,
        targetFolderId: targetFolderId,
        status: 'uploading', // uploading, paused, completed, error
        uploadedChunks: 0,
        totalChunks: totalChunks
      };
    });

    setUploads(prev => [...prev, ...newUploads]);
  };

  const handleUploadComplete = (newFile, targetFolderId) => {
    notifyOperation("Upload Complete", `File "${newFile.title}" uploaded successfully.`, true);

    if (targetFolderId === selectedFolderId) {
      const mappedFile = {
        id: newFile.id,
        folderId: newFile.folderId,
        title: newFile.title,
        type: newFile.type,
        size: newFile.size,
        owner: newFile.owner,
        tags: newFile.tags,
        dateModified: new Date(newFile.createdAt).toLocaleDateString(),
        url: `/api/files/${newFile.id}/content`
      };
      setDocuments(prev => [...prev, mappedFile]);
    }
  };

  const activeDoc = documents.find(d => d.id === selectedDocId);

  if (!isAuthenticated) {
    return authView === 'login' ? (
      <Login 
        onLogin={() => {
          const cached = localStorage.getItem('user');
          if (cached) {
            try {
              setUserProfile(JSON.parse(cached));
            } catch (err) {}
          }
          setIsAuthenticated(true);
          // fetch fresh copy too
          const token = localStorage.getItem('token');
          if (token) {
            fetchUserProfile(token);
          }
        }} 
        onSignupClick={() => setAuthView('signup')} 
      />
    ) : (
      <Signup 
        onSignup={() => setIsAuthenticated(true)} 
        onBackToLogin={() => setAuthView('login')} 
      />
    );
  }

  return (
    <div className="app-container">
      <Header />
      <div className={`workspace ${isResizing ? 'is-resizing' : ''} ${isSidebarMenuOpen ? 'sidebar-menu-open' : ''}`}>
        <Allotment>
          {/* Fixed Sidebar */}
          <Allotment.Pane 
            preferredSize={isSidebarAutoHide && !isSidebarMenuOpen && !isHoveringLeft ? 0 : 70} 
            minSize={isSidebarAutoHide && !isSidebarMenuOpen && !isHoveringLeft ? 0 : 70} 
            maxSize={70}
            visible={!(isSidebarAutoHide && !isSidebarMenuOpen && !isHoveringLeft)}
          >
            <Sidebar 
              activeView={activeView}
              onViewChange={(view) => {
                if (view === 'settings') {
                  setSettingsCategory('general');
                  setIsSettingsOpen(true);
                } else {
                  setActiveView(view);
                  if (view === 'repositories') setIsRepoExpanded(true);
                }
              }} 
              onMenuToggle={(isOpen) => setIsSidebarMenuOpen(isOpen)}
              onLogout={handleLogout}
              userProfile={userProfile}
              onProfileClick={() => {
                setSettingsCategory('profile');
                setIsSettingsOpen(true);
              }}
            />
          </Allotment.Pane>

          {/* Repository & Properties Section */}
          {activeView === 'repositories' && isRepoExpanded && (
            <Allotment.Pane preferredSize={280} minSize={200} maxSize={500}>
              <div key={activeView} className="view-transition-wrapper h-full">
                <Allotment vertical>
                  <Allotment.Pane preferredSize="60%">
                    <Repository 
                      onCollapse={() => setIsRepoExpanded(false)} 
                      onFolderSelect={handleFolderSelect}
                      selectedFolderId={selectedFolderId}
                      onFileUpload={handleFileUpload}
                      onFileDrop={handleFileDrop}
                      showToast={showToast}
                      notifyOperation={notifyOperation}
                    />
                  </Allotment.Pane>
                  <Allotment.Pane>
                    <FileProperties data={activeDoc || selectedFolderData || {}} />
                  </Allotment.Pane>
                </Allotment>
              </div>
            </Allotment.Pane>
          )}

          {/* Main Content Area */}
          <Allotment.Pane>
            <div key={activeView} className="view-transition-wrapper h-full">
              {activeView === 'repositories' ? (
                <Allotment>
                  <Allotment.Pane preferredSize="60%">
                    <FileList 
                      data={documents} 
                      selectedId={selectedDocId}
                      selectedDocIds={selectedDocIds}
                      setSelectedDocIds={setSelectedDocIds}
                      onDocClick={handleDocClick}
                      isPreviewVisible={isPreviewVisible} 
                      setIsPreviewVisible={handleTogglePreview}
                      isLoading={loadingFiles}
                      onFileUpdated={() => handleFolderSelect(selectedFolderId)}
                      onDeleteFiles={handleRequestDelete}
                      onCopyFiles={openCopyMoveModalForContext}
                      onMoveFiles={openCopyMoveModalForContext}
                      onFileUpload={handleFileUpload}
                      currentFolderId={selectedFolderId}
                      notifyOperation={notifyOperation}
                    />
                  </Allotment.Pane>
                  <Allotment.Pane preferredSize="40%" visible={isPreviewVisible}>
                    <FileViewer data={activeDoc} />
                  </Allotment.Pane>
                </Allotment>
              ) : (
                <div className="blank-page glass-panel">
                  <div className="blank-content">
                    <h2>{activeView.charAt(0).toUpperCase() + activeView.slice(1).replace('-', ' ')}</h2>
                    <p>This section is under development.</p>
                  </div>
                </div>
              )}
            </div>
          </Allotment.Pane>
        </Allotment>
      </div>
 
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => {
          setIsSettingsOpen(false);
          const token = localStorage.getItem('token');
          if (token) {
            fetchUserProfile(token);
          }
        }} 
        userProfile={userProfile}
        initialCategory={settingsCategory}
        onProfileUpdate={(updatedUser) => {
          setUserProfile(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }}
      />
      
      <UploadManager 
        uploads={uploads} 
        setUploads={setUploads} 
        onUploadComplete={handleUploadComplete} 
      />
 
      <CopyMoveModal
        isOpen={copyMoveModal.isOpen}
        filename={copyMoveModal.filename}
        foldername={copyMoveModal.targetFolderName}
        folders={foldersList}
        onCopy={handleConfirmCopy}
        onMove={handleConfirmMove}
        onCancel={() => setCopyMoveModal(prev => ({ ...prev, isOpen: false }))}
      />

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        filenamesString={deleteModal.filenamesString}
        onDelete={handleConfirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, fileIds: [], filenamesString: '' })}
      />

      <ToastContainer toasts={toasts} />

      <style dangerouslySetInnerHTML={{ __html: `
        .app-container {
          height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .workspace {
          flex: 1;
          overflow: hidden;
        }

        .h-full { height: 100%; }
        
        /* View Transition Animation */
        .view-transition-wrapper {
          animation: viewFadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes viewFadeIn {
          from { 
            opacity: 0; 
            transform: translateY(10px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        

        /* High-quality smooth transitions for preview toggle and sidebar auto-hide */
        .split-view-container > .split-view-view:first-child,
        div[class*="splitViewContainer"] > div[class*="splitViewView"]:first-child {
          transition: all 400ms cubic-bezier(0.4, 0, 0.2, 1) !important;
        }

        .workspace.is-resizing :where(.split-view-view, div[class*="splitViewView"], .sash) {
          transition: all 400ms cubic-bezier(0.4, 0, 0.2, 1) !important;
        }

        .blank-page {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-main);
        }
        .blank-content {
          text-align: center;
          padding: 40px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--glass-border);
        }
        .blank-content h2 {
          margin-bottom: 10px;
          font-weight: 600;
        }
        .blank-content p {
          color: var(--text-muted);
          font-size: 14px;
        }
      `}} />
    </div>
  );
}

export default App;
