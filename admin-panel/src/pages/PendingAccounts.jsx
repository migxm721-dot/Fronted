import { useState, useEffect } from 'react';
import { adminApi } from '../services/api';

export function PendingAccounts() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState([]);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    loadPendingAccounts();
  }, [page]);

  const loadPendingAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getPendingAccounts(page);
      setUsers(data.users || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (id, username) => {
    if (!window.confirm(`Activate account "${username}"?`)) return;
    
    try {
      setActivating(true);
      await adminApi.activateAccount(id);
      alert(`Account ${username} activated successfully`);
      loadPendingAccounts();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setActivating(false);
    }
  };

  const handleBulkActivate = async () => {
    if (selectedIds.length === 0) {
      alert('Please select accounts to activate');
      return;
    }
    
    if (!window.confirm(`Activate ${selectedIds.length} selected accounts?`)) return;
    
    try {
      setActivating(true);
      await adminApi.bulkActivateAccounts(selectedIds);
      alert(`${selectedIds.length} accounts activated successfully`);
      setSelectedIds([]);
      loadPendingAccounts();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setActivating(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(users.map(u => u.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  if (loading) return <div className="page">Loading...</div>;
  if (error) return <div className="page error">Error: {error}</div>;

  return (
    <div className="page">
      <h2>✅ Pending Account Activation</h2>
      <p style={{ color: '#888', marginBottom: '20px' }}>
        Total pending: <strong style={{ color: '#E74C3C' }}>{total}</strong> accounts
      </p>

      {selectedIds.length > 0 && (
        <div style={{ marginBottom: '20px', padding: '12px', background: '#1a5c38', borderRadius: '8px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span>{selectedIds.length} selected</span>
          <button 
            onClick={handleBulkActivate}
            disabled={activating}
            style={{ padding: '8px 16px', background: '#2ECC71', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {activating ? 'Activating...' : '✅ Activate Selected'}
          </button>
          <button 
            onClick={() => setSelectedIds([])}
            style={{ padding: '8px 16px', background: '#666', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Clear
          </button>
        </div>
      )}

      {users.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#2ECC71' }}>
          <span style={{ fontSize: '48px' }}>🎉</span>
          <p>No pending accounts! All users are verified.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input 
                  type="checkbox" 
                  onChange={handleSelectAll}
                  checked={selectedIds.length === users.length && users.length > 0}
                />
              </th>
              <th>ID</th>
              <th>Username</th>
              <th>Email</th>
              <th>Registered</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <input 
                    type="checkbox"
                    checked={selectedIds.includes(user.id)}
                    onChange={() => handleSelect(user.id)}
                  />
                </td>
                <td>{user.id}</td>
                <td style={{ fontWeight: 'bold', color: '#3498DB' }}>{user.username}</td>
                <td style={{ fontSize: '12px', color: '#aaa' }}>{user.email || '-'}</td>
                <td style={{ fontSize: '12px', color: '#888' }}>
                  {new Date(user.created_at).toLocaleDateString('id-ID')}
                </td>
                <td>
                  <button
                    onClick={() => handleActivate(user.id, user.username)}
                    disabled={activating}
                    style={{ 
                      padding: '6px 14px', 
                      background: '#2ECC71', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '6px', 
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '12px'
                    }}
                  >
                    ✅ Activate
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            Previous
          </button>
          <span>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
