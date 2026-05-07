export default function Alert({ type = 'info', message, onClose }) {
  const icons = {
    success: 'fas fa-check-circle',
    error:   'fas fa-exclamation-circle',
    warning: 'fas fa-exclamation-triangle',
    info:    'fas fa-info-circle',
  };

  return (
    <div className={`alert alert-${type}`}>
      <i className={icons[type] ?? icons.info}></i>
      <span style={{ flex: 1 }}>{message}</span>
      {onClose && (
        <button className="alert-close" onClick={onClose} aria-label="Close">
          <i className="fas fa-times"></i>
        </button>
      )}
    </div>
  );
}
