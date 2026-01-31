import { useState, useEffect } from 'react';
import { adminApi } from '../services/api';

export function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getAnnouncements();
      setAnnouncements(response.announcements || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const adminData = JSON.parse(localStorage.getItem('admin_user') || '{}');
      await adminApi.createAnnouncement(title, content, adminData?.id);
      setTitle('');
      setContent('');
      loadAnnouncements();
      alert('Announcement created successfully');
    } catch (err) {
      alert('Error creating announcement: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="page">Loading...</div>;

  return (
    <div className="page">
      <h2>📢 Announcements</h2>

      <form onSubmit={handleSubmit} className="form-container">
        <div className="form-group">
          <label>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Announcement title"
          />
        </div>

        <div className="form-group">
          <label>Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Announcement content"
            rows="4"
          />
        </div>

        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Announcement'}
        </button>
      </form>

      <h3>Recent Announcements</h3>
      {error && <p className="error">Error: {error}</p>}
      {announcements.length === 0 ? (
        <p>No announcements yet</p>
      ) : (
        <div className="announcements-list">
          {announcements.map((announcement) => (
            <div key={announcement.id} className="announcement-card">
              <h4>{announcement.title}</h4>
              <p>{announcement.content}</p>
              <small>{new Date(announcement.created_at).toLocaleString()}</small>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .form-container {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
          max-width: 600px;
        }

        .announcements-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .announcement-card {
          background: white;
          padding: 15px;
          border-radius: 8px;
          border-left: 4px solid #0a5229;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .announcement-card h4 {
          margin: 0 0 8px 0;
          color: #082919;
        }

        .announcement-card p {
          margin: 8px 0;
          color: #666;
        }

        .announcement-card small {
          color: #999;
        }

        textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          font-family: inherit;
        }
      `}</style>
    </div>
  );
}
