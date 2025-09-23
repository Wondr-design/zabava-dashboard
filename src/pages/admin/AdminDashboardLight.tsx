import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import InviteManager from './InviteManager';
import RewardsManagement from './RewardsManagement';
import { SubmissionsTable } from '@/components/SubmissionsTable';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Activity,
  Package,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  Bell,
  UserPlus,
  Gift,
  FileText,
  BarChart3,
  Settings,
  Plus,
  Search,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { API_BASE_URL } from '@/lib/config';

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

// Format relative time for notifications
const formatRelativeTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  return format(date, 'MMM d, yyyy');
};

// Mock data generators for charts
const generateMockChartData = () => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map(day => ({
    date: day,
    revenue: Math.floor(Math.random() * 5000) + 1000,
    users: Math.floor(Math.random() * 200) + 50,
    partners: Math.floor(Math.random() * 10) + 2
  }));
};

const generateMockPieData = () => {
  return [
    { name: 'LaserMaxx', value: 35000, revenue: 35000 },
    { name: 'Adventure Park', value: 28000, revenue: 28000 },
    { name: 'Bowling Center', value: 22000, revenue: 22000 },
    { name: 'Cinema Complex', value: 18000, revenue: 18000 },
    { name: 'Others', value: 15000, revenue: 15000 }
  ];
};

interface AdminMetrics {
  totalPartners: number;
  totalUsers: number;
  totalRevenue: number;
  totalRedemptions: number;
  recentActivity: any[];
  partnerGrowth: any[];
  revenueByPartner: any[];
  submissions?: any[];
}

export default function AdminDashboardLight() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, logout } = useAuth();
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    addNotification,
    fetchNotifications 
  } = useNotifications();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [metrics, setMetrics] = useState<AdminMetrics>({
    totalPartners: 0,
    totalUsers: 0,
    totalRevenue: 0,
    totalRedemptions: 0,
    recentActivity: [],
    partnerGrowth: [],
    revenueByPartner: []
  });
  const [activeView, setActiveView] = useState('overview');

  // Handle view changes within dashboard
  const handleViewChange = (view: string) => {
    setActiveView(view);
    // Update URL without navigation
    window.history.pushState({}, '', `/admin/${view === 'overview' ? 'dashboard' : view}`);
    
    // Fetch submissions data when switching to submissions view
    if (view === 'submissions' && !metrics.submissions) {
      fetchAllSubmissions();
    }
  };

  // Handle initial route
  useEffect(() => {
    const path = location.pathname.split('/').pop();
    if (path && path !== 'admin') {
      setActiveView(path === 'dashboard' ? 'overview' : path);
    }
  }, []);

  // Fetch data on mount
  useEffect(() => {
    fetchAdminData();
    // Notifications are handled by the NotificationContext
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const adminSecret = 'zabava'; // Use hardcoded secret for now
      
      // Fetch overview data
      const overviewResponse = await fetch(`${API_BASE_URL}/api/admin/overview`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-admin-secret': adminSecret
        }
      });

      // Fetch analytics data
      const analyticsResponse = await fetch(`${API_BASE_URL}/api/admin/analytics?mode=metrics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-admin-secret': adminSecret
        }
      });

      if (overviewResponse.ok) {
        const overviewData = await overviewResponse.json();
        let analyticsData = {};
        
        if (analyticsResponse.ok) {
          analyticsData = await analyticsResponse.json();
        }
        
        // Process and set metrics combining both responses
        setMetrics({
          totalPartners: overviewData.totals?.activePartners || analyticsData.totals?.activePartners || 0,
          totalUsers: analyticsData.totals?.totalUsers || overviewData.totals?.users || 0,
          totalRevenue: overviewData.totals?.totalRevenue || analyticsData.totals?.revenue || 0,
          totalRedemptions: analyticsData.totals?.totalRedemptions || overviewData.totals?.redemptions || 0,
          recentActivity: analyticsData.recentActivity || overviewData.recentActivity || [],
          partnerGrowth: analyticsData.partnerGrowth || generateMockChartData(),
          revenueByPartner: analyticsData.revenueByPartner || generateMockPieData()
        });
      }
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Trigger manual notification check (useful for testing)
  const triggerTestNotification = () => {
    addNotification({
      type: 'system',
      title: 'Test Notification',
      message: 'This is a test notification from the admin dashboard',
      priority: 'medium'
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    
    try {
      if (activeView === 'submissions') {
        await fetchAllSubmissions();
      } else {
        // For other views, refresh general admin data
        await fetchAdminData();
      }
      // Also refresh notifications
      await fetchNotifications();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchAllSubmissions = async () => {
    try {
      setLoading(true);
      const adminSecret = 'zabava';
      
      // Fetch submissions from all partners
      const partnersResponse = await fetch(`${API_BASE_URL}/api/admin/partners`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-admin-secret': adminSecret
        }
      });
      
      if (partnersResponse.ok) {
        const partnersData = await partnersResponse.json();
        const allSubmissions: any[] = [];
        
        // Fetch submissions for each partner
        for (const partner of (partnersData.partners || [])) {
          try {
            const submissionsResponse = await fetch(`${API_BASE_URL}/api/partner/${partner.partnerId}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'x-admin-secret': adminSecret
              }
            });
            
            if (submissionsResponse.ok) {
              const data = await submissionsResponse.json();
              if (data.submissions) {
                allSubmissions.push(...data.submissions.map((s: any) => ({
                  ...s,
                  partnerId: partner.partnerId,
                  partnerName: partner.name || partner.partnerId
                })));
              }
            }
          } catch (error) {
            console.error(`Failed to fetch submissions for partner ${partner.partnerId}:`, error);
          }
        }
        
        setMetrics(prev => ({ ...prev, submissions: allSubmissions }));
      }
    } catch (error) {
      console.error('Failed to fetch all submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Notification permission is handled by NotificationContext

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  // Mock data generators for charts
  const generateMockChartData = () => {
    return [...Array(7)].map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        date: format(date, 'MMM dd'),
        partners: Math.floor(Math.random() * 5) + 10,
        users: Math.floor(Math.random() * 50) + 100,
        revenue: Math.floor(Math.random() * 10000) + 5000
      };
    });
  };

  const generateMockPieData = () => {
    return [
      { name: 'Partner A', value: 35, revenue: 45000 },
      { name: 'Partner B', value: 25, revenue: 32000 },
      { name: 'Partner C', value: 20, revenue: 25000 },
      { name: 'Partner D', value: 15, revenue: 18000 },
      { name: 'Others', value: 5, revenue: 8000 }
    ];
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0">
        <Sidebar
          user={user!}
          onLogout={handleLogout}
          onViewChange={handleViewChange}
          activeView={activeView}
          className="h-full"
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {activeView === 'overview' && 'Admin Dashboard'}
                {activeView === 'submissions' && 'All Submissions'}
                {activeView === 'partners' && 'Partner Management'}
                {activeView === 'invites' && 'Invite Manager'}
                {activeView === 'rewards' && 'Rewards Management'}
                {activeView === 'analytics' && 'Analytics'}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className="gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                Refresh
              </Button>
              <div className="relative">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    if (!showNotifications && unreadCount > 0) {
                      markAllAsRead();
                    }
                  }}
                  className="relative"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
                
                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">Notifications</h3>
                          <p className="text-xs text-gray-500 mt-1">
                            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={markAllAsRead}
                            className="text-sm text-blue-600 hover:text-blue-700"
                          >
                            Mark all read
                          </button>
                          <button 
                            onClick={triggerTestNotification}
                            className="text-sm text-green-600 hover:text-green-700"
                          >
                            Test
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500 text-sm">No notifications yet</p>
                          <p className="text-gray-400 text-xs mt-1">We'll notify you when something happens</p>
                        </div>
                      ) : (
                        notifications.slice(0, 10).map((notif) => (
                          <div 
                            key={notif.id} 
                            className={cn(
                              "p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors",
                              !notif.read && "bg-blue-50 hover:bg-blue-100"
                            )}
                            onClick={() => {
                              if (!notif.read) markAsRead(notif.id);
                              if (notif.actionUrl) {
                                navigate(notif.actionUrl);
                                setShowNotifications(false);
                              }
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className="relative">
                                <div className={cn(
                                  "w-10 h-10 rounded-full flex items-center justify-center",
                                  notif.type === 'partner' && "bg-blue-100",
                                  notif.type === 'user' && "bg-green-100",
                                  notif.type === 'redemption' && "bg-purple-100",
                                  notif.type === 'submission' && "bg-yellow-100",
                                  notif.type === 'system' && "bg-gray-100"
                                )}>
                                  {notif.type === 'partner' && <UserPlus className="h-5 w-5 text-blue-600" />}
                                  {notif.type === 'user' && <Users className="h-5 w-5 text-green-600" />}
                                  {notif.type === 'redemption' && <Gift className="h-5 w-5 text-purple-600" />}
                                  {notif.type === 'submission' && <FileText className="h-5 w-5 text-yellow-600" />}
                                  {notif.type === 'system' && <Bell className="h-5 w-5 text-gray-600" />}
                                </div>
                                {!notif.read && (
                                  <div className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{notif.title}</p>
                                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{notif.message}</p>
                                <p className="text-xs text-gray-400 mt-2">
                                  {formatRelativeTime(notif.timestamp)}
                                </p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(notif.id);
                                }}
                                className="text-gray-400 hover:text-gray-600 p-1"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {notifications.length > 10 && (
                      <div className="p-3 border-t border-gray-200 text-center">
                        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                          View all notifications ({notifications.length})
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {activeView === 'overview' && (
                <Button size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export Report
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Overview Dashboard */}
          {activeView === 'overview' && (
            <div className="space-y-6">
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardDescription className="text-sm font-medium">Total Partners</CardDescription>
                      <Users className="h-4 w-4 text-gray-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatNumber(metrics.totalPartners)}</div>
                    <div className="flex items-center gap-1 mt-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600 font-medium">+3</span>
                      <span className="text-sm text-gray-500">this month</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardDescription className="text-sm font-medium">Total Users</CardDescription>
                      <Activity className="h-4 w-4 text-gray-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatNumber(metrics.totalUsers)}</div>
                    <div className="flex items-center gap-1 mt-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600 font-medium">+245</span>
                      <span className="text-sm text-gray-500">this week</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardDescription className="text-sm font-medium">Total Revenue</CardDescription>
                      <DollarSign className="h-4 w-4 text-gray-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
                    <div className="flex items-center gap-1 mt-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600 font-medium">+18.2%</span>
                      <span className="text-sm text-gray-500">from last month</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardDescription className="text-sm font-medium">Total Redemptions</CardDescription>
                      <Gift className="h-4 w-4 text-gray-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatNumber(metrics.totalRedemptions)}</div>
                    <div className="flex items-center gap-1 mt-2">
                      <span className="text-sm text-gray-500">Active rewards:</span>
                      <span className="text-sm text-gray-700 font-medium">12</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Growth Overview</CardTitle>
                    <CardDescription>Partners, users, and revenue over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={metrics.partnerGrowth}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                        <YAxis stroke="#94a3b8" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          name="Revenue"
                        />
                        <Line
                          type="monotone"
                          dataKey="users"
                          stroke="#10b981"
                          strokeWidth={2}
                          name="Users"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Partners</CardTitle>
                    <CardDescription>By revenue contribution</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={metrics.revenueByPartner}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {metrics.revenueByPartner.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 space-y-2">
                      {metrics.revenueByPartner.slice(0, 4).map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                            />
                            <span className="text-sm text-gray-600">{item.name}</span>
                          </div>
                          <span className="text-sm font-medium">{formatCurrency(item.revenue)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Recent Activity</CardTitle>
                      <CardDescription>Latest system events</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm">
                      View All
                      <ArrowUpRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <UserPlus className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">New partner registered</p>
                          <p className="text-xs text-gray-500">Adventure Park joined the platform</p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">2 hours ago</span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                          <Gift className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Reward redeemed</p>
                          <p className="text-xs text-gray-500">User claimed "Weekend Pass" reward</p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">4 hours ago</span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">New submission</p>
                          <p className="text-xs text-gray-500">125 new bookings received today</p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">Today</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Invites View */}
          {activeView === 'invites' && (
            <InviteManager />
          )}

          {/* Rewards View */}
          {activeView === 'rewards' && (
            <RewardsManagement />
          )}

          {/* Submissions View */}
          {activeView === 'submissions' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All System Submissions</CardTitle>
                    <CardDescription>Complete overview of all partner submissions</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchAllSubmissions}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <SubmissionsTable
                    submissions={metrics.submissions || []}
                    isLoading={loading}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Partners View */}
          {activeView === 'partners' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Partner Management</CardTitle>
                      <CardDescription>Manage all partner accounts and settings</CardDescription>
                    </div>
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Partner
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500">Partner management interface will be displayed here...</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Analytics View */}
          {activeView === 'analytics' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Analytics Dashboard</CardTitle>
                  <CardDescription>Detailed analytics and insights</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500">Advanced analytics will be displayed here...</p>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}