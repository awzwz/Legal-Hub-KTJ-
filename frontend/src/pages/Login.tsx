import { useState, useEffect, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ACCESS_TOKEN_KEY = "legalhub_access_token";

const Login = () => {
  const navigate = useNavigate();
  const forceMock = import.meta.env.VITE_FORCE_MOCK === "true";
  const [sessionReady, setSessionReady] = useState(false);
  const [email, setEmail] = useState("director@company.kz");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (forceMock) return;
    const t = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!t) {
      setSessionReady(true);
      return;
    }
    fetch("/api/v1/auth/me", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => {
        if (r.ok) {
          navigate("/", { replace: true });
          return;
        }
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        setSessionReady(true);
      })
      .catch(() => {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        setSessionReady(true);
      });
  }, [forceMock, navigate]);

  if (forceMock) {
    return <Navigate to="/" replace />;
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 text-sm text-muted-foreground">
        Проверка сессии…
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      if (!res.ok) {
        setError("Неверный email или пароль");
        return;
      }
      const data = (await res.json()) as { access_token?: string };
      if (!data.access_token) {
        setError("Сервер не вернул токен");
        return;
      }
      localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
      navigate("/", { replace: true });
    } catch {
      setError("Сеть недоступна. Повторите попытку.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">Вход в LegalHub КТЖ</CardTitle>
          <CardDescription>Введите корпоративный email и пароль.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Вход…" : "Войти"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Login;
