const priorityClass = {
  low: 'badge-priority-low',
  medium: 'badge-priority-medium',
  high: 'badge-priority-high',
  urgent: 'badge-priority-urgent',
};

const TaskCard = ({ task, onClick, onDragStart, isDragging }) => {
  return (
    <div
      className={`task-card ${isDragging ? 'is-dragging' : ''}`}
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onClick={() => onClick(task)}
    >
      {task.labels?.length > 0 && (
        <div className="task-card-labels">
          {task.labels.map((label) => (
            <span key={label} className="label-chip">
              {label}
            </span>
          ))}
        </div>
      )}
      <div className="task-card-title">{task.title}</div>
      <div className="task-card-footer">
        <span className={`badge ${priorityClass[task.priority]}`}>{task.priority}</span>
        <div className="row" style={{ gap: '0.3rem' }}>
          {task.assignees?.slice(0, 3).map((a) => (
            <div key={a._id} className="avatar avatar-sm" title={a.name}>
              {a.name?.[0]?.toUpperCase()}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
