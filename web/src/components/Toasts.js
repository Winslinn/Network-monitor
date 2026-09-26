import { ToastContainer, Toast } from "react-bootstrap";
import { Info, TriangleAlert, CircleStop, Siren, Zap } from "lucide-react";

export const SEV_ICON = {
  low:      <Info size={16} className="text-info" />,
  medium:   <TriangleAlert size={16} className="text-warning" />,
  high:     <CircleStop size={16} className="text-danger" />,
  critical: <Siren size={16} className="text-danger" />,
};

export default function Toasts({ toasts }) {
  return (
    <ToastContainer position="top-end" className="p-3 toast-container">
      {toasts.map(t => (
        <Toast
          key={t.id}
          className={`nw-toast toast-${t.severity}`}
        >
          <Toast.Header
            closeVariant="white"
            className="nw-toast-header"
          >
            {/* Рендеримо іконку як React-компонент */}
            <span className="toast-icon">
              {SEV_ICON[t.severity] || <Zap size={16} />}
            </span>
            <strong className="toast-title">
              Event Log
            </strong>
            <small className="toast-time">NOW</small>
          </Toast.Header>

          <Toast.Body className="nw-toast-body">
            {t.message}
          </Toast.Body>
        </Toast>
      ))}
    </ToastContainer>
  );
}
