import { useState, useEffect } from 'react';
import { adminApi } from '../services/api';

export function Transactions() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loadingTx, setLoadingTx] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [page]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getUsers(page);
      setUsers(data.users || []);
      setPagination(data.pagination || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadUsers();
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.searchUser(searchQuery.trim());
      if (data.user) {
        setUsers([data.user]);
      } else if (data.users) {
        setUsers(data.users);
      }
      setPagination(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = async (user) => {
    setSelectedUser(user);
    setLoadingTx(true);
    try {
      const data = await adminApi.getUserTransactions(user.username);
      setTransactions(data.transactions || []);
    } catch (err) {
      setError(err.message);
      setTransactions([]);
    } finally {
      setLoadingTx(false);
    }
  };

  const handleBack = () => {
    setSelectedUser(null);
    setTransactions([]);
  };

  if (selectedUser) {
    return (
      <div className="page tx-page">
        <button className="back-btn" onClick={handleBack}>
          ← Back to Users
        </button>
        <h2 className="history-title">History</h2>
        <div className="user-info-bar">
          <span>{selectedUser.username}</span>
          <span className="credits">{selectedUser.credits || 0} coins</span>
        </div>

        {loadingTx ? (
          <div className="loading">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <p className="no-tx">No transactions found for this user</p>
        ) : (
          <div className="tx-list">
            {transactions.map((tx) => (
              <div key={tx.id} className="tx-row">
                <div className="tx-left">
                  <span className={`tx-dot ${tx.amount >= 0 ? 'positive' : 'negative'}`}></span>
                  <div className="tx-info">
                    <div className="tx-desc">{tx.description}</div>
                    <div className="tx-date">{formatDate(tx.created_at)}</div>
                  </div>
                </div>
                <div className={`tx-amount ${tx.amount >= 0 ? 'positive' : 'negative'}`}>
                  {tx.amount >= 0 ? '+' : ''}{tx.amount} <span className="coin-icon">🪙</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <style>{`
          .tx-page {
            background: #121212;
            min-height: 100vh;
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
          .history-title {
            text-align: center;
            color: #fff;
            font-size: 18px;
            font-weight: 600;
            margin: 0 0 16px 0;
          }
          .user-info-bar {
            display: flex;
            justify-content: space-between;
            padding: 12px 16px;
            background: #1a1a1a;
            border-radius: 10px;
            margin-bottom: 20px;
            color: #fff;
          }
          .user-info-bar .credits {
            color: #2ECC71;
            font-weight: bold;
          }
          .tx-list {
            display: flex;
            flex-direction: column;
          }
          .tx-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 0;
            border-bottom: 1px solid #222;
          }
          .tx-row:last-child {
            border-bottom: none;
          }
          .tx-left {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .tx-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            flex-shrink: 0;
          }
          .tx-dot.positive {
            background: #2ECC71;
          }
          .tx-dot.negative {
            background: #E74C3C;
          }
          .tx-info {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .tx-desc {
            color: #fff;
            font-size: 14px;
            font-weight: 500;
          }
          .tx-date {
            color: #666;
            font-size: 12px;
          }
          .tx-amount {
            font-size: 16px;
            font-weight: bold;
            white-space: nowrap;
          }
          .tx-amount.positive {
            color: #2ECC71;
          }
          .tx-amount.negative {
            color: #E74C3C;
          }
          .coin-icon {
            font-size: 14px;
          }
          .loading, .no-tx {
            text-align: center;
            padding: 40px;
            color: #666;
          }
        `}</style>
      </div>
    );
  }

  if (loading) return <div className="page">Loading...</div>;
  if (error) return <div className="page error">Error: {error}</div>;

  return (
    <div className="page">
      <h2>💰 Transaction History</h2>
      <p style={{ color: '#888', marginBottom: '20px' }}>
        Click on a user to view their transaction history
      </p>

      <div className="search-box">
        <input
          type="text"
          placeholder="Search username..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={handleSearch}>Search</button>
        {searchQuery && (
          <button onClick={() => { setSearchQuery(''); loadUsers(); }}>Clear</button>
        )}
      </div>

      {users.length === 0 ? (
        <p>No users found</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Credits</th>
              <th>Role</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <span 
                    className="clickable-username"
                    onClick={() => handleUserClick(user)}
                  >
                    {user.username}
                  </span>
                </td>
                <td>{user.email}</td>
                <td style={{ fontWeight: 'bold', color: '#2ECC71' }}>
                  {user.credits || 0}
                </td>
                <td>
                  <span className="role-badge" style={{ background: getRoleColor(user.role) }}>
                    {user.role}
                  </span>
                </td>
                <td>
                  <button 
                    className="view-btn"
                    onClick={() => handleUserClick(user)}
                  >
                    View Transactions
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="pagination">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            Previous
          </button>
          <span>Page {page} of {pagination.totalPages}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= pagination.totalPages}>
            Next
          </button>
        </div>
      )}

      <style>{`
        .search-box {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }
        .search-box input {
          flex: 1;
          padding: 10px 16px;
          border: 1px solid #333;
          border-radius: 8px;
          background: #1a1a1a;
          color: white;
          font-size: 14px;
        }
        .search-box button {
          padding: 10px 20px;
          background: #1a5c38;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
        }
        .search-box button:hover {
          background: #0d3820;
        }
        .clickable-username {
          color: #3498DB;
          cursor: pointer;
          font-weight: bold;
        }
        .clickable-username:hover {
          text-decoration: underline;
        }
        .role-badge {
          padding: 4px 10px;
          border-radius: 20px;
          color: white;
          font-size: 12px;
          font-weight: bold;
        }
        .view-btn {
          padding: 6px 12px;
          background: #1a5c38;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
        }
        .view-btn:hover {
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
    default: return '#95A5A6';
  }
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).replace(',', ' •');
}
