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

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authView, setAuthView] = useState('login'); // 'login' or 'signup'
  const [activeView, setActiveView] = useState('home');
  const [isRepoExpanded, setIsRepoExpanded] = useState(true);
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  const [isResizing, setIsResizing] = useState(false);
  const [isSidebarMenuOpen, setIsSidebarMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  
  const [documents] = useState([
    { id: 1, folderId: 'thor', title: 'Thor - Resume.pdf', tags: 'hero', owner: 'Admin', dateModified: '19/04/2021 11:02', type: 'pdf', isPrivate: true, url: 'https://pdfobject.com/pdf/sample.pdf' },
    { id: 2, folderId: 'thor', title: 'Steve - Resume.pdf', tags: 'hero', owner: 'Admin', dateModified: '19/04/2021 11:02', type: 'pdf', url: '/api/proxy/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf' },
    { id: 3, folderId: 'marvel', title: 'Tony - Resume.docx', tags: 'hero', owner: 'Admin', dateModified: '19/04/2021 11:12', type: 'word', url: 'https://calibre-ebook.com/downloads/demos/demo.docx' },
    { id: 4, folderId: 'marvel', title: 'Bruce - Profile.jpg', tags: 'hero', owner: 'Admin', dateModified: '19/04/2021 11:12', type: 'image', url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRcB3htu1qaYdt1pFuoil_aMFr79tyLtmJU7A&s' },
    { id: 5, folderId: 'marvel', title: 'Hank - Data.xlsx', tags: 'hero', owner: 'Admin', dateModified: '19/04/2021 11:12', type: 'excel', url: 'https://go.microsoft.com/fwlink/?LinkID=521962' },
    { id: 6, folderId: 'regard', title: 'Generia - Documents.zip', tags: 'none', owner: 'Admin', dateModified: '19/04/2021 11:04', type: 'zip', url: 'https://www.learningcontainer.com/download/sample-zip-files/?wpdmdl=1637&refresh=6a32876639eed1781696358' },
    { id: 7, folderId: 'thor', title: 'Regart - Resume.pdf', tags: 'docc', owner: 'Admin', dateModified: '19/04/2021 11:45', type: 'pdf', url: 'https://www.adobe.com/support/products/enterprise/knowledgecenter/media/c4611_sample_explain.pdf' },
    { id: 8, folderId: 'regard', title: 'Notes - Readme.txt', tags: 'info', owner: 'Admin', dateModified: '20/04/2021 09:15', type: 'text', url: 'https://sample-files.com/downloads/documents/txt/long-doc.txt' },
  ]);

  const [selectedDocId, setSelectedDocId] = useState(null); // No default selection

  const activeDoc = documents.find(d => d.id === selectedDocId);
  const filteredDocs = documents.filter(d => d.folderId === selectedFolderId);

  const handleDocClick = (id) => {
    setSelectedDocId(selectedDocId === id ? null : id);
  };

  const handleFolderSelect = (folderId) => {
    setSelectedFolderId(folderId);
    setSelectedDocId(null);
  };

  const handleTogglePreview = () => {
    setIsResizing(true);
    setIsPreviewVisible(!isPreviewVisible);
    setTimeout(() => setIsResizing(false), 450);
  };

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

          {/* Repository & Properties Section - Only visible in repositories view */}
          {activeView === 'repositories' && isRepoExpanded && (
            <Allotment.Pane preferredSize={280} minSize={200} maxSize={500}>
              <div key={activeView} className="view-transition-wrapper h-full">
                <Allotment vertical>
                  <Allotment.Pane preferredSize="60%">
                    <Repository 
                      onCollapse={() => setIsRepoExpanded(false)} 
                      onFolderSelect={handleFolderSelect}
                      selectedFolderId={selectedFolderId}
                    />
                  </Allotment.Pane>
                  <Allotment.Pane>
                    <FileProperties data={activeDoc || {}} />
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
                      data={filteredDocs} 
                      selectedId={selectedDocId}
                      onDocClick={handleDocClick}
                      isPreviewVisible={isPreviewVisible} 
                      setIsPreviewVisible={handleTogglePreview}
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
