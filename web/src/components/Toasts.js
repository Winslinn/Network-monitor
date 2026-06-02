import { Toast, ToastContainer } from "react-bootstrap";

export const SEV_ICON = { low: "ℹ️", medium: "⚠️", high: "🔴", critical: "🚨" };

export default function Toasts({ toasts }) {
  return (
    <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999 }}>
      {toasts.map(t => (
        <Toast key={t.id} bg="dark" className="border-secondary text-light">
          <Toast.Header closeVariant="white" className="bg-dark text-light border-secondary">
            <span className="me-2">{SEV_ICON[t.severity] || "⚡"}</span>
            <strong className="me-auto text-uppercase small font-monospace">Сповіщення</strong>
            <small className="text-secondary">щойно</small>
          </Toast.Header>
          <Toast.Body className="small font-monospace">
            {t.message}
          </Toast.Body>
        </Toast>
      ))}
    </ToastContainer>
  );
}
