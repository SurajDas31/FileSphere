import { useState } from 'react';
import { Lock, Mail, LogIn } from 'lucide-react';
import { config } from '../../config';

const Login = ({ onLogin, onSignupClick }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loginUrl = `${config.API_BASE_URL || ''}/api/auth/login`;
      const res = await (window.originalFetch ? window.originalFetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      }) : fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      }));

      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLogin();
      } else {
        setError(data.error || 'Invalid email or password');
      }
    } catch (err) {
      console.error('Login error', err);
      setError('Connection refused. Is auth-service running?');
    } finally {
      setLoading(false);
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
            <Mail size={18} className="input-icon" />
            <input
              type="text"
              placeholder="Email or Username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <div className="oauth-section">
          <div className="oauth-separator">
            <span>Or sign in with</span>
          </div>
          <div className="oauth-buttons">
            <a href={`${config.API_BASE_URL || 'http://localhost:7002'}/oauth2/authorization/google`} className="oauth-btn google-btn" title="Sign in with Google">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
            </a>
            <a href={`${config.API_BASE_URL || 'http://localhost:7002'}/oauth2/authorization/facebook`} className="oauth-btn facebook-btn" title="Sign in with Facebook">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
            <a href={`${config.API_BASE_URL || 'http://localhost:7002'}/oauth2/authorization/github`} className="oauth-btn github-btn" title="Sign in with GitHub">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
            </a>
          </div>
        </div>

        <div className="login-footer">
          <p>Don't have an account? <button onClick={onSignupClick} className="signup-link">Sign up</button></p>
          <div className="demo-credentials">Credentials: root / password</div>
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

        .oauth-section {
          display: flex;
          flex-direction: column;
          gap: 15px;
          margin: 10px 0;
        }

        .oauth-separator {
          display: flex;
          align-items: center;
          text-align: center;
          color: var(--text-muted);
          font-size: 13px;
        }

        .oauth-separator::before,
        .oauth-separator::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid var(--glass-border);
        }

        .oauth-separator:not(:empty)::before {
          margin-right: .5em;
        }

        .oauth-separator:not(:empty)::after {
          margin-left: .5em;
        }

        .oauth-buttons {
          display: flex;
          justify-content: center;
          gap: 16px;
        }

        .oauth-btn {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--glass-border);
          color: var(--text-main);
          background: rgba(255, 255, 255, 0.05);
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .oauth-btn:hover {
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.12);
          border-color: var(--accent);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .google-btn:hover {
          color: #ea4335;
        }

        .facebook-btn:hover {
          color: #1877f2;
        }

        .github-btn:hover {
          color: #24292e;
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
