import { useState, useEffect, useRef } from 'react';
import { Bell, FileText, Share2, Info, CheckCircle } from 'lucide-react';

const Notifications = ({ onViewAll }) => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef(null);

  const [notifications] = useState([
    { id: 1, type: 'file', message: 'Tony shared a new document with you', time: '2 mins ago', icon: <FileText size={14} />, color: '#3498db' },
    { id: 2, type: 'share', message: 'Bruce modified the workflow forms', time: '15 mins ago', icon: <Share2 size={14} />, color: '#9b59b6' },
    { id: 3, type: 'status', message: 'System update completed successfully', time: '1 hour ago', icon: <CheckCircle size={14} />, color: '#2ecc71' },
    { id: 4, type: 'info', message: 'New repository created: Project-X', time: '3 hours ago', icon: <Info size={14} />, color: '#f1c40f' },
  ]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    };

    if (isNotifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNotifOpen]);

  return (
    <div className="notif-wrapper" ref={notifRef}>
      <button className={`header-btn ${isNotifOpen ? 'active' : ''}`} onClick={() => setIsNotifOpen(!isNotifOpen)}>
        <Bell size={20} />
        {notifications.length > 0 && <span className="notif-badge">{notifications.length}</span>}
      </button>
      
      {isNotifOpen && (
        <div className="notif-menu solid-panel">
          <div className="notif-header">
            <span>Notifications</span>
            <button className="mark-read">Mark all as read</button>
          </div>
          <div className="notif-list">
            {notifications.map(n => (
              <div key={n.id} className="notif-item">
                <div className="notif-icon-circle" style={{ backgroundColor: n.color }}>
                  {n.icon}
                </div>
                <div className="notif-content">
                  <p className="notif-message">{n.message}</p>
                  <span className="notif-time">{n.time}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="notif-footer">
            <button onClick={() => {
              setIsNotifOpen(false);
              if (onViewAll) onViewAll();
            }}>
              View all notifications
            </button>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: `
        .notif-wrapper {
          position: relative;
        }
        .notif-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          background: #ff4b2b;
          color: white;
          font-size: 10px;
          font-weight: bold;
          min-width: 16px;
          height: 16px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
        }
        .notif-menu {
          position: absolute;
          top: calc(100% + 15px);
          right: 0;
          width: 320px;
          border-radius: 16px;
          z-index: 10001;
          animation: slideDownNotif 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
        }
        @keyframes slideDownNotif {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .notif-header {
          padding: 15px 20px;
          border-bottom: 1px solid rgba(0,0,0,0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 600;
          font-size: 14px;
        }
        body.dark-mode .notif-header {
          border-bottom-color: rgba(255,255,255,0.05);
        }
        .mark-read {
          background: none;
          border: none;
          color: var(--accent);
          font-size: 12px;
          cursor: pointer;
        }
        .notif-list {
          max-height: 350px;
          overflow-y: auto;
        }
        .notif-item {
          padding: 12px 20px;
          display: flex;
          gap: 15px;
          cursor: pointer;
          transition: background 0.2s;
          border-bottom: 1px solid rgba(0,0,0,0.03);
          text-align: left;
        }
        body.dark-mode .notif-item {
          border-bottom-color: rgba(255,255,255,0.03);
        }
        .notif-item:hover {
          background: rgba(0,0,0,0.02);
        }
        body.dark-mode .notif-item:hover {
          background: rgba(255,255,255,0.05);
        }
        .notif-icon-circle {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }
        .notif-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .notif-message {
          font-size: 13px;
          line-height: 1.4;
          margin: 0;
          white-space: normal;
        }
        .notif-time {
          font-size: 11px;
          color: var(--text-muted);
        }
        .notif-footer {
          padding: 12px;
          text-align: center;
          border-top: 1px solid rgba(0,0,0,0.05);
        }
        body.dark-mode .notif-footer {
          border-top-color: rgba(255,255,255,0.05);
        }
        .notif-footer button {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 12px;
          cursor: pointer;
          width: 100%;
          padding: 5px;
          transition: color 0.2s;
        }
        .notif-footer button:hover {
          color: var(--accent);
        }
      `}} />
    </div>
  );
};

export default Notifications;
