const ToastContainer = ({ toasts }) => {
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast-item ${toast.type} glass-panel`}>
          <div className="toast-icon">
            {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
          </div>
          <div className="toast-message">{toast.message}</div>
        </div>
      ))}
      <style dangerouslySetInnerHTML={{ __html: `
        .toast-container {
          position: fixed;
          bottom: 20px;
          right: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          z-index: 999999;
          pointer-events: none;
        }
        .toast-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 20px;
          border-radius: 12px;
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
          pointer-events: auto;
          animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          min-width: 250px;
          max-width: 400px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 13px;
          font-weight: 500;
          backdrop-filter: blur(15px);
          -webkit-backdrop-filter: blur(15px);
          border: 1px solid var(--glass-border);
        }
        .toast-item.success {
          background: rgba(46, 204, 113, 0.15);
          border-color: rgba(46, 204, 113, 0.3);
          color: #2ecc71;
        }
        .toast-item.error {
          background: rgba(231, 76, 60, 0.15);
          border-color: rgba(231, 76, 60, 0.3);
          color: #e74c3c;
        }
        .toast-item.info {
          background: rgba(52, 152, 219, 0.15);
          border-color: rgba(52, 152, 219, 0.3);
          color: #3498db;
        }
        body.dark-mode .toast-item.success {
          color: #2ecc71;
        }
        body.dark-mode .toast-item.error {
          color: #e74c3c;
        }
        body.dark-mode .toast-item.info {
          color: #3498db;
        }
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}} />
    </div>
  );
};

export default ToastContainer;
