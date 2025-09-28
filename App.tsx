import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './screens/Dashboard';
import { User, AcademicYear, Group, Teacher, Activity, ParticipationRecord, UserRole } from './types';
import * as api from './services/supabaseService';
import { PasswordChangeModal } from './components/PasswordChangeModal';
import { LoginScreen } from './screens/LoginScreen';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  
  const [users, setUsers] = useState<User[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [participationRecords, setParticipationRecords] = useState<ParticipationRecord[]>([]);

  const [isInitialLoading, setIsInitialLoading] = useState(true); // For loading users list for login
  const [isDataLoading, setIsDataLoading] = useState(false); // For loading all other data after login

  const [passwordModal, setPasswordModal] = useState<{ isOpen: boolean; user: User | null; mode: 'change' | 'reset' }>({ isOpen: false, user: null, mode: 'change' });

  // Load just the users for the login screen
  useEffect(() => {
    const loadUsersForLogin = async () => {
        setIsInitialLoading(true);
        setInitialLoadError(null);
        try {
            const loadedUsers = await api.getUsers();
            setUsers(loadedUsers);
        } catch (error: any) {
            console.error("Failed to load users for login:", error);
            let userMessage = "Không thể tải danh sách người dùng. Vui lòng thử lại sau.";
            if (error.message && error.message.includes('permission denied')) {
                userMessage = "Lỗi truy cập dữ liệu: Không có quyền đọc danh sách người dùng. Vui lòng kiểm tra lại cài đặt Row Level Security (RLS) trong Supabase cho bảng 'users'.";
            } else if (error.message) {
                 userMessage = `Lỗi tải dữ liệu ban đầu: ${error.message}`;
            }
            setInitialLoadError(userMessage);
        } finally {
            setIsInitialLoading(false);
        }
    };
    loadUsersForLogin();
  }, []);

  const loadAllData = useCallback(async () => {
    if (!currentUser) return;
    
    setIsDataLoading(true);
    
    try {
        const [
          loadedAcademicYears,
          loadedGroups,
          loadedActivities,
          loadedParticipationRecords,
        ] = await Promise.all([
          api.getAcademicYears(),
          api.getGroups(),
          api.getActivities(),
          api.getParticipationRecords(),
        ]);
        setAcademicYears(loadedAcademicYears);
        setGroups(loadedGroups);
        setActivities(loadedActivities);
        setParticipationRecords(loadedParticipationRecords);
    } catch (error) {
        console.error("Failed to load app data:", error);
        alert("Đã có lỗi xảy ra khi tải dữ liệu.");
        setCurrentUser(null); // Log out on data loading failure
    } finally {
        setIsDataLoading(false);
    }
  }, [currentUser]);
  
  const handleLogin = async (userId: string, password: string): Promise<boolean> => {
      setLoginError(null);
      const userToLogin = users.find(u => u.id === userId);
      
      if (userToLogin && userToLogin.password === password) {
          setCurrentUser(userToLogin);
          return true;
      } else {
          setLoginError('Tài khoản hoặc mật khẩu không chính xác.');
          return false;
      }
  };

  const handleLogout = () => {
      setCurrentUser(null);
      // Clear all local state
      setAcademicYears([]);
      setGroups([]);
      setActivities([]);
      setParticipationRecords([]);
  };
  
  useEffect(() => {
    // When currentUser is set (after successful login), load all other data
    if (currentUser) {
        loadAllData();
    }
  }, [currentUser, loadAllData]);

  // Handlers
  const handlePasswordChange = async (userId: string, newPassword: string): Promise<{ success: boolean, message?: string }> => {
      try {
          await api.updateUser(userId, { password: newPassword });
          // We need to refresh the local state
          const newUsers = users.map(u => u.id === userId ? { ...u, password: newPassword } : u);
          setUsers(newUsers);
          // If the current user changed their own password, update the currentUser object
          if (currentUser?.id === userId) {
            setCurrentUser({ ...currentUser, password: newPassword });
          }
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
          const { id, ...updatePayload } = updatedItem;
          // Fix: Cast `updatePayload` to `Partial<T>` because TypeScript cannot infer
          // that `Omit<T, 'id'>` is assignable to `Partial<T>` for a generic T.
          // This is a safe cast as `updatePayload` is a valid partial object for an update.
          await api.update<T>(tableName, id, updatePayload as Partial<T>);
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

        const { id, ...updatePayload } = finalUpdatedItem;
        await api.updateUser(id, updatePayload);
        
        setUsers(users.map(user => user.id === updatedItem.id ? finalUpdatedItem : user));
      },
      remove: async (id: string) => {
        await api.removeUser(id);
        setUsers(users.filter(u => u.id !== id));
      }
  };
  
  const activityHandlers = createHandlers('activities', activities, setActivities);
  const academicYearHandlers = createHandlers('academic_years', academicYears, setAcademicYears);
  const groupHandlers = createHandlers('groups', groups, setGroups);
  
  const teacherHandlers = {
      update: userHandlers.update,
      remove: userHandlers.remove
  };

  const participationRecordHandlers = {
      updateBatch: async (activityId: string, newRecordsForActivity: Omit<ParticipationRecord, 'id'>[]) => {
          await api.updateParticipationBatch(activityId, newRecordsForActivity);
          const loadedParticipationRecords = await api.getParticipationRecords();
          setParticipationRecords(loadedParticipationRecords);
      }
  };
  
  if (isInitialLoading) {
    return <div className="flex items-center justify-center min-h-screen">Đang tải danh sách người dùng...</div>;
  }

  if (initialLoadError) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-100 p-4">
            <div className="text-center text-red-800 bg-red-100 p-8 rounded-2xl shadow-lg max-w-xl">
                <h2 className="font-extrabold text-2xl mb-4">Không thể khởi động ứng dụng</h2>
                <p className="text-base text-left mb-6">{initialLoadError}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
                >
                  Tải lại trang
                </button>
            </div>
        </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen users={users} onLogin={handleLogin} loginError={loginError} />;
  }
  
  if (isDataLoading) {
      return <div className="flex items-center justify-center min-h-screen">Đang tải dữ liệu...</div>;
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