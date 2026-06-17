import { useState } from 'react';
import { Lock, User, Mail, UserPlus, ArrowLeft } from 'lucide-react';

const Signup = ({ onSignup, onBackToLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    // Dummy signup logic
    console.log('Signup data:', formData);
    onSignup();
  };

  return (
    <div className="login-container">
      <div className="login-card glass-panel">
        <div className="login-header">
          <div className="login-logo">
            <UserPlus size={32} color="var(--accent)" />
          </div>
          <h1>Join FileSphere</h1>
          <p>Create an account to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <User size={18} className="input-icon" />
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              required
            />
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

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-button">
            Create Account
          </button>
        </form>

        <div className="login-footer">
          <button className="back-link" onClick={onBackToLogin}>
            <ArrowLeft size={14} /> Back to Login
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
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
