import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserX,
  UserCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  ArrowLeft,
  RefreshCw,
  Ban,
} from 'lucide-react';

interface User {
  email: string;
  nickname: string;
  isBanned: boolean;
  banReason: string | null;
  bannedAt: string | null;
  bannedBy: string | null;
  lastLoginAt: string | null;
  loginCount: number;
  createdAt: string;
  isAdmin: boolean;
}

interface UserStats {
  totalUsers: number;
  bannedUsers: number;
  activeUsers: number;
  newUsers: number;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export default function UserManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [bannedFilter, setBannedFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [banModal, setBanModal] = useState<{ email: string; nickname: string } | null>(null);
  const [banReason, setBanReason] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [page, bannedFilter]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('console_auth_token');
      const res = await fetch('/api/users/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('console_auth_token');
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '10',
        ...(search && { search }),
        ...(bannedFilter && { banned: bannedFilter }),
      });
      const res = await fetch(`/api/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.data.users);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchUsers();
  };

  const handleBan = async (email: string) => {
    if (!banReason.trim()) {
      alert('请输入封禁原因');
      return;
    }
    setActionLoading(email);
    try {
      const token = localStorage.getItem('console_auth_token');
      const res = await fetch(`/api/users/${encodeURIComponent(email)}/ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: banReason }),
      });
      const data = await res.json();
      if (data.success) {
        setBanModal(null);
        setBanReason('');
        fetchUsers();
        fetchStats();
      } else {
        alert(data.error || '操作失败');
      }
    } catch (error) {
      console.error('Failed to ban user:', error);
      alert('操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnban = async (email: string) => {
    if (!confirm('确定要解封该用户吗？')) return;
    
    setActionLoading(email);
    try {
      const token = localStorage.getItem('console_auth_token');
      const res = await fetch(`/api/users/${encodeURIComponent(email)}/unban`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        fetchUsers();
        fetchStats();
      } else {
        alert(data.error || '操作失败');
      }
    } catch (error) {
      console.error('Failed to unban user:', error);
      alert('操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin')}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-3">
                <Users className="w-7 h-7 text-blue-400" />
                用户管理
              </h1>
              <p className="text-gray-400 text-sm mt-1">管理平台用户，支持封号和解封</p>
            </div>
          </div>
          <button
            onClick={() => { fetchUsers(); fetchStats(); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                  <p className="text-gray-400 text-xs">总用户</p>
                </div>
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <Ban className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.bannedUsers}</p>
                  <p className="text-gray-400 text-xs">已封禁</p>
                </div>
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <UserCheck className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.activeUsers}</p>
                  <p className="text-gray-400 text-xs">活跃用户(7天)</p>
                </div>
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <UserCheck className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.newUsers}</p>
                  <p className="text-gray-400 text-xs">新增用户(7天)</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索邮箱或昵称..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/10 border border-white/10 focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>
          <select
            value={bannedFilter}
            onChange={(e) => { setBannedFilter(e.target.value); setPage(1); }}
            className="px-4 py-2.5 rounded-lg bg-white/10 border border-white/10 focus:border-blue-500 focus:outline-none transition-colors"
          >
            <option value="">全部状态</option>
            <option value="false">正常</option>
            <option value="true">已封禁</option>
          </select>
          <button
            onClick={handleSearch}
            className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors font-medium"
          >
            搜索
          </button>
        </div>

        {/* Users Table */}
        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-gray-400 font-medium">用户</th>
                  <th className="text-left p-4 text-gray-400 font-medium">状态</th>
                  <th className="text-left p-4 text-gray-400 font-medium">登录次数</th>
                  <th className="text-left p-4 text-gray-400 font-medium">最后登录</th>
                  <th className="text-left p-4 text-gray-400 font-medium">注册时间</th>
                  <th className="text-right p-4 text-gray-400 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400">
                      加载中...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400">
                      暂无用户数据
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.email} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                            {user.nickname[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium flex items-center gap-2">
                              {user.nickname}
                              {user.isAdmin && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-yellow-500/20 text-yellow-400">
                                  <Shield className="w-3 h-3 inline" /> 管理员
                                </span>
                              )}
                            </p>
                            <p className="text-gray-400 text-sm">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {user.isBanned ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-sm">
                              <UserX className="w-4 h-4" />
                              已封禁
                            </span>
                            {user.banReason && (
                              <p className="text-gray-400 text-xs mt-1">原因: {user.banReason}</p>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-sm">
                            <UserCheck className="w-4 h-4" />
                            正常
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-gray-300">{user.loginCount} 次</td>
                      <td className="p-4 text-gray-400 text-sm">{formatDate(user.lastLoginAt)}</td>
                      <td className="p-4 text-gray-400 text-sm">{formatDate(user.createdAt)}</td>
                      <td className="p-4 text-right">
                        {!user.isAdmin && (
                          user.isBanned ? (
                            <button
                              onClick={() => handleUnban(user.email)}
                              disabled={actionLoading === user.email}
                              className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors text-sm"
                            >
                              {actionLoading === user.email ? '处理中...' : '解封'}
                            </button>
                          ) : (
                            <button
                              onClick={() => setBanModal({ email: user.email, nickname: user.nickname })}
                              disabled={actionLoading === user.email}
                              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors text-sm"
                            >
                              封禁
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="px-4 py-2 rounded-lg bg-white/10">
              {page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Ban Modal */}
      {banModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-white/10">
            <h3 className="text-xl font-bold mb-4">封禁用户</h3>
            <p className="text-gray-300 mb-4">
              确定要封禁用户 <span className="text-white font-medium">{banModal.nickname}</span> 吗？
            </p>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">封禁原因</label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="请输入封禁原因..."
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/10 focus:border-blue-500 focus:outline-none transition-colors resize-none"
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setBanModal(null); setBanReason(''); }}
                className="flex-1 px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleBan(banModal.email)}
                disabled={actionLoading === banModal.email}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading === banModal.email ? '处理中...' : '确认封禁'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}