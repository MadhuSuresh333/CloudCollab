import { useState } from 'react';
import Modal from './Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const emptyForm = {
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  dueDate: '',
  labels: '',
};

const TaskModal = ({ task, members, onClose, onSave, onDelete, onAddComment }) => {
  const { user } = useAuth();
  const isEdit = !!task;
  const [form, setForm] = useState(
    isEdit
      ? {
          title: task.title,
          description: task.description || '',
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
          labels: (task.labels || []).join(', '),
          assignees: (task.assignees || []).map((a) => a._id),
        }
      : { ...emptyForm, assignees: [] }
  );
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        ...form,
        labels: form.labels
          .split(',')
          .map((l) => l.trim())
          .filter(Boolean),
        dueDate: form.dueDate || null,
      };
      await onSave(payload, task?._id);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save task.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAssignee = (id) => {
    setForm((f) => ({
      ...f,
      assignees: f.assignees.includes(id)
        ? f.assignees.filter((a) => a !== id)
        : [...f.assignees, id],
    }));
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    await onAddComment(task._id, commentText.trim());
    setCommentText('');
  };

  return (
    <Modal title={isEdit ? 'Edit task' : 'New task'} onClose={onClose} width="560px">
      {error && <div className="form-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="t-title">
            Title
          </label>
          <input
            id="t-title"
            className="form-input"
            required
            autoFocus
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="t-desc">
            Description
          </label>
          <textarea
            id="t-desc"
            className="form-textarea"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label" htmlFor="t-status">
              Status
            </label>
            <select
              id="t-status"
              className="form-select"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="todo">To do</option>
              <option value="in-progress">In progress</option>
              <option value="review">Review</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label" htmlFor="t-priority">
              Priority
            </label>
            <select
              id="t-priority"
              className="form-select"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label" htmlFor="t-due">
              Due date
            </label>
            <input
              id="t-due"
              type="date"
              className="form-input"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="t-labels">
            Labels (comma separated)
          </label>
          <input
            id="t-labels"
            className="form-input"
            placeholder="frontend, bug, urgent"
            value={form.labels}
            onChange={(e) => setForm({ ...form, labels: e.target.value })}
          />
        </div>

        {members?.length > 0 && (
          <div className="form-group">
            <label className="form-label">Assignees</label>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              {members.map((m) => (
                <button
                  type="button"
                  key={m._id}
                  onClick={() => toggleAssignee(m._id)}
                  className={`badge ${form.assignees.includes(m._id) ? 'badge-owner' : 'badge-member'}`}
                  style={{ border: 'none' }}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
          {isEdit ? (
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => onDelete(task._id).then(onClose)}
            >
              Delete task
            </button>
          ) : (
            <span />
          )}
          <div className="row">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create task'}
            </button>
          </div>
        </div>
      </form>

      {isEdit && (
        <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
          <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>
            Comments ({task.comments?.length || 0})
          </h4>
          <div className="stack" style={{ gap: 0, marginBottom: '1rem', maxHeight: '200px', overflowY: 'auto' }}>
            {(task.comments || []).map((c) => (
              <div className="comment" key={c._id}>
                <div className="avatar avatar-sm">{c.user?.name?.[0]?.toUpperCase()}</div>
                <div className="comment-body">
                  <div className="comment-meta">
                    <span className="comment-author">{c.user?.name}</span>
                    <span className="comment-time">
                      {new Date(c.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="comment-text">{c.text}</div>
                </div>
              </div>
            ))}
            {(!task.comments || task.comments.length === 0) && (
              <p style={{ color: 'var(--text-faint)', fontSize: '0.85rem' }}>No comments yet.</p>
            )}
          </div>
          <form onSubmit={handleComment} className="row">
            <input
              className="form-input"
              placeholder={`Comment as ${user?.name?.split(' ')[0]}…`}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-secondary">
              Post
            </button>
          </form>
        </div>
      )}
    </Modal>
  );
};

export default TaskModal;
