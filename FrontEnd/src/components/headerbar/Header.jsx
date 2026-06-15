import React, { useState, useEffect } from 'react';
import { Search, Moon, Sun, LogOut } from 'lucide-react';
import Notifications from './Notifications';

const Header = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleDarkMode = () => {
    const newValue = !isDarkMode;
    setIsDarkMode(newValue);
    if (newValue) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  };

  useEffect(() => {
    if (document.body.classList.contains('dark-mode')) {
      setIsDarkMode(true);
    }
  }, []);

  return (
    <div className="header glass-panel">
      <div className="header-left">
        <div className="logo-container">
          <div className="logo-icon">
            <svg width="34" height="34" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="sphereGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6e8efb" />
                  <stop offset="50%" stopColor="#a777e3" />
                  <stop offset="100%" stopColor="#ff4b2b" />
                </linearGradient>
                <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="1" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <circle cx="16" cy="16" r="15" stroke="url(#sphereGrad)" strokeWidth="0.5" strokeOpacity="0.5" className="animate-pulse-ring" />
              <circle cx="16" cy="16" r="13" fill="url(#sphereGrad)" fillOpacity="0.2" />
              <circle cx="16" cy="16" r="13" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" />
              <g className="animate-float">
                <path 
                  d="M11 11C11 10.4477 11.4477 10 12 10H17.5L21 13.5V21C21 21.5523 20.5523 22 20 22H12C11.4477 22 11 21.5523 11 21V11Z" 
                  fill="currentColor" 
                  fillOpacity="0.3" 
                  stroke="currentColor" 
                  strokeWidth="1.2" 
                  filter="url(#logoGlow)"
                />
                <path d="M17.5 10V13.5H21" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </g>
              <g className="animate-orbit">
                <path 
                  d="M5 16C5 9.92487 9.92487 5 16 5" 
                  stroke="currentColor" 
                  strokeOpacity="0.6" 
                  strokeWidth="1.5" 
                  strokeLinecap="round"
                />
                <circle cx="5" cy="16" r="1.5" fill="currentColor" />
              </g>
            </svg>
          </div>
          <span className="logo-text">FileSphere</span>
        </div>
      </div>
      
      <div className="header-center">
        <div className="search-bar">
          <Search size={18} className="search-icon" />
          <input type="text" placeholder="Search ..." />
        </div>
      </div>

      <div className="header-right">
        <Notifications />

        <button className="header-btn" onClick={toggleDarkMode} title={isDarkMode ? "Light Mode" : "Dark Mode"}>
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulseLogo {
          0% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.05); opacity: 0.8; }
          100% { transform: scale(1); opacity: 0.5; }
        }
        @keyframes orbitLogo {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes floatLogo {
          0% { transform: translateY(0); }
          50% { transform: translateY(-1.5px); }
          100% { transform: translateY(0); }
        }
        .animate-pulse-ring {
          animation: pulseLogo 4s infinite ease-in-out;
          transform-origin: center;
        }
        .animate-orbit {
          animation: orbitLogo 12s infinite linear;
          transform-origin: center;
        }
        .animate-float {
          animation: floatLogo 3s infinite ease-in-out;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 20px;
          height: 60px;
          border-bottom: 1px solid var(--glass-border);
          color: var(--text-main);
          z-index: 1000;
        }
        .header-left {
          flex: 1;
        }
        .logo-container {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 20px;
          font-weight: 600;
        }
        .header-center {
          flex: 2;
          display: flex;
          justify-content: center;
        }
        .search-bar {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 8px;
          display: flex;
          align-items: center;
          padding: 8px 15px;
          width: 100%;
          max-width: 500px;
          border: 1px solid var(--glass-border);
        }
        body.dark-mode .search-bar {
          background: rgba(255, 255, 255, 0.1);
        }
        .search-bar input {
          background: none;
          border: none;
          color: var(--text-main);
          margin-left: 10px;
          width: 100%;
          outline: none;
          font-size: 14px;
        }
        .search-bar input::placeholder {
          color: var(--text-muted);
        }
        .search-icon {
          color: var(--text-muted);
        }
        .header-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 15px;
        }
        .header-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 5px;
          transition: all 0.2s;
          position: relative;
        }
        .header-btn:hover, .header-btn.active {
          color: var(--text-main);
          transform: scale(1.1);
        }
        .solid-panel {
          background: #ffffff;
          border: 1px solid #e0e0e0;
          color: #1a1a1a;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        }
        body.dark-mode .solid-panel {
          background: #1e1e1e;
          border: 1px solid #333333;
          color: #ffffff;
        }
      `}} />
    </div>
  );
};

export default Header;
