import { useCallback, useEffect, useMemo, useState } from "react";
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
import { API_BASE_URL } from "@/lib/config";
import { cn } from "@/lib/utils";

function formatDate(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatCountdown(iso) {
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

const PRIMARY_BUTTON_CLASS = "bg-white text-slate-950 hover:bg-white/90 border border-white/80";
const SECONDARY_BUTTON_CLASS = "bg-white/70 text-slate-950 hover:bg-white/60 border border-white/60";

function InviteRow({ invite, onCopyLink, onCopyToken }) {
  const isUsed = invite.used;
  const statusStyles = isUsed
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
    : "border-amber-400/40 bg-amber-500/10 text-amber-100";
  const statusLabel = isUsed ? "Used" : "Pending";
  const expiresSoon = !isUsed && invite.expiresAt && new Date(invite.expiresAt) - Date.now() < 86_400_000;
  const expiresLabel = formatCountdown(invite.expiresAt);

  return (
    <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-[0_20px_40px_rgba(8,11,20,0.45)] backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-white">
            {invite.email || "(no email)"}
          </p>
          <p className="truncate text-sm text-slate-300">
            {invite.name ? invite.name : "Partner contact"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusStyles}`}>
            {statusLabel}
          </span>
          <Badge variant="outline" className="border-white/15 bg-white/[0.05] text-slate-200">
            {(invite.partnerId || "").toString().toUpperCase() || "—"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <InviteDetail title="Created" value={formatDate(invite.createdAt)} />
        <InviteDetail title="Expires" value={formatDate(invite.expiresAt)} highlight={expiresSoon} />
        <InviteDetail title="Time remaining" value={expiresLabel} highlight={expiresSoon && !isUsed} />
        <InviteDetail
          title="Used on"
          value={isUsed ? formatDate(invite.usedAt) : "Not yet"}
          highlight={isUsed}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className={cn("gap-2", PRIMARY_BUTTON_CLASS)}
          onClick={() => onCopyLink(invite)}
        >
          <Link2 className="size-4" /> Copy invite link
        </Button>
        <Button
          size="sm"
          variant="outline"
          className={cn("gap-2", SECONDARY_BUTTON_CLASS)}
          onClick={() => onCopyToken(invite.token)}
        >
          <Copy className="size-4" /> Copy token
        </Button>
        {invite.inviteUrl ? (
          <a
            href={invite.inviteUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
          >
            Open invite
          </a>
        ) : null}
      </div>
    </div>
  );
}

function InviteDetail({ title, value, highlight }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.04] px-3 py-2 text-xs text-slate-400">
      <p className="uppercase tracking-[0.2em] text-slate-500">{title}</p>
      <p
        className={`mt-1 truncate text-sm ${
          highlight ? "text-emerald-200" : "text-slate-200"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default function InviteManager() {
  const navigate = useNavigate();
  const { isAuthenticated, user, token } = useAuth();
  const isAdmin = user?.role === "admin";

  const [partners, setPartners] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState("");
  const [useCustomPartner, setUseCustomPartner] = useState(false);
  const [customPartnerId, setCustomPartnerId] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [expiresIn, setExpiresIn] = useState("10080");
  const [invites, setInvites] = useState([]);
  const [loadingPartners, setLoadingPartners] = useState(false);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [refreshingInvites, setRefreshingInvites] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [partnersRefreshIndex, setPartnersRefreshIndex] = useState(0);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);

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
    async ({ silent = false, signal } = {}) => {
      if (!isAdmin || !token) return;
      if (silent) {
        setRefreshingInvites(true);
      } else {
        setLoadingInvites(true);
      }
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/invites`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal,
        });
        if (!response.ok) {
          throw new Error(`Failed to load invites: ${response.status}`);
        }
        const payload = await response.json();
        const list = (payload.items || []).sort(
          (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        );
        setInvites(list);
        setLastFetchedAt(new Date());
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error(err);
        setMessage({ type: "error", text: err.message });
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
    async function fetchPartners() {
      setLoadingPartners(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/analytics?mode=metrics`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Failed to load partners: ${response.status}`);
        }
        const payload = await response.json();
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
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error(err);
        setMessage({ type: "error", text: err.message });
      } finally {
        if (!abort) {
          setLoadingPartners(false);
        }
      }
    }
    fetchPartners();
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

  const createInvite = async (event) => {
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
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusAlert = message ? (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm shadow-[0_12px_30px_rgba(15,23,42,0.35)] ${
        message.type === "success"
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
          : "border-rose-500/40 bg-rose-500/10 text-rose-200"
      }`}
    >
      {message.text}
    </div>
  ) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-white">Partner invites</h1>
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
              className={cn("gap-2", PRIMARY_BUTTON_CLASS)}
              onClick={() => refreshInvites()}
              disabled={loadingInvites || refreshingInvites}
            >
              <RefreshCw className={`size-4 ${loadingInvites || refreshingInvites ? "animate-spin" : ""}`} />
              Refresh invites
            </Button>
            <Button
              variant="outline"
              className={cn("gap-2", SECONDARY_BUTTON_CLASS)}
              onClick={() => setPartnersRefreshIndex((prev) => prev + 1)}
              disabled={loadingPartners}
            >
              <RefreshCw className={`size-4 ${loadingPartners ? "animate-spin" : ""}`} />
              Refresh partners
            </Button>
            <Button
              variant="outline"
              className={cn(SECONDARY_BUTTON_CLASS)}
              onClick={() => navigate("/admin/dashboard")}
            >
              View analytics
            </Button>
          </div>
        </header>

        {statusAlert}

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-white/10 bg-white/[0.07] backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-lg text-white">Create invite</CardTitle>
              <CardDescription>
                Complete the form to issue a single-use signup link. You can pre-select partners or input a custom ID.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4" onSubmit={createInvite}>
                <div className="grid gap-3">
                  <Label className="text-xs uppercase tracking-[0.25em] text-slate-400">Partner</Label>
                  <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                    <div className="flex flex-col gap-2">
                      <select
                        value={selectedPartner}
                        onChange={(event) => setSelectedPartner(event.target.value)}
                        disabled={loadingPartners || !partners.length || useCustomPartner}
                        className="rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:text-slate-500"
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
                      <label className="flex items-center gap-2 text-xs text-slate-300">
                        <input
                          type="checkbox"
                          className="size-4 rounded border-white/30 bg-white/10"
                          checked={useCustomPartner}
                          onChange={(event) => setUseCustomPartner(event.target.checked)}
                        />
                        Enter custom partner ID
                      </label>
                      <Input
                        value={customPartnerId}
                        onChange={(event) => setCustomPartnerId(event.target.value.toUpperCase())}
                        placeholder="e.g. LZ001"
                        disabled={!useCustomPartner}
                        className="bg-slate-950/60 text-white disabled:cursor-not-allowed disabled:text-slate-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="partner@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="bg-slate-950/60 text-white"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="invite-name">Contact name (optional)</Label>
                  <Input
                    id="invite-name"
                    type="text"
                    placeholder="Contact name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="bg-slate-950/60 text-white"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="invite-expiry">Expires in minutes</Label>
                  <Input
                    id="invite-expiry"
                    type="number"
                    min="30"
                    max="43200"
                    value={expiresIn}
                    onChange={(event) => setExpiresIn(event.target.value)}
                    className="bg-slate-950/60 text-white"
                  />
                  <p className="text-xs text-slate-500">
                    Default is 7 days (10,080 minutes). Shorten this for sensitive access windows.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || loadingPartners}
                  className={cn("gap-2", PRIMARY_BUTTON_CLASS)}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Generating invite…
                    </>
                  ) : (
                    "Generate invite"
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="text-xs text-slate-500">
              Invites are single-use. When the partner finishes signup, the row below flips to “Used” automatically.
            </CardFooter>
          </Card>

          <Card className="border-white/10 bg-white/[0.05] backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-base text-white">Invite activity</CardTitle>
              <CardDescription>Monitor pending access and quick stats.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
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
              <div className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 text-xs text-slate-400">
                <p className="font-medium text-slate-200">Need to resend?</p>
                <p className="mt-1">
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
  );
}

function SummaryStat({ label, value, tone }) {
  const toneClasses = {
    pending: "border-amber-500/30 bg-amber-500/10 text-amber-100",
    used: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    warning: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  };
  return (
    <div className={`rounded-2xl border px-4 py-4 text-sm font-medium ${toneClasses[tone]}`}>
      <p className="text-xs uppercase tracking-[0.24em] text-white/70">{label}</p>
      <p className="mt-1 text-2xl text-white">{value}</p>
    </div>
  );
}
