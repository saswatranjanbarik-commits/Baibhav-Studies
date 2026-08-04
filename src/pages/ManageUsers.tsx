import React, { useState, useEffect } from 'react';
import { Users, Plus, X, Search, Edit2, Trash2, Globe, Shield, User, UserCheck, Key, Lock, AlertTriangle } from 'lucide-react';

interface UserObj {
  id: string;
  username: string;
  password?: string;
  role: 'Admin' | 'Teacher' | 'Student';
  timezone: string;
}

const TIMEZONES = [
  "UTC-12:00 (International Date Line West)",
  "UTC-11:00 (Samoa Standard Time)",
  "UTC-10:00 (Hawaii-Aleutian Standard Time)",
  "UTC-09:00 (Alaska Standard Time)",
  "UTC-08:00 (Pacific Standard Time)",
  "UTC-07:00 (Mountain Standard Time)",
  "UTC-06:00 (Central Standard Time)",
  "UTC-05:00 (Eastern Standard Time)",
  "UTC-04:00 (Atlantic Standard Time)",
  "UTC-03:00 (Argentina, Brazil Time)",
  "UTC-02:00 (South Georgia/Sandwich Islands)",
  "UTC-01:00 (Azores, Cape Verde Time)",
  "UTC (Coordinated Universal Time)",
  "UTC+01:00 (Central European Time)",
  "UTC+02:00 (Eastern European Time)",
  "UTC+03:00 (Moscow Standard Time)",
  "UTC+04:00 (Gulf Standard Time)",
  "UTC+05:00 (Pakistan Standard Time)",
  "UTC+05:30 (Indian Standard Time)",
  "UTC+06:00 (Bangladesh Standard Time)",
  "UTC+07:00 (Indochina Time)",
  "UTC+08:00 (China Standard Time, AWST)",
  "UTC+09:00 (Japan Standard Time)",
  "UTC+09:30 (Australian Central Standard Time)",
  "UTC+10:00 (Australian Eastern Standard Time)",
  "UTC+11:00 (Solomon Islands Time)",
  "UTC+12:00 (New Zealand Standard Time)",
  "UTC+13:00 (Samoa Time)",
  "UTC+14:00 (Line Islands Time)"
];

const DEFAULT_USERS: UserObj[] = [
  {
    id: '1',
    username: 'Saswat',
    password: 'admin123',
    role: 'Admin',
    timezone: 'UTC+05:30 (Indian Standard Time)'
  }
];

export default function ManageUsers() {
  const [users, setUsers] = useState<UserObj[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [newUser, setNewUser] = useState<Partial<UserObj>>({
    role: 'Student',
    timezone: 'UTC (Coordinated Universal Time)'
  });
  
  const [editingUser, setEditingUser] = useState<UserObj | null>(null);

  useEffect(() => {
    const savedUsers = localStorage.getItem('dugu_users_v2');
    if (savedUsers) {
      setUsers(JSON.parse(savedUsers));
    } else {
      setUsers(DEFAULT_USERS);
      localStorage.setItem('dugu_users_v2', JSON.stringify(DEFAULT_USERS));
    }
  }, []);

  const saveUsers = (newUsers: UserObj[]) => {
    setUsers(newUsers);
    localStorage.setItem('dugu_users_v2', JSON.stringify(newUsers));
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username) return;

    if (editingUser) {
      const updated = users.map(u => {
        if (u.id === editingUser.id) {
          return {
            ...u,
            username: newUser.username as string,
            password: newUser.password ? newUser.password : u.password,
            role: newUser.role as any,
            timezone: newUser.timezone as string
          };
        }
        return u;
      });
      saveUsers(updated);
      setEditingUser(null);
    } else {
      if (!newUser.password) {
        alert("Password is required for new users.");
        return;
      }
      const user: UserObj = {
        id: Date.now().toString(),
        username: newUser.username,
        password: newUser.password,
        role: newUser.role as any,
        timezone: newUser.timezone as string,
      };
      saveUsers([user, ...users]);
    }

    setShowAddModal(false);
    setNewUser({ role: 'Student', timezone: 'UTC (Coordinated Universal Time)' });
  };

  const handleDelete = (id: string) => {
    const user = users.find(u => u.id === id);
    if (user?.role === 'Admin' && user?.username === 'Saswat') {
      alert("Cannot delete the primary Admin account.");
      return;
    }
    
    if (confirm('Are you sure you want to remove this user?')) {
      saveUsers(users.filter(u => u.id !== id));
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleClearData = () => {
    if (confirm("WARNING: This will clear ALL app data (except users) for all users! Are you absolutely sure?")) {
      const usersBackup = localStorage.getItem('dugu_users_v2');
      const currentUserBackup = localStorage.getItem('dugu_currentUser_v2');
      
      localStorage.clear();
      
      if (usersBackup) localStorage.setItem('dugu_users_v2', usersBackup);
      if (currentUserBackup) localStorage.setItem('dugu_currentUser_v2', currentUserBackup);
      
      alert("All app data has been cleared.");
      window.location.reload();
    }
  };

  const getRoleIcon = (role: string) => {
    switch(role) {
      case 'Admin': return <Shield className="h-4 w-4 text-purple-600" />;
      case 'Teacher': return <UserCheck className="h-4 w-4 text-blue-600" />;
      case 'Student': return <User className="h-4 w-4 text-emerald-600" />;
      default: return <User className="h-4 w-4 text-slate-600" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'Admin': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Teacher': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Student': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" /> Manage Users
          </h2>
          <p className="text-sm text-slate-500 mt-1">Add, remove, and configure roles (Admin, Teacher, Student) across different timezones.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleClearData}
            className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 text-sm font-semibold rounded-lg hover:bg-red-100 shadow-sm flex items-center gap-2 transition-colors"
          >
            <AlertTriangle className="h-4 w-4" /> Clear All Data
          </button>
          <button
            onClick={() => {
              setEditingUser(null);
              setNewUser({ role: 'Student', timezone: 'UTC (Coordinated Universal Time)' });
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 shadow-sm flex items-center gap-2 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add User
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="relative w-full sm:max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by username or role..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Timezone</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredUsers.length > 0 ? filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-inner bg-indigo-500`}>
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{user.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide border ${getRoleBadge(user.role)}`}>
                      {getRoleIcon(user.role)} {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg w-fit border border-slate-200">
                      <Globe className="h-4 w-4 text-slate-400" />
                      {user.timezone}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => {
                          setEditingUser(user);
                          setNewUser({ ...user, password: '' });
                          setShowAddModal(true);
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(user.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          user.role === 'Admin' && user.username === 'Saswat' 
                            ? 'text-slate-300 cursor-not-allowed' 
                            : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                        }`}
                        disabled={user.role === 'Admin' && user.username === 'Saswat'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    No users found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddUser} className="p-6 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Username *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={newUser.username || ''}
                    onChange={e => setNewUser({...newUser, username: e.target.value})}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm"
                    placeholder="e.g. JohnStudent"
                    disabled={editingUser?.role === 'Admin' && editingUser?.username === 'Saswat'}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  {editingUser ? 'New Password (Leave blank to keep current)' : 'Password *'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required={!editingUser}
                    value={newUser.password || ''}
                    onChange={e => setNewUser({...newUser, password: e.target.value})}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm"
                    placeholder="Enter password"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Role *</label>
                <select
                  required
                  value={newUser.role || 'Student'}
                  onChange={e => setNewUser({...newUser, role: e.target.value as any})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm"
                  disabled={editingUser?.role === 'Admin' && editingUser?.username === 'Saswat'}
                >
                  <option value="Admin">Admin</option>
                  <option value="Teacher">Teacher</option>
                  <option value="Student">Student</option>
                </select>
                {newUser.role === 'Admin' && (
                  <p className="text-xs text-purple-600 font-medium mt-2">
                    Admins have full access to all settings and content.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Timezone *</label>
                <select
                  required
                  value={newUser.timezone || TIMEZONES[0]}
                  onChange={e => setNewUser({...newUser, timezone: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm"
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
                >
                  {editingUser ? 'Save Changes' : 'Add User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

