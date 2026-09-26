import { useState } from "react";
import { Lock, User, Eye, EyeOff } from "lucide-react";

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
    <div className="login-page">
      <div className="login-wrapper">
        {/* Card */}
        <div className="login-card">
          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} id="login-form" name="login">
            {/* Username */}
            <div className="login-field login-field-username">
              <label
                htmlFor="username"
                className="login-label"
              >
                Логін
              </label>
              <div className="login-input-wrapper">
                <User size={14} className="login-input-icon" />
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoFocus
                  autoComplete="username"
                  aria-label="Логін"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Введіть логін"
                  className="login-input username-input"
                />
              </div>
            </div>

            {/* Password */}
            <div className="login-field login-field-password">
              <label
                htmlFor="password"
                className="login-label"
              >
                Пароль
              </label>
              <div className="login-input-wrapper">
                <Lock size={14} className="login-input-icon" />
                <input
                  id="password"
                  name="password"
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  aria-label="Пароль"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Введіть пароль"
                  className="login-input password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="password-toggle"
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-100 login-submit"
            >
              {loading ? "Перевірка..." : "Увійти"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="login-footer">
        </p>
      </div>
    </div>
  );
}
