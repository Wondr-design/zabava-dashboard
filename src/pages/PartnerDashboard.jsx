// src/pages/PartnerDashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SubmissionsTable } from "../components/SubmissionsTable";
import { usePartnerData } from "../hooks/usePartnerData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import {
  Activity,
  Award,
  DollarSign,
  RefreshCcw,
  Ticket,
  Users,
  LogOut,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ["#22d3ee", "#a855f7", "#f97316", "#4ade80", "#facc15"];

export default function PartnerDashboard() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const partnerId = user?.partnerId || "";
  const userEmail = user?.email || "";

  const primaryButtonClass = "bg-white text-slate-950 hover:bg-white/90 border border-white/80";
  const secondaryButtonClass = "bg-white/70 text-slate-950 hover:bg-white/60 border border-white/60";

  const { data, loading, error, refetch } = usePartnerData(partnerId, {
    token,
    onUnauthorized: logout,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");

  const overviewRef = useRef(null);
  const submissionsRef = useRef(null);

  useEffect(() => {
    if (!partnerId) {
      navigate("/login", { replace: true });
    }
  }, [partnerId, navigate]);

  const partnerLabel = useMemo(() => {
    const submissionWithAttraction = submissions.find((entry) => {
      return (
        entry?.attractionName ||
        entry?.partnerName ||
        entry?.partnerLabel ||
        entry?.originalPayload?.attractionName ||
        entry?.originalPayload?.partnerName ||
        entry?.originalPayload?.partnerLabel
      );
    });

    if (submissionWithAttraction) {
      return (
        submissionWithAttraction.attractionName ||
        submissionWithAttraction.partnerName ||
        submissionWithAttraction.partnerLabel ||
        submissionWithAttraction.originalPayload?.attractionName ||
        submissionWithAttraction.originalPayload?.partnerName ||
        submissionWithAttraction.originalPayload?.partnerLabel
      );
    }

    if (data?.partner) {
      return data.partner;
    }

    if (partnerId) {
      return partnerId;
    }

    return "Partner";
  }, [submissions, data?.partner, partnerId]);

  useEffect(() => {
    const label = String(partnerLabel || "Partner");
    document.title = `${label} · Zabava`;
    return () => {
      document.title = "Zabava";
    };
  }, [partnerLabel]);

  const submissions = useMemo(() => {
    if (Array.isArray(data?.submissions)) {
      return data.submissions;
    }
    return [];
  }, [data?.submissions]);

  const [filters, setFilters] = useState({
    ticket: "all",
    visited: "all",
    startDate: "",
    endDate: "",
    search: "",
  });
  const [visitUpdating, setVisitUpdating] = useState({});

  const metrics = useMemo(() => {
    const count = submissions.length;
    let used = 0;
    let visited = 0;
    let revenue = 0;
    let points = 0;

    submissions.forEach((entry) => {
      if (entry.used) used += 1;
      if (entry.visited) visited += 1;
      revenue += Number(entry.totalPrice || 0);
      points += Number(entry.estimatedPoints || 0);
    });

    return {
      count,
      used,
      unused: count - used,
      visited,
      notVisited: count - visited,
      revenue,
      points,
      averageRevenue: count ? revenue / count : 0,
      averagePoints: count ? points / count : 0,
    };
  }, [submissions]);

  const conversionRate = useMemo(() => {
    if (!metrics.count) {
      return 0;
    }
    return (metrics.used / metrics.count) * 100;
  }, [metrics.count, metrics.used]);

  const visitRate = useMemo(() => {
    if (!metrics.count) {
      return 0;
    }
    return (metrics.visited / metrics.count) * 100;
  }, [metrics.count, metrics.visited]);

  const availableTickets = useMemo(() => {
    const set = new Set();
    submissions.forEach((submission) => {
      if (submission.ticket) {
        set.add(submission.ticket);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [submissions]);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((submission) => {
      const createdAtTime = submission.createdAt
        ? new Date(submission.createdAt).getTime()
        : null;

      if (filters.startDate) {
        const startTime = new Date(filters.startDate).setHours(0, 0, 0, 0);
        if (!createdAtTime || createdAtTime < startTime) {
          return false;
        }
      }

      if (filters.endDate) {
        const endTime = new Date(filters.endDate).setHours(23, 59, 59, 999);
        if (!createdAtTime || createdAtTime > endTime) {
          return false;
        }
      }

      if (filters.ticket !== "all") {
        const ticket = submission.ticket || "N/A";
        if (ticket !== filters.ticket) {
          return false;
        }
      }

      if (filters.visited === "visited" && !submission.visited) {
        return false;
      }

      if (filters.visited === "unvisited" && submission.visited) {
        return false;
      }

      if (filters.search) {
        const term = filters.search.trim().toLowerCase();
        const haystack = [
          submission.email,
          submission.Categories,
          submission.ticket,
          submission.cityCode,
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
  }, [filters, submissions]);

  const filteredCount = filteredSubmissions.length;

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      ticket: "all",
      visited: "all",
      startDate: "",
      endDate: "",
      search: "",
    });
  };

  const handleExport = () => {
    const rows = (filteredSubmissions.length ? filteredSubmissions : submissions) || [];
    if (!rows.length) {
      return;
    }

    const header = [
      "Email",
      "Category",
      "Ticket",
      "Number of People",
      "Total Price",
      "Estimated Points",
      "QR Status",
      "Visited",
      "Visited At",
      "Created At",
      "City Code",
    ];

    const escapeForCsv = (value) => {
      return `"${String(value ?? "").replace(/"/g, '""')}"`;
    };

    const lines = rows.map((row) =>
      [
        row.email || "",
        row.Categories || "",
        row.ticket || "",
        row.numPeople || "",
        row.totalPrice || 0,
        row.estimatedPoints || 0,
        row.used ? "Used" : "Pending",
        row.visited ? "Visited" : "Unconfirmed",
        row.visitedAt || "",
        row.createdAt || "",
        row.cityCode || "",
      ].map(escapeForCsv).join(",")
    );

    const headerRow = header.map(escapeForCsv).join(",");
    const csvContent = [headerRow, ...lines].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `partner-${partnerId || "data"}-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleToggleVisited = async (submission) => {
    if (!token || !submission?.email) return;
    const email = submission.email;
    setVisitUpdating((prev) => ({ ...prev, [email]: true }));
    try {
    const response = await fetch(`${API_BASE_URL}/api/partner/visit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email,
        partnerId,
      }),
    });

      if (!response.ok) {
        throw new Error(`Visit update failed: ${response.status}`);
      }

      await refetch();
    } catch (err) {
      console.error("Failed to update visit status", err);
    } finally {
      setVisitUpdating((prev) => {
        const next = { ...prev };
        delete next[email];
        return next;
      });
    }
  };

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

  const revenueTrend = useMemo(() => {
    if (!submissions.length) {
      return [];
    }

    return [...submissions]
      .filter((entry) => entry.createdAt)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      .map((submission) => ({
        date: new Date(submission.createdAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        revenue: submission.totalPrice || 0,
      }));
  }, [submissions]);

  const pieData = useMemo(() => {
    if (!submissions.length) {
      return [];
    }

    const distribution = submissions.reduce((acc, submission) => {
      const key = submission.ticket || "N/A";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(distribution).map(([name, value]) => ({
      name,
      value,
    }));
  }, [submissions]);

  const topTicketTypes = useMemo(() => {
    if (!pieData.length) {
      return [];
    }
    return [...pieData]
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);
  }, [pieData]);

  const bestSubmission = useMemo(() => {
    if (!submissions.length) {
      return null;
    }

    return submissions.reduce((top, submission) => {
      const current = submission.totalPrice || 0;
      const topValue = top?.totalPrice || 0;
      return current > topValue ? submission : top;
    }, submissions[0]);
  }, [submissions]);

  const lastUpdatedLabel = useMemo(() => {
    if (!data?.lastUpdated) {
      return null;
    }
    const date = new Date(data.lastUpdated);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return `${date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })} • ${date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }, [data?.lastUpdated]);

  const totalRevenue = metrics.revenue || 0;
  const averageRevenue = metrics.averageRevenue || 0;
  const points = metrics.points || 0;

  const navigationItems = useMemo(
    () => [
      {
        id: "overview",
        label: "Overview",
        active: activeSection === "overview",
      },
      {
        id: "submissions",
        label: "Submissions",
        active: activeSection === "submissions",
      },
    ],
    [activeSection]
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const sections = [
      { id: "overview", ref: overviewRef },
      { id: "submissions", ref: submissionsRef },
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length) {
          const matching = sections.find(
            (section) => section.ref.current === visible[0].target
          );
          if (matching) {
            setActiveSection((prev) =>
              prev === matching.id ? prev : matching.id
            );
          }
        }
      },
      {
        rootMargin: "-40% 0px -40% 0px",
        threshold: [0.15, 0.3, 0.6],
      }
    );

    sections.forEach(({ ref }) => {
      if (ref.current) {
        observer.observe(ref.current);
      }
    });

    return () => {
      sections.forEach(({ ref }) => {
        if (ref.current) {
          observer.unobserve(ref.current);
        }
      });
      observer.disconnect();
    };
  }, []);

  const tooltipStyles = useMemo(
    () => ({
      background: "rgba(15, 23, 42, 0.92)",
      borderRadius: 12,
      border: "1px solid rgba(148, 163, 184, 0.25)",
      backdropFilter: "blur(10px)",
      color: "#e2e8f0",
    }),
    []
  );
  const tooltipLabelStyle = useMemo(
    () => ({ color: "#e2e8f0", fontWeight: 600 }),
    []
  );
  const tooltipItemStyle = useMemo(
    () => ({ color: "#38bdf8", fontWeight: 500 }),
    []
  );

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="grid min-h-screen md:grid-cols-[260px_1fr]">
        <aside className="hidden border-r border-white/10 bg-white/5 backdrop-blur-xl md:flex md:flex-col">
          <div className="flex items-center gap-3 px-6 py-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/25 text-lg font-semibold text-primary">
              {partnerId ? partnerId.slice(0, 2).toUpperCase() : "L"}
            </div>
            <div>
              <p className="text-sm font-medium text-white">{partnerId || "Partner"}</p>
              <p className="text-xs text-slate-400">Partner Console</p>
            </div>
          </div>
          <nav className="flex-1 space-y-1 px-4">
            {navigationItems.map(({ id, label, active }) => (
              <button
                key={id}
                type="button"
                className={cn(
                  "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-white/10 text-white shadow-lg shadow-primary/5"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                )}
                onClick={() => {
                  const target = id === "overview" ? overviewRef : submissionsRef;
                  target.current?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <span className="flex-1 text-left">{label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex flex-col">
          <header className="border-b border-white/10 bg-white/5 backdrop-blur md:px-8 md:py-6">
            <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 md:px-0">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-semibold text-white">Partner dashboard</h1>
                  <Badge className="bg-emerald-500/20 text-emerald-200">Live</Badge>
                  <Badge variant="outline" className="border-white/20 text-slate-200">
                    {partnerId.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-sm text-slate-300">
                  Real-time visibility into submissions, revenue, and points for your account.
                </p>
                {lastUpdatedLabel && (
                  <p className="text-xs text-slate-500">Last synced {lastUpdatedLabel}</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {userEmail && (
                  <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
                    <p className="font-medium text-slate-200">{userEmail}</p>
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">
                      Partner account
                    </p>
                  </div>
                )}
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={refreshing || loading}
                  className={cn("gap-2", primaryButtonClass)}
                >
                  {refreshing ? (
                    <RefreshCcw className="size-4 animate-spin" />
                  ) : (
                    <RefreshCcw className="size-4" />
                  )}
                  {refreshing ? "Refreshing" : "Refresh data"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className={cn("gap-2", secondaryButtonClass)}
                >
                  <LogOut className="size-4" />
                  Logout
                </Button>
              </div>
            </div>
          </header>

          <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col space-y-8 px-4 py-6 md:px-10">
            {error && (
              <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
                {error.message || "Unable to load partner data. Please try again."}
              </div>
            )}

            <section
              ref={overviewRef}
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
            >
              <MetricCard
                title="Total submissions"
                value={numberFormatter.format(metrics.count)}
                subtitle={`${numberFormatter.format(metrics.used)} used • ${numberFormatter.format(
                  metrics.unused
                )} pending`}
              />
              <MetricCard
                title="Conversion rate"
                value={`${conversionRate.toFixed(0)}%`}
                subtitle="Usage of distributed tickets"
              />
              <MetricCard
                title="Total revenue"
                value={currencyFormatter.format(totalRevenue)}
                subtitle={`Avg ${currencyFormatterDetailed.format(averageRevenue)} / submission`}
              />
              <MetricCard
                title="Total points"
                value={numberFormatter.format(points)}
                subtitle={`Avg ${numberFormatter.format(metrics.averagePoints)} pts per submission`}
              />
              <MetricCard
                title="Visits confirmed"
                value={`${numberFormatter.format(metrics.visited)} (${visitRate.toFixed(0)}%)`}
                subtitle={`${numberFormatter.format(metrics.notVisited)} awaiting confirmation`}
              />
            </section>

            <section className="grid gap-6 xl:grid-cols-3">
              <Card className="border-white/10 bg-white/[0.06] backdrop-blur-xl xl:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base text-white">Revenue trend</CardTitle>
                  <CardDescription>Tracking submissions over time</CardDescription>
                </CardHeader>
                <CardContent className="h-[320px] px-0 pb-0">
                  {loading && revenueTrend.length === 0 ? (
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
                          contentStyle={tooltipStyles}
                          labelStyle={tooltipLabelStyle}
                          itemStyle={tooltipItemStyle}
                          formatter={(value) => currencyFormatter.format(value)}
                          labelFormatter={(label) => `Date: ${label}`}
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
                <CardFooter className="flex flex-wrap gap-6 border-t border-white/10 bg-white/[0.04] py-4 text-sm text-slate-300">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">
                      Highest booking
                    </p>
                    <p className="mt-1 font-medium text-white">
                      {bestSubmission
                        ? currencyFormatter.format(bestSubmission.totalPrice || 0)
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">
                      Average value
                    </p>
                    <p className="mt-1 font-medium text-white">
                      {currencyFormatterDetailed.format(averageRevenue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">
                      Total revenue
                    </p>
                    <p className="mt-1 font-medium text-white">
                      {currencyFormatter.format(totalRevenue)}
                    </p>
                  </div>
                </CardFooter>
              </Card>

              <Card className="border-white/10 bg-white/[0.06] backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-base text-white">
                    Ticket distribution
                  </CardTitle>
                  <CardDescription>
                    Breakdown of submissions by ticket type
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[320px] px-0 pb-0">
                  {loading && pieData.length === 0 ? (
                    <Skeleton className="h-full w-full bg-white/10" />
                  ) : pieData.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell
                              key={entry.name}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={tooltipStyles}
                          labelStyle={tooltipLabelStyle}
                          itemStyle={{ color: "#cbd5f5" }}
                          formatter={(value, name) => [`${value} submissions`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-400">
                      Not enough data yet.
                    </div>
                  )}
                </CardContent>
                {topTicketTypes.length ? (
                  <CardFooter className="flex flex-col gap-3 border-t border-white/10 bg-white/[0.04] py-4 text-sm text-slate-300">
                    {topTicketTypes.map((item, index) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="size-2.5 rounded-full"
                            style={{
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          />
                          <span className="font-medium text-white">
                            {item.name}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">
                          {metrics.count
                            ? `${((item.value / metrics.count) * 100).toFixed(0)}%`
                            : "0%"}
                          {" "}• {numberFormatter.format(item.value)} submissions
                        </span>
                      </div>
                    ))}
                  </CardFooter>
                ) : null}
              </Card>
            </section>

            <section ref={submissionsRef}>
              <Card className="border-white/10 bg-white/[0.06] backdrop-blur-xl">
                <CardHeader className="flex flex-wrap items-center justify-between gap-4 space-y-0">
                  <div>
                    <CardTitle className="text-base text-white">
                      Latest submissions
                    </CardTitle>
                    <CardDescription>
                      Complete feed of partner activity and ticket scans
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <BadgeWithIcon
                      icon={Users}
                      label={`${numberFormatter.format(metrics.count)} total`}
                    />
                    <BadgeWithIcon
                      icon={Activity}
                      label={`${numberFormatter.format(metrics.used)} used`}
                    />
                    <BadgeWithIcon
                      icon={Ticket}
                      label={`${numberFormatter.format(metrics.unused)} pending`}
                    />
                    <BadgeWithIcon
                      icon={Award}
                      label={`${numberFormatter.format(metrics.visited)} visited`}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 px-0">
                  <div className="space-y-3 border-b border-white/10 bg-white/[0.03] px-4 py-4">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                          Search
                        </label>
                        <Input
                          value={filters.search}
                          onChange={(event) => handleFilterChange("search", event.target.value)}
                          placeholder="Search email, category, ticket"
                          className="bg-slate-950/50 text-white"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                          Ticket type
                        </label>
                        <select
                          value={filters.ticket}
                          onChange={(event) => handleFilterChange("ticket", event.target.value)}
                          className="rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white"
                        >
                          <option value="all">All tickets</option>
                          {availableTickets.map((ticket) => (
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
                          value={filters.visited}
                          onChange={(event) => handleFilterChange("visited", event.target.value)}
                          className="rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white"
                        >
                          <option value="all">All</option>
                          <option value="visited">Visited</option>
                          <option value="unvisited">Awaiting visit</option>
                        </select>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                            From
                          </label>
                          <Input
                            type="date"
                            value={filters.startDate}
                            onChange={(event) => handleFilterChange("startDate", event.target.value)}
                            className="bg-slate-950/60 text-white"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                            To
                          </label>
                          <Input
                            type="date"
                            value={filters.endDate}
                            onChange={(event) => handleFilterChange("endDate", event.target.value)}
                            className="bg-slate-950/60 text-white"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs text-slate-400">
                        Showing {numberFormatter.format(filteredCount)} of {numberFormatter.format(metrics.count)} submissions
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn("gap-1", secondaryButtonClass)}
                          onClick={handleResetFilters}
                        >
                          Reset filters
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn("gap-2", primaryButtonClass)}
                          onClick={handleExport}
                          disabled={filteredSubmissions.length === 0}
                        >
                          <Download className="size-4" /> Export CSV
                        </Button>
                      </div>
                    </div>
                  </div>

                  <SubmissionsTable
                    submissions={filteredSubmissions}
                    isLoading={loading && submissions.length === 0}
                    onToggleVisited={handleToggleVisited}
                    visitUpdating={visitUpdating}
                  />
                </CardContent>
              </Card>
            </section>
          </main>
        </div>
      </div>
    </div>
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

function BadgeWithIcon({ icon, label }) {
  const Icon = icon;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-slate-200">
      <Icon className="size-3" />
      {label}
    </span>
  );
}
