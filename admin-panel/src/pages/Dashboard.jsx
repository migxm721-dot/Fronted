import { useState, useEffect } from 'react';
import { adminApi } from '../services/api';

export function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getStats();
      setStats(data);
    } catch (err) {
      setError(err.message);
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="page">Loading...</div>;
  if (error) return <div className="page error">Error: {error}</div>;

  return (
    <div className="page">
      <h2>Dashboard</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Users</div>
          <div className="stat-value">{stats?.totalUsers || 0}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Active Rooms</div>
          <div className="stat-value">{stats?.activeRooms || 0}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Pending Reports</div>
          <div className="stat-value">{stats?.pendingReports || 0}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Online Users</div>
          <div className="stat-value">{stats?.onlineUsers || 0}</div>
        </div>
      </div>

      <button className="btn-primary" onClick={loadStats}>
        Refresh Stats
      </button>
    </div>
  );
}
