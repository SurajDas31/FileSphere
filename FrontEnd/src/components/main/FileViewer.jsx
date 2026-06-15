import React from 'react';
import { FileSearch } from 'lucide-react';

const FileViewer = ({ data }) => {
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

  return (
    <div className="document-viewer solid-panel">
      <div className="viewer-header">
        <span className="viewer-title">{data.title}</span>
        <div className={`doc-tag ${data.type}`}>{data.type.toUpperCase()}</div>
      </div>
      <div className="viewer-content">
        <div className="resume-paper">
          <div className="resume-text large">शीर्ष</div>
          <div className="resume-text medium">श्रीविनमुव</div>
          <div className="resume-text small">
            ओकारयत्रे<br/>
            नयगेग ववल<br/>
            नयतेम राव<br/>
            तब्बीन भोजाम |
          </div>
          <div className="resume-footer">
            Sample Name<br/>
            Contact Nam<br/>
            +91-911-225550312<br/>
            mmon@lp@gmail.com
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .document-viewer {
          height: 100%;
          display: flex;
          flex-direction: column;
          color: var(--text-main);
          border-left: 1px solid var(--glass-border);
          position: relative;
          z-index: 20; /* High z-index to stay above file list sticky header (z: 10) */
        }
        .viewer-header {
          padding: 15px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--glass-border);
          background: inherit;
        }
        .viewer-title {
          font-size: 16px;
          font-weight: 600;
        }
        .doc-tag {
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: bold;
          color: white;
        }
        .doc-tag.pdf { background: #e74c3c; }
        .doc-tag.word { background: #3498db; }
        .doc-tag.image { background: #f1c40f; }
        .doc-tag.excel { background: #2ecc71; }
        .doc-tag.zip { background: #9b59b6; }

        .viewer-content {
          flex: 1;
          padding: 30px;
          display: flex;
          justify-content: center;
          overflow-y: auto;
          background: rgba(0,0,0,0.02);
        }
        body.dark-mode .viewer-content {
          background: rgba(255,255,255,0.02);
        }
        .resume-paper {
          background: white;
          width: 100%;
          max-width: 400px;
          min-height: 500px;
          padding: 40px;
          color: #333;
          box-shadow: 0 10px 30px rgba(0,0,0,0.15);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .resume-text.large { font-size: 32px; font-weight: bold; }
        .resume-text.medium { font-size: 24px; }
        .resume-text.small { font-size: 16px; line-height: 1.6; }
        .resume-footer {
          margin-top: auto;
          font-size: 14px;
          line-height: 1.4;
        }
      `}} />
    </div>
  );
};

export default FileViewer;
