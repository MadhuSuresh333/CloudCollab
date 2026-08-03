import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getWorkspace, inviteMember, removeMember } from '../services/workspaceService.js';
import { listProjects, createProject } from '../services/projectService.js';
import Modal from '../components/Modal.jsx';

const roleBadgeClass = { owner: 'badge-owner', admin: 'badge-admin', member: 'badge-member' };

const WorkspaceDetail = () => {
  const { workspaceId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [workspace, setWorkspace] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tab, setTab] = useState('projects');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreateProject, setShowCreateProject] = useState(false);
  const [projectForm, setProjectForm] = useState({ name: '', description: '', dueDate: '' });
  const [submitting, setSubmitting] = useState(false);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member' });
  const [inviteError, setInviteError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [wsRes, projRes] = await Promise.all([
        getWorkspace(workspaceId),
        listProjects(workspaceId),
      ]);
      setWorkspace(wsRes.data.data);
      setProjects(projRes.data.data);
    } catch {
      setError('Could not load this workspace.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const myRole = workspace?.members.find((m) => m.user._id === user?._id)?.role;
  const canManage = myRole === 'owner' || myRole === 'admin';

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createProject(workspaceId, projectForm);
      setShowCreateProject(false);
      setProjectForm({ name: '', description: '', dueDate: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create project.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteError('');
    try {
      await inviteMember(workspaceId, inviteForm);
      setShowInvite(false);
      setInviteForm({ email: '', role: 'member' });
      load();
    } catch (err) {
      setInviteError(err.response?.data?.message || 'Could not invite that member.');
    }
  };

  const handleRemove = async (userId) => {
    if (!window.confirm('Remove this member from the workspace?')) return;
    await removeMember(workspaceId, userId);
    load();
  };

  if (loading) return <div className="loading-state">Loading workspace…</div>;
  if (error && !workspace) return <div className="form-error">{error}</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')} style={{ marginBottom: '0.5rem' }}>
            ← All workspaces
          </button>
          <h1 className="page-title">{workspace.name}</h1>
          <p className="page-subtitle">{workspace.description || 'No description yet.'}</p>
        </div>
        {tab === 'projects' && (
          <button className="btn btn-primary" onClick={() => setShowCreateProject(true)}>
            + New project
          </button>
        )}
        {tab === 'members' && canManage && (
          <button className="btn btn-primary" onClick={() => setShowInvite(true)}>
            + Invite member
          </button>
        )}
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'projects' ? 'active' : ''}`} onClick={() => setTab('projects')}>
          Projects
        </button>
        <button className={`tab ${tab === 'members' ? 'active' : ''}`} onClick={() => setTab('members')}>
          Members ({workspace.members.length})
        </button>
      </div>

      {tab === 'projects' &&
        (projects.length === 0 ? (
          <div className="empty-state card">
            <div className="empty-state-icon">📋</div>
            <h3>No projects yet</h3>
            <p style={{ marginTop: '0.5rem' }}>Create a project to start tracking tasks on a board.</p>
            <button className="btn btn-primary" style={{ marginTop: '1.25rem' }} onClick={() => setShowCreateProject(true)}>
              Create a project
            </button>
          </div>
        ) : (
          <div className="grid">
            {projects.map((p) => (
              <Link key={p._id} to={`/projects/${p._id}`} className="card card-link">
                <div className="card-title">{p.name}</div>
                <div className="card-desc">{p.description || 'No description yet.'}</div>
                <div className="card-meta">
                  <span className={`badge badge-${p.status === 'active' ? 'member' : 'admin'}`}>{p.status}</span>
                  <span>{p.dueDate ? new Date(p.dueDate).toLocaleDateString() : 'No due date'}</span>
                </div>
              </Link>
            ))}
          </div>
        ))}

      {tab === 'members' && (
        <div className="stack">
          {workspace.members.map((m) => (
            <div key={m.user._id} className="card row" style={{ justifyContent: 'space-between' }}>
              <div className="row">
                <div className="avatar">{m.user.name?.[0]?.toUpperCase()}</div>
                <div>
                  <div style={{ fontWeight: 600 }}>{m.user.name}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>{m.user.email}</div>
                </div>
              </div>
              <div className="row">
                <span className={`badge ${roleBadgeClass[m.role]}`}>{m.role}</span>
                {canManage && m.role !== 'owner' && m.user._id !== user._id && (
                  <button className="btn btn-danger btn-sm" onClick={() => handleRemove(m.user._id)}>
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateProject && (
        <Modal title="Create a project" onClose={() => setShowCreateProject(false)}>
          {error && <div className="form-error">{error}</div>}
          <form onSubmit={handleCreateProject}>
            <div className="form-group">
              <label className="form-label" htmlFor="p-name">
                Name
              </label>
              <input
                id="p-name"
                className="form-input"
                required
                autoFocus
                value={projectForm.name}
                onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="p-desc">
                Description
              </label>
              <textarea
                id="p-desc"
                className="form-textarea"
                value={projectForm.description}
                onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="p-due">
                Due date
              </label>
              <input
                id="p-due"
                type="date"
                className="form-input"
                value={projectForm.dueDate}
                onChange={(e) => setProjectForm({ ...projectForm, dueDate: e.target.value })}
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreateProject(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create project'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showInvite && (
        <Modal title="Invite a member" onClose={() => setShowInvite(false)}>
          {inviteError && <div className="form-error">{inviteError}</div>}
          <form onSubmit={handleInvite}>
            <div className="form-group">
              <label className="form-label" htmlFor="inv-email">
                Email address
              </label>
              <input
                id="inv-email"
                type="email"
                className="form-input"
                required
                autoFocus
                placeholder="teammate@company.com"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              />
              <p style={{ fontSize: '0.78rem', color: 'var(--text-faint)' }}>
                They must already have a CloudCollab account.
              </p>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="inv-role">
                Role
              </label>
              <select
                id="inv-role"
                className="form-select"
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowInvite(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Send invite
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default WorkspaceDetail;
