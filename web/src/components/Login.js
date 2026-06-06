import { useState } from "react";
import { Form, Button, Alert, Spinner } from "react-bootstrap";
import { Shield, Lock, User, Eye, EyeOff } from "lucide-react";

export default function Login({ onLoginSuccess }) {
  const [username, setUsername]       = useState("");
  const [password, setPassword]       = useState("");
  const [showPass, setShowPass]       = useState(false);
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("https://potyshyi-server:8443/api/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        onLoginSuccess();
      } else {
        const data = await res.json();
        setError(data.detail || "Невірний логін або пароль");
      }
    } catch {
      setError("Помилка з'єднання з сервером");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--nw-bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1rem",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Ambient background grid */}
      <div aria-hidden style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: `
          linear-gradient(rgba(13,202,170,.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(13,202,170,.04) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
      }} />
      {/* Glow orb */}
      <div aria-hidden style={{
        position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)",
        width: 480, height: 480,
        background: "radial-gradient(ellipse, rgba(13,202,170,.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{
        width: "100%", maxWidth: 400, position: "relative", zIndex: 1,
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 56, height: 56, borderRadius: 16,
            background: "var(--nw-accent-bg)",
            border: "1px solid rgba(13,202,170,.25)",
            marginBottom: "1.25rem",
            boxShadow: "0 0 32px rgba(13,202,170,.12)",
          }}>
            <Shield size={26} color="var(--nw-accent)" />
          </div>
          <h1 style={{
            fontSize: "1.6rem", fontWeight: 800, margin: 0,
            color: "var(--nw-text)", letterSpacing: "-.02em",
          }}>NetWatch</h1>
          <p style={{
            margin: ".4rem 0 0", fontSize: ".85rem",
            color: "var(--nw-muted)", fontWeight: 500,
          }}>
            Система мережевого моніторингу
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "var(--nw-surface)",
          border: "1px solid var(--nw-border)",
          borderRadius: 16,
          padding: "2rem",
          boxShadow: "0 24px 48px rgba(0,0,0,.4)",
        }}>
          {error && (
            <Alert
              variant="danger"
              className="py-2 small border-0 mb-4"
              style={{
                background: "rgba(244,63,94,.08)",
                border: "1px solid rgba(244,63,94,.25) !important",
                borderRadius: 10, color: "var(--nw-danger)",
              }}
            >
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            {/* Username */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{
                display: "block", fontSize: ".78rem", fontWeight: 600,
                color: "var(--nw-muted)", marginBottom: ".5rem", letterSpacing: ".02em",
              }}>
                Користувач
              </label>
              <div style={{ position: "relative" }}>
                <User
                  size={15}
                  style={{
                    position: "absolute", left: 14, top: "50%",
                    transform: "translateY(-50%)", color: "var(--nw-muted)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="text"
                  autoFocus
                  autoComplete="username"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Введіть логін"
                  style={{
                    width: "100%", padding: ".65rem 1rem .65rem 2.6rem",
                    background: "var(--nw-inset)",
                    border: "1px solid var(--nw-border)",
                    borderRadius: 9, color: "var(--nw-text)",
                    fontSize: ".875rem", outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color .15s, box-shadow .15s",
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = "var(--nw-accent)";
                    e.target.style.boxShadow = "0 0 0 3px var(--nw-accent-bg)";
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = "var(--nw-border)";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: "1.75rem" }}>
              <label style={{
                display: "block", fontSize: ".78rem", fontWeight: 600,
                color: "var(--nw-muted)", marginBottom: ".5rem", letterSpacing: ".02em",
              }}>
                Пароль
              </label>
              <div style={{ position: "relative" }}>
                <Lock
                  size={15}
                  style={{
                    position: "absolute", left: 14, top: "50%",
                    transform: "translateY(-50%)", color: "var(--nw-muted)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Введіть пароль"
                  style={{
                    width: "100%", padding: ".65rem 2.6rem .65rem 2.6rem",
                    background: "var(--nw-inset)",
                    border: "1px solid var(--nw-border)",
                    borderRadius: 9, color: "var(--nw-text)",
                    fontSize: ".875rem", outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color .15s, box-shadow .15s",
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = "var(--nw-accent)";
                    e.target.style.boxShadow = "0 0 0 3px var(--nw-accent-bg)";
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = "var(--nw-border)";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position: "absolute", right: 12, top: "50%",
                    transform: "translateY(-50%)",
                    background: "none", border: "none", padding: 4, cursor: "pointer",
                    color: "var(--nw-muted)",
                  }}
                  aria-label={showPass ? "Сховати пароль" : "Показати пароль"}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: ".75rem",
                background: loading ? "rgba(13,202,170,.5)" : "var(--nw-accent)",
                border: "none", borderRadius: 10,
                color: "#000", fontWeight: 700,
                fontSize: ".9rem", cursor: loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "background .15s, transform .1s",
                letterSpacing: ".01em",
              }}
              onMouseEnter={e => !loading && (e.target.style.background = "#0aaa8e")}
              onMouseLeave={e => !loading && (e.target.style.background = "var(--nw-accent)")}
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" style={{ width: 14, height: 14, borderWidth: 2 }} />
                  Перевірка…
                </>
              ) : "Увійти"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p style={{
          textAlign: "center", marginTop: "1.5rem",
          fontSize: ".72rem", color: "var(--nw-muted)", opacity: .6,
        }}>
          NetWatch · Захищений доступ
        </p>
      </div>
    </div>
  );
}
