import { useState } from 'react';
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

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authView, setAuthView] = useState('login');
  const [activeView, setActiveView] = useState('home');
  const [isRepoExpanded, setIsRepoExpanded] = useState(true);
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  const [isResizing, setIsResizing] = useState(false);
  const [isSidebarMenuOpen, setIsSidebarMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [selectedFolderData, setSelectedFolderData] = useState(null);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  
  const [uploads, setUploads] = useState([]);

  // Fetch files when a folder is selected
  const handleFolderSelect = async (folderId) => {
    setSelectedFolderId(folderId);
    setSelectedDocId(null);
    setSelectedFolderData(null);
    
    if (!folderId) {
      setDocuments([]);
      return;
    }

    // Fetch from real API
    setLoadingFiles(true);
    try {
      const res = await fetch(`${config.API_BASE_URL}/api/folders/${folderId}`);
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
          url: `${config.API_BASE_URL}/api/files/${f.id}/content`
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
        onLogin={() => setIsAuthenticated(true)} 
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
      <div className={`workspace ${isResizing ? 'is-resizing' : ''}`}>
        <Allotment>
          {/* Fixed Sidebar */}
          <Allotment.Pane preferredSize={70} minSize={70} maxSize={70}>
            <Sidebar 
              activeView={activeView}
              onViewChange={(view) => {
                if (view === 'settings') {
                  setIsSettingsOpen(true);
                } else {
                  setActiveView(view);
                  if (view === 'repositories') setIsRepoExpanded(true);
                }
              }} 
              onMenuToggle={(isOpen) => setIsSidebarMenuOpen(isOpen)}
              onLogout={() => setIsAuthenticated(false)}
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
                      onDocClick={handleDocClick}
                      isPreviewVisible={isPreviewVisible} 
                      setIsPreviewVisible={handleTogglePreview}
                      isLoading={loadingFiles}
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

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      
      <UploadManager 
        uploads={uploads} 
        setUploads={setUploads} 
        onUploadComplete={handleUploadComplete} 
      />

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
        
        /* THE FIX: Force Allotment internal containers to show overflowing menus */
        .workspace div[class*="splitView"] {
          overflow: visible !important;
        }
        .workspace div[class*="splitViewContainer"] {
          overflow: visible !important;
        }
        .workspace div[class*="splitViewView"] {
          overflow: visible !important;
        }

        /* Elevate the Sidebar pane's stacking context when a menu is open */
        .workspace div[class*="splitViewView"]:first-child {
          z-index: ${isSidebarMenuOpen ? '1000' : '1'} !important;
        }

        /* High-quality smooth transitions for preview toggle */
        .workspace.is-resizing :where(.allotment-pane, .allotment-pane-component, .sash) {
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
