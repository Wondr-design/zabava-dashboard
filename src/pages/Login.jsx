import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user?.role === "partner") {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setError("");

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError("Enter both email and password.");
      return;
    }

    setIsSubmitting(true);
    login({ email: trimmedEmail, password: trimmedPassword })
      .then((payload) => {
        if (payload?.user?.role !== "partner") {
          setError("Use the admin login to access the console.");
          return;
        }
        navigate("/dashboard", { replace: true });
      })
      .catch((err) => {
        setError(err.message || "Invalid credentials");
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const demoAccount = useMemo(() => {
    try {
      return import.meta.env.VITE_DEMO_ACCOUNT
        ? JSON.parse(import.meta.env.VITE_DEMO_ACCOUNT)
        : null;
    } catch (err) {
      console.warn("Failed to parse VITE_DEMO_ACCOUNT", err);
      return null;
    }
  }, []);

  const showDemoBanner = Boolean(demoAccount?.email && demoAccount?.password);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 py-12 text-slate-100">
      <Card className="w-full max-w-md border-white/10 bg-white/[0.07] text-slate-100 shadow-[0_25px_60px_rgba(7,12,24,0.65)] backdrop-blur-xl">
        <CardHeader className="space-y-2 text-left">
          <CardTitle className="text-2xl text-white">Partner login</CardTitle>
          <CardDescription className="text-sm text-slate-400">
            Access the Lasermax partner dashboard with the credentials sent to your inbox.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-slate-200">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="partner@example.com"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (error) {
                    setError("");
                  }
                }}
                className="border-white/15 bg-white/[0.06] text-white placeholder:text-slate-400 focus-visible:border-white/40 focus-visible:ring-white/20"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-slate-200">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (error) {
                    setError("");
                  }
                }}
                className="border-white/15 bg-white/[0.06] text-white placeholder:text-slate-400 focus-visible:border-white/40 focus-visible:ring-white/20"
              />
            </div>
            {error && (
              <p className="text-sm text-rose-300" role="alert">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in..." : "Login"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="block text-left text-xs text-slate-400">
          {showDemoBanner ? (
            <div>
              Demo credentials: {demoAccount.email} / {demoAccount.password}
            </div>
          ) : (
            <div className="space-y-1">
              <p>Contact your administrator if you need access.</p>
              <p>
                Have an invite? {" "}
                <Link to="/signup" className="text-sky-300 underline">
                  Create your account
                </Link>
              </p>
              <p>
                Admin? {" "}
                <Link to="/admin/login" className="text-sky-300 underline">
                  Log in here
                </Link>
              </p>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
