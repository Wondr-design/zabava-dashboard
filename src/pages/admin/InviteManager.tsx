import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Link2, Loader2, RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL, buildApiUrl } from "@/lib/config";
import { cn } from "@/lib/utils";
import type {
  AdminInvite,
  AnalyticsPartnerOption,
  InviteSummaryMessage,
} from "@/types/dashboard";

const PRIMARY_BUTTON_CLASS = "bg-white text-slate-950 hover:bg-white/90 border border-white/80";
const SECONDARY_BUTTON_CLASS = "bg-white/70 text-slate-950 hover:bg-white/60 border border-white/60";

interface InviteRowProps {
  invite: AdminInvite;
  onCopyLink: (invite: AdminInvite) => void;
  onCopyToken: (token: string) => void;
}

interface InviteDetailProps {
  title: string;
  value: string;
  highlight?: boolean;
}

interface SummaryStatProps {
  label: string;
  value: string;
  tone: "pending" | "used" | "warning";
}

interface RefreshInvitesOptions {
  silent?: boolean;
  signal?: AbortSignal;
}

interface PartnerOption extends AnalyticsPartnerOption {
  metrics?: { count?: number };
  lastSubmissionAt?: string | null;
}

function formatDate(iso?: string | Date | null): string {
  if (!iso) return "—";
  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatCountdown(iso?: string | null): string {
  if (!iso) return "—";
  const expires = new Date(iso).getTime();
  if (Number.isNaN(expires)) return "—";
  const diff = expires - Date.now();
  if (diff <= 0) return "Expired";
  const minutes = Math.floor(diff / 60000);
  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes % (60 * 24)) / 60);
  const mins = minutes % 60;
  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

function InviteRow({ invite, onCopyLink, onCopyToken }: InviteRowProps): JSX.Element {
  const isUsed = invite.used;
  const statusStyles = isUsed
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
    : "border-amber-400/40 bg-amber-500/10 text-amber-100";
  const statusLabel = isUsed ? "Used" : "Pending";
  const expiresSoon = !isUsed && invite.expiresAt && new Date(invite.expiresAt) - Date.now() < 86_400_000;
  const expiresLabel = formatCountdown(invite.expiresAt);

  return (
    <div className="group grid gap-5 rounded-xl border border-white/20 bg-gradient-to-br from-white/[0.08] to-white/[0.12] p-6 shadow-xl backdrop-blur-xl hover:shadow-2xl hover:border-white/30 transition-all duration-300 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
        <div className="min-w-0 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">
              {invite.email ? invite.email.charAt(0).toUpperCase() : "?"}
            </span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-white group-hover:text-blue-100 transition-colors">
              {invite.email || "(no email)"}
            </p>
            <p className="truncate text-sm text-slate-300 group-hover:text-slate-200 transition-colors">
              {invite.name ? invite.name : "Partner contact"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm ${statusStyles}`}>
            <div className={`inline-block h-1.5 w-1.5 rounded-full mr-2 ${isUsed ? "bg-emerald-400" : "bg-amber-400"}`}></div>
            {statusLabel}
          </span>
          <Badge variant="outline" className="border-white/20 bg-white/[0.08] text-slate-100 font-medium px-3 py-1">
            {(invite.partnerId || "").toString().toUpperCase() || "—"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 relative z-10">
        <InviteDetail title="Created" value={formatDate(invite.createdAt)} />
        <InviteDetail title="Expires" value={formatDate(invite.expiresAt)} highlight={expiresSoon} />
        <InviteDetail title="Time remaining" value={expiresLabel} highlight={expiresSoon && !isUsed} />
        <InviteDetail
          title="Used on"
          value={isUsed ? formatDate(invite.usedAt) : "Not yet"}
          highlight={isUsed}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 relative z-10">
        <Button
          size="sm"
          variant="outline"
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 hover:from-blue-700 hover:to-purple-700 shadow-md font-medium px-4 py-2 rounded-lg transition-all duration-200"
          onClick={() => onCopyLink(invite)}
        >
          <Link2 className="size-4 mr-2" /> Copy invite link
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="bg-white/10 text-white border border-white/30 hover:bg-white/20 hover:border-white/50 shadow-sm font-medium px-4 py-2 rounded-lg transition-all duration-200"
          onClick={() => onCopyToken(invite.token)}
        >
          <Copy className="size-4 mr-2" /> Copy token
        </Button>
        {invite.inviteUrl ? (
          <a
            href={invite.inviteUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-slate-300 underline-offset-2 hover:text-blue-300 hover:underline transition-colors font-medium"
          >
            Open invite
          </a>
        ) : null}
      </div>
    </div>
  );
}

function InviteDetail({ title, value, highlight }: InviteDetailProps): JSX.Element {
  return (
    <div className={`rounded-lg border px-4 py-3 text-xs shadow-sm backdrop-blur-sm transition-all duration-200 ${
      highlight 
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100" 
        : "border-white/20 bg-white/[0.08] text-slate-300"
    }`}>
      <p className={`uppercase tracking-widest font-semibold ${
        highlight ? "text-emerald-200" : "text-slate-400"
      }`}>{title}</p>
      <p
        className={`mt-2 truncate text-sm font-medium ${
          highlight ? "text-emerald-100" : "text-slate-100"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default function InviteManager(): JSX.Element {
  const navigate = useNavigate();
  const { isAuthenticated, user, token } = useAuth();
  const isAdmin = user?.role === "admin";

  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string>("");
  const [useCustomPartner, setUseCustomPartner] = useState<boolean>(false);
  const [customPartnerId, setCustomPartnerId] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [expiresIn, setExpiresIn] = useState<string>("10080");
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [loadingPartners, setLoadingPartners] = useState<boolean>(false);
  const [loadingInvites, setLoadingInvites] = useState<boolean>(false);
  const [refreshingInvites, setRefreshingInvites] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<InviteSummaryMessage | null>(null);
  const [partnersRefreshIndex, setPartnersRefreshIndex] = useState<number>(0);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);

  const numberFormatter = useMemo(() => new Intl.NumberFormat("en-US"), []);

  const inviteStats = useMemo(() => {
    const pending = invites.filter((invite) => !invite.used).length;
    const used = invites.length - pending;
    const expiringSoon = invites.filter((invite) => {
      if (invite.used) return false;
      if (!invite.expiresAt) return false;
      const diff = new Date(invite.expiresAt).getTime() - Date.now();
      return diff > 0 && diff < 86_400_000;
    }).length;
    return { pending, used, expiringSoon };
  }, [invites]);

  useEffect(() => {
    if (isAuthenticated && !isAdmin) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, isAdmin, navigate]);

  const refreshInvites = useCallback(
    async ({ silent = false, signal }: RefreshInvitesOptions = {}): Promise<void> => {
      if (!isAdmin || !token) return;
      if (silent) {
        setRefreshingInvites(true);
      } else {
        setLoadingInvites(true);
      }
      try {
        const response = await fetch(buildApiUrl("/api/admin/invites"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal,
        });
        if (!response.ok) {
          throw new Error(`Failed to load invites: ${response.status}`);
        }
        const payload = (await response.json()) as { items?: AdminInvite[] };
        const list = (payload.items || [])
          .map((item) => ({ ...item }))
          .sort(
            (a, b) =>
              new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
          );
        setInvites(list);
        setLastFetchedAt(new Date());
      } catch (unknownError) {
        const err = unknownError as Error & { name?: string };
        if (err.name === "AbortError") return;
        console.error(err);
        setMessage({ type: "error", text: err.message || "Failed to load invites." });
      } finally {
        if (silent) {
          setRefreshingInvites(false);
        } else {
          setLoadingInvites(false);
        }
      }
    },
    [isAdmin, token]
  );

  useEffect(() => {
    if (!isAdmin || !token) return;
    let abort = false;
    const controller = new AbortController();
    async function fetchPartners(): Promise<void> {
      setLoadingPartners(true);
      try {
        const response = await fetch(buildApiUrl("/api/admin/analytics", { mode: "metrics" }), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Failed to load partners: ${response.status}`);
        }
        const payload = (await response.json()) as { partners?: AnalyticsPartnerOption[] };
        if (abort) return;
        const items = (payload.partners || []).map((record) => ({
          id: (record.id || "").toLowerCase(),
          metrics: record.metrics || {},
          lastSubmissionAt: record.lastSubmissionAt || null,
        }));
        items.sort((a, b) => a.id.localeCompare(b.id));
        setPartners(items);
        if (!useCustomPartner && items.length && !selectedPartner) {
          setSelectedPartner(items[0].id);
        }
      } catch (unknownError) {
        const err = unknownError as Error & { name?: string };
        if (err.name === "AbortError") return;
        console.error(err);
        setMessage({ type: "error", text: err.message || "Failed to load partners." });
      } finally {
        if (!abort) {
          setLoadingPartners(false);
        }
      }
    }
    void fetchPartners();
    return () => {
      abort = true;
      controller.abort();
    };
  }, [isAdmin, token, partnersRefreshIndex, useCustomPartner, selectedPartner]);

  useEffect(() => {
    const controller = new AbortController();
    refreshInvites({ signal: controller.signal });
    return () => controller.abort();
  }, [refreshInvites]);

  useEffect(() => {
    if (!message) return undefined;
    const timeout = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(timeout);
  }, [message]);

  useEffect(() => {
    if (!invites.length) return undefined;
    if (!invites.some((invite) => !invite.used)) return undefined;
    const interval = setInterval(() => {
      refreshInvites({ silent: true });
    }, 15000);
    return () => clearInterval(interval);
  }, [invites, refreshInvites]);

  const handleCopy = (value) => {
    navigator.clipboard
      .writeText(value)
      .then(() => setMessage({ type: "success", text: "Copied to clipboard." }))
      .catch(() => setMessage({ type: "error", text: "Failed to copy." }));
  };

  const handleLinkCopy = (invite) => {
    const params = new URLSearchParams({ token: invite.token });
    if (invite.email) params.set("email", invite.email);
    if (invite.name) params.set("name", invite.name);
    const fallbackUrl = `${window.location.origin}/signup?${params.toString()}`;
    handleCopy(invite.inviteUrl || fallbackUrl);
  };

  const createInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    const partnerIdToUse = useCustomPartner
      ? customPartnerId.trim()
      : selectedPartner;
    if (!partnerIdToUse) {
      setMessage({ type: "error", text: "Specify a partner ID." });
      return;
    }
    if (!email.trim()) {
      setMessage({ type: "error", text: "Enter an email." });
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/invites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: email.trim(),
          partnerId: partnerIdToUse,
          role: "partner",
          name: name.trim() || undefined,
          expiresInMinutes: Number(expiresIn) || undefined,
        }),
      });
      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.error || "Failed to create invite");
      }
      setEmail("");
      setName("");
      if (useCustomPartner) {
        setCustomPartnerId("");
      }
      setMessage({ type: "success", text: "Invite created." });
      await refreshInvites({ silent: true });
    } catch (unknownError) {
      const err = unknownError as Error;
      console.error(err);
      setMessage({ type: "error", text: err.message || "Failed to create invite." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusAlert = message ? (
    <div
      className={`rounded-xl border px-5 py-4 text-sm font-medium shadow-lg backdrop-blur-sm animate-in fade-in-0 slide-in-from-top-2 duration-300 ${
        message.type === "success"
          ? "border-emerald-500/40 bg-gradient-to-r from-emerald-500/20 to-emerald-500/10 text-emerald-100"
          : "border-rose-500/40 bg-gradient-to-r from-rose-500/20 to-rose-500/10 text-rose-100"
      }`}
    >
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${
          message.type === "success" ? "bg-emerald-400" : "bg-rose-400"
        } animate-pulse`}></div>
        {message.text}
      </div>
    </div>
  ) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 relative overflow-hidden">
      {/* Subtle background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/5 via-transparent to-purple-900/5"></div>
      <div className="absolute top-0 left-1/4 w-72 h-72 bg-blue-500/3 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/3 rounded-full blur-3xl"></div>
      <div className="relative z-10 py-12">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">Z</span>
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Partner invites</h1>
            </div>
            <p className="max-w-2xl text-sm text-slate-300">
              Generate one-time signup links for partner contacts. Invites automatically switch to
              <span className="text-emerald-300"> “used”</span> once the partner completes their registration.
            </p>
            {lastFetchedAt ? (
              <p className="text-xs text-slate-500">
                Last updated {formatDate(lastFetchedAt.toISOString())}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 hover:from-blue-700 hover:to-purple-700 shadow-lg font-medium px-4 py-2.5 rounded-lg transition-all duration-200"
              onClick={() => refreshInvites()}
              disabled={loadingInvites || refreshingInvites}
            >
              <RefreshCw className={`size-4 ${loadingInvites || refreshingInvites ? "animate-spin" : ""}`} />
              Refresh invites
            </Button>
            <Button
              variant="outline"
              className="bg-white/10 text-white border border-white/30 hover:bg-white/20 hover:border-white/50 shadow-md font-medium px-4 py-2.5 rounded-lg transition-all duration-200 disabled:opacity-50"
              onClick={() => setPartnersRefreshIndex((prev) => prev + 1)}
              disabled={loadingPartners}
            >
              <RefreshCw className={`size-4 ${loadingPartners ? "animate-spin" : ""}`} />
              Refresh partners
            </Button>
            <Button
              variant="outline"
              className="bg-white/10 text-white border border-white/30 hover:bg-white/20 hover:border-white/50 shadow-md font-medium px-4 py-2.5 rounded-lg transition-all duration-200"
              onClick={() => navigate("/admin/dashboard")}
            >
              View analytics
            </Button>
          </div>
        </header>

        {statusAlert}

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="group border-white/20 bg-gradient-to-br from-white/[0.08] to-white/[0.12] backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:border-white/30 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <CardHeader className="relative z-10">
              <CardTitle className="text-xl font-semibold text-white group-hover:text-blue-100 transition-colors">Create invite</CardTitle>
              <CardDescription className="text-slate-400 group-hover:text-slate-300 transition-colors">
                Complete the form to issue a single-use signup link. You can pre-select partners or input a custom ID.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <form className="grid gap-6" onSubmit={createInvite}>
                <div className="grid gap-4">
                  <Label className="text-sm font-semibold uppercase tracking-widest text-slate-300">Partner</Label>
                  <div className="grid gap-4 rounded-xl border border-white/20 bg-white/[0.08] p-5 shadow-inner backdrop-blur-sm">
                    <div className="flex flex-col gap-2">
                      <select
                        value={selectedPartner}
                        onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                          setSelectedPartner(event.target.value)
                        }
                        disabled={loadingPartners || !partners.length || useCustomPartner}
                        className="rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm text-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 disabled:cursor-not-allowed disabled:text-slate-500 disabled:opacity-60"
                      >
                        {partners.length === 0 ? (
                          <option value="">
                            {loadingPartners ? "Loading partners..." : "No partners yet"}
                          </option>
                        ) : (
                          partners.map((partner) => (
                            <option key={partner.id} value={partner.id}>
                              {partner.id.toUpperCase()} · {numberFormatter.format(partner.metrics?.count ?? 0)} submissions
                            </option>
                          ))
                        )}
                      </select>
                      <p className="text-xs text-slate-500">
                        Partners appear automatically after the first verified submission that uses their
                        <code className="mx-1 text-slate-200">partner_id</code>.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-3 text-sm text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          className="size-4 rounded border-white/30 bg-white/10 text-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                          checked={useCustomPartner}
                          onChange={(event: ChangeEvent<HTMLInputElement>) =>
                            setUseCustomPartner(event.target.checked)
                          }
                        />
                        Enter custom partner ID
                      </label>
                      <Input
                        value={customPartnerId}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          setCustomPartnerId(event.target.value.toUpperCase())
                        }
                        placeholder="e.g. LZ001"
                        disabled={!useCustomPartner}
                        className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 rounded-lg shadow-sm disabled:cursor-not-allowed disabled:text-slate-500 disabled:opacity-60"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="invite-email" className="text-sm font-semibold text-slate-300">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="partner@example.com"
                    value={email}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setEmail(event.target.value)
                    }
                    className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 rounded-lg shadow-sm py-3"
                  />
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="invite-name" className="text-sm font-semibold text-slate-300">Contact name (optional)</Label>
                  <Input
                    id="invite-name"
                    type="text"
                    placeholder="Contact name"
                    value={name}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setName(event.target.value)
                    }
                    className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 rounded-lg shadow-sm py-3"
                  />
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="invite-expiry" className="text-sm font-semibold text-slate-300">Expires in minutes</Label>
                  <Input
                    id="invite-expiry"
                    type="number"
                    min="30"
                    max="43200"
                    value={expiresIn}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setExpiresIn(event.target.value)
                    }
                    className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 rounded-lg shadow-sm py-3"
                  />
                  <p className="text-xs text-slate-400">
                    Default is 7 days (10,080 minutes). Shorten this for sensitive access windows.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || loadingPartners}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-0 hover:from-emerald-700 hover:to-teal-700 shadow-lg font-semibold px-6 py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" /> Generating invite…
                    </>
                  ) : (
                    "Generate invite"
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="text-xs text-slate-400 relative z-10">
              Invites are single-use. When the partner finishes signup, the row below flips to “Used” automatically.
            </CardFooter>
          </Card>

          <Card className="group border-white/20 bg-gradient-to-br from-white/[0.08] to-white/[0.12] backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:border-white/30 overflow-hidden relative p-6 hover:p-7">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <CardHeader className="relative z-10 -m-6 mb-0 p-6">
              <CardTitle className="text-lg font-semibold text-white group-hover:text-blue-100 transition-colors">Invite activity</CardTitle>
              <CardDescription className="text-slate-400 group-hover:text-slate-300 transition-colors">Monitor pending access and quick stats.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 relative z-10 -m-6 mt-0 p-6">
              <SummaryStat
                label="Pending"
                value={numberFormatter.format(inviteStats.pending)}
                tone="pending"
              />
              <SummaryStat
                label="Used"
                value={numberFormatter.format(inviteStats.used)}
                tone="used"
              />
              <SummaryStat
                label="Expiring soon (24h)"
                value={numberFormatter.format(inviteStats.expiringSoon)}
                tone="warning"
              />
              <div className="rounded-xl border border-white/20 bg-white/[0.08] px-4 py-4 text-sm text-slate-300 shadow-inner backdrop-blur-sm">
                <p className="font-semibold text-slate-100 mb-2">Need to resend?</p>
                <p className="leading-relaxed">
                  You can reuse an invite token until it is marked “used”. For a fresh link, generate a new invite—old
                  links automatically expire after their cutoff.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <section className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">Recent invites</h2>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              {refreshingInvites || loadingInvites ? (
                <span className="flex items-center gap-1 text-emerald-200">
                  <RefreshCw className="size-3 animate-spin" /> Updating…
                </span>
              ) : null}
              <span>
                Showing {numberFormatter.format(invites.length)} {invites.length === 1 ? "result" : "results"}
              </span>
            </div>
          </div>
          {loadingInvites && !invites.length ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center text-slate-400">
              Loading invites…
            </div>
          ) : invites.length ? (
            <div className="grid gap-3">
              {invites.map((invite) => (
                <InviteRow
                  key={invite.token}
                  invite={invite}
                  onCopyLink={handleLinkCopy}
                  onCopyToken={handleCopy}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-slate-400">
              No invites yet. Generate one above to see it tracked here.
            </div>
          )}
        </section>
        </div>
      </div>
    </div>
  );
}

function SummaryStat({ label, value, tone }: SummaryStatProps): JSX.Element {
  const toneClasses = {
    pending: "border-amber-500/40 bg-gradient-to-br from-amber-500/20 to-amber-500/10 text-amber-100 shadow-amber-500/10",
    used: "border-emerald-500/40 bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 text-emerald-200 shadow-emerald-500/10",
    warning: "border-rose-500/40 bg-gradient-to-br from-rose-500/20 to-rose-500/10 text-rose-200 shadow-rose-500/10",
  };
  
  const iconClasses = {
    pending: "bg-amber-400",
    used: "bg-emerald-400",
    warning: "bg-rose-400",
  };
  
  return (
    <div className={`group rounded-xl border px-5 py-5 text-sm font-medium shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:shadow-xl ${toneClasses[tone]}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-white/80 font-semibold">{label}</p>
        <div className={`h-2 w-2 rounded-full ${iconClasses[tone]} animate-pulse`}></div>
      </div>
      <p className="mt-3 text-2xl font-bold text-white group-hover:scale-110 transition-transform duration-200">{value}</p>
    </div>
  );
}
