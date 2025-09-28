
import React, { useState } from 'react';
import { User } from '../types';
import { Modal } from './Modal';

interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  mode: 'change' | 'reset'; // 'change' for self, 'reset' for admin resetting others
  onSubmit: (userId: string, newPassword: string, oldPassword?: string) => { success: boolean, message?: string };
}

export const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({ isOpen, onClose, user, mode, onSubmit }) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword || !confirmPassword) {
      setError('Vui lòng nhập mật khẩu mới và xác nhận.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu mới và mật khẩu xác nhận không khớp.');
      return;
    }
    if (mode === 'change' && !oldPassword) {
        setError('Vui lòng nhập mật khẩu cũ.');
        return;
    }

    const result = onSubmit(user.id, newPassword, mode === 'change' ? oldPassword : undefined);
    
    if (result.success) {
      alert('Đổi mật khẩu thành công!');
      onClose();
    } else {
      setError(result.message || 'Đã có lỗi xảy ra.');
    }
  };

  const title = mode === 'change' ? 'Đổi mật khẩu của bạn' : `Reset mật khẩu cho ${user.name}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'change' && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Mật khẩu cũ</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700">Mật khẩu mới</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Xác nhận mật khẩu mới</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            required
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end pt-4 space-x-2">
            <button type="button" onClick={onClose} className="px-6 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Hủy</button>
            <button type="submit" className="px-6 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700">Lưu</button>
        </div>
      </form>
    </Modal>
  );
};
