import React, { useState } from 'react';
import { User } from '../types';

interface LoginScreenProps {
  users: User[];
  onLogin: (userId: string, password: string) => Promise<boolean>;
  loginError: string | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ users, onLogin, loginError }) => {
  const [selectedUserId, setSelectedUserId] = useState<string>(users.length > 0 ? users[0].id : '');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !password || isLoggingIn) return;
    
    setIsLoggingIn(true);
    await onLogin(selectedUserId, password);
    setIsLoggingIn(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-indigo-600">Hệ thống Quản lý Hoạt động</h1>
          <p className="mt-2 text-gray-500">Vui lòng chọn tài khoản và nhập mật khẩu để đăng nhập.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="user-select" className="block text-sm font-medium text-gray-700">Tài khoản</label>
            <select
              id="user-select"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.name} ({user.role})</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Mật khẩu</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
          </div>
          
          {loginError && (
            <p className="text-sm text-red-600 text-center">{loginError}</p>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
            >
              {isLoggingIn ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
