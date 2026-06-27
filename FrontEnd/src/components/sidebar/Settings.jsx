import { useState, useEffect } from 'react';
import { X, Settings, User, Bell, Shield, Database, Monitor, Globe, HelpCircle, Upload, Check, Activity, Eye, EyeOff } from 'lucide-react';
import { config } from '../../config';

const SettingsModal = ({ isOpen, onClose, userProfile, onProfileUpdate, initialCategory = 'general' }) => {
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  
  useEffect(() => {
    if (isOpen) {
      setActiveCategory(initialCategory);
    }
  }, [isOpen, initialCategory]);

  const [isGlassmorphism, setIsGlassmorphism] = useState(() => 
    localStorage.getItem('ui_glassmorphism') !== 'false'
  );

  // Admin States
  const [adminSettings, setAdminSettings] = useState({
    storage_path: '/app/storage',
    storage_type: 'LOCAL',
    ftp_host: 'ftp.filesphere.com',
    ftp_port: '21',
    ftp_user: 'ftpuser',
    ftp_password: 'ftppassword',
    google_client_id: '',
    google_client_secret: '',
    facebook_client_id: '',
    facebook_client_secret: ''
  });
  const [tenants, setTenants] = useState({});
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [ftpTesting, setFtpTesting] = useState(false);
  const [ftpTestMessage, setFtpTestMessage] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [showOauthSecrets, setShowOauthSecrets] = useState(false);
  const [showFtpPassword, setShowFtpPassword] = useState(false);

  // Profile Upload states
  const [uploadingPic, setUploadingPic] = useState(false);
  const [picError, setPicError] = useState('');
  const [ftpTestSuccess, setFtpTestSuccess] = useState(false);

  // Profile States
  const [profileFirstName, setProfileFirstName] = useState(userProfile?.firstName || '');
  const [profileLastName, setProfileLastName] = useState(userProfile?.lastName || '');
  const [profileMobileNo, setProfileMobileNo] = useState(userProfile?.mobileNo || '');
  const [profileSaveMsg, setProfileSaveMsg] = useState('');

  // Initial Admin Settings (for Reset functionality)
  const [initialAdminSettings, setInitialAdminSettings] = useState(null);
  const [storagePaths, setStoragePaths] = useState(['/app/storage', '/app/storage/repository', '/app/storage/backup']);

  // Cropping states
  const [cropSrc, setCropSrc] = useState(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [isDragCropper, setIsDragCropper] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cropImageObj, setCropImageObj] = useState(null);

  const isSuperAdmin = userProfile?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (userProfile) {
      setProfileFirstName(userProfile.firstName || '');
      setProfileLastName(userProfile.lastName || '');
      setProfileMobileNo(userProfile.mobileNo || '');
    }
  }, [userProfile]);

  // User Preferences Behavior states
  const [userSettingsInitial, setUserSettingsInitial] = useState(null);
  const [userSettings, setUserSettings] = useState({
    theme: 'light',
    glassmorphism: true,
    accentColor: 'blue',
    sidebarDensity: 'Default',
    autoHideSidebar: false
  });
  const [userSettingsSaveMsg, setUserSettingsSaveMsg] = useState('');

  const loadUserSettings = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${config.AUTH_API_BASE_URL || 'http://localhost:8081'}/api/auth/user/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUserSettings(data);
        setUserSettingsInitial(data);
        
        // Persist theme class dynamically
        if (data.theme === 'dark') {
          document.body.classList.add('dark-mode');
          localStorage.setItem('theme_dark_mode', 'true');
        } else {
          document.body.classList.remove('dark-mode');
          localStorage.setItem('theme_dark_mode', 'false');
        }
        setIsGlassmorphism(data.glassmorphism);
        localStorage.setItem('ui_glassmorphism', data.glassmorphism ? 'true' : 'false');
      }
    } catch (e) {
      console.error("Failed to load user preferences", e);
    }
  };

  const handleGeneralSettingsSave = async () => {
    setUserSettingsSaveMsg('');
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${config.AUTH_API_BASE_URL || 'http://localhost:8081'}/api/auth/user/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userSettings)
      });
      if (res.ok) {
        const data = await res.json();
        setUserSettings(data);
        setUserSettingsInitial(data);
        setUserSettingsSaveMsg('Preferences saved successfully!');
        
        // Apply visual properties instantly
        if (data.theme === 'dark') {
          document.body.classList.add('dark-mode');
          localStorage.setItem('theme_dark_mode', 'true');
        } else {
          document.body.classList.remove('dark-mode');
          localStorage.setItem('theme_dark_mode', 'false');
        }
        setIsGlassmorphism(data.glassmorphism);
        localStorage.setItem('ui_glassmorphism', data.glassmorphism ? 'true' : 'false');
        if (data.glassmorphism) {
          document.body.classList.add('glassmorphic-ui');
        } else {
          document.body.classList.remove('glassmorphic-ui');
        }
        document.documentElement.style.setProperty('--accent', data.accentColor === 'blue' ? '#3498db' : data.accentColor === 'purple' ? '#9b59b6' : data.accentColor === 'green' ? '#2ecc71' : '#e74c3c');
        
        setTimeout(() => setUserSettingsSaveMsg(''), 3000);
      } else {
        setUserSettingsSaveMsg('Failed to save preferences');
      }
    } catch (e) {
      console.error("Failed to save user preferences", e);
      setUserSettingsSaveMsg('Error saving preferences');
    }
  };

  const handleGeneralSettingsReset = () => {
    if (userSettingsInitial) {
      setUserSettings(userSettingsInitial);
      setIsGlassmorphism(userSettingsInitial.glassmorphism);
      setUserSettingsSaveMsg('Preferences reset to cached configuration');
      setTimeout(() => setUserSettingsSaveMsg(''), 3000);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUserSettings();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && activeCategory === 'admin' && isSuperAdmin) {
      loadAdminData();
    }
  }, [isOpen, activeCategory]);

  const loadAdminData = async () => {
    setLoadingAdmin(true);
    const token = localStorage.getItem('token');
    try {
      // Fetch system settings
      const settingsRes = await fetch(`${config.AUTH_API_BASE_URL || 'http://localhost:8081'}/api/auth/admin/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setAdminSettings(settingsData);
        setInitialAdminSettings(settingsData);
      }

      // Fetch tenants and users
      const tenantsRes = await fetch(`${config.AUTH_API_BASE_URL || 'http://localhost:8081'}/api/auth/admin/tenants`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (tenantsRes.ok) {
        const tenantsData = await tenantsRes.json();
        setTenants(tenantsData);
      }

      // Fetch storage directories suggestions
      await reloadStoragePaths();
    } catch (e) {
      console.error("Failed to load administrative settings", e);
    } finally {
      setLoadingAdmin(false);
    }
  };

  const handleAdminSettingsSave = async () => {
    setSaveMessage('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${config.AUTH_API_BASE_URL || 'http://localhost:8081'}/api/auth/admin/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(adminSettings)
      });
      if (res.ok) {
        setSaveMessage('Settings saved successfully!');
        setInitialAdminSettings(adminSettings);
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setSaveMessage('Failed to save settings');
      }
    } catch (e) {
      setSaveMessage('Error saving settings');
    }
  };

  const handleAdminSettingsReset = () => {
    if (initialAdminSettings) {
      setAdminSettings(initialAdminSettings);
      setSaveMessage('Settings reset to initial configuration');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const reloadStoragePaths = async () => {
    const token = localStorage.getItem('token');
    try {
      const pathsRes = await fetch(`${config.AUTH_API_BASE_URL || 'http://localhost:8081'}/api/auth/admin/storage/directories`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (pathsRes.ok) {
        const pathsData = await pathsRes.json();
        if (Array.isArray(pathsData) && pathsData.length > 0) {
          setStoragePaths(pathsData);
        }
      }
    } catch (e) {
      console.error("Failed to load storage directories", e);
    }
  };

  const handleTestFtp = async () => {
    setFtpTesting(true);
    setFtpTestMessage('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${config.AUTH_API_BASE_URL || 'http://localhost:8081'}/api/auth/admin/ftp/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ftp_host: adminSettings.ftp_host,
          ftp_port: adminSettings.ftp_port,
          ftp_user: adminSettings.ftp_user,
          ftp_password: adminSettings.ftp_password
        })
      });
      const data = await res.json();
      if (res.ok) {
        setFtpTestMessage(data.message || 'Connection test successful');
        setFtpTestSuccess(true);
        // Load the directories list as soon as connection is verified
        reloadStoragePaths();
      } else {
        setFtpTestMessage(data.error || 'Connection failed');
        setFtpTestSuccess(false);
      }
    } catch (e) {
      setFtpTestMessage('Network error checking FTP status');
    } finally {
      setFtpTesting(false);
    }
  };

  const handleProfileDetailsSave = async () => {
    setProfileSaveMsg('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${config.AUTH_API_BASE_URL || 'http://localhost:8081'}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName: profileFirstName,
          lastName: profileLastName,
          mobileNo: profileMobileNo
        })
      });
      const data = await res.json();
      if (res.ok) {
        setProfileSaveMsg('Profile updated successfully!');
        if (data.token) {
          localStorage.setItem('token', data.token);
        }
        if (onProfileUpdate) {
          onProfileUpdate(data.user);
        }
        setTimeout(() => setProfileSaveMsg(''), 3000);
      } else {
        setProfileSaveMsg(data.error || 'Failed to update profile');
      }
    } catch (e) {
      setProfileSaveMsg('Error saving profile changes');
    }
  };

  const handleProfilePicUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPicError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setCropImageObj(img);
        setCropSrc(event.target.result);
        setCropZoom(1);
        setCropOffset({ x: 0, y: 0 });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    // Clear input value so same file can be selected again if needed
    e.target.value = '';
  };

  const commitCroppedImage = async () => {
    if (!cropImageObj) return;
    setUploadingPic(true);
    setCropSrc(null); // Close crop modal

    const token = localStorage.getItem('token');
    try {
      const canvas = document.createElement('canvas');
      const size = 300; // Standard output size for profile pic
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      // Draw circular clip path
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.clip();

      // Calculate how to draw the image based on zoom and offset
      // Natural min dimension
      const natMin = Math.min(cropImageObj.width, cropImageObj.height);
      const drawWidth = (cropImageObj.width / natMin) * size * cropZoom;
      const drawHeight = (cropImageObj.height / natMin) * size * cropZoom;

      const x = (size - drawWidth) / 2 + cropOffset.x;
      const y = (size - drawHeight) / 2 + cropOffset.y;

      ctx.drawImage(cropImageObj, x, y, drawWidth, drawHeight);

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setPicError('Cropping failed');
          setUploadingPic(false);
          return;
        }

        const formData = new FormData();
        formData.append('file', blob, 'profile.png');

        try {
          const res = await fetch(`${config.AUTH_API_BASE_URL || 'http://localhost:8081'}/api/auth/profile/upload`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });
          if (res.ok) {
            const data = await res.json();
            if (onProfileUpdate && userProfile) {
              onProfileUpdate({
                ...userProfile,
                profilePicPath: data.profilePicPath
              });
            }
          } else {
            const errData = await res.json();
            setPicError(errData.error || 'Upload failed');
          }
        } catch (err) {
          setPicError('Network error uploading profile picture');
        } finally {
          setUploadingPic(false);
        }
      }, 'image/png');
    } catch (cropErr) {
      setPicError('Error adjusting picture shape');
      setUploadingPic(false);
    }
  };

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

  if (isSuperAdmin) {
    categories.push({ id: 'admin', label: 'Admin Settings', icon: <Shield size={18} color="var(--accent)" /> });
  }

  const renderAdminContent = () => {
    if (loadingAdmin) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p>Loading administration console...</p>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        {/* System Settings & OAuth */}
        <section className="settings-section">
          <h3>OAuth Keys & Settings</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontWeight: '500', fontSize: '14px' }}>Reveal Secrets</label>
              <button 
                className="btn-secondary" 
                style={{ padding: '4px 12px', fontSize: '12px' }}
                onClick={() => setShowOauthSecrets(!showOauthSecrets)}
              >
                {showOauthSecrets ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            
            <div className="admin-field-row">
              <label>Google Client ID</label>
              <input 
                type="text" 
                className="settings-input" 
                value={adminSettings.google_client_id || ''}
                onChange={e => setAdminSettings({...adminSettings, google_client_id: e.target.value})}
              />
            </div>
            <div className="admin-field-row">
              <label>Google Secret Key</label>
              <input 
                type={showOauthSecrets ? "text" : "password"} 
                className="settings-input" 
                value={adminSettings.google_client_secret || ''}
                onChange={e => setAdminSettings({...adminSettings, google_client_secret: e.target.value})}
              />
            </div>
            <div className="admin-field-row">
              <label>Facebook Client ID</label>
              <input 
                type="text" 
                className="settings-input" 
                value={adminSettings.facebook_client_id || ''}
                onChange={e => setAdminSettings({...adminSettings, facebook_client_id: e.target.value})}
              />
            </div>
            <div className="admin-field-row">
              <label>Facebook Secret Key</label>
              <input 
                type={showOauthSecrets ? "text" : "password"} 
                className="settings-input" 
                value={adminSettings.facebook_client_secret || ''}
                onChange={e => setAdminSettings({...adminSettings, facebook_client_secret: e.target.value})}
              />
            </div>
          </div>
        </section>

        {/* Storage path FTP configurations */}
        <section className="settings-section">
          <h3>NFS / Storage Settings</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div className="admin-field-row">
              <label>Storage Mode</label>
              <select 
                className="settings-select"
                value={adminSettings.storage_type || 'LOCAL'}
                onChange={e => {
                  setAdminSettings({...adminSettings, storage_type: e.target.value});
                  setFtpTestSuccess(false);
                }}
              >
                <option value="LOCAL">Standard Local File System / NFS</option>
                <option value="FTP">FTP Server (Remote Storage)</option>
              </select>
            </div>

            {adminSettings.storage_type === 'LOCAL' ? (
              <div className="admin-field-row">
                <label>Storage Base Path</label>
                <input 
                  type="text" 
                  className="settings-input" 
                  style={{ width: '60%' }}
                  value={adminSettings.storage_path || ''}
                  onChange={e => setAdminSettings({...adminSettings, storage_path: e.target.value})}
                />
              </div>
            ) : (
              ftpTestSuccess && (
                <div className="admin-field-row">
                  <label>Storage Base Path</label>
                  <div style={{ display: 'flex', gap: '10px', width: '60%' }}>
                    <select 
                      className="settings-select"
                      style={{ width: '100%' }}
                      value={adminSettings.storage_path || '/'}
                      onChange={e => setAdminSettings({...adminSettings, storage_path: e.target.value})}
                    >
                      {storagePaths.map(path => (
                        <option key={path} value={path}>{path}</option>
                      ))}
                    </select>
                    <button 
                      className="btn-secondary" 
                      style={{ padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                      title="Reload directories"
                      onClick={(e) => {
                        e.preventDefault();
                        reloadStoragePaths();
                      }}
                    >
                      🔄
                    </button>
                  </div>
                </div>
              )
            )}

            {adminSettings.storage_type === 'FTP' && (
              <div style={{ padding: '15px', background: 'rgba(0,0,0,0.05)', borderRadius: '12px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '600' }}>FTP Server Credentials</h4>
                <div className="admin-field-row">
                  <label>Host Address</label>
                  <input 
                    type="text" 
                    className="settings-input" 
                    value={adminSettings.ftp_host || ''}
                    onChange={e => setAdminSettings({...adminSettings, ftp_host: e.target.value})}
                  />
                </div>
                <div className="admin-field-row">
                  <label>Port</label>
                  <input 
                    type="text" 
                    className="settings-input" 
                    value={adminSettings.ftp_port || '21'}
                    onChange={e => setAdminSettings({...adminSettings, ftp_port: e.target.value})}
                  />
                </div>
                <div className="admin-field-row">
                  <label>Username</label>
                  <input 
                    type="text" 
                    className="settings-input" 
                    value={adminSettings.ftp_user || ''}
                    onChange={e => setAdminSettings({...adminSettings, ftp_user: e.target.value})}
                  />
                </div>
                <div className="admin-field-row">
                  <label>Password</label>
                  <div style={{ display: 'flex', gap: '10px', width: '60%' }}>
                    <input 
                      type={showFtpPassword ? "text" : "password"} 
                      className="settings-input" 
                      style={{ width: '100%' }}
                      value={adminSettings.ftp_password || ''}
                      onChange={e => setAdminSettings({...adminSettings, ftp_password: e.target.value})}
                    />
                    <button 
                      className="btn-secondary" 
                      onClick={() => setShowFtpPassword(!showFtpPassword)}
                    >
                      {showFtpPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px' }}>
                  <button 
                    className="btn-primary" 
                    style={{ padding: '8px 16px', background: 'var(--accent)', fontSize: '13px' }}
                    onClick={handleTestFtp}
                    disabled={ftpTesting}
                  >
                    {ftpTesting ? 'Testing connection...' : 'Test FTP Connection'}
                  </button>
                  {ftpTestMessage && (
                    <span style={{ fontSize: '12px', color: ftpTestMessage.includes('successfully') ? '#2ecc71' : '#e74c3c', fontWeight: '500' }}>
                      {ftpTestMessage}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Multi Tenancy Listing */}
        <section className="settings-section">
          <h3>Tenant Domain & User Isolation</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '15px' }}>
            List of isolated tenant directory namespaces registered in the system:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {Object.keys(tenants).map(tenantId => (
              <div key={tenantId} style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '15px', background: 'rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                   <span style={{ fontWeight: '600', fontSize: '14px', color: 'var(--accent)' }}>
                    🏢 Tenant Key: {tenantId}
                   </span>
                  <span style={{ fontSize: '11px', background: 'rgba(52,152,219,0.1)', padding: '2px 8px', borderRadius: '12px', color: 'var(--accent)' }}>
                    {tenants[tenantId].length} isolated accounts
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {tenants[tenantId].map(user => (
                    <div key={user.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '6px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                      <span>👤 {user.firstName} {user.lastName} ({user.email})</span>
                      <span style={{ fontWeight: '500', color: user.role === 'SUPER_ADMIN' ? '#e74c3c' : 'var(--text-muted)' }}>
                        {user.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
          <button className="btn-primary" onClick={handleAdminSettingsSave}>
            Save System Configurations
          </button>
          <button className="btn-secondary" onClick={handleAdminSettingsReset}>
            Reset
          </button>
          {saveMessage && (
            <span style={{ fontSize: '13px', fontWeight: '500', color: saveMessage.includes('successfully') ? '#2ecc71' : '#e74c3c' }}>
              {saveMessage}
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeCategory) {
      case 'general':
        return (
          <>
            <section className="settings-section">
              <h3>Appearance</h3>
              <div className="settings-option">
                <div>
                  <label>Interface Theme</label>
                  <p>Choose how FileSphere looks to you.</p>
                </div>
                <select 
                  className="settings-select"
                  value={userSettings.theme}
                  onChange={(e) => {
                    const themeVal = e.target.value;
                    setUserSettings({ ...userSettings, theme: themeVal });
                  }}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
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
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      setIsGlassmorphism(enabled);
                      setUserSettings({ ...userSettings, glassmorphism: enabled });
                    }}
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
                  {['blue', 'purple', 'green', 'red'].map(color => (
                    <div 
                      key={color}
                      className={`color-dot ${color} ${userSettings.accentColor === color ? 'active' : ''}`}
                      onClick={() => {
                        setUserSettings({ ...userSettings, accentColor: color });
                      }}
                    ></div>
                  ))}
                </div>
              </div>
            </section>

            <section className="settings-section">
              <h3>Workspace</h3>
              <div className="settings-option">
                <div>
                  <label>Auto-hide Sidebar</label>
                  <p>Automatically collapse the sidebar when not in use.</p>
                </div>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={userSettings.autoHideSidebar} 
                    onChange={(e) => setUserSettings({ ...userSettings, autoHideSidebar: e.target.checked })}
                  />
                  <span className="slider round"></span>
                </label>
              </div>
            </section>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', borderTop: '1px solid var(--glass-border)', paddingTop: '20px', marginTop: '20px' }}>
              <button className="btn-primary" onClick={handleGeneralSettingsSave}>
                Save Preferences
              </button>
              <button className="btn-secondary" onClick={handleGeneralSettingsReset}>
                Reset
              </button>
              {userSettingsSaveMsg && (
                <span style={{ fontSize: '13px', fontWeight: '500', color: userSettingsSaveMsg.includes('successfully') ? '#2ecc71' : '#e74c3c' }}>
                  {userSettingsSaveMsg}
                </span>
              )}
            </div>
          </>
        );
      case 'profile':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            <section className="settings-section">
              <h3>Account Profile</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '25px', marginBottom: '25px' }}>
                <div style={{ position: 'relative' }}>
                  {userProfile?.profilePicPath ? (
                    <img 
                      src={userProfile.profilePicPath} 
                      alt="Profile" 
                      style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent)' }} 
                    />
                  ) : (
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(52,152,219,0.1)', display: 'flex', alignItems: 'center', justifyContext: 'center', fontSize: '32px', color: 'var(--accent)' }}>
                      👤
                    </div>
                  )}
                  <label htmlFor="profile-pic-input" style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--accent)', color: 'white', borderRadius: '50%', p: '6px', cursor: 'pointer', display: 'flex', border: '2px solid white', margin: 0 }}>
                    <Upload size={14} />
                    <input 
                      id="profile-pic-input" 
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }}
                      onChange={handleProfilePicUpload}
                      disabled={uploadingPic}
                    />
                  </label>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '600' }}>
                    {userProfile ? `${profileFirstName} ${profileLastName}` : 'Guest User'}
                  </h4>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                    Role: {userProfile?.role || 'USER'} | Tenant Key: <span style={{ background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '4px', fontSize: '13px' }}>{userProfile?.tenantId || 'None'}</span>
                  </p>
                  {picError && <p style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px', margin: 0 }}>{picError}</p>}
                  {uploadingPic && <p style={{ color: 'var(--accent)', fontSize: '12px', marginTop: '4px', margin: 0 }}>Saving circular avatar to NFS path...</p>}
                </div>
              </div>

              <div className="admin-field-row" style={{ display: 'flex', marginBottom: '15px' }}>
                <label style={{ width: '30%', fontWeight: '500' }}>First Name</label>
                <input 
                  type="text" 
                  className="settings-input" 
                  style={{ width: '70%' }} 
                  value={profileFirstName}
                  onChange={e => setProfileFirstName(e.target.value)}
                />
              </div>
              <div className="admin-field-row" style={{ display: 'flex', marginBottom: '15px' }}>
                <label style={{ width: '30%', fontWeight: '500' }}>Last Name</label>
                <input 
                  type="text" 
                  className="settings-input" 
                  style={{ width: '70%' }} 
                  value={profileLastName}
                  onChange={e => setProfileLastName(e.target.value)}
                />
              </div>
              <div className="admin-field-row" style={{ display: 'flex', marginBottom: '15px' }}>
                <label style={{ width: '30%', fontWeight: '500' }}>Email Address</label>
                <input type="text" className="settings-input" style={{ width: '70%' }} disabled value={userProfile?.email || ''} />
              </div>
              <div className="admin-field-row" style={{ display: 'flex', marginBottom: '20px' }}>
                <label style={{ width: '30%', fontWeight: '500' }}>Mobile Number</label>
                <input 
                  type="text" 
                  className="settings-input" 
                  style={{ width: '70%' }} 
                  value={profileMobileNo}
                  onChange={e => setProfileMobileNo(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
                <button className="btn-primary" onClick={handleProfileDetailsSave}>
                  Save Profile Changes
                </button>
                {profileSaveMsg && (
                  <span style={{ fontSize: '13px', fontWeight: '500', color: profileSaveMsg.includes('successfully') ? '#2ecc71' : '#e74c3c' }}>
                    {profileSaveMsg}
                  </span>
                )}
              </div>
            </section>
          </div>
        );
      case 'admin':
        return renderAdminContent();
      default:
        return (
          <div style={{ padding: '20px', color: 'var(--text-muted)' }}>
            <p>This category is under development.</p>
          </div>
        );
    }
  };

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
              <div 
                key={cat.id} 
                className={`settings-nav-item ${cat.id === activeCategory ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="settings-main">
          <div className="settings-content-header">
            <h2>{categories.find(c => c.id === activeCategory)?.label || 'Settings'}</h2>
            <button className="close-settings" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
          <div className="settings-scroll-area">
            {renderContent()}
          </div>
        </div>
      </div>

      {cropSrc && (
        <div className="crop-modal-overlay" onClick={() => setCropSrc(null)}>
          <div className="crop-modal-container solid-panel" onClick={(e) => e.stopPropagation()}>
            <div className="crop-modal-header">
              <h3>Adjust Profile Picture</h3>
              <button className="btn-close-crop" onClick={() => setCropSrc(null)}>
                <X size={18} />
              </button>
            </div>
            
            <p className="crop-modal-hint">Drag image to adjust position, use zoom slider below.</p>
            
            <div 
              className="crop-viewport"
              onMouseDown={(e) => {
                setIsDragCropper(true);
                setDragStart({ x: e.clientX - cropOffset.x, y: e.clientY - cropOffset.y });
              }}
              onMouseMove={(e) => {
                if (!isDragCropper) return;
                setCropOffset({
                  x: e.clientX - dragStart.x,
                  y: e.clientY - dragStart.y
                });
              }}
              onMouseUp={() => setIsDragCropper(false)}
              onMouseLeave={() => setIsDragCropper(false)}
            >
              <div className="crop-circle-overlay"></div>
              <img 
                src={cropSrc} 
                alt="Crop preview" 
                className="crop-preview-image"
                style={{
                  transform: `translate(${cropOffset.x}px, ${cropOffset.y}px) scale(${cropZoom})`,
                  cursor: isDragCropper ? 'grabbing' : 'grab'
                }}
                draggable={false}
              />
            </div>
            
            <div className="crop-zoom-container">
              <label>Zoom</label>
              <input 
                type="range" 
                min="1" 
                max="3" 
                step="0.05" 
                value={cropZoom} 
                onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                className="crop-zoom-slider"
              />
            </div>
            
            <div className="crop-modal-footer">
              <button className="btn-secondary" onClick={() => setCropSrc(null)}>Cancel</button>
              <button className="btn-primary" onClick={commitCroppedImage}>Save Profile Image</button>
            </div>
          </div>
        </div>
      )}
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
          padding: 10px 16px;
          border-radius: 12px;
          border: 1px solid var(--glass-border);
          background: rgba(255, 255, 255, 0.4);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          color: var(--text-main);
          font-family: inherit;
          font-size: 13px;
          font-weight: 500;
          outline: none;
          min-width: 200px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 10px rgba(0,0,0,0.03);
        }
        .settings-select:hover, .settings-select:focus {
          border-color: var(--accent);
          box-shadow: 0 4px 15px rgba(52, 152, 219, 0.15);
        }
        body.dark-mode .settings-select {
          background: rgba(15, 18, 25, 0.45);
        }
        .settings-select option {
          background: var(--solid-bg, #ffffff);
          color: var(--text-main, #1a1a1a);
          padding: 8px;
        }

        .settings-input {
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid var(--glass-border);
          background: rgba(0, 0, 0, 0.05);
          color: var(--text-main);
          outline: none;
        }
        body.dark-mode .settings-input {
          background: rgba(255, 255, 255, 0.05);
        }

        .admin-field-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .admin-field-row label {
          font-weight: 500;
          font-size: 13px;
          width: 35%;
        }
        .admin-field-row input {
          width: 60%;
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
          background: linear-gradient(135deg, var(--accent), #2980b9);
          color: white;
          border: none;
          padding: 10px 24px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 15px rgba(52, 152, 219, 0.25);
        }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(52, 152, 219, 0.35);
          filter: brightness(1.05);
        }
        .btn-primary:active:not(:disabled) {
          transform: translateY(0);
        }
        .btn-primary:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid var(--glass-border);
          color: var(--text-main);
          padding: 10px 24px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(5px);
        }
        .btn-secondary:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.2);
          border-color: var(--accent);
          color: var(--accent);
          transform: translateY(-2px);
        }
        .btn-secondary:active:not(:disabled) {
          transform: translateY(0);
        }
        body.dark-mode .btn-secondary {
          background: rgba(0, 0, 0, 0.2);
        }
        body.dark-mode .btn-secondary:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.05);
        }

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

        /* Image Cropper Modal Styles */
        .crop-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(8px);
          z-index: 200000;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.25s ease;
        }
        .crop-modal-container {
          width: 380px;
          border-radius: 20px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 15px;
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.4);
          animation: scaleUp 0.25s ease;
          background: var(--solid-bg);
          border: 1px solid var(--glass-border);
        }
        .crop-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .crop-modal-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: var(--text-main);
        }
        .btn-close-crop {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: background 0.2s;
        }
        .btn-close-crop:hover {
          background: rgba(0,0,0,0.05);
          color: var(--text-main);
        }
        .crop-modal-hint {
          margin: 0;
          font-size: 12px;
          color: var(--text-muted);
        }
        .crop-viewport {
          position: relative;
          width: 280px;
          height: 280px;
          border-radius: 12px;
          overflow: hidden;
          margin: 0 auto;
          background: #111;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .crop-circle-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          border-radius: 12px;
          box-shadow: inset 0 0 0 40px rgba(0, 0, 0, 0.6);
          border: 2px dashed var(--accent);
          box-sizing: border-box;
          z-index: 10;
        }
        .crop-circle-overlay::after {
          content: '';
          position: absolute;
          top: 40px;
          left: 40px;
          width: 200px;
          height: 200px;
          border-radius: 50%;
          border: 2px solid var(--accent);
          box-sizing: border-box;
        }
        .crop-preview-image {
          max-width: none;
          max-height: none;
          transition: transform 0.05s ease-out;
        }
        .crop-zoom-container {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 5px;
        }
        .crop-zoom-container label {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-muted);
        }
        .crop-zoom-slider {
          width: 100%;
          accent-color: var(--accent);
          cursor: pointer;
        }
        .crop-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 10px;
        }
      `}} />
    </div>
  );
};

export default SettingsModal;
