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
      <div style={{
        width: "100%", maxWidth: 360, position: "relative", zIndex: 1,
      }}>
        {/* Card */}
        <div style={{
          background: "var(--nw-surface)",
          border: "1px solid var(--nw-border)",
          borderRadius: "var(--nw-radius)",
          padding: "1.75rem",
        }}>
          {error && (
            <div
              style={{
                padding: ".5rem .75rem",
                background: "rgba(244,63,94,.05)",
                border: "1px solid var(--nw-danger)",
                borderRadius: "var(--nw-radius)", color: "var(--nw-danger)",
                fontSize: "0.75rem", fontWeight: 700, marginBottom: "1.25rem",
                textTransform: "uppercase", textAlign: "center"
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Username */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{
                display: "block", fontSize: ".65rem", fontWeight: 800,
                color: "var(--nw-muted)", marginBottom: ".4rem", letterSpacing: ".08em",
                textTransform: "uppercase"
              }}>
                Логін
              </label>
              <div style={{ position: "relative" }}>
                <User
                  size={14}
                  style={{
                    position: "absolute", left: 12, top: "50%",
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
                    width: "100%", padding: ".5rem 1rem .5rem 2.2rem",
                    background: "var(--nw-inset)",
                    border: "1px solid var(--nw-border)",
                    borderRadius: "var(--nw-radius)", color: "var(--nw-text)",
                    fontSize: ".8rem", outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{
                display: "block", fontSize: ".65rem", fontWeight: 800,
                color: "var(--nw-muted)", marginBottom: ".4rem", letterSpacing: ".08em",
                textTransform: "uppercase"
              }}>
                Пароль
              </label>
              <div style={{ position: "relative" }}>
                <Lock
                  size={14}
                  style={{
                    position: "absolute", left: 12, top: "50%",
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
                    width: "100%", padding: ".5rem 2.4rem .5rem 2.2rem",
                    background: "var(--nw-inset)",
                    border: "1px solid var(--nw-border)",
                    borderRadius: "var(--nw-radius)", color: "var(--nw-text)",
                    fontSize: ".8rem", outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position: "absolute", right: 10, top: "50%",
                    transform: "translateY(-50%)",
                    background: "none", border: "none", padding: 4, cursor: "pointer",
                    color: "var(--nw-muted)",
                  }}
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-100"
              style={{ padding: ".6rem" }}
            >
              {loading ? "Перевірка..." : "Увійти"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p style={{
          textAlign: "center", marginTop: "1.25rem",
          fontSize: ".6rem", color: "var(--nw-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em"
        }}>
        </p>
      </div>
    </div>
  );
}
