import { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';

const ContextMenu = ({ x, y, options, onClose }) => {
  const menuRef = useRef(null);
  const [coords, setCoords] = useState({ x, y });
  const [isPositioned, setIsPositioned] = useState(false);

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const { innerWidth, innerHeight } = window;
      
      let finalX = x;
      let finalY = y;

      if (x + rect.width > innerWidth) {
        finalX = innerWidth - rect.width - 10;
      }
      if (y + rect.height > innerHeight) {
        finalY = innerHeight - rect.height - 10;
      }

      setCoords({ x: finalX, y: finalY });
      setIsPositioned(true);
    }
  }, [x, y]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('wheel', onClose);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('wheel', onClose);
    };
  }, [onClose]);

  const menuContent = (
    <div 
      ref={menuRef}
      className="context-menu glass-panel"
      style={{ 
        top: coords.y, 
        left: coords.x,
        visibility: isPositioned ? 'visible' : 'hidden' 
      }}
    >
      {options.map((option, index) => (
        <div 
          key={index} 
          className="context-menu-item"
          onClick={(e) => {
            e.stopPropagation();
            option.onClick();
            onClose();
          }}
        >
          {option.icon && <span className="menu-icon">{option.icon}</span>}
          <span className="menu-label">{option.label}</span>
        </div>
      ))}
      <style dangerouslySetInnerHTML={{ __html: `
        .context-menu {
          position: fixed;
          z-index: 10000;
          min-width: 160px;
          padding: 5px 0;
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
          animation: fadeIn 0.1s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .context-menu-item {
          padding: 8px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          font-size: 13px;
          color: var(--text-main);
          transition: background 0.1s;
        }
        .context-menu-item:hover {
          background: rgba(52, 152, 219, 0.25);
        }
        .menu-icon {
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.8;
        }
        .menu-label {
          flex: 1;
        }
      `}} />
    </div>
  );

  return ReactDOM.createPortal(menuContent, document.body);
};

export default ContextMenu;
