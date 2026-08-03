import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { listWorkspaces, createWorkspace } from '../services/workspaceService.js';
import Modal from '../components/Modal.jsx';

const Dashboard = () => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadWorkspaces = async () => {
    setLoading(true);
    try {
      const { data } = await listWorkspaces();
      setWorkspaces(data.data);
    } catch {
      setError('Could not load your workspaces.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await createWorkspace(form);
      setShowCreate(false);
      setForm({ name: '', description: '' });
      loadWorkspaces();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create workspace.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {user?.name?.split(' ')[0]}</h1>
          <p className="page-subtitle">Pick a workspace to jump back into your team's work.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + New workspace
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Loading workspaces…</div>
      ) : workspaces.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon">🗂️</div>
          <h3>No workspaces yet</h3>
          <p style={{ marginTop: '0.5rem' }}>
            Create your first workspace to start organizing projects and tasks with your team.
          </p>
          <button className="btn btn-primary" style={{ marginTop: '1.25rem' }} onClick={() => setShowCreate(true)}>
            Create a workspace
          </button>
        </div>
      ) : (
        <div className="grid">
          {workspaces.map((ws) => (
            <Link key={ws._id} to={`/workspaces/${ws._id}`} className="card card-link">
              <div className="card-title">{ws.name}</div>
              <div className="card-desc">{ws.description || 'No description yet.'}</div>
              <div className="card-meta">
                <span>
                  {ws.members.length} member{ws.members.length !== 1 ? 's' : ''}
                </span>
                <span>{new Date(ws.updatedAt).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showCreate && (
        <Modal title="Create a workspace" onClose={() => setShowCreate(false)}>
          {error && <div className="form-error">{error}</div>}
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label" htmlFor="ws-name">
                Name
              </label>
              <input
                id="ws-name"
                className="form-input"
                required
                autoFocus
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="ws-desc">
                Description
              </label>
              <textarea
                id="ws-desc"
                className="form-textarea"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create workspace'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Dashboard;
