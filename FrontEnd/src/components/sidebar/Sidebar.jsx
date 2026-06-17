import { useState, useEffect, useRef } from 'react';
import { 
  Home, Database, Users, Pin, Clock, Settings, 
  LayoutGrid, User, UserCircle, LogOut,
  Mail, Calendar, MessageSquare, GitBranch, ClipboardList
} from 'lucide-react';

const Sidebar = ({ activeView, onViewChange, onMenuToggle, onLogout }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAppsOpen, setIsAppsOpen] = useState(false);
  const [hasImageError, setHasImageError] = useState(false);
  const profileRef = useRef(null);
  const appsRef = useRef(null);

  const user = {
    name: 'Admin',
    image: 'https://via.placeholder.com/32',
  };

  const apps = [
    { id: 'workflow', label: 'Workflow', icon: <GitBranch size={20} />, color: '#6e8efb' },
    { id: 'forms', label: 'Forms', icon: <ClipboardList size={20} />, color: '#ff4b2b' },
    { id: 'mail', label: 'Mail', icon: <Mail size={20} />, color: '#e74c3c' },
    { id: 'calendar', label: 'Calendar', icon: <Calendar size={20} />, color: '#2ecc71' },
    { id: 'chat', label: 'Chat', icon: <MessageSquare size={20} />, color: '#f1c40f' },
  ];

  // Notify parent of menu state changes to handle z-index
  useEffect(() => {
    if (onMenuToggle) {
      onMenuToggle(isProfileOpen || isAppsOpen);
    }
  }, [isProfileOpen, isAppsOpen, onMenuToggle]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (appsRef.current && !appsRef.current.contains(event.target)) {
        setIsAppsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="sidebar glass-panel">
      <div className="sidebar-icons">
        <SidebarIcon 
          Icon={Home} 
          label="Home" 
          active={activeView === 'home'} 
          onClick={() => onViewChange('home')} 
        />
        <SidebarIcon 
          Icon={Database} 
          label="Repositories" 
          active={activeView === 'repositories'} 
          onClick={() => onViewChange('repositories')} 
        />
        <SidebarIcon 
          Icon={Users} 
          label="Shared with Me" 
          active={activeView === 'shared'} 
          onClick={() => onViewChange('shared')} 
        />
        <SidebarIcon 
          Icon={Pin} 
          label="Pinned" 
          active={activeView === 'pinned'} 
          onClick={() => onViewChange('pinned')} 
        />
        <SidebarIcon 
          Icon={Clock} 
          label="Recents" 
          active={activeView === 'recents'} 
          onClick={() => onViewChange('recents')} 
        />
      </div>

      <div className="sidebar-bottom">
        {/* Apps Menu */}
        <div className="sidebar-menu-wrapper" ref={appsRef}>
          <div 
            className={`sidebar-icon-wrapper ${isAppsOpen ? 'active' : ''}`} 
            onClick={() => setIsAppsOpen(!isAppsOpen)}
            title="Apps"
          >
            <LayoutGrid size={24} />
          </div>
          {isAppsOpen && (
            <div className="apps-menu solid-panel">
              <div className="apps-grid">
                {apps.map(app => (
                  <div key={app.id} className="app-item">
                    <div className="app-icon" style={{ backgroundColor: app.color }}>
                      {app.icon}
                    </div>
                    <span className="app-label">{app.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="sidebar-menu-wrapper" ref={profileRef}>
          <div 
            className={`sidebar-icon-wrapper profile-trigger ${isProfileOpen ? 'active' : ''}`} 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            title="Profile"
          >
            {user.image && !hasImageError ? (
              <img 
                src={user.image} 
                alt="Profile" 
                className="sidebar-profile-img" 
                onError={() => setHasImageError(true)}
              />
            ) : (
              <UserCircle size={24} />
            )}
          </div>
          {isProfileOpen && (
            <div className="profile-menu solid-panel">
              <div className="menu-item">
                <User size={16} />
                <span>My Profile</span>
              </div>
              <div className="menu-divider"></div>
              <div className="menu-item logout" onClick={onLogout}>
                <LogOut size={16} />
                <span>Log Out</span>
              </div>
            </div>
          )}
        </div>

        <SidebarIcon 
          Icon={Settings} 
          label="System Settings" 
          active={activeView === 'settings'} 
          onClick={() => onViewChange('settings')} 
        />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .sidebar {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px 0;
          justify-content: space-between;
          border-right: 1px solid var(--glass-border);
          overflow: visible !important; 
          z-index: 100;
        }
        .sidebar-icons, .sidebar-bottom {
          display: flex;
          flex-direction: column;
          gap: 25px;
          align-items: center;
          width: 100%;
          overflow: visible !important;
        }
        .sidebar-icon-wrapper {
          cursor: pointer;
          color: var(--text-muted);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          padding: 8px;
          border-radius: 12px;
        }
        .sidebar-icon-wrapper:hover {
          color: var(--text-main);
          transform: scale(1.1);
          background: rgba(255, 255, 255, 0.05);
        }
        body.dark-mode .sidebar-icon-wrapper:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .sidebar-icon-wrapper.active {
          color: var(--accent);
          background: rgba(52, 152, 219, 0.1);
        }
        .sidebar-icon-wrapper.active::after {
          content: '';
          position: absolute;
          left: -12px;
          top: 50%;
          transform: translateY(-50%);
          width: 4px;
          height: 20px;
          background: var(--accent);
          border-radius: 0 4px 4px 0;
          box-shadow: 0 0 10px var(--accent);
          transition: all 0.3s ease;
        }
        .sidebar-profile-img {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 2px solid transparent;
          transition: all 0.3s ease;
        }
        .sidebar-icon-wrapper.active .sidebar-profile-img {
          border-color: var(--accent);
        }
        
        .sidebar-menu-wrapper {
          position: relative;
          overflow: visible !important;
        }

        /* Solid Panels for Menus */
        .solid-panel {
          background: #ffffff;
          border: 1px solid #e0e0e0;
          color: #1a1a1a;
        }
        body.dark-mode .solid-panel {
          background: #1e1e1e;
          border: 1px solid #333333;
          color: #ffffff;
        }

        .profile-menu, .apps-menu {
          position: absolute;
          bottom: 0;
          left: 55px;
          border-radius: 16px;
          box-shadow: 0 15px 35px rgba(0,0,0,0.25);
          animation: slideInSidebar 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 10000; 
          padding: 10px;
        }

        @keyframes slideInSidebar {
          from { opacity: 0; transform: translateX(-20px) scale(0.95); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }

        .profile-menu {
          width: 180px;
        }

        .apps-menu {
          width: 260px;
          padding: 20px;
        }

        .apps-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        .app-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .app-item:hover {
          transform: translateY(-5px);
        }

        .app-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 8px 15px rgba(0,0,0,0.15);
          transition: all 0.3s ease;
        }

        .app-item:hover .app-icon {
          box-shadow: 0 12px 20px rgba(0,0,0,0.25);
          filter: brightness(1.1);
        }

        .app-label {
          font-size: 11px;
          font-weight: 500;
          opacity: 0.8;
        }

        .menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 15px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s ease;
        }

        .menu-item:hover {
          background: rgba(0, 0, 0, 0.05);
          transform: translateX(5px);
        }
        body.dark-mode .menu-item:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .menu-divider {
          height: 1px;
          background: rgba(0, 0, 0, 0.1);
          margin: 6px 0;
        }
        body.dark-mode .menu-divider {
          background: rgba(255, 255, 255, 0.1);
        }

        .menu-item.logout {
          color: #ff4b2b;
        }
        .menu-item.logout:hover {
          background: rgba(255, 75, 43, 0.1);
        }
      `}} />
    </div>
  );
};

const SidebarIcon = ({ Icon, label, active, onClick }) => (
  <div className={`sidebar-icon-wrapper ${active ? 'active' : ''}`} title={label} onClick={onClick}>
    <Icon size={24} />
  </div>
);

export default Sidebar;
