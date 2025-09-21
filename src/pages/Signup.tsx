import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";

export default function Signup(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signup, isAuthenticated } = useAuth();

  const presetEmail = useMemo(
    () => searchParams.get("email") || "",
    [searchParams]
  );
  const presetToken = useMemo(
    () => searchParams.get("token") || "",
    [searchParams]
  );
  const presetName = useMemo(
    () => searchParams.get("name") || "",
    [searchParams]
  );

  const [email, setEmail] = useState<string>(presetEmail);
  const [name, setName] = useState<string>(presetName);
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [token, setToken] = useState<string>(presetToken);
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setError("");

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedToken = token.trim();
    const trimmedPassword = password.trim();

    if (!trimmedToken) {
      setError("Invite token is required.");
      return;
    }
    if (!trimmedEmail || !trimmedPassword) {
      setError("Email and password are required.");
      return;
    }
    if (trimmedPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (trimmedPassword !== confirmPassword.trim()) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await signup({
        email: trimmedEmail,
        password: trimmedPassword,
        token: trimmedToken,
        name: name.trim(),
      });
      navigate("/dashboard", { replace: true });
    } catch (unknownError) {
      const err = unknownError as Error;
      setError(err.message || "Unable to complete signup.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 py-12 text-slate-100">
      <Card className="w-full max-w-lg border-white/10 bg-white/[0.07] text-slate-100 shadow-[0_25px_60px_rgba(7,12,24,0.65)] backdrop-blur-xl">
        <CardHeader className="space-y-2 text-left">
          <CardTitle className="text-2xl text-white">Partner sign up</CardTitle>
          <CardDescription className="text-sm text-slate-400">
            Paste the invite token from your onboarding email and set your credentials to access the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="token" className="text-slate-200">
                Invite token
              </Label>
              <Input
                id="token"
                type="text"
                placeholder="Paste your invite token"
                value={token}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  setToken(event.target.value);
                  if (error) {
                    setError("");
                  }
                }}
                autoComplete="off"
                className="border-white/15 bg-white/[0.06] text-white placeholder:text-slate-400 focus-visible:border-white/40 focus-visible:ring-white/20"
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-slate-200">
                Work email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="partner@example.com"
                autoComplete="email"
                value={email}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  setEmail(event.target.value);
                  if (error) {
                    setError("");
                  }
                }}
                className="border-white/15 bg-white/[0.06] text-white placeholder:text-slate-400 focus-visible:border-white/40 focus-visible:ring-white/20"
              />
            </div>
            <div>
              <Label htmlFor="name" className="text-slate-200">
                Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Full name"
                autoComplete="name"
                value={name}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  setName(event.target.value);
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
                autoComplete="new-password"
                value={password}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  setPassword(event.target.value);
                  if (error) {
                    setError("");
                  }
                }}
                className="border-white/15 bg-white/[0.06] text-white placeholder:text-slate-400 focus-visible:border-white/40 focus-visible:ring-white/20"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword" className="text-slate-200">
                Confirm password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  setConfirmPassword(event.target.value);
                  if (error) {
                    setError("");
                  }
                }}
                className="border-white/15 bg-white/[0.06] text-white placeholder:text-slate-400 focus-visible:border-white/40 focus-visible:ring-white/20"
              />
            </div>
            {error ? (
              <p className="text-sm text-rose-300" role="alert">
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              className="w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating account..." : "Create account"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="block text-left text-xs text-slate-400">
          <p>
            Already have access?{" "}
            <Link to="/login" className="text-sky-300 underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
