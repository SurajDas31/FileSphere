import { useState } from 'react';
import { Lock, User, LogIn } from 'lucide-react';

const Login = ({ onLogin, onSignupClick }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Dummy credentials
    if (username === 'admin' && password === 'admin') {
      onLogin();
    } else {
      setError('Invalid username or password');
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    alert('Password reset link has been sent to your email (Demo)');
  };

  return (
    <div className="login-container">
      <div className="login-card glass-panel">
        <div className="login-header">
          <div className="login-logo">
            <LogIn size={32} color="var(--accent)" />
          </div>
          <h1>FileSphere</h1>
          <p>Sign in to manage your documents</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <User size={18} className="input-icon" />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <Lock size={18} className="input-icon" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-options">
            <a href="#" onClick={handleForgotPassword} className="forgot-password">
              Forgot password?
            </a>
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-button">
            Login
          </button>
        </form>

        <div className="login-footer">
          <p>Don't have an account? <button onClick={onSignupClick} className="signup-link">Sign up</button></p>
          <div className="demo-credentials">Demo: admin / admin</div>
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
          gap: 30px;
          animation: loginFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes loginFadeIn {
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
          gap: 20px;
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
          padding: 14px 14px 14px 48px;
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

        .form-options {
          display: flex;
          justify-content: flex-end;
          margin-top: -10px;
        }

        .forgot-password {
          font-size: 13px;
          color: var(--text-muted);
          text-decoration: none;
          transition: color 0.2s;
        }

        .forgot-password:hover {
          color: var(--accent);
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
          box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
        }

        .login-button:active {
          transform: translateY(0);
        }

        .login-footer {
          text-align: center;
          padding-top: 10px;
          border-top: 1px solid var(--glass-border);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .login-footer p {
          font-size: 14px;
          color: var(--text-main);
        }

        .signup-link {
          background: none;
          border: none;
          color: var(--accent);
          font-weight: 600;
          cursor: pointer;
          padding: 0;
          font-size: 14px;
        }

        .signup-link:hover {
          text-decoration: underline;
        }

        .demo-credentials {
          font-size: 12px;
          color: var(--text-muted);
        }
      `}} />
    </div>
  );
};

export default Login;
