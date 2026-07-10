import React from 'react';

// Common SVG filters and styles for modern neon glow/glassmorphism
const IconDefs = () => (
  <svg width="0" height="0" style={{ position: 'absolute' }}>
    <defs>
      <linearGradient id="folderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4facfe" />
        <stop offset="100%" stopColor="#00f2fe" />
      </linearGradient>
      <linearGradient id="rootGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6e8efb" />
        <stop offset="50%" stopColor="#a777e3" />
        <stop offset="100%" stopColor="#ff4b2b" />
      </linearGradient>
      <linearGradient id="pdfGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ff416c" />
        <stop offset="100%" stopColor="#ff4b2b" />
      </linearGradient>
      <linearGradient id="wordGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#2193b0" />
        <stop offset="100%" stopColor="#6dd5ed" />
      </linearGradient>
      <linearGradient id="excelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#11998e" />
        <stop offset="100%" stopColor="#38ef7d" />
      </linearGradient>
      <linearGradient id="imageGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#da22ff" />
        <stop offset="100%" stopColor="#9733ee" />
      </linearGradient>
      <linearGradient id="videoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f857a6" />
        <stop offset="100%" stopColor="#ff5858" />
      </linearGradient>
      <linearGradient id="zipGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f4c4f3" />
        <stop offset="100%" stopColor="#fc67fa" />
      </linearGradient>
      <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#757f9a" />
        <stop offset="100%" stopColor="#d7dde8" />
      </linearGradient>
      <linearGradient id="htmlGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#13e0db" />
        <stop offset="100%" stopColor="#08a09b" />
      </linearGradient>
      <linearGradient id="threeDGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#bf55ec" />
        <stop offset="100%" stopColor="#8e44ad" />
      </linearGradient>
      <linearGradient id="unknownGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#e65c00" />
        <stop offset="100%" stopColor="#F9D423" />
      </linearGradient>
      <filter id="glowFilter" x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur stdDeviation="1" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
  </svg>
);

export const AnimatedRootIcon = ({ size = 20 }) => (
  <span className="animated-icon-wrapper root-icon-anim">
    <IconDefs />
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="18" height="18" rx="3" stroke="url(#rootGrad)" strokeWidth="1.5" fill="url(#rootGrad)" fillOpacity="0.1" />
      <line x1="7" y1="8" x2="17" y2="8" stroke="url(#rootGrad)" strokeWidth="1.5" className="root-line-1" />
      <line x1="7" y1="12" x2="17" y2="12" stroke="url(#rootGrad)" strokeWidth="1.5" className="root-line-2" />
      <line x1="7" y1="16" x2="17" y2="16" stroke="url(#rootGrad)" strokeWidth="1.5" className="root-line-3" />
      <circle cx="16" cy="8" r="1" fill="url(#rootGrad)" />
      <circle cx="16" cy="12" r="1" fill="url(#rootGrad)" />
      <circle cx="16" cy="16" r="1" fill="url(#rootGrad)" />
    </svg>
    <style dangerouslySetInnerHTML={{ __html: `
      .root-icon-anim svg {
        transition: transform 0.3s ease;
      }
      .root-icon-anim:hover svg {
        transform: translateY(-2px);
      }
      .root-line-1, .root-line-2, .root-line-3 {
        transition: transform 0.3s ease, opacity 0.3s ease;
      }
      .root-icon-anim:hover .root-line-1 { transform: translateX(2px); }
      .root-icon-anim:hover .root-line-2 { transform: translateX(-1px); }
      .root-icon-anim:hover .root-line-3 { transform: translateX(1.5px); }
    `}} />
  </span>
);

export const AnimatedFolderIcon = ({ size = 20, active = false }) => (
  <span className={`animated-icon-wrapper folder-icon-anim ${active ? 'active' : ''}`}>
    <IconDefs />
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path 
        d="M3 7C3 5.89543 3.89543 5 5 7H9.5L11.5 9H19C20.1046 9 21 9.89543 21 11V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V7Z" 
        fill="url(#folderGrad)" 
        fillOpacity={active ? "0.35" : "0.15"} 
        stroke="url(#folderGrad)" 
        strokeWidth="1.5" 
      />
      <path 
        d="M3 10.5C3 9.94772 3.44772 9.5 4 9.5H20C20.5523 9.5 21 9.94772 21 10.5V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V10.5Z" 
        fill="url(#folderGrad)" 
        fillOpacity={active ? "0.45" : "0.25"} 
        stroke="url(#folderGrad)" 
        strokeWidth="1.2" 
        className="folder-front-flap" 
      />
    </svg>
    <style dangerouslySetInnerHTML={{ __html: `
      .folder-icon-anim svg {
        transition: transform 0.3s ease;
      }
      .folder-front-flap {
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), fill-opacity 0.3s ease;
        transform-origin: 3px 20px;
      }
      .folder-icon-anim:hover .folder-front-flap {
        transform: skewX(-6deg) scaleY(0.92);
        fill-opacity: 0.45;
      }
      .folder-icon-anim:hover svg {
        transform: scale(1.08);
      }
    `}} />
  </span>
);

export const AnimatedFileIcon = ({ size = 20 }) => (
  <span className="animated-icon-wrapper file-icon-anim">
    <IconDefs />
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V9L13 2Z" stroke="#757f9a" strokeWidth="1.5" fill="#757f9a" fillOpacity="0.1" />
      <path d="M13 2V9H20" stroke="#757f9a" strokeWidth="1.5" />
      <line x1="8" y1="13" x2="16" y2="13" stroke="#757f9a" strokeWidth="1.5" strokeLinecap="round" className="file-line-1" />
      <line x1="8" y1="16" x2="14" y2="16" stroke="#757f9a" strokeWidth="1.5" strokeLinecap="round" className="file-line-2" />
    </svg>
    <style dangerouslySetInnerHTML={{ __html: `
      .file-icon-anim svg {
        transition: transform 0.3s ease;
      }
      .file-icon-anim:hover svg {
        transform: translateY(-2px);
      }
      .file-line-1, .file-line-2 {
        transition: transform 0.3s ease;
      }
      .file-icon-anim:hover .file-line-1 { transform: translateX(2px); }
      .file-icon-anim:hover .file-line-2 { transform: translateX(1px); }
    `}} />
  </span>
);

export const AnimatedDocIcon = ({ type = 'unknown', size = 24 }) => {
  const getGradient = (t) => {
    switch (t) {
      case 'pdf': return 'url(#pdfGrad)';
      case 'word': return 'url(#wordGrad)';
      case 'excel': return 'url(#excelGrad)';
      case 'image': return 'url(#imageGrad)';
      case 'video': return 'url(#videoGrad)';
      case 'zip': return 'url(#zipGrad)';
      case 'text': return 'url(#textGrad)';
      case 'html': return 'url(#htmlGrad)';
      case '3d': return 'url(#threeDGrad)';
      default: return 'url(#unknownGrad)';
    }
  };

  const getLabel = (t) => {
    return t.toUpperCase();
  };

  return (
    <span className={`animated-doc-icon-container doc-icon-anim-${type}`} title={getLabel(type)}>
      <IconDefs />
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="doc-svg">
        {/* Document base card */}
        <path 
          d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" 
          fill={getGradient(type)} 
          fillOpacity="0.1" 
          stroke={getGradient(type)} 
          strokeWidth="1.5" 
        />
        {/* Folded paper corner */}
        <path d="M14 2V8H20" stroke={getGradient(type)} strokeWidth="1.5" strokeLinejoin="round" />

        {/* Custom decorations per document type */}
        {type === 'pdf' && (
          <g className="pdf-decor">
            {/* Draw a tiny PDF badge or red line */}
            <rect x="7" y="12" width="10" height="6" rx="1" fill={getGradient(type)} fillOpacity="0.3" />
            <line x1="9" y1="15" x2="15" y2="15" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          </g>
        )}

        {type === 'word' && (
          <g className="word-decor">
            {/* Horizontal lines simulating text pages */}
            <line x1="8" y1="12" x2="16" y2="12" stroke={getGradient(type)} strokeWidth="1.5" strokeLinecap="round" className="w-line-1" />
            <line x1="8" y1="15" x2="14" y2="15" stroke={getGradient(type)} strokeWidth="1.5" strokeLinecap="round" className="w-line-2" />
            <line x1="8" y1="18" x2="16" y2="18" stroke={getGradient(type)} strokeWidth="1.5" strokeLinecap="round" className="w-line-3" />
          </g>
        )}

        {type === 'excel' && (
          <g className="excel-decor">
            {/* Mini grid representing spreadsheets */}
            <rect x="7" y="12" width="10" height="7" rx="1" stroke={getGradient(type)} strokeWidth="1" fill={getGradient(type)} fillOpacity="0.05" />
            <line x1="12" y1="12" x2="12" y2="19" stroke={getGradient(type)} strokeWidth="1" className="e-grid" />
            <line x1="7" y1="15" x2="17" y2="15" stroke={getGradient(type)} strokeWidth="1" className="e-grid" />
          </g>
        )}

        {type === 'image' && (
          <g className="image-decor">
            {/* Landscape sun & mountains */}
            <circle cx="15" cy="13" r="1.5" fill={getGradient(type)} className="i-sun" />
            <path d="M7 19L11 14L14 17L17 13L17 19H7Z" fill={getGradient(type)} fillOpacity="0.3" className="i-mountain" />
          </g>
        )}

        {type === 'video' && (
          <g className="video-decor">
            {/* Miniature play button */}
            <polygon points="10,12 10,18 15,15" fill={getGradient(type)} className="v-play" />
          </g>
        )}

        {type === 'zip' && (
          <g className="zip-decor">
            {/* Zipper lines */}
            <line x1="12" y1="11" x2="12" y2="19" stroke={getGradient(type)} strokeWidth="1.5" strokeDasharray="2,2" className="z-zipper" />
            <rect x="10" y="13" width="4" height="3" rx="0.5" fill={getGradient(type)} className="z-zipper-pull" />
          </g>
        )}

        {type === 'text' && (
          <g className="text-decor">
            <line x1="8" y1="13" x2="16" y2="13" stroke={getGradient(type)} strokeWidth="1" className="t-line-1" />
            <line x1="8" y1="16" x2="13" y2="16" stroke={getGradient(type)} strokeWidth="1" className="t-line-2" />
          </g>
        )}

        {type === 'html' && (
          <g className="html-decor">
            {/* Drawing tag brackets < > */}
            <path d="M8 13L6 15L8 17" stroke={getGradient(type)} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="h-left" />
            <path d="M16 13L18 15L16 17" stroke={getGradient(type)} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="h-right" />
          </g>
        )}

        {type === '3d' && (
          <g className="threed-decor">
            {/* Top face */}
            <path d="M12 11L16 9L12 7L8 9L12 11Z" fill={getGradient(type)} fillOpacity="0.4" stroke={getGradient(type)} strokeWidth="1" />
            {/* Left face */}
            <path d="M8 9V14L12 16V11L8 9Z" fill={getGradient(type)} fillOpacity="0.25" stroke={getGradient(type)} strokeWidth="1" />
            {/* Right face */}
            <path d="M12 11V16L16 14V9L12 11Z" fill={getGradient(type)} fillOpacity="0.5" stroke={getGradient(type)} strokeWidth="1" />
          </g>
        )}

        {type === 'unknown' && (
          <g className="unknown-decor">
            {/* Spinning question mark */}
            <circle cx="12" cy="15" r="1.5" fill={getGradient(type)} />
            <path d="M10.5 12C10.5 11 11.5 10 12.5 10C13.5 10 14.5 11 14.5 12C14.5 13 13.5 13.5 13 14" stroke={getGradient(type)} strokeWidth="1.2" strokeLinecap="round" className="u-question" />
          </g>
        )}
      </svg>
      <span className="doc-icon-label">{getLabel(type)}</span>

      <style dangerouslySetInnerHTML={{ __html: `
        .animated-doc-icon-container {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 2px 6px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .doc-svg {
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .doc-icon-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.5px;
          opacity: 0.7;
          transition: opacity 0.3s ease;
        }

        /* Hover general animations */
        .animated-doc-icon-container:hover {
          transform: translateY(-1.5px);
          border-color: rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.06);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .animated-doc-icon-container:hover .doc-svg {
          transform: scale(1.08);
        }
        .animated-doc-icon-container:hover .doc-icon-label {
          opacity: 1;
        }

        /* Specific item micro-animations */
        /* PDF: page entry */
        .pdf-decor {
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .animated-doc-icon-container:hover .pdf-decor {
          transform: translateY(-0.5px) scale(1.02);
        }
        
        /* Word: swipe transitions */
        .w-line-1, .w-line-2, .w-line-3 {
          transition: transform 0.3s ease, stroke-width 0.3s ease;
        }
        .animated-doc-icon-container:hover .w-line-1 { transform: translateX(1px); }
        .animated-doc-icon-container:hover .w-line-2 { transform: translateX(2px); }
        .animated-doc-icon-container:hover .w-line-3 { transform: translateX(1.5px); }

        /* Excel: cell grid border blinks */
        .e-grid {
          transition: opacity 0.3s ease;
        }
        .animated-doc-icon-container:hover .e-grid {
          animation: excelBlink 1s infinite alternate;
        }
        @keyframes excelBlink {
          0% { opacity: 0.4; }
          100% { opacity: 1; }
        }

        /* Image: floating sun */
        .i-sun {
          transition: transform 0.4s ease;
        }
        .animated-doc-icon-container:hover .i-sun {
          transform: translateY(-1.5px);
        }

        /* Video: pulsing play scale */
        .v-play {
          transform-origin: 12px 15px;
          transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .animated-doc-icon-container:hover .v-play {
          transform: scale(1.15);
        }

        /* Zip: zipper slider movement */
        .z-zipper-pull {
          transition: transform 0.4s ease;
        }
        .animated-doc-icon-container:hover .z-zipper-pull {
          transform: translateY(2px);
        }

        /* HTML: tag spacing */
        .h-left, .h-right {
          transition: transform 0.3s ease;
        }
        .animated-doc-icon-container:hover .h-left { transform: translateX(-1px); }
        .animated-doc-icon-container:hover .h-right { transform: translateX(1px); }
      `}} />
    </span>
  );
};
