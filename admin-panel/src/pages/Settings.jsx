import { useState } from 'react';
import { adminApi } from '../services/api';

export function Settings() {
  const [activeTab, setActiveTab] = useState('create-admin');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'super_admin'
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!formData.username || !formData.email || !formData.password) {
      setMessage({ type: 'error', text: 'All fields are required' });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    if (formData.password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setMessage({ type: 'error', text: 'Invalid email format' });
      return;
    }

    try {
      setLoading(true);
      await adminApi.createAccount({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: formData.role
      });
      
      setMessage({ type: 'success', text: `Account "${formData.username}" created successfully with role: ${formData.role}` });
      setFormData({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'super_admin'
      });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to create account' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page settings-page">
      <h2>⚙️ Settings</h2>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'create-admin' ? 'active' : ''}`}
          onClick={() => setActiveTab('create-admin')}
        >
          👑 Create Admin
        </button>
      </div>

      {activeTab === 'create-admin' && (
        <div className="settings-section">
          <div className="section-header">
            <h3>Create Admin Account</h3>
            <p>Create a new super admin or admin account</p>
          </div>

          <form onSubmit={handleCreateAdmin} className="admin-form">
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="Enter username"
                required
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter email"
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter password (min 6 characters)"
                required
              />
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm password"
                required
              />
            </div>

            <div className="form-group">
              <label>Role</label>
              <select 
                name="role" 
                value={formData.role} 
                onChange={handleInputChange}
              >
                <option value="super_admin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="customer_service">Customer Service</option>
                <option value="merchant">Merchant</option>
                <option value="mentor">Mentor</option>
                <option value="user">User</option>
              </select>
            </div>

            {message.text && (
              <div className={`message ${message.type}`}>
                {message.text}
              </div>
            )}

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Creating...' : '👑 Create Account'}
            </button>
          </form>
        </div>
      )}

      <style>{`
        .settings-page {
          background: #121212;
          min-height: 100vh;
        }
        .tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          border-bottom: 1px solid #333;
          padding-bottom: 12px;
        }
        .tab {
          padding: 10px 20px;
          background: transparent;
          border: 1px solid #333;
          border-radius: 8px;
          color: #888;
          cursor: pointer;
          font-weight: 600;
        }
        .tab.active {
          background: #1a5c38;
          border-color: #1a5c38;
          color: white;
        }
        .settings-section {
          background: #1a1a1a;
          border-radius: 12px;
          padding: 24px;
        }
        .section-header {
          margin-bottom: 24px;
        }
        .section-header h3 {
          color: #fff;
          margin: 0 0 8px 0;
        }
        .section-header p {
          color: #888;
          margin: 0;
          font-size: 14px;
        }
        .admin-form {
          max-width: 500px;
        }
        .form-group {
          margin-bottom: 20px;
        }
        .form-group label {
          display: block;
          margin-bottom: 8px;
          color: #aaa;
          font-size: 14px;
          font-weight: 500;
        }
        .form-group input,
        .form-group select {
          width: 100%;
          padding: 12px 16px;
          background: #2a2a2a;
          border: 1px solid #444;
          border-radius: 8px;
          color: #fff;
          font-size: 14px;
        }
        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #1a5c38;
        }
        .form-group input::placeholder {
          color: #666;
        }
        .message {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 14px;
        }
        .message.error {
          background: #3d1a1a;
          color: #ff6b6b;
          border: 1px solid #5a2a2a;
        }
        .message.success {
          background: #1a3d1a;
          color: #6bff6b;
          border: 1px solid #2a5a2a;
        }
        .btn-submit {
          width: 100%;
          padding: 14px 20px;
          background: linear-gradient(135deg, #1a5c38, #0d3820);
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-submit:hover:not(:disabled) {
          background: linear-gradient(135deg, #1e6b42, #104428);
        }
        .btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
