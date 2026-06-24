import { useState } from 'react';
import { X, Settings, User, Bell, Shield, Database, Monitor, Globe, HelpCircle } from 'lucide-react';

const SettingsModal = ({ isOpen, onClose }) => {
  const [isGlassmorphism, setIsGlassmorphism] = useState(() => 
    localStorage.getItem('ui_glassmorphism') !== 'false'
  );

  const handleGlassmorphismToggle = () => {
    const newValue = !isGlassmorphism;
    setIsGlassmorphism(newValue);
    localStorage.setItem('ui_glassmorphism', newValue.toString());
    if (newValue) {
      document.body.classList.add('glassmorphic-ui');
    } else {
      document.body.classList.remove('glassmorphic-ui');
    }
  };

  if (!isOpen) return null;

  const categories = [
    { id: 'general', label: 'General', icon: <Monitor size={18} /> },
    { id: 'profile', label: 'Account', icon: <User size={18} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
    { id: 'security', label: 'Security & Privacy', icon: <Shield size={18} /> },
    { id: 'storage', label: 'Storage', icon: <Database size={18} /> },
    { id: 'language', label: 'Language', icon: <Globe size={18} /> },
    { id: 'help', label: 'Help & Support', icon: <HelpCircle size={18} /> },
  ];

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-container solid-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-sidebar">
          <div className="settings-nav-header">
            <Settings size={20} />
            <span>Settings</span>
          </div>
          <div className="settings-nav-list">
            {categories.map(cat => (
              <div key={cat.id} className={`settings-nav-item ${cat.id === 'general' ? 'active' : ''}`}>
                {cat.icon}
                <span>{cat.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="settings-main">
          <div className="settings-content-header">
            <h2>General Settings</h2>
            <button className="close-settings" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
          <div className="settings-scroll-area">
            <section className="settings-section">
              <h3>Appearance</h3>
              <div className="settings-option">
                <div>
                  <label>Interface Theme</label>
                  <p>Choose how FileSphere looks to you.</p>
                </div>
                <select className="settings-select">
                  <option>System Default</option>
                  <option>Light</option>
                  <option>Dark</option>
                </select>
              </div>
              <div className="settings-option">
                <div>
                  <label>Glassmorphism Effect</label>
                  <p>Enable frosted glass panels and background blur.</p>
                </div>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={isGlassmorphism} 
                    onChange={handleGlassmorphismToggle}
                  />
                  <span className="slider round"></span>
                </label>
              </div>
              <div className="settings-option">
                <div>
                  <label>Accent Color</label>
                  <p>Select your preferred highlight color.</p>
                </div>
                <div className="color-presets">
                  <div className="color-dot blue active"></div>
                  <div className="color-dot purple"></div>
                  <div className="color-dot green"></div>
                  <div className="color-dot red"></div>
                </div>
              </div>
            </section>


            <section className="settings-section">
              <h3>Workspace</h3>
              <div className="settings-option">
                <div>
                  <label>Sidebar Density</label>
                  <p>Adjust the spacing between navigation icons.</p>
                </div>
                <select className="settings-select">
                  <option>Compact</option>
                  <option>Default</option>
                  <option>Relaxed</option>
                </select>
              </div>
              <div className="settings-option">
                <div>
                  <label>Auto-hide Sidebar</label>
                  <p>Automatically collapse the sidebar when not in use.</p>
                </div>
                <input type="checkbox" className="settings-toggle" />
              </div>
            </section>

            <section className="settings-section">
              <h3>System</h3>
              <div className="settings-option">
                <div>
                  <label>Hardware Acceleration</label>
                  <p>Enable for smoother animations and UI transitions.</p>
                </div>
                <input type="checkbox" defaultChecked className="settings-toggle" />
              </div>
            </section>
          </div>
          <div className="settings-content-footer">
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={onClose}>Save Changes</button>
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .settings-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(8px);
          z-index: 100000;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .settings-container {
          width: 90%;
          height: 90%;
          border-radius: 24px;
          display: flex;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes scaleUp {
          from { transform: scale(0.9) translateY(20px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
        
        /* Sidebar */
        .settings-sidebar {
          width: 280px;
          border-right: 1px solid rgba(0, 0, 0, 0.05);
          background: rgba(0, 0, 0, 0.02);
          display: flex;
          flex-direction: column;
          padding: 20px 0;
        }
        body.dark-mode .settings-sidebar {
          background: rgba(255, 255, 255, 0.02);
          border-right-color: rgba(255, 255, 255, 0.05);
        }
        .settings-nav-header {
          padding: 0 25px 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 700;
          font-size: 18px;
          color: var(--text-main);
        }
        .settings-nav-list {
          flex: 1;
        }
        .settings-nav-item {
          padding: 12px 25px;
          display: flex;
          align-items: center;
          gap: 15px;
          cursor: pointer;
          transition: all 0.2s;
          color: var(--text-muted);
          font-size: 14px;
          font-weight: 500;
        }
        .settings-nav-item:hover {
          background: rgba(0, 0, 0, 0.05);
          color: var(--text-main);
        }
        body.dark-mode .settings-nav-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .settings-nav-item.active {
          color: var(--accent);
          background: rgba(52, 152, 219, 0.1);
          border-right: 3px solid var(--accent);
        }

        /* Main Content */
        .settings-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: transparent;
        }
        .settings-content-header {
          padding: 25px 40px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .settings-content-header h2 {
          font-size: 24px;
          font-weight: 700;
        }
        .close-settings {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          transition: background 0.2s;
        }
        .close-settings:hover {
          background: rgba(0, 0, 0, 0.05);
          color: var(--text-main);
        }
        body.dark-mode .close-settings:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .settings-scroll-area {
          flex: 1;
          overflow-y: auto;
          padding: 0 40px 40px;
        }
        .settings-section {
          margin-bottom: 40px;
        }
        .settings-section h3 {
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-muted);
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }
        body.dark-mode .settings-section h3 {
          border-bottom-color: rgba(255, 255, 255, 0.05);
        }

        .settings-option {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
        }
        .settings-option label {
          display: block;
          font-weight: 600;
          font-size: 15px;
          margin-bottom: 4px;
        }
        .settings-option p {
          font-size: 13px;
          color: var(--text-muted);
        }

        .settings-select {
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid var(--glass-border);
          background: rgba(255, 255, 255, 0.1);
          color: var(--text-main);
          outline: none;
          min-width: 150px;
          cursor: pointer;
        }
        body.dark-mode .settings-select {
          background: rgba(0, 0, 0, 0.25);
        }
        .settings-select option {
          background: var(--solid-bg-fallback, #ffffff);
          color: var(--text-main, #1a1a1a);
        }

        .color-presets {
          display: flex;
          gap: 10px;
        }
        .color-dot {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid transparent;
          transition: transform 0.2s;
        }
        .color-dot:hover { transform: scale(1.2); }
        .color-dot.active { border-color: var(--text-main); }
        .color-dot.blue { background: #3498db; }
        .color-dot.purple { background: #9b59b6; }
        .color-dot.green { background: #2ecc71; }
        .color-dot.red { background: #e74c3c; }

        .settings-content-footer {
          padding: 25px 40px;
          border-top: 1px solid rgba(0, 0, 0, 0.05);
          display: flex;
          justify-content: flex-end;
          gap: 15px;
        }
        body.dark-mode .settings-content-footer {
          border-top-color: rgba(255, 255, 255, 0.05);
        }

        .btn-primary {
          background: var(--accent);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-secondary {
          background: none;
          border: 1px solid var(--glass-border);
          color: var(--text-main);
          padding: 10px 20px;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
        }

        /* Switch Toggler Style */
        .switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
          flex-shrink: 0;
        }
        .switch input { 
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0,0,0,0.1);
          transition: .3s;
          border: 1px solid var(--glass-border);
        }
        body.dark-mode .slider {
          background-color: rgba(255,255,255,0.1);
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 3px;
          bottom: 2px;
          background-color: var(--text-main);
          transition: .3s;
        }
        .switch input:checked + .slider {
          background-color: var(--accent);
        }
        .switch input:checked + .slider:before {
          transform: translateX(20px);
          background-color: white;
        }
        .slider.round {
          border-radius: 24px;
        }
        .slider.round:before {
          border-radius: 50%;
        }
      `}} />
    </div>
  );
};

export default SettingsModal;
