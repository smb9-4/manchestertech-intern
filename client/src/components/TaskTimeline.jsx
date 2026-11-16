const formatDate = (date) => {
  if (!date) return 'Assignment date unavailable';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? 'Assignment date unavailable'
    : parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const parsedDate = (date) => {
  if (!date) return null;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const dateKey = (date) => {
  const parsed = parsedDate(date);
  if (!parsed) return 'unknown';
  return `${parsed.getFullYear()}-${parsed.getMonth()}-${parsed.getDate()}`;
};

export default function TaskTimeline({ tasks, showAssignee = false }) {
  const groups = new Map();
  [...tasks]
    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
    .forEach((task) => {
      const key = dateKey(task.createdAt);
      if (!groups.has(key)) groups.set(key, { label: formatDate(task.createdAt), tasks: [] });
      groups.get(key).tasks.push(task);
    });

  return <div className="task-timeline">
    {[...groups.entries()].map(([key, group]) => <section className="task-timeline-day" key={key}>
      <h4 className="task-timeline-date">{group.label}</h4>
      {group.tasks.map((task) => {
        const complete = task.status === 'approved';
        return <div className={'task-timeline-step' + (complete ? ' complete' : '')} key={task._id}>
          <span className="task-timeline-marker" aria-label={complete ? 'Completed' : 'Not completed'}>{complete ? '✓' : ''}</span>
          <div className="grow">
            <div className="t">{task.title}</div>
            <div className="s">
              {showAssignee && <>{task.assignee?.name || 'Unassigned'} · </>}
              {complete ? 'Completed' : 'Not completed'} · Assigned {formatDate(task.createdAt)}
            </div>
          </div>
        </div>;
      })}
    </section>)}
  </div>;
}
