import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './screens/Dashboard';
import { User, AcademicYear, Group, Teacher, Activity, ParticipationRecord, UserRole } from './types';
import * as api from './services/supabaseService';
import { PasswordChangeModal } from './components/PasswordChangeModal';
import { Session } from '@supabase/supabase-js';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const [users, setUsers] = useState<User[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [participationRecords, setParticipationRecords] = useState<ParticipationRecord[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [passwordModal, setPasswordModal] = useState<{ isOpen: boolean; user: User | null; mode: 'change' | 'reset' }>({ isOpen: false, user: null, mode: 'change' });

  useEffect(() => {
    api.onAuthStateChange((_event, session) => {
      setSession(session);
      // Mark auth as ready once we get the first auth event
      if (!authReady) {
        setAuthReady(true);
      }
    });
  }, [authReady]);

  const loadAllData = useCallback(async () => {
    if (!session?.user?.email) {
        setCurrentUser(null);
        setIsLoading(false);
        return;
    }
    
    setIsLoading(true);

    // First, fetch the user's profile based on their email
    const userProfile = await api.getUserProfile(session.user.email);
    setCurrentUser(userProfile);

    // If user has no profile, they are not authorized.
    if (!userProfile) {
      setIsLoading(false);
      return;
    }
    
    // If user is authorized, fetch all other data
    const [
      loadedUsers,
      loadedAcademicYears,
      loadedGroups,
      loadedActivities,
      loadedParticipationRecords,
    ] = await Promise.all([
      api.getUsers(),
      api.getAcademicYears(),
      api.getGroups(),
      api.getActivities(),
      api.getParticipationRecords(),
    ]);
    setUsers(loadedUsers);
    setAcademicYears(loadedAcademicYears);
    setGroups(loadedGroups);
    // Teachers are now part of the users table.
    setActivities(loadedActivities);
    setParticipationRecords(loadedParticipationRecords);
    
    setIsLoading(false);
  }, [session]);

  useEffect(() => {
      if (authReady) {
          loadAllData();
      }
  }, [session, authReady, loadAllData]);
  
  const handleLogin = () => api.signInWithGoogle();
  const handleLogout = async () => {
      await api.signOut();
      setCurrentUser(null);
      // Clear all local state
      setUsers([]);
      setAcademicYears([]);
      setGroups([]);
      setActivities([]);
      setParticipationRecords([]);
  };
  
  // Handlers
  const handlePasswordChange = async (userId: string, newPassword: string): Promise<{ success: boolean, message?: string }> => {
      try {
          await api.updateUser(userId, { password: newPassword });
          // We need to refresh the local state
          const newUsers = users.map(u => u.id === userId ? { ...u, password: newPassword } : u);
          setUsers(newUsers);
          return { success: true };
      } catch (error: any) {
          return { success: false, message: error.message };
      }
  };

  const openPasswordModal = (user: User, mode: 'change' | 'reset') => setPasswordModal({ isOpen: true, user, mode });
  const closePasswordModal = () => setPasswordModal({ isOpen: false, user: null, mode: 'change' });

  // Generic handler creator
  const createHandlers = <T extends {id: string}>(
    tableName: string,
    state: T[],
    setter: React.Dispatch<React.SetStateAction<T[]>>,
  ) => ({
      add: async (item: Omit<T, 'id'>) => {
          const newItem = await api.add<T>(tableName, item);
          setter([...state, newItem]);
          return newItem;
      },
      update: async (updatedItem: T) => {
          await api.update<T>(tableName, updatedItem.id, updatedItem);
          setter(state.map(item => item.id === updatedItem.id ? updatedItem : item));
      },
      remove: async (id: string) => {
          await api.remove(tableName, id);
          setter(state.filter(item => item.id !== id));
      },
  });

  const getTeachersFromUsers = (currentUsers: User[]) => {
      return currentUsers
        .filter(u => u.role === UserRole.TEACHER || u.role === UserRole.GROUP_LEADER)
        .map(u => ({ id: u.id, name: u.name, groupId: u.groupId || '' }));
  };

  // Specific handlers with cascading logic
  const userHandlers = {
      add: async (item: Omit<User, 'id' | 'password'> & {password?: string}) => {
          const newUser = await api.addUser({ ...item, password: item.password || '123' });
          setUsers([...users, newUser]);
          return newUser;
      },
      update: async (updatedItem: User) => {
        const originalUser = users.find(u => u.id === updatedItem.id);
        if (!originalUser) return;

        const finalUpdatedItem = {
            ...updatedItem,
            password: updatedItem.password ? updatedItem.password : originalUser.password,
        };
        await api.updateUser(finalUpdatedItem.id, finalUpdatedItem);
        setUsers(users.map(user => user.id === updatedItem.id ? finalUpdatedItem : user));
      },
      // Note: Supabase foreign key constraints with cascades will handle most deletions.
      // Manual cleanup might be needed for complex cases not handled by DB schema.
      remove: async (id: string) => {
        await api.removeUser(id);
        setUsers(users.filter(u => u.id !== id));
        // Refresh other related data if necessary, though cascades should handle it.
        await loadAllData(); 
      }
  };
  
  const activityHandlers = createHandlers('activities', activities, setActivities);
  const academicYearHandlers = createHandlers('academic_years', academicYears, setAcademicYears);
  const groupHandlers = createHandlers('groups', groups, setGroups);
  
  // Teacher data is derived from users, so handler is different
  const teacherHandlers = {
      update: userHandlers.update,
      remove: userHandlers.remove
  };

  const participationRecordHandlers = {
      updateBatch: async (activityId: string, newRecordsForActivity: Omit<ParticipationRecord, 'id'>[]) => {
          await api.updateParticipationBatch(activityId, newRecordsForActivity);
          // Refresh data to get new state
          const loadedParticipationRecords = await api.getParticipationRecords();
          setParticipationRecords(loadedParticipationRecords);
      }
  };
  
  if (!authReady) {
    return <div className="flex items-center justify-center min-h-screen">Đang khởi tạo ứng dụng...</div>;
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-xl text-center">
            <h1 className="text-3xl font-bold text-indigo-600">Hệ thống Quản lý Hoạt động</h1>
            <p className="mt-2 text-gray-500">Vui lòng đăng nhập bằng tài khoản Google của bạn để tiếp tục.</p>
            <button onClick={handleLogin} className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
              Đăng nhập bằng Google
            </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
      return <div className="flex items-center justify-center min-h-screen">Đang tải dữ liệu...</div>;
  }
  
  if (!currentUser) {
      return (
        <div className="flex items-center justify-center min-h-screen text-center p-4 bg-slate-100">
          <div>
            <h2 className="text-2xl font-bold text-red-600">Truy cập bị từ chối</h2>
            <p className="text-gray-700 mt-2 max-w-md">
              Tài khoản Google của bạn (`{session.user.email}`) chưa được cấp quyền truy cập hệ thống. Vui lòng liên hệ quản trị viên để được thêm vào danh sách người dùng.
            </p>
            <button onClick={handleLogout} className="mt-6 px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
              Đăng xuất
            </button>
          </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Header currentUser={currentUser} onLogout={handleLogout} onChangePassword={() => openPasswordModal(currentUser, 'change')} />
      <main>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Dashboard
            currentUser={currentUser}
            data={{ users, academicYears, groups, teachers: getTeachersFromUsers(users), activities, participationRecords }}
            handlers={{ userHandlers, academicYearHandlers, groupHandlers, teacherHandlers, activityHandlers, participationRecordHandlers, requestPasswordReset: (user: User) => openPasswordModal(user, 'reset') }}
          />
        </div>
      </main>
      {passwordModal.isOpen && passwordModal.user && (
        <PasswordChangeModal
            isOpen={passwordModal.isOpen}
            onClose={closePasswordModal}
            user={passwordModal.user}
            mode={passwordModal.mode}
            onSubmit={(userId, newPass) => handlePasswordChange(userId, newPass)}
        />
      )}
    </div>
  );
};

export default App;