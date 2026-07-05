import React, { useState } from 'react';
import { RefreshCw, ServerCrash, AlertTriangle } from 'lucide-react';

const MaintenancePage = ({ onRetry }) => {
  const [isChecking, setIsChecking] = useState(false);

  const handleRetryClick = async () => {
    setIsChecking(true);
    // Add artificial delay to give premium feel
    setTimeout(async () => {
      if (onRetry) {
        await onRetry();
      }
      setIsChecking(false);
    }, 1200);
  };

  return (
    <div className="maintenance-wrapper">
      {/* Animated Floating Orbs for Premium Background */}
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>
      <div className="bg-orb orb-3"></div>

      <div className="maintenance-card glass-panel">
        <div className="animated-status-illustration">
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="serverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff416c" />
                <stop offset="100%" stopColor="#ff4b2b" />
              </linearGradient>
              <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6e8efb" stopOpacity="0" />
                <stop offset="50%" stopColor="#a777e3" stopOpacity="1" />
                <stop offset="100%" stopColor="#ff4b2b" stopOpacity="0" />
              </linearGradient>
              <filter id="cardGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Server Rack SVG with pulsers */}
            <rect x="25" y="20" width="70" height="80" rx="6" stroke="url(#serverGrad)" strokeWidth="2" fill="rgba(255, 255, 255, 0.03)" filter="url(#cardGlow)" />
            
            {/* Rack Slots */}
            <rect x="35" y="32" width="50" height="10" rx="2" fill="rgba(255, 255, 255, 0.08)" stroke="rgba(255,255,255,0.15)" />
            <rect x="35" y="52" width="50" height="10" rx="2" fill="rgba(255, 255, 255, 0.08)" stroke="rgba(255,255,255,0.15)" />
            <rect x="35" y="72" width="50" height="10" rx="2" fill="rgba(255, 255, 255, 0.08)" stroke="rgba(255,255,255,0.15)" />

            {/* Lights blinking */}
            <circle cx="43" cy="37" r="2" fill="#2ecc71" className="led-blink-fast" />
            <circle cx="51" cy="37" r="2" fill="#2ecc71" className="led-blink-slow" />
            
            <circle cx="43" cy="57" r="2" fill="#e74c3c" className="led-static-red" />
            <circle cx="51" cy="57" r="2" fill="#95a5a6" />

            <circle cx="43" cy="77" r="2" fill="#f1c40f" className="led-blink-medium" />
            <circle cx="51" cy="77" r="2" fill="#95a5a6" />

            {/* Warning pulse overlay */}
            <circle cx="82" cy="57" r="6" fill="#ff4b2b" fillOpacity="0.4" className="led-pulse-ring" />
            <circle cx="82" cy="57" r="3" fill="#ff4b2b" />
            <path d="M82 54.5V57.5M82 59.5H82.01" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </div>

        <h1 className="error-title">Connection Lost</h1>
        <p className="error-message">
          The page you are looking for under maintenance or other error occured. Pls try again after sometimes.
        </p>

        <button 
          className={`retry-btn ${isChecking ? 'checking' : ''}`} 
          onClick={handleRetryClick}
          disabled={isChecking}
        >
          {isChecking ? (
            <>
              <RefreshCw className="spinner-icon" size={18} />
              <span>Verifying Connection...</span>
            </>
          ) : (
            <>
              <RefreshCw size={18} />
              <span>Try Again</span>
            </>
          )}
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .maintenance-wrapper {
          height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0f1016;
          position: fixed;
          top: 0;
          left: 0;
          z-index: 99999;
          overflow: hidden;
          font-family: 'Outfit', 'Inter', -apple-system, sans-serif;
          color: #ffffff;
        }

        /* Floating background orbs */
        .bg-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.15;
          mix-blend-mode: screen;
          pointer-events: none;
        }
        .orb-1 {
          width: 400px;
          height: 400px;
          background: #6e8efb;
          top: -100px;
          left: -100px;
          animation: floatOrb 12s infinite alternate ease-in-out;
        }
        .orb-2 {
          width: 500px;
          height: 500px;
          background: #ff4b2b;
          bottom: -150px;
          right: -150px;
          animation: floatOrb 16s infinite alternate-reverse ease-in-out;
        }
        .orb-3 {
          width: 300px;
          height: 300px;
          background: #a777e3;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: floatOrb 20s infinite alternate ease-in-out;
        }

        @keyframes floatOrb {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(40px, 40px) scale(1.15); }
        }

        /* Glassmorphic Error Card */
        .maintenance-card {
          width: 90%;
          max-width: 460px;
          padding: 40px 30px;
          text-align: center;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 24px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
          animation: cardEntry 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 10;
        }

        @keyframes cardEntry {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* SVG Micro-animations */
        .led-blink-fast {
          animation: blink 0.5s infinite alternate ease-in-out;
        }
        .led-blink-medium {
          animation: blink 0.8s infinite alternate ease-in-out;
        }
        .led-blink-slow {
          animation: blink 1.5s infinite alternate ease-in-out;
        }
        .led-pulse-ring {
          animation: pulseRing 2s infinite ease-out;
          transform-origin: 82px 57px;
        }

        @keyframes blink {
          0% { opacity: 0.2; }
          100% { opacity: 1; }
        }
        @keyframes pulseRing {
          0% { transform: scale(0.6); opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }

        .error-title {
          font-size: 24px;
          font-weight: 700;
          margin-top: 20px;
          margin-bottom: 12px;
          background: linear-gradient(135deg, #ffffff 0%, #a5a9c0 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .error-message {
          font-size: 14px;
          color: #a0aec0;
          line-height: 1.6;
          margin-bottom: 30px;
          font-weight: 400;
        }

        /* Modern Action Button */
        .retry-btn {
          width: 100%;
          padding: 14px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, #6e8efb 0%, #a777e3 100%);
          color: white;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 8px 20px rgba(110, 142, 251, 0.3);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .retry-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 25px rgba(110, 142, 251, 0.45);
          filter: brightness(1.05);
        }

        .retry-btn:active {
          transform: translateY(0);
        }

        .retry-btn.checking {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.6);
          box-shadow: none;
          cursor: not-allowed;
        }

        .spinner-icon {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
};

export default MaintenancePage;
