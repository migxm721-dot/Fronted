import { useState, useEffect } from 'react';
import { adminApi } from '../services/api';

export function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);

  useEffect(() => {
    if (!searchResults) {
      loadUsers();
    }
  }, [page, selectedRole]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getUsers(page, selectedRole || null);
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      loadUsers();
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.searchUser(searchQuery.trim());
      if (data.user) {
        setSearchResults([data.user]);
      } else if (data.users) {
        setSearchResults(data.users);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      if (err.message.includes('not found')) {
        setSearchResults([]);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
    loadUsers();
  };

  const handleAddCoins = async (username) => {
    const amount = window.prompt(`Add coins to ${username}:`, '100');
    if (!amount || isNaN(amount)) {
      alert('Invalid amount');
      return;
    }
    
    try {
      setLoading(true);
      const numAmount = parseInt(amount);
      await adminApi.addCoins(username, numAmount, 'Admin top-up');
      alert(`Successfully added ${numAmount} coins to ${username}`);
      await loadUsers();
    } catch (err) {
      alert('Error adding coins: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async (id, currentRole) => {
    const roles = ['user', 'mentor', 'merchant', 'admin', 'customer_service'];
    const newRole = window.prompt(`Change role (current: ${currentRole}):`, currentRole);
    
    if (!newRole || !roles.includes(newRole)) {
      alert('Invalid role');
      return;
    }

    try {
      setLoading(true);
      await adminApi.updateUserRole(id, newRole);
      alert(`Role changed to ${newRole}`);
      await loadUsers();
    } catch (err) {
      alert('Error changing role: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async (id, isSuspended) => {
    const action = isSuspended ? 'unban' : 'ban';
    if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} this user?`)) return;
    try {
      if (isSuspended) {
        await adminApi.unbanUser(id);
      } else {
        await adminApi.banUser(id);
      }
      loadUsers();
    } catch (err) {
      alert(`Error ${action}ning user: ` + err.message);
    }
  };

  const handleDeleteUser = async (id, username) => {
    if (!window.confirm(`Are you sure you want to PERMANENTLY DELETE user ${username}?\nThis action cannot be undone!`)) return;
    try {
      setLoading(true);
      await adminApi.deleteUser(id);
      alert(`User ${username} deleted successfully`);
      closeUserDetail();
      await loadUsers();
    } catch (err) {
      alert('Error deleting user: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (id, username) => {
    const newPassword = window.prompt(`Enter new password for ${username}:\n(minimum 6 characters)`);
    
    if (!newPassword) return;
    
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      await adminApi.changeUserPassword(id, newPassword);
      alert(`Password changed successfully for ${username}`);
    } catch (err) {
      alert('Error changing password: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEmail = async (id, username, currentEmail) => {
    const newEmail = window.prompt(`Change email for ${username}:`, currentEmail || '');
    
    if (!newEmail) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      alert('Invalid email format');
      return;
    }

    try {
      setLoading(true);
      await adminApi.changeUserEmail(id, newEmail);
      alert(`Email changed successfully for ${username}`);
      await loadUsers();
    } catch (err) {
      alert('Error changing email: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPin = async (id, username) => {
    const newPin = window.prompt(`Reset PIN for ${username}:\n(2-12 digits)`);
    
    if (!newPin) return;
    
    if (newPin.length < 2 || newPin.length > 12 || !/^\d+$/.test(newPin)) {
      alert('PIN must be 2-12 digits (numbers only)');
      return;
    }

    try {
      setLoading(true);
      await adminApi.resetUserPin(id, newPin);
      alert(`PIN reset successfully for ${username}`);
    } catch (err) {
      alert('Error resetting PIN: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const openUserDetail = (user) => {
    setSelectedUser(user);
  };

  const closeUserDetail = () => {
    setSelectedUser(null);
  };

  if (loading && !selectedUser) return <div className="page">Loading...</div>;
  if (error) return <div className="page error">Error: {error}</div>;

  if (selectedUser) {
    return (
      <div className="page user-detail-page">
        <button className="back-btn" onClick={closeUserDetail}>
          ← Back to Users
        </button>
        
        <div className="user-profile-card">
          <div className="user-avatar">
            {selectedUser.username?.charAt(0).toUpperCase()}
          </div>
          <h2>{selectedUser.username}</h2>
          <span className={`role-badge ${selectedUser.role}`}>{selectedUser.role}</span>
        </div>

        <div className="user-info-section">
          <div className="info-row">
            <span className="label">User ID</span>
            <span className="value">{selectedUser.id}</span>
          </div>
          <div className="info-row">
            <span className="label">Username</span>
            <span className="value">{selectedUser.username}</span>
          </div>
          <div className="info-row">
            <span className="label">Email</span>
            <span className="value">{selectedUser.email || '-'}</span>
          </div>
          <div className="info-row">
            <span className="label">Credits</span>
            <span className="value credit">{selectedUser.credits || 0}</span>
          </div>
          <div className="info-row">
            <span className="label">Level</span>
            <span className="value">{selectedUser.level || 1}</span>
          </div>
          <div className="info-row">
            <span className="label">Status</span>
            <span className={`value ${selectedUser.is_suspended ? 'suspended' : 'active'}`}>
              {selectedUser.is_suspended ? 'Suspended' : 'Active'}
            </span>
          </div>
          <div className="info-row">
            <span className="label">Last IP</span>
            <span className="value ip">{selectedUser.last_ip || '-'}</span>
          </div>
          <div className="info-row">
            <span className="label">Joined</span>
            <span className="value">{new Date(selectedUser.created_at).toLocaleDateString('id-ID')}</span>
          </div>
        </div>

        <div className="action-buttons">
          <button className="action-btn email" onClick={() => handleChangeEmail(selectedUser.id, selectedUser.username, selectedUser.email)}>
            ✉️ Change Email
          </button>
          <button className="action-btn password" onClick={() => handleChangePassword(selectedUser.id, selectedUser.username)}>
            🔑 Change Password
          </button>
          <button className="action-btn pin" onClick={() => handleResetPin(selectedUser.id, selectedUser.username)}>
            🔢 Reset PIN
          </button>
          <button className="action-btn role" onClick={() => handleChangeRole(selectedUser.id, selectedUser.role)}>
            👤 Change Role
          </button>
          <button className="action-btn coins" onClick={() => handleAddCoins(selectedUser.username)}>
            💰 Add Coins
          </button>
          <button 
            className={`action-btn ${selectedUser.is_suspended ? 'unban' : 'ban'}`}
            onClick={() => handleBan(selectedUser.id, selectedUser.is_suspended)}
          >
            {selectedUser.is_suspended ? '✅ Unban User' : '🚫 Ban User'}
          </button>
          <button 
            className="action-btn delete"
            onClick={() => handleDeleteUser(selectedUser.id, selectedUser.username)}
          >
            🗑️ Delete Account
          </button>
        </div>

        <style>{`
          .user-detail-page {
            background: #121212;
          }
          .back-btn {
            background: transparent;
            color: #aaa;
            border: none;
            padding: 10px 0;
            cursor: pointer;
            font-size: 14px;
          }
          .back-btn:hover {
            color: #fff;
          }
          .user-profile-card {
            text-align: center;
            padding: 24px;
            background: linear-gradient(135deg, #1a5c38, #0d3820);
            border-radius: 16px;
            margin-bottom: 24px;
          }
          .user-avatar {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: #2a7a4a;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            font-weight: bold;
            color: white;
            margin: 0 auto 12px;
          }
          .user-profile-card h2 {
            color: white;
            margin: 0 0 8px 0;
          }
          .role-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            color: white;
            background: #666;
          }
          .role-badge.super_admin { background: #E74C3C; }
          .role-badge.admin { background: #E67E22; }
          .role-badge.merchant { background: #9B59B6; }
          .role-badge.mentor { background: #3498DB; }
          .role-badge.user { background: #95A5A6; }
          
          .user-info-section {
            background: #1a1a1a;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 24px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #333;
          }
          .info-row:last-child {
            border-bottom: none;
          }
          .info-row .label {
            color: #888;
            font-size: 14px;
          }
          .info-row .value {
            color: #fff;
            font-size: 14px;
            font-weight: 500;
          }
          .info-row .value.credit {
            color: #2ECC71;
          }
          .info-row .value.active {
            color: #2ECC71;
          }
          .info-row .value.suspended {
            color: #E74C3C;
          }
          .info-row .value.ip {
            font-family: monospace;
            color: #3498DB;
          }
          
          .action-buttons {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          .action-btn {
            padding: 14px 16px;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }
          .action-btn.email {
            background: #3498DB;
            color: white;
          }
          .action-btn.password {
            background: #9B59B6;
            color: white;
          }
          .action-btn.pin {
            background: #E67E22;
            color: white;
          }
          .action-btn.role {
            background: #1ABC9C;
            color: white;
          }
          .action-btn.coins {
            background: #2ECC71;
            color: white;
          }
          .action-btn.ban {
            background: #E74C3C;
            color: white;
          }
          .action-btn.unban {
            background: #27AE60;
            color: white;
          }
          .action-btn.delete {
            background: #000;
            color: #ff4d4d;
            border: 1px solid #ff4d4d;
          }
          .action-btn.delete:hover {
            background: #ff4d4d;
            color: white;
          }
          .action-btn:hover {
            opacity: 0.9;
          }
        `}</style>
      </div>
    );
  }

  const displayUsers = searchResults !== null ? searchResults : users;

  return (
    <div className="page">
      <h2>👥 User Management</h2>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #333', background: '#1a1a1a', color: '#fff', width: '200px' }}
          />
          <button 
            onClick={handleSearch}
            style={{ padding: '8px 16px', background: '#1a5c38', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            🔍 Search
          </button>
          {searchResults !== null && (
            <button 
              onClick={clearSearch}
              style={{ padding: '8px 16px', background: '#666', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              ✕ Clear
            </button>
          )}
        </div>

        <div>
          <label>Filter by Role: </label>
          <select 
            value={selectedRole} 
            onChange={(e) => { setSelectedRole(e.target.value); setSearchResults(null); }}
            style={{ padding: '8px', marginLeft: '10px', borderRadius: '4px', border: '1px solid #333', background: '#1a1a1a', color: '#fff' }}
            disabled={searchResults !== null}
          >
            <option value="">All Roles</option>
            <option value="user">User</option>
            <option value="mentor">Mentor</option>
            <option value="merchant">Merchant</option>
            <option value="admin">Admin</option>
            <option value="customer_service">Customer Service</option>
          </select>
        </div>
      </div>

      {searchResults !== null && (
        <p style={{ color: '#888', marginBottom: '10px' }}>
          Found {searchResults.length} user(s) matching "{searchQuery}"
        </p>
      )}

      {displayUsers.length === 0 ? (
        <p>No users found</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Email</th>
              <th>IP</th>
              <th>Role</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {displayUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>
                  <span 
                    style={{ color: '#3498DB', cursor: 'pointer', fontWeight: 'bold' }}
                    onClick={() => openUserDetail(user)}
                  >
                    {user.username}
                  </span>
                </td>
                <td style={{ fontSize: '12px', color: '#aaa' }}>{user.email || '-'}</td>
                <td style={{ fontSize: '11px', fontFamily: 'monospace', color: '#888' }}>
                  {user.last_ip || '-'}
                </td>
                <td>
                  <span className="role-tag" style={{ background: getRoleColor(user.role) }}>
                    {user.role || 'user'}
                  </span>
                </td>
                <td>{user.is_suspended ? '🔴' : '🟢'}</td>
                <td>
                  <button
                    className="btn-view"
                    onClick={() => openUserDetail(user)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {searchResults === null && (
        <div className="pagination">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            Previous
          </button>
          <span>Page {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={users.length === 0}>
            Next
          </button>
        </div>
      )}

      <style>{`
        .role-tag {
          padding: 4px 10px;
          border-radius: 20px;
          color: white;
          font-size: 11px;
          font-weight: bold;
        }
        .btn-view {
          padding: 6px 14px;
          background: #1a5c38;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          font-weight: bold;
        }
        .btn-view:hover {
          background: #0d3820;
        }
      `}</style>
    </div>
  );
}

function getRoleColor(role) {
  switch (role) {
    case 'super_admin': return '#E74C3C';
    case 'admin': return '#E67E22';
    case 'merchant': return '#9B59B6';
    case 'mentor': return '#3498DB';
    case 'customer_service': return '#1ABC9C';
    default: return '#95A5A6';
  }
}
