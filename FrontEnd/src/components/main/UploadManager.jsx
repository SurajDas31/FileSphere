import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, X, UploadCloud, CheckCircle2, AlertCircle, Minus, ChevronUp } from 'lucide-react';
import { config } from '../../config';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB per chunk

const UploadManager = ({ uploads, setUploads, onUploadComplete }) => {
  const [isOpen, setIsOpen] = useState(true);
  const activeTasks = useRef(new Map());
  
  // Mutable ref to instantly track paused uploads without waiting for React state cycles
  const pausedUploads = useRef(new Set());

  // Function to handle the actual chunking logic
  const processUpload = useCallback(async (upload) => {
    const { id, file, targetFolderId, uploadedChunks, totalChunks, uploadId } = upload;
    
    // Safety check
    if (upload.status === 'paused' || upload.status === 'completed' || upload.status === 'error') {
      return;
    }

    try {
      let currentChunk = uploadedChunks;
      
      while (currentChunk < totalChunks) {
        // Double check if pause was clicked during this loop using the mutable ref
        if (pausedUploads.current.has(id)) {
          return; // Exit loop immediately
        }

        const start = currentChunk * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('file', chunk);
        formData.append('uploadId', uploadId);
        formData.append('chunkIndex', currentChunk.toString());

        const res = await fetch('/api/files/chunk', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) throw new Error('Chunk upload failed');

        currentChunk++;
        
        // Update state to show progress visually
        setUploads(prev => prev.map(u => 
          u.id === id ? { ...u, uploadedChunks: currentChunk } : u
        ));
      }

      // All chunks uploaded, signal completion
      const completeRes = await fetch('/api/files/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId: uploadId,
          filename: file.name,
          folderId: targetFolderId,
          totalChunks: totalChunks,
          size: file.size
        })
      });

      if (!completeRes.ok) throw new Error('Completion failed');

      const completedFile = await completeRes.json();
      
      setUploads(prev => prev.map(u => 
        u.id === id ? { ...u, status: 'completed' } : u
      ));
      
      onUploadComplete(completedFile, targetFolderId);

    } catch (error) {
      console.error('Upload Error:', error);
      setUploads(prev => prev.map(u => 
        u.id === id ? { ...u, status: 'error', error: error.message } : u
      ));
    }
  }, [setUploads, onUploadComplete]);

  // Monitor the uploads array for items that need processing
  useEffect(() => {
    uploads.forEach(upload => {
      if (upload.status === 'uploading' && !activeTasks.current.has(upload.id)) {
        // Start processing and track it
        pausedUploads.current.delete(upload.id); // Ensure it's not marked paused
        const promise = processUpload(upload);
        activeTasks.current.set(upload.id, promise);
        
        // Cleanup tracking when done (success or error or pause)
        promise.finally(() => {
          activeTasks.current.delete(upload.id);
        });
      }
    });
  }, [uploads, processUpload]);

  const togglePause = (id) => {
    setUploads(prev => prev.map(u => {
      if (u.id === id) {
        const isCurrentlyUploading = u.status === 'uploading';
        
        // Immediately update the mutable ref for the chunking loop to catch
        if (isCurrentlyUploading) {
          pausedUploads.current.add(id);
        } else {
          pausedUploads.current.delete(id);
        }
        
        return { 
          ...u, 
          status: isCurrentlyUploading ? 'paused' : 'uploading' 
        };
      }
      return u;
    }));
  };

  const removeUpload = async (id) => {
    pausedUploads.current.add(id); // Stop any ongoing loop immediately

    // Attempt to cancel on backend to clear temp chunks
    const upload = uploads.find(u => u.id === id);
    if (upload && ['uploading', 'paused', 'error'].includes(upload.status)) {
      try {
        await fetch(`${config.API_BASE_URL}/api/files/cancel/${upload.uploadId}`, { method: 'DELETE' });
      } catch (err) {
        console.error("Failed to cancel upload on backend", err);
      }
    }

    setUploads(prev => prev.filter(u => u.id !== id));
  };

  if (uploads.length === 0) return null;

  return (
    <div className={`upload-manager ${isOpen ? 'open' : 'closed'}`}>
      <div className="upload-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="header-title">
          <UploadCloud size={16} />
          <span>Uploads ({uploads.filter(u => u.status === 'uploading').length} active)</span>
        </div>
        <div className="header-actions" onClick={(e) => e.stopPropagation()}>
          <button 
            className="minimize-manager-btn" 
            onClick={() => setIsOpen(!isOpen)}
            title={isOpen ? "Minimize" : "Expand"}
          >
            {isOpen ? <Minus size={16} /> : <ChevronUp size={16} />}
          </button>
          <button 
            className="close-manager-btn" 
            onClick={() => { 
              uploads.forEach(async u => {
                pausedUploads.current.add(u.id);
                if (['uploading', 'paused', 'error'].includes(u.status)) {
                  try {
                    await fetch(`${config.API_BASE_URL}/api/files/cancel/${u.uploadId}`, { method: 'DELETE' });
                  } catch { /* ignore */ }
                }
              });
              setUploads([]); 
            }}
            title="Cancel all and close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="upload-list">
          {uploads.map(upload => {
            const progress = Math.round((upload.uploadedChunks / upload.totalChunks) * 100) || 0;
            
            return (
              <div key={upload.id} className="upload-item">
                <div className="upload-item-header">
                  <span className="file-name" title={upload.file.name}>{upload.file.name}</span>
                  <div className="upload-actions">
                    {upload.status === 'uploading' || upload.status === 'paused' ? (
                      <button className="action-icon" onClick={() => togglePause(upload.id)}>
                        {upload.status === 'uploading' ? <Pause size={14} /> : <Play size={14} />}
                      </button>
                    ) : null}
                    <button className="action-icon" onClick={() => removeUpload(upload.id)}>
                      <X size={14} />
                    </button>
                  </div>
                </div>
                
                <div className="progress-container">
                  <div 
                    className={`progress-bar ${upload.status}`} 
                    style={{ width: `${progress}%` }}
                  />
                </div>
                
                <div className="upload-status-text">
                  {upload.status === 'uploading' && <span>Uploading {progress}%</span>}
                  {upload.status === 'paused' && <span>Paused</span>}
                  {upload.status === 'completed' && <span className="success"><CheckCircle2 size={12}/> Completed</span>}
                  {upload.status === 'error' && <span className="error"><AlertCircle size={12}/> Failed</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .upload-manager {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 320px;
          background: var(--solid-bg);
          backdrop-filter: blur(10px);
          border: 1px solid var(--glass-border);
          border-radius: 8px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          z-index: 9999;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: height 0.3s;
          color: var(--text-main);
        }
        .upload-manager.closed {
          height: 40px;
        }
        .upload-header {
          padding: 10px 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(0,0,0,0.2);
          cursor: pointer;
          height: 40px;
          border-bottom: 1px solid var(--glass-border);
        }
        .header-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-main);
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .minimize-manager-btn, .close-manager-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.7;
          transition: all 0.2s;
        }
        .minimize-manager-btn:hover, .close-manager-btn:hover { 
          opacity: 1; 
          color: var(--text-main); 
        }
        
        .upload-list {
          max-height: 300px;
          overflow-y: auto;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .upload-item {
          background: rgba(0,0,0,0.1);
          border-radius: 6px;
          padding: 10px;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .upload-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .file-name {
          font-size: 12px;
          color: var(--text-main);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 220px;
        }
        .upload-actions {
          display: flex;
          gap: 5px;
        }
        .action-icon {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 2px;
          border-radius: 4px;
        }
        .action-icon:hover {
          background: rgba(255,255,255,0.1);
          color: var(--text-main);
        }
        
        .progress-container {
          height: 4px;
          background: rgba(255,255,255,0.1);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 6px;
        }
        .progress-bar {
          height: 100%;
          transition: width 0.2s;
        }
        .progress-bar.uploading { background: var(--accent); }
        .progress-bar.paused { background: #f1c40f; }
        .progress-bar.completed { background: #2ecc71; }
        .progress-bar.error { background: #e74c3c; }
        
        .upload-status-text {
          font-size: 10px;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .upload-status-text .success { color: #2ecc71; }
        .upload-status-text .error { color: #e74c3c; }
      `}} />
    </div>
  );
};

export default UploadManager;
