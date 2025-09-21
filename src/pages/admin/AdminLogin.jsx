import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Enter both email and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = await login({ email: email.trim().toLowerCase(), password });
      if (payload?.user?.role !== "admin") {
        setError("This account is not authorized for admin access.");
        return;
      }
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Unable to sign in");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 py-12 text-slate-100">
      <Card className="w-full max-w-md border-white/10 bg-white/[0.07] text-slate-100 shadow-[0_25px_60px_rgba(7,12,24,0.65)] backdrop-blur-xl">
        <CardHeader className="space-y-2 text-left">
          <CardTitle className="text-2xl text-white">Admin login</CardTitle>
          <CardDescription className="text-sm text-slate-400">
            Enter your admin credentials to manage partners, invitations, and analytics.
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
                placeholder="admin@example.com"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
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
                onChange={(event) => setPassword(event.target.value)}
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
              {isSubmitting ? "Signing in…" : "Login"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="block text-left text-xs text-slate-400">
          <p>
            Use the credentials configured by your platform administrator.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
