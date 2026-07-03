import { useState } from 'react';
import { Lock, User, Mail, Phone, UserPlus, ArrowLeft } from 'lucide-react';
import { config } from '../../config';

const Signup = ({ onSignup, onBackToLogin }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobileNo: '',
    password: '',
    confirmPassword: '',
    joinTenantMode: 'join', // 'join' or 'create'
    tenantId: '',
    tenantName: ''
  });
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const signupUrl = `${config.API_BASE_URL || 'http://localhost:7002'}/api/auth/signup`;
      const res = await fetch(signupUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          mobileNo: formData.mobileNo,
          password: formData.password,
          joinTenantMode: formData.joinTenantMode,
          tenantId: formData.tenantId,
          tenantName: formData.tenantName
        })
      });

      const data = await res.json();

      if (res.ok) {
        setError('');
        // Show success alert/message
        const msg = data.message || 'Account created successfully! Redirecting to login page...';
        setSuccessMsg(msg);
        setTimeout(() => {
          onBackToLogin();
        }, 3000);
      } else {
        setError(data.error || 'Failed to create account');
      }
    } catch (err) {
      console.error('Signup error', err);
      setError('Connection refused. Is auth-service running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card glass-panel" style={{ maxWidth: '450px' }}>
        <div className="login-header">
          <div className="login-logo">
            <UserPlus size={32} color="var(--accent)" />
          </div>
          <h1>Join FileSphere</h1>
          <p>Create an account to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <User size={18} className="input-icon" />
              <input
                type="text"
                name="firstName"
                placeholder="First Name"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <User size={18} className="input-icon" />
              <input
                type="text"
                name="lastName"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <Mail size={18} className="input-icon" />
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <Phone size={18} className="input-icon" />
            <input
              type="text"
              name="mobileNo"
              placeholder="Mobile Number"
              value={formData.mobileNo}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <Lock size={18} className="input-icon" />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <Lock size={18} className="input-icon" />
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid var(--glass-border)', padding: '15px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.05)' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Tenant Namespace Options</span>
              <span style={{ color: '#e74c3c', fontSize: '11px' }}>* Required</span>
            </label>
            <div style={{ display: 'flex', gap: '20px', margin: '5px 0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-main)' }}>
                <input
                  type="radio"
                  name="joinTenantMode"
                  value="join"
                  style={{ accentColor: 'var(--accent)' }}
                  checked={formData.joinTenantMode === 'join'}
                  onChange={handleChange}
                />
                Join Existing Tenant
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-main)' }}>
                <input
                  type="radio"
                  name="joinTenantMode"
                  value="create"
                  style={{ accentColor: 'var(--accent)' }}
                  checked={formData.joinTenantMode === 'create'}
                  onChange={handleChange}
                />
                Create New Tenant
              </label>
            </div>

            {formData.joinTenantMode === 'join' ? (
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type="text"
                  name="tenantId"
                  placeholder="Enter Tenant ID (UUID Format) *"
                  value={formData.tenantId}
                  onChange={handleChange}
                  style={{
                    padding: '10px 14px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1.5px solid #e74c3c',
                    borderRadius: '12px',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                    width: '100%',
                    marginTop: '5px',
                    outline: 'none',
                    boxShadow: '0 0 10px rgba(231, 76, 60, 0.1)'
                  }}
                  required
                />
              </div>
            ) : (
              <input
                type="text"
                name="tenantName"
                placeholder="Enter new Tenant Name *"
                value={formData.tenantName}
                onChange={handleChange}
                required
                style={{
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '12px',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                  width: '100%',
                  marginTop: '5px',
                  outline: 'none'
                }}
              />
            )}
          </div>

          {error && <div className="login-error">{error}</div>}
          {successMsg && <div className="login-success" style={{ color: '#2ecc71', background: 'rgba(46, 204, 113, 0.1)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(46, 204, 113, 0.2)', fontSize: '13px', textAlign: 'center', marginTop: '10px' }}>{successMsg}</div>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="login-footer">
          <button className="back-link" onClick={onBackToLogin}>
            <ArrowLeft size={14} /> Back to Login
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .login-container {
          height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
        }

        .login-card {
          width: 100%;
          max-width: 400px;
          padding: 40px;
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          gap: 25px;
          animation: signupFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes signupFadeIn {
          from { 
            opacity: 0; 
            transform: translateY(20px) scale(0.95); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0) scale(1); 
          }
        }

        .login-header {
          text-align: center;
        }

        .login-logo {
          width: 64px;
          height: 64px;
          background: rgba(52, 152, 219, 0.1);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          border: 1px solid rgba(52, 152, 219, 0.2);
        }

        .login-header h1 {
          font-size: 28px;
          font-weight: 700;
          color: var(--text-main);
          margin-bottom: 8px;
        }

        .login-header p {
          color: var(--text-muted);
          font-size: 14px;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .input-group {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 16px;
          color: var(--text-muted);
          pointer-events: none;
        }

        .input-group input {
          width: 100%;
          padding: 12px 12px 12px 48px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          color: var(--text-main);
          font-size: 15px;
          outline: none;
          transition: all 0.2s;
        }

        .input-group input:focus {
          border-color: var(--accent);
          background: rgba(255, 255, 255, 0.1);
          box-shadow: 0 0 0 4px rgba(52, 152, 219, 0.1);
        }

        .login-error {
          color: #ff4d4d;
          font-size: 13px;
          text-align: center;
          background: rgba(255, 77, 77, 0.1);
          padding: 10px;
          border-radius: 8px;
          border: 1px solid rgba(255, 77, 77, 0.2);
        }

        .login-button {
          padding: 14px;
          background: var(--accent);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 10px;
        }

        .login-button:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }

        .login-footer {
          text-align: center;
          padding-top: 10px;
          border-top: 1px solid var(--glass-border);
        }

        .back-link {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          transition: color 0.2s;
        }

        .back-link:hover {
          color: var(--accent);
        }
      `}} />
    </div>
  );
};

export default Signup;
