// @ts-nocheck
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/lib/config";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

function formatDate(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const isAdmin = user?.role === "admin";

  const primaryButtonClass = "bg-white text-slate-950 hover:bg-white/90 border border-white/80";
  const secondaryButtonClass = "bg-white/70 text-slate-950 hover:bg-white/60 border border-white/60";

  const [partners, setPartners] = useState([]);
  const [overviewPartner, setOverviewPartner] = useState("");
  const [overviewRefreshIndex, setOverviewRefreshIndex] = useState(0);
  const [overview, setOverview] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [overviewStats, setOverviewStats] = useState(null);
  const [loadingOverviewStats, setLoadingOverviewStats] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchPartner, setSearchPartner] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchTicket, setSearchTicket] = useState("all");
  const [searchVisited, setSearchVisited] = useState("all");
  const [searchStartDate, setSearchStartDate] = useState("");
  const [searchEndDate, setSearchEndDate] = useState("");
  const [partnerDirectory, setPartnerDirectory] = useState([]);
  const [loadingPartnerDirectory, setLoadingPartnerDirectory] = useState(false);
  const [partnerSearchTerm, setPartnerSearchTerm] = useState("");
  const [partnerStatusFilter, setPartnerStatusFilter] = useState("all");
  const [editingPartnerId, setEditingPartnerId] = useState(null);
  const [partnerForm, setPartnerForm] = useState(null);
  const [savingPartner, setSavingPartner] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      navigate("/login", { replace: true });
    }
  }, [isAdmin, navigate]);

  useEffect(() => {
    document.title = "Zabava";
    return () => {
      document.title = "Zabava";
    };
  }, []);

  useEffect(() => {
    if (!isAdmin || !token) return;

    let abort = false;
    async function fetchPartners() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/analytics?mode=metrics`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error(`Partners fetch failed: ${response.status}`);
        }
        const payload = await response.json();
        if (abort) return;
        const items = payload.partners || [];
        items.sort((a, b) => a.id.localeCompare(b.id));
        setPartners(items);
        if (!overviewPartner && items.length) {
          setOverviewPartner("all");
        }
      } catch (err) {
        console.error("Failed to load partners", err);
      }
    }

    fetchPartners();
    return () => {
      abort = true;
    };
  }, [isAdmin, token, overviewPartner]);

  useEffect(() => {
    if (!isAdmin || !token) return;

    const controller = new AbortController();
    setLoadingOverview(true);

    const url = new URL(`${API_BASE_URL}/api/admin/analytics`);
    url.searchParams.set("mode", "metrics");
    if (overviewPartner && overviewPartner !== "all") {
      url.searchParams.set("partnerId", overviewPartner);
    }

    fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Metrics fetch failed: ${response.status}`);
        }
        return response.json();
      })
      .then((payload) => {
        setOverview(payload);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Failed to load metrics", err);
        }
      })
      .finally(() => {
        setLoadingOverview(false);
      });

    return () => controller.abort();
  }, [isAdmin, token, overviewPartner, overviewRefreshIndex]);

  useEffect(() => {
    loadPartnerDirectory();
  }, [loadPartnerDirectory]);

  useEffect(() => {
    if (!isAdmin || !token) return;

    const controller = new AbortController();
    setLoadingOverviewStats(true);

    fetch(`${API_BASE_URL}/api/admin/overview`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Overview fetch failed: ${response.status}`);
        }
        return response.json();
      })
      .then((payload) => {
        setOverviewStats(payload);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Failed to load overview counters", err);
        }
      })
      .finally(() => {
        setLoadingOverviewStats(false);
      });

    return () => controller.abort();
  }, [isAdmin, token, overviewRefreshIndex]);

  useEffect(() => {
    if (!isAdmin || !token) return;
    const term = searchTerm.trim();
    if (term.length < 2 && !searchPartner) {
      setSearchResults([]);
      setLoadingSearch(false);
      return;
    }

    const controller = new AbortController();
    setLoadingSearch(true);
    const url = new URL(`${API_BASE_URL}/api/admin/analytics`);
    url.searchParams.set("mode", "submissions");
    if (term.length >= 2) {
      url.searchParams.set("search", term);
    }
    if (searchPartner) {
      url.searchParams.set("partnerId", searchPartner);
    }

    const timeout = setTimeout(() => {
      fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Search failed: ${response.status}`);
          }
          return response.json();
        })
        .then((payload) => {
          setSearchResults(payload.items || []);
        })
        .catch((err) => {
          if (err.name !== "AbortError") {
            console.error("Failed to run search", err);
          }
        })
        .finally(() => {
          setLoadingSearch(false);
        });
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [isAdmin, token, searchTerm, searchPartner]);

  const refreshOverview = useCallback(() => {
    setOverviewRefreshIndex((prev) => prev + 1);
  }, []);

  const handleExport = async () => {
    if (!token) return;
    try {
      const url = new URL(`${API_BASE_URL}/api/admin/analytics`);
      url.searchParams.set("mode", "export");
      const term = searchTerm.trim();
      if (term.length >= 2) {
        url.searchParams.set("search", term);
      }
      if (searchPartner) {
        url.searchParams.set("partnerId", searchPartner);
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`);
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `lasermax-submissions-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("Failed to export CSV", err);
    }
  };

  const resetSearchFilters = () => {
    setSearchTicket("all");
    setSearchVisited("all");
    setSearchStartDate("");
    setSearchEndDate("");
  };

  const loadPartnerDirectory = useCallback(async () => {
    if (!isAdmin || !token) return;
    setLoadingPartnerDirectory(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/partners`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`Partner directory fetch failed: ${response.status}`);
      }
      const payload = await response.json();
      setPartnerDirectory(payload.items || []);
    } catch (err) {
      console.error("Failed to load partner directory", err);
    } finally {
      setLoadingPartnerDirectory(false);
    }
  }, [isAdmin, token]);


  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }),
    []
  );
  const currencyFormatterDetailed = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }),
    []
  );
  const numberFormatter = useMemo(() => new Intl.NumberFormat("en-US"), []);

  const analyticsTotals = overview?.totals || {
    count: 0,
    used: 0,
    unused: 0,
    visited: 0,
    notVisited: 0,
    revenue: 0,
    points: 0,
    bonusRedemptions: 0,
    averageRevenue: 0,
    averagePoints: 0,
  };
  const conversionRate = analyticsTotals.count
    ? Math.round((analyticsTotals.used / analyticsTotals.count) * 100)
    : 0;
  const visitRate = analyticsTotals.count
    ? Math.round((analyticsTotals.visited / analyticsTotals.count) * 100)
    : 0;

  const searchTicketOptions = useMemo(() => {
    const set = new Set();
    searchResults.forEach((item) => {
      if (item.ticket) {
        set.add(item.ticket);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [searchResults]);

  const filteredSearchResults = useMemo(() => {
    return searchResults.filter((item) => {
      const createdTime = item.createdAt ? new Date(item.createdAt).getTime() : null;

      if (searchStartDate) {
        const startTime = new Date(searchStartDate).setHours(0, 0, 0, 0);
        if (!createdTime || createdTime < startTime) {
          return false;
        }
      }

      if (searchEndDate) {
        const endTime = new Date(searchEndDate).setHours(23, 59, 59, 999);
        if (!createdTime || createdTime > endTime) {
          return false;
        }
      }

      if (searchTicket !== "all") {
        const ticket = item.ticket || "N/A";
        if (ticket !== searchTicket) {
          return false;
        }
      }

      if (searchVisited === "visited" && !item.visited) {
        return false;
      }

      if (searchVisited === "unvisited" && item.visited) {
        return false;
      }

      return true;
    });
  }, [searchEndDate, searchResults, searchStartDate, searchTicket, searchVisited]);

  const filteredSearchCount = filteredSearchResults.length;

  const filteredPartners = useMemo(() => {
    const term = partnerSearchTerm.trim().toLowerCase();
    return partnerDirectory.filter((item) => {
      if (partnerStatusFilter !== "all" && item.status !== partnerStatusFilter) {
        return false;
      }
      if (term) {
        const haystack = [
          item.partnerId,
          item.info?.contactName,
          item.info?.contactEmail,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(term)) {
          return false;
        }
      }
      return true;
    });
  }, [partnerDirectory, partnerSearchTerm, partnerStatusFilter]);

  const revenueTrend = overview?.revenueTrend || [];
  const latest = overview?.latestSubmissions || [];
  const partnerSummary = overview?.partners || [];

  const overviewTotals = useMemo(
    () => overviewStats?.totals || {},
    [overviewStats]
  );
  const quickActions = useMemo(
    () => overviewStats?.quickActions || {},
    [overviewStats]
  );

  const heroCards = useMemo(
    () => [
      {
        title: "Active partners",
        value: numberFormatter.format(overviewTotals.activePartners || 0),
        subtitle: "Currently live on Lasermax",
      },
      {
        title: "QRs generated today",
        value: numberFormatter.format(overviewTotals.qrsGeneratedToday || 0),
        subtitle: "New registrations received today",
      },
      {
        title: "QRs scanned today",
        value: numberFormatter.format(overviewTotals.qrsScannedToday || 0),
        subtitle: "Visits confirmed so far today",
      },
      {
        title: "Monthly visitors",
        value: numberFormatter.format(overviewTotals.monthlyVisitors || 0),
        subtitle: "Visits confirmed this month",
      },
      {
        title: "Revenue (month)",
        value: currencyFormatter.format(overviewTotals.totalRevenue || 0),
        subtitle: "From confirmed visits",
      },
    ],
    [
      currencyFormatter,
      numberFormatter,
      overviewTotals.activePartners,
      overviewTotals.qrsGeneratedToday,
      overviewTotals.qrsScannedToday,
      overviewTotals.monthlyVisitors,
      overviewTotals.totalRevenue,
    ]
  );

  const quickActionItems = useMemo(
    () => [
      {
        id: "add-partner",
        label: "Add new partner",
        description: "Send an invite to onboard another attraction",
        action: () => navigate("/admin/invites"),
      },
      {
        id: "view-unvisited",
        label: `${numberFormatter.format(
          overviewTotals.unvisitedQRCodes || 0
        )} unconfirmed visits`,
        description: "Follow up on partners to mark recent visitors",
        action: () => navigate("/admin/dashboard#submissions"),
      },
      {
        id: "pending-approvals",
        label: `${numberFormatter.format(
          quickActions.pendingPartnerApprovals || 0
        )} partner approvals`,
        description: "Review pending accounts",
        action: () => navigate("/admin/invites"),
      },
    ],
    [
      navigate,
      numberFormatter,
      overviewTotals.unvisitedQRCodes,
      quickActions.pendingPartnerApprovals,
    ]
  );

  const createPartnerFormState = useCallback((meta) => ({
    partnerId: meta.partnerId,
    status: meta.status || "active",
    monthlyFee:
      meta.contract?.monthlyFee !== undefined
        ? String(meta.contract.monthlyFee)
        : "",
    discountRate:
      meta.contract?.discountRate !== undefined
        ? String(meta.contract.discountRate)
        : "",
    commissionRate:
      meta.contract?.commissionRate !== undefined
        ? String(meta.contract.commissionRate)
        : "",
    commissionBasis: meta.contract?.commissionBasis || "discounted",
    ticketTypes: (meta.ticketing?.ticketTypes || []).join(", "),
    familyRule: meta.ticketing?.familyRule || "",
    contactName: meta.info?.contactName || "",
    contactEmail: meta.info?.contactEmail || "",
    payments: (meta.info?.payments || []).join(", "),
    facilities: (meta.info?.facilities || []).join(", "),
    website: meta.info?.website || "",
    bonusProgramEnabled: Boolean(meta.bonusProgramEnabled),
    notes: meta.notes || "",
    updatedAt: meta.updatedAt || null,
    createdAt: meta.createdAt || null,
  }), []);

  const openPartnerEditor = useCallback(
    (meta) => {
      setEditingPartnerId(meta.partnerId);
      setPartnerForm(createPartnerFormState(meta));
    },
    [createPartnerFormState]
  );

  const closePartnerEditor = useCallback(() => {
    setEditingPartnerId(null);
    setPartnerForm(null);
    setSavingPartner(false);
  }, []);

  const handlePartnerFieldChange = useCallback((field, value) => {
    setPartnerForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  }, []);

  const splitList = useCallback((value) => {
    if (!value) return [];
    return value
      .split(/[,\n]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }, []);

  const handleSavePartner = useCallback(async () => {
    if (!partnerForm || !editingPartnerId || !token) return;
    setSavingPartner(true);
    try {
      const payload = {
        status: partnerForm.status,
        contract: {
          monthlyFee: partnerForm.monthlyFee
            ? parseFloat(partnerForm.monthlyFee)
            : 0,
          discountRate: partnerForm.discountRate
            ? parseFloat(partnerForm.discountRate)
            : 0,
          commissionRate: partnerForm.commissionRate
            ? parseFloat(partnerForm.commissionRate)
            : 0,
          commissionBasis: partnerForm.commissionBasis || "discounted",
        },
        ticketing: {
          ticketTypes: splitList(partnerForm.ticketTypes),
          familyRule: partnerForm.familyRule || "",
        },
        info: {
          contactName: partnerForm.contactName || "",
          contactEmail: partnerForm.contactEmail || "",
          payments: splitList(partnerForm.payments),
          facilities: splitList(partnerForm.facilities),
          website: partnerForm.website || "",
        },
        bonusProgramEnabled: Boolean(partnerForm.bonusProgramEnabled),
        notes: partnerForm.notes || "",
      };

      const response = await fetch(
        `${API_BASE_URL}/api/admin/partners/${editingPartnerId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) {
        throw new Error(`Partner update failed: ${response.status}`);
      }
      const updated = await response.json();
      setPartnerDirectory((prev) =>
        prev.map((item) =>
          item.partnerId === updated.partnerId ? updated : item
        )
      );
      closePartnerEditor();
    } catch (err) {
      console.error("Failed to update partner metadata", err);
    } finally {
      setSavingPartner(false);
    }
  }, [closePartnerEditor, editingPartnerId, partnerForm, splitList, token]);

  const handleLogout = () => {
    logout();
    navigate("/admin/login", { replace: true });
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-white/5 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-white">Admin console</h1>
            <p className="text-sm text-slate-300">
              Manage partners, monitor submissions, and export data across the program.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left">
              <p className="font-medium text-slate-100">{user?.email}</p>
              <p className="text-[11px] uppercase tracking-wide">Administrator</p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate("/admin/invites")}
              className={cn(primaryButtonClass)}
            >
              Partner invites
            </Button>
            <Button
              variant="outline"
              onClick={refreshOverview}
              disabled={loadingOverview}
              className={cn(secondaryButtonClass)}
            >
              {loadingOverview ? "Refreshing" : "Refresh"}
            </Button>
            <Button
              variant="outline"
              onClick={handleLogout}
              className={cn(secondaryButtonClass)}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {heroCards.map((card) => (
            <MetricCard
              key={card.title}
              title={card.title}
              value={card.value}
              subtitle={card.subtitle}
            />
          ))}
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {quickActionItems.map((action) => (
            <Card
              key={action.id}
              className="border-white/10 bg-white/[0.07] backdrop-blur"
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-white">
                  {action.label}
                </CardTitle>
                <CardDescription>{action.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(primaryButtonClass)}
                  onClick={action.action}
                  disabled={loadingOverviewStats}
                >
                  Go
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="space-y-4" id="partners">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Input
                value={partnerSearchTerm}
                onChange={(event) => setPartnerSearchTerm(event.target.value)}
                placeholder="Search partner or contact"
                className="w-full max-w-sm bg-white/[0.08] text-white"
              />
              <select
                value={partnerStatusFilter}
                onChange={(event) => setPartnerStatusFilter(event.target.value)}
                className="rounded-md border border-white/10 bg-white/[0.08] px-3 py-2 text-sm text-white"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className={cn(secondaryButtonClass)}
                onClick={loadPartnerDirectory}
                disabled={loadingPartnerDirectory}
              >
                {loadingPartnerDirectory ? "Refreshing" : "Refresh list"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={cn(primaryButtonClass)}
                onClick={() => navigate("/admin/invites")}
              >
                Invite partner
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="bg-white/[0.04]">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                    Partner
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                    Monthly fee
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                    Commission
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                    Discount
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                    Tickets
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                    Updated
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                    Bonus
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-white/[0.02]">
                {loadingPartnerDirectory ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-4 text-sm text-slate-400">
                      Loading partner directory…
                    </td>
                  </tr>
                ) : filteredPartners.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-4 text-sm text-slate-400">
                      {partnerDirectory.length === 0
                        ? "No partners yet."
                        : "No partners match the selected filters."}
                    </td>
                  </tr>
                ) : (
                  filteredPartners.map((partner) => {
                    const statusStyles = {
                      active: "bg-emerald-500/15 text-emerald-200",
                      pending: "bg-amber-400/15 text-amber-200",
                      hidden: "bg-slate-500/20 text-slate-200",
                    };
                    const badgeClass =
                      statusStyles[partner.status] || "bg-slate-500/20 text-slate-200";

                    return (
                      <tr key={partner.partnerId}>
                        <td className="px-3 py-3 text-sm text-slate-200">
                          <div className="space-y-1">
                            <p className="font-semibold text-white">
                              {partner.partnerId.toUpperCase()}
                            </p>
                            {partner.info?.contactName ? (
                              <p className="text-xs text-slate-400">
                                {partner.info.contactName}
                              </p>
                            ) : null}
                            {partner.info?.contactEmail ? (
                              <p className="text-xs text-slate-500">
                                {partner.info.contactEmail}
                              </p>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-300">
                          <Badge className={badgeClass}>{partner.status}</Badge>
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-300">
                          {currencyFormatter.format(
                            partner.contract?.monthlyFee || 0
                          )}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-300">
                          {`${partner.contract?.commissionRate || 0}% (${
                            partner.contract?.commissionBasis === "original"
                              ? "original"
                              : "discounted"
                          })`}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-300">
                          {`${partner.contract?.discountRate || 0}%`}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-300">
                          {partner.ticketing?.ticketTypes?.length
                            ? partner.ticketing.ticketTypes.join(", ")
                            : "—"}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-400">
                          {partner.updatedAt ? formatDate(partner.updatedAt) : "—"}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-300">
                          {partner.bonusProgramEnabled ? "Enabled" : "Disabled"}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-300">
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(primaryButtonClass)}
                            onClick={() => openPartnerEditor(partner)}
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Total submissions"
            value={numberFormatter.format(analyticsTotals.count)}
            subtitle={`${numberFormatter.format(analyticsTotals.used)} used • ${numberFormatter.format(
              analyticsTotals.unused
            )} pending`}
          />
          <MetricCard
            title="Conversion rate"
            value={`${conversionRate}%`}
            subtitle="Usage of distributed tickets"
          />
          <MetricCard
            title="Total revenue"
            value={currencyFormatter.format(analyticsTotals.revenue)}
            subtitle={`Avg ${currencyFormatterDetailed.format(
              analyticsTotals.averageRevenue
            )} per submission`}
          />
          <MetricCard
            title="Visits confirmed"
            value={`${numberFormatter.format(analyticsTotals.visited)} (${visitRate}%)`}
            subtitle={`${numberFormatter.format(analyticsTotals.notVisited)} awaiting confirmation`}
          />
        </section>

        <section className="flex flex-wrap items-center gap-3">
          <span className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Dataset
          </span>
          <select
            value={overviewPartner || "all"}
            onChange={(event) => setOverviewPartner(event.target.value)}
            className="rounded-md border border-white/10 bg-white/[0.08] px-3 py-2 text-sm text-white"
          >
            <option value="all">All partners</option>
            {partners.map((partner) => (
              <option key={partner.id} value={partner.id}>
                {partner.id}
              </option>
            ))}
          </select>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <Card className="border-white/10 bg-white/[0.06] backdrop-blur-xl xl:col-span-2">
            <CardHeader>
              <CardTitle className="text-base text-white">
                Global revenue trend
              </CardTitle>
              <CardDescription>Aggregated submissions by day</CardDescription>
            </CardHeader>
            <CardContent className="h-[320px] px-0 pb-0">
              {loadingOverview && !overview ? (
                <Skeleton className="h-full w-full bg-white/10" />
              ) : revenueTrend.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueTrend}>
                    <XAxis
                      dataKey="date"
                      stroke="rgba(148, 163, 184, 0.4)"
                      tickLine={false}
                      tick={{ fill: "rgba(226, 232, 240, 0.75)", fontSize: 12 }}
                    />
                    <YAxis
                      stroke="rgba(148, 163, 184, 0.4)"
                      tickFormatter={(value) =>
                        currencyFormatter.format(value).replace("$", "")
                      }
                      width={60}
                      tickLine={false}
                      tick={{ fill: "rgba(226, 232, 240, 0.75)", fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(15, 23, 42, 0.92)",
                        borderRadius: 12,
                        border: "1px solid rgba(148, 163, 184, 0.25)",
                        color: "#e2e8f0",
                      }}
                      formatter={(value) => currencyFormatter.format(value)}
                    />
                    <Legend
                      wrapperStyle={{
                        color: "rgba(226, 232, 240, 0.8)",
                        paddingTop: 12,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#38bdf8"
                      strokeWidth={3}
                      dot={false}
                      name="Revenue"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  Not enough data yet.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.06] backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-base text-white">Partner summary</CardTitle>
              <CardDescription>Snapshot of partner performance</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {partnerSummary.length === 0 ? (
                <p className="text-sm text-slate-400">No partners available.</p>
              ) : (
                partnerSummary.slice(0, 10).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-slate-200"
                  >
                    <div>
                      <p className="font-semibold text-white">{item.id}</p>
                      <p className="text-xs text-slate-400">
                        {numberFormatter.format(item.metrics.count)} submissions · {numberFormatter.format(item.metrics.used)} used
                      </p>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <p>{currencyFormatter.format(item.metrics.revenue)}</p>
                      <p>{formatDate(item.lastSubmissionAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        <Card className="border-white/10 bg-white/[0.06] backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-base text-white">Latest submissions</CardTitle>
            <CardDescription>Most recent activity across partners</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto px-0">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="bg-white/[0.04]">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                    Partner
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                    Email
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                    Ticket
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-slate-300">
                    Total
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                    QR Status
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                    Visit
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-white/[0.02]">
                {latest.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-4 text-center text-sm text-slate-400">
                      No submissions yet.
                    </td>
                  </tr>
                ) : (
                  latest.slice(0, 12).map((item, index) => (
                      <tr key={`${item.partnerId}-${item.email}-${index}`}>
                        <td className="px-3 py-2 text-sm text-slate-200">{item.partnerId}</td>
                        <td className="px-3 py-2 text-sm text-slate-300">{item.email}</td>
                        <td className="px-3 py-2 text-sm text-slate-300">{item.ticket || "N/A"}</td>
                        <td className="px-3 py-2 text-right text-sm text-slate-300">
                          {currencyFormatter.format(item.totalPrice || 0)}
                        </td>
                        <td className="px-3 py-2 text-sm text-slate-300">{item.used ? "Used" : "Pending"}</td>
                        <td className="px-3 py-2 text-sm text-slate-300">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                item.visited
                                  ? "bg-emerald-500/15 text-emerald-200"
                                  : "bg-amber-400/15 text-amber-200"
                              }`}
                            >
                              {item.visited ? "Visited" : "Unconfirmed"}
                            </span>
                            {item.visitedAt ? (
                              <span className="text-xs text-slate-400">
                                {formatDate(item.visitedAt)}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-sm text-slate-400">{formatDate(item.createdAt)}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.06] backdrop-blur-xl">
          <CardHeader className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base text-white">Search submissions</CardTitle>
              <CardDescription>
                Filter by partner or email keyword and export results.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className={cn(primaryButtonClass)}
            >
              Download CSV
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by email, ticket, partner..."
                className="w-full max-w-sm bg-white/[0.08] text-white"
              />
              <select
                className="rounded-md border border-white/10 bg-white/[0.08] px-3 py-2 text-sm text-white"
                value={searchPartner}
                onChange={(event) => setSearchPartner(event.target.value)}
              >
                <option value="">All partners</option>
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.id}
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-500">
                Type at least two characters to search globally.
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Ticket type
                </label>
                <select
                  className="rounded-md border border-white/10 bg-white/[0.08] px-3 py-2 text-sm text-white"
                  value={searchTicket}
                  onChange={(event) => setSearchTicket(event.target.value)}
                >
                  <option value="all">All tickets</option>
                  {searchTicketOptions.map((ticket) => (
                    <option key={ticket} value={ticket}>
                      {ticket}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Visit status
                </label>
                <select
                  className="rounded-md border border-white/10 bg-white/[0.08] px-3 py-2 text-sm text-white"
                  value={searchVisited}
                  onChange={(event) => setSearchVisited(event.target.value)}
                >
                  <option value="all">All</option>
                  <option value="visited">Visited</option>
                  <option value="unvisited">Awaiting visit</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  From
                </label>
                <Input
                  type="date"
                  value={searchStartDate}
                  onChange={(event) => setSearchStartDate(event.target.value)}
                  className="bg-white/[0.08] text-white"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  To
                </label>
                <Input
                  type="date"
                  value={searchEndDate}
                  onChange={(event) => setSearchEndDate(event.target.value)}
                  className="bg-white/[0.08] text-white"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span>Showing {numberFormatter.format(filteredSearchCount)} results</span>
              <Button
                variant="outline"
                size="sm"
                className={cn(secondaryButtonClass)}
                onClick={resetSearchFilters}
              >
                Reset filters
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/10">
                <thead className="bg-white/[0.04]">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                      Partner
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                      Email
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                      Ticket
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-slate-300">
                      Total
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                      QR Status
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                      Visit
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 bg-white/[0.02]">
                  {loadingSearch ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-4 text-center text-sm text-slate-400">
                        Searching…
                      </td>
                    </tr>
                  ) : filteredSearchResults.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-4 text-center text-sm text-slate-400">
                        {searchResults.length === 0
                          ? searchTerm.trim().length < 2 && !searchPartner
                            ? "Enter at least two characters to search."
                            : "No submissions matched your criteria."
                          : "No submissions match the selected filters."}
                      </td>
                    </tr>
                  ) : (
                    filteredSearchResults.map((item, index) => (
                        <tr key={`${item.partnerId}-${item.email}-${index}`}>
                          <td className="px-3 py-2 text-sm text-slate-200">{item.partnerId}</td>
                          <td className="px-3 py-2 text-sm text-slate-300">{item.email}</td>
                          <td className="px-3 py-2 text-sm text-slate-300">{item.ticket || "N/A"}</td>
                          <td className="px-3 py-2 text-right text-sm text-slate-300">
                            {currencyFormatter.format(item.totalPrice || 0)}
                          </td>
                          <td className="px-3 py-2 text-sm text-slate-300">{item.used ? "Used" : "Pending"}</td>
                          <td className="px-3 py-2 text-sm text-slate-300">
                            <div className="flex flex-col gap-1">
                              <span
                                className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  item.visited
                                    ? "bg-emerald-500/15 text-emerald-200"
                                    : "bg-amber-400/15 text-amber-200"
                                }`}
                              >
                                {item.visited ? "Visited" : "Unconfirmed"}
                              </span>
                              {item.visitedAt ? (
                                <span className="text-xs text-slate-400">
                                  {formatDate(item.visitedAt)}
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-sm text-slate-400">{formatDate(item.createdAt)}</td>
                        </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>

    <Dialog open={Boolean(editingPartnerId)} onOpenChange={(open) => (open ? null : closePartnerEditor())}>
      {partnerForm ? (
        <DialogContent className="bg-white/[0.08] text-white" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Edit partner settings</DialogTitle>
            <DialogDescription className="text-slate-400">
              Adjust contract terms and business details for {partnerForm.partnerId.toUpperCase()}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="partner-status">Status</Label>
              <select
                id="partner-status"
                value={partnerForm.status}
                onChange={(event) => handlePartnerFieldChange("status", event.target.value)}
                className="rounded-md border border-white/10 bg-white/[0.08] px-3 py-2 text-sm text-white"
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="partner-monthly-fee">Monthly fee (CZK)</Label>
                <Input
                  id="partner-monthly-fee"
                  value={partnerForm.monthlyFee}
                  onChange={(event) => handlePartnerFieldChange("monthlyFee", event.target.value)}
                  placeholder="0"
                  className="bg-white/[0.08] text-white"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="partner-discount">Discount %</Label>
                <Input
                  id="partner-discount"
                  value={partnerForm.discountRate}
                  onChange={(event) => handlePartnerFieldChange("discountRate", event.target.value)}
                  placeholder="0"
                  className="bg-white/[0.08] text-white"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="partner-commission">Commission %</Label>
                <Input
                  id="partner-commission"
                  value={partnerForm.commissionRate}
                  onChange={(event) => handlePartnerFieldChange("commissionRate", event.target.value)}
                  placeholder="0"
                  className="bg-white/[0.08] text-white"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="partner-commission-basis">Commission basis</Label>
                <select
                  id="partner-commission-basis"
                  value={partnerForm.commissionBasis}
                  onChange={(event) => handlePartnerFieldChange("commissionBasis", event.target.value)}
                  className="rounded-md border border-white/10 bg-white/[0.08] px-3 py-2 text-sm text-white"
                >
                  <option value="discounted">Discounted price</option>
                  <option value="original">Original price</option>
                </select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="partner-ticket-types">Ticket types (comma separated)</Label>
              <Input
                id="partner-ticket-types"
                value={partnerForm.ticketTypes}
                onChange={(event) => handlePartnerFieldChange("ticketTypes", event.target.value)}
                placeholder="Adult, Child, Family"
                className="bg-white/[0.08] text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="partner-family-rule">Family ticket rule</Label>
              <Input
                id="partner-family-rule"
                value={partnerForm.familyRule}
                onChange={(event) => handlePartnerFieldChange("familyRule", event.target.value)}
                placeholder="e.g. Minimum 4 guests"
                className="bg-white/[0.08] text-white"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="partner-contact-name">Contact name</Label>
                <Input
                  id="partner-contact-name"
                  value={partnerForm.contactName}
                  onChange={(event) => handlePartnerFieldChange("contactName", event.target.value)}
                  className="bg-white/[0.08] text-white"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="partner-contact-email">Contact email</Label>
                <Input
                  id="partner-contact-email"
                  value={partnerForm.contactEmail}
                  onChange={(event) => handlePartnerFieldChange("contactEmail", event.target.value)}
                  className="bg-white/[0.08] text-white"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="partner-payments">Accepted payments (comma or newline separated)</Label>
              <Textarea
                id="partner-payments"
                value={partnerForm.payments}
                onChange={(event) => handlePartnerFieldChange("payments", event.target.value)}
                className="bg-white/[0.08] text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="partner-facilities">Facilities (comma or newline separated)</Label>
              <Textarea
                id="partner-facilities"
                value={partnerForm.facilities}
                onChange={(event) => handlePartnerFieldChange("facilities", event.target.value)}
                className="bg-white/[0.08] text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="partner-website">Website / booking URL</Label>
              <Input
                id="partner-website"
                value={partnerForm.website}
                onChange={(event) => handlePartnerFieldChange("website", event.target.value)}
                placeholder="https://"
                className="bg-white/[0.08] text-white"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.05] px-4 py-3">
              <div>
                <p className="text-sm font-medium text-white">Bonus program</p>
                <p className="text-xs text-slate-400">
                  Toggle if this partner participates in the Lasermax bonus program.
                </p>
              </div>
              <Switch
                checked={partnerForm.bonusProgramEnabled}
                onCheckedChange={(value) => handlePartnerFieldChange("bonusProgramEnabled", value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="partner-notes">Internal notes</Label>
              <Textarea
                id="partner-notes"
                value={partnerForm.notes}
                onChange={(event) => handlePartnerFieldChange("notes", event.target.value)}
                className="bg-white/[0.08] text-white"
                rows={4}
              />
            </div>

            <p className="text-xs text-slate-500">
              Last updated: {partnerForm.updatedAt ? formatDate(partnerForm.updatedAt) : "—"}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closePartnerEditor}
              className={cn(secondaryButtonClass)}
              disabled={savingPartner}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePartner}
              className={cn(primaryButtonClass)}
              disabled={savingPartner}
            >
              {savingPartner ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
    </>
  );
}

function MetricCard({ title, value, subtitle }) {
  return (
    <Card className="border-white/10 bg-white/[0.06] backdrop-blur transition hover:border-white/20 hover:bg-white/[0.09]">
      <CardContent className="p-6">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {title}
          </p>
          <p className="text-3xl font-semibold text-white">{value}</p>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
