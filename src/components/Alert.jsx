export default function Alert({ type = 'info', message, onClose, dark = false }) {
  const icons = {
    success: 'fas fa-check-circle',
    error:   'fas fa-exclamation-circle',
    warning: 'fas fa-exclamation-triangle',
    info:    'fas fa-info-circle',
  };

  const prefix = dark ? 'dp-alert' : 'alert';

  return (
    <div className={`${prefix} ${prefix}-${type}`}>
      <i className={icons[type] ?? icons.info}></i>
      <span style={{ flex: 1 }}>{message}</span>
      {onClose && (
        <button className={`${prefix}-close`} onClick={onClose} aria-label="Close">
          <i className="fas fa-times"></i>
        </button>
      )}
    </div>
  );
}
