import { useState, useEffect } from 'react';
import { adminApi } from '../services/api';

export function AppConfig() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState({});
  const [editValues, setEditValues] = useState({});

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getAppConfig();
      setConfigs(data.configs || []);
      const values = {};
      (data.configs || []).forEach(c => {
        values[c.config_key] = c.config_value;
      });
      setEditValues(values);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key) => {
    try {
      setSaving(prev => ({ ...prev, [key]: true }));
      await adminApi.updateAppConfig(key, editValues[key]);
      alert(`"${key}" updated successfully`);
      loadConfigs();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleChange = (key, value) => {
    setEditValues(prev => ({ ...prev, [key]: value }));
  };

  const getConfigLabel = (key) => {
    const labels = {
      min_app_version: 'Minimum App Version',
      force_update_message: 'Force Update Message',
      maintenance_mode: 'Maintenance Mode',
    };
    return labels[key] || key;
  };

  const getConfigIcon = (key) => {
    const icons = {
      min_app_version: '📱',
      force_update_message: '💬',
      maintenance_mode: '🔧',
    };
    return icons[key] || '⚙️';
  };

  if (loading) return <div className="page">Loading...</div>;
  if (error) return <div className="page error">Error: {error}</div>;

  return (
    <div className="page">
      <h2>📱 App Configuration</h2>
      <p style={{ color: '#888', marginBottom: '24px' }}>
        Manage app version requirements and maintenance settings. Changes take effect immediately.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '700px' }}>
        {configs.map((config) => (
          <div
            key={config.config_key}
            style={{
              background: '#1a3a2a',
              borderRadius: '10px',
              padding: '20px',
              border: '1px solid #2a5a3a',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontWeight: 'bold', fontSize: '15px', color: '#2ECC71' }}>
                {getConfigIcon(config.config_key)} {getConfigLabel(config.config_key)}
              </label>
              {config.updated_by && (
                <span style={{ fontSize: '11px', color: '#666' }}>
                  Last updated by: {config.updated_by}
                </span>
              )}
            </div>

            {config.description && (
              <p style={{ color: '#888', fontSize: '12px', margin: '0 0 12px 0' }}>
                {config.description}
              </p>
            )}

            {config.config_key === 'maintenance_mode' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <select
                  value={editValues[config.config_key] || 'false'}
                  onChange={(e) => handleChange(config.config_key, e.target.value)}
                  style={{
                    padding: '10px 14px',
                    background: '#0d1f15',
                    color: '#fff',
                    border: '1px solid #3a6a4a',
                    borderRadius: '6px',
                    fontSize: '14px',
                    flex: 1,
                  }}
                >
                  <option value="false">OFF - Normal Mode</option>
                  <option value="true">ON - Maintenance Mode</option>
                </select>
                <button
                  onClick={() => handleSave(config.config_key)}
                  disabled={saving[config.config_key] || editValues[config.config_key] === config.config_value}
                  style={{
                    padding: '10px 20px',
                    background: editValues[config.config_key] !== config.config_value ? '#2ECC71' : '#555',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: editValues[config.config_key] !== config.config_value ? 'pointer' : 'default',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {saving[config.config_key] ? 'Saving...' : 'Save'}
                </button>
              </div>
            ) : config.config_key === 'force_update_message' ? (
              <div style={{ display: 'flex', gap: '12px' }}>
                <textarea
                  value={editValues[config.config_key] || ''}
                  onChange={(e) => handleChange(config.config_key, e.target.value)}
                  rows={3}
                  style={{
                    padding: '10px 14px',
                    background: '#0d1f15',
                    color: '#fff',
                    border: '1px solid #3a6a4a',
                    borderRadius: '6px',
                    fontSize: '14px',
                    flex: 1,
                    resize: 'vertical',
                  }}
                />
                <button
                  onClick={() => handleSave(config.config_key)}
                  disabled={saving[config.config_key] || editValues[config.config_key] === config.config_value}
                  style={{
                    padding: '10px 20px',
                    background: editValues[config.config_key] !== config.config_value ? '#2ECC71' : '#555',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: editValues[config.config_key] !== config.config_value ? 'pointer' : 'default',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    whiteSpace: 'nowrap',
                    alignSelf: 'flex-start',
                  }}
                >
                  {saving[config.config_key] ? 'Saving...' : 'Save'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  value={editValues[config.config_key] || ''}
                  onChange={(e) => handleChange(config.config_key, e.target.value)}
                  placeholder={`Enter ${getConfigLabel(config.config_key)}`}
                  style={{
                    padding: '10px 14px',
                    background: '#0d1f15',
                    color: '#fff',
                    border: '1px solid #3a6a4a',
                    borderRadius: '6px',
                    fontSize: '14px',
                    flex: 1,
                  }}
                />
                <button
                  onClick={() => handleSave(config.config_key)}
                  disabled={saving[config.config_key] || editValues[config.config_key] === config.config_value}
                  style={{
                    padding: '10px 20px',
                    background: editValues[config.config_key] !== config.config_value ? '#2ECC71' : '#555',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: editValues[config.config_key] !== config.config_value ? 'pointer' : 'default',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {saving[config.config_key] ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}

            {config.updated_at && (
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#555' }}>
                Last updated: {new Date(config.updated_at).toLocaleString('id-ID')}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: '32px', padding: '16px', background: '#1a2a1a', borderRadius: '8px', border: '1px solid #2a4a2a' }}>
        <h3 style={{ color: '#F39C12', margin: '0 0 8px 0', fontSize: '14px' }}>How Version Control Works</h3>
        <ul style={{ color: '#888', fontSize: '13px', margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
          <li>Set <strong style={{ color: '#2ECC71' }}>Minimum App Version</strong> to block older app versions (e.g. "1.5.0")</li>
          <li>When a user opens an older version, they will see the <strong style={{ color: '#2ECC71' }}>Force Update Message</strong></li>
          <li>Enable <strong style={{ color: '#2ECC71' }}>Maintenance Mode</strong> to temporarily block ALL users from accessing the app</li>
          <li>Version format: major.minor.patch (e.g. 1.0.0, 1.5.0, 2.0.0)</li>
        </ul>
      </div>
    </div>
  );
}
