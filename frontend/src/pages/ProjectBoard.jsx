import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext.jsx';
import { getProject } from '../services/projectService.js';
import { getWorkspace } from '../services/workspaceService.js';
import * as taskApi from '../services/taskService.js';
import TaskCard from '../components/TaskCard.jsx';
import TaskModal from '../components/TaskModal.jsx';

const COLUMNS = [
  { key: 'todo', label: 'To do', dot: 'var(--text-faint)' },
  { key: 'in-progress', label: 'In progress', dot: 'var(--info)' },
  { key: 'review', label: 'Review', dot: 'var(--warning)' },
  { key: 'done', label: 'Done', dot: 'var(--success)' },
];

const ProjectBoard = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();

  const [project, setProject] = useState(null);
  const [assignableMembers, setAssignableMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTask, setActiveTask] = useState(null);
  const [showCreateFor, setShowCreateFor] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const draggedTask = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [projRes, tasksRes] = await Promise.all([
        getProject(projectId),
        taskApi.listTasks(projectId),
      ]);
      setProject(projRes.data.data);
      setTasks(tasksRes.data.data);

      const wsRes = await getWorkspace(projRes.data.data.workspace);
      setAssignableMembers(wsRes.data.data.members.map((m) => m.user));
    } catch {
      setError('Could not load this project.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  // Real-time board sync
  useEffect(() => {
    if (!socket || !isConnected) return;
    const room = `project:${projectId}`;
    socket.emit('join:room', room);

    const upsert = (task) =>
      setTasks((prev) => {
        const exists = prev.some((t) => t._id === task._id);
        return exists ? prev.map((t) => (t._id === task._id ? task : t)) : [...prev, task];
      });
    const remove = ({ _id }) => setTasks((prev) => prev.filter((t) => t._id !== _id));

    socket.on('task:created', upsert);
    socket.on('task:updated', upsert);
    socket.on('task:moved', upsert);
    socket.on('task:comment', upsert);
    socket.on('task:deleted', remove);

    return () => {
      socket.emit('leave:room', room);
      socket.off('task:created', upsert);
      socket.off('task:updated', upsert);
      socket.off('task:moved', upsert);
      socket.off('task:comment', upsert);
      socket.off('task:deleted', remove);
    };
  }, [socket, isConnected, projectId]);

  const handleSaveTask = async (payload, taskId) => {
    if (taskId) {
      const { data } = await taskApi.updateTask(taskId, payload);
      setTasks((prev) => prev.map((t) => (t._id === taskId ? data.data : t)));
    } else {
      const { data } = await taskApi.createTask(projectId, payload);
      setTasks((prev) => [...prev, data.data]);
    }
  };

  const handleDeleteTask = async (taskId) => {
    await taskApi.deleteTask(taskId);
    setTasks((prev) => prev.filter((t) => t._id !== taskId));
  };

  const handleAddComment = async (taskId, text) => {
    const { data } = await taskApi.addComment(taskId, text);
    setTasks((prev) => prev.map((t) => (t._id === taskId ? data.data : t)));
    setActiveTask(data.data);
  };

  const handleDragStart = (e, task) => {
    draggedTask.current = task;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (status) => {
    setDragOverCol(null);
    const task = draggedTask.current;
    draggedTask.current = null;
    if (!task || task.status === status) return;

    const targetTasks = tasks.filter((t) => t.status === status);
    const position = targetTasks.length;

    // optimistic update
    setTasks((prev) => prev.map((t) => (t._id === task._id ? { ...t, status, position } : t)));
    try {
      await taskApi.moveTask(task._id, status, position);
    } catch {
      load(); // reconcile on failure
    }
  };

  if (loading) return <div className="loading-state">Loading board…</div>;
  if (error) return <div className="form-error">{error}</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: '0.5rem' }}>
            ← Back
          </button>
          <h1 className="page-title">{project.name}</h1>
          <p className="page-subtitle">{project.description || 'No description yet.'}</p>
        </div>
      </div>

      <div className="board">
        {COLUMNS.map((col) => {
          const colTasks = tasks
            .filter((t) => t.status === col.key)
            .sort((a, b) => a.position - b.position);

          return (
            <div
              key={col.key}
              className={`board-column ${dragOverCol === col.key ? 'is-drag-over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverCol(col.key);
              }}
              onDragLeave={() => setDragOverCol((c) => (c === col.key ? null : c))}
              onDrop={() => handleDrop(col.key)}
            >
              <div className="board-column-header">
                <span>
                  <span className="column-dot" style={{ background: col.dot }} />
                  {col.label}
                </span>
                <span className="board-column-count">{colTasks.length}</span>
              </div>
              <div className="board-column-body">
                {colTasks.map((task) => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    onClick={setActiveTask}
                    onDragStart={handleDragStart}
                  />
                ))}
                <button className="add-task-btn" onClick={() => setShowCreateFor(col.key)}>
                  + Add task
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {activeTask && (
        <TaskModal
          task={activeTask}
          members={assignableMembers}
          onClose={() => setActiveTask(null)}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
          onAddComment={handleAddComment}
        />
      )}

      {showCreateFor && (
        <TaskModal
          task={null}
          members={assignableMembers}
          onClose={() => setShowCreateFor(null)}
          onSave={(payload) => handleSaveTask({ ...payload, status: showCreateFor })}
        />
      )}
    </div>
  );
};

export default ProjectBoard;
