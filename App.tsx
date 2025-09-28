import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './screens/Dashboard';
import { User, AcademicYear, Group, Teacher, Activity, ParticipationRecord, UserRole } from './types';
import * as api from './services/googleApiService';
import { PasswordChangeModal } from './components/PasswordChangeModal';

const App: React.FC = () => {
  const [isApiReady, setIsApiReady] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const [users, setUsers] = useState<User[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [participationRecords, setParticipationRecords] = useState<ParticipationRecord[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [passwordModal, setPasswordModal] = useState<{ isOpen: boolean; user: User | null; mode: 'change' | 'reset' }>({ isOpen: false, user: null, mode: 'change' });

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    const [
      loadedUsers,
      loadedAcademicYears,
      loadedGroups,
      loadedTeachers,
      loadedActivities,
      loadedParticipationRecords,
    ] = await Promise.all([
      api.getUsers(),
      api.getAcademicYears(),
      api.getGroups(),
      api.getTeachers(),
      api.getActivities(),
      api.getParticipationRecords(),
    ]);
    setUsers(loadedUsers);
    setAcademicYears(loadedAcademicYears);
    setGroups(loadedGroups);
    setTeachers(loadedTeachers);
    setActivities(loadedActivities);
    setParticipationRecords(loadedParticipationRecords);
    
    // Simulate user selection after data load
    // In a real app, you might have a user selection screen if the Google User can manage multiple teacher accounts
    const googleUserEmail = api.getSignedInUserEmail();
    console.log("Google User Email:", googleUserEmail);
    // For this example, we will just set the first admin as the current user.
    const adminUser = loadedUsers.find(u => u.role === UserRole.ADMIN);
    setCurrentUser(adminUser || loadedUsers[0] || null);
    
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const handleAuthChange = async (signedIn: boolean) => {
      setIsSignedIn(signedIn);
      if (signedIn) {
        await loadAllData();
      } else {
        setCurrentUser(null);
      }
    };
    
    api.initClient(handleAuthChange).then(() => {
      setIsApiReady(true);
      const wasSignedIn = api.isSignedIn();
      handleAuthChange(wasSignedIn);
    });
  }, [loadAllData]);
  
  const handleLogin = () => api.signIn();
  const handleLogout = () => {
      api.signOut();
      // Clear all local state
      setUsers([]);
      setAcademicYears([]);
      setGroups([]);
      setTeachers([]);
      setActivities([]);
      setParticipationRecords([]);
      setCurrentUser(null);
  };
  
  // Handlers
  const handlePasswordChange = async (userId: string, newPassword: string): Promise<{ success: boolean, message?: string }> => {
      const userToUpdate = users.find(u => u.id === userId);
      if (!userToUpdate) return { success: false, message: "User not found." };
      
      const updatedUsers = users.map(u => u.id === userId ? { ...u, password: newPassword } : u);
      await api.updateUsers(updatedUsers);
      setUsers(updatedUsers);
      return { success: true };
  };

  const openPasswordModal = (user: User, mode: 'change' | 'reset') => setPasswordModal({ isOpen: true, user, mode });
  const closePasswordModal = () => setPasswordModal({ isOpen: false, user: null, mode: 'change' });

  // Generic handler creator
  const createHandlers = <T extends {id: string}>(
      state: T[],
      setter: React.Dispatch<React.SetStateAction<T[]>>,
      updater: (data: T[]) => Promise<any>
  ) => ({
      add: async (item: Omit<T, 'id'>) => {
          const newItem = { ...item, id: `${Date.now()}` } as T;
          const newState = [...state, newItem];
          await updater(newState);
          setter(newState);
          return newItem;
      },
      update: async (updatedItem: T) => {
          const newState = state.map(item => item.id === updatedItem.id ? updatedItem : item);
          await updater(newState);
          setter(newState);
      },
      remove: async (id: string) => {
          const newState = state.filter(item => item.id !== id);
          await updater(newState);
          setter(newState);
      },
  });

  // Specific handlers with cascading logic
  const activityHandlers = {
      ...createHandlers(activities, setActivities, api.updateActivities),
      remove: async (id: string) => {
          const newActivities = activities.filter(a => a.id !== id);
          const newParticipationRecords = participationRecords.filter(pr => pr.activityId !== id);
          await Promise.all([
              api.updateActivities(newActivities),
              api.updateParticipationRecords(newParticipationRecords),
          ]);
          setActivities(newActivities);
          setParticipationRecords(newParticipationRecords);
      }
  };
    
  const userHandlers = {
      add: async (item: Omit<User, 'id'>) => {
          const newUser = { ...item, id: `user-${Date.now()}` } as User;
          const newUsers = [...users, newUser];
          let newTeachers = [...teachers];

          if(item.role === UserRole.TEACHER || item.role === UserRole.GROUP_LEADER) {
            newTeachers.push({ name: item.name, groupId: item.groupId || '', id: newUser.id });
          }
          await Promise.all([
            api.updateUsers(newUsers),
            api.updateTeachers(newTeachers)
          ]);
          setUsers(newUsers);
          setTeachers(newTeachers);
          return newUser;
      },
      update: async (updatedItem: User) => {
        const originalUser = users.find(u => u.id === updatedItem.id);
        if (!originalUser) return;

        const finalUpdatedItem = {
            ...updatedItem,
            password: updatedItem.password ? updatedItem.password : originalUser.password,
        };
        const newUsers = users.map(user => user.id === updatedItem.id ? finalUpdatedItem : user);

        const isTeacherOrLeader = (role: UserRole) => role === UserRole.TEACHER || role === UserRole.GROUP_LEADER;
        const wasTeacher = isTeacherOrLeader(originalUser.role);
        const isNowTeacher = isTeacherOrLeader(finalUpdatedItem.role);

        let newTeachers = [...teachers];
        if (!wasTeacher && isNowTeacher) {
            newTeachers.push({ id: finalUpdatedItem.id, name: finalUpdatedItem.name, groupId: finalUpdatedItem.groupId || '' });
        } else if (wasTeacher && !isNowTeacher) {
            newTeachers = newTeachers.filter(t => t.id !== updatedItem.id);
        } else if (wasTeacher && isNowTeacher) {
            newTeachers = newTeachers.map(t =>
                t.id === updatedItem.id
                    ? { ...t, name: finalUpdatedItem.name, groupId: finalUpdatedItem.groupId || '' }
                    : t
            );
        }

        await Promise.all([
            api.updateUsers(newUsers),
            api.updateTeachers(newTeachers)
        ]);
        setUsers(newUsers);
        setTeachers(newTeachers);
      },
      remove: async (id: string) => {
        const newUsers = users.filter(u => u.id !== id);
        const newTeachers = teachers.filter(t => t.id !== id);
        const newGroups = groups.map(g => g.leaderId === id ? { ...g, leaderId: '' } : g);
        const newParticipationRecords = participationRecords.filter(pr => pr.teacherId !== id);

        await Promise.all([
            api.updateUsers(newUsers),
            api.updateTeachers(newTeachers),
            api.updateGroups(newGroups),
            api.updateParticipationRecords(newParticipationRecords)
        ]);
        setUsers(newUsers);
        setTeachers(newTeachers);
        setGroups(newGroups);
        setParticipationRecords(newParticipationRecords);
      }
  };

  const groupHandlers = {
      ...createHandlers(groups, setGroups, api.updateGroups),
      remove: async (id: string) => {
          const teachersInGroup = teachers.filter(t => t.groupId === id);
          const teacherIdsInGroup = new Set(teachersInGroup.map(t => t.id));
          
          const newGroups = groups.filter(g => g.id !== id);
          const newTeachers = teachers.filter(t => t.groupId !== id);
          const newUsers = users.filter(u => !teacherIdsInGroup.has(u.id));
          const newParticipationRecords = participationRecords.filter(pr => !teacherIdsInGroup.has(pr.teacherId));

          await Promise.all([
            api.updateGroups(newGroups),
            api.updateTeachers(newTeachers),
            api.updateUsers(newUsers),
            api.updateParticipationRecords(newParticipationRecords)
          ]);

          setGroups(newGroups);
          setTeachers(newTeachers);
          setUsers(newUsers);
          setParticipationRecords(newParticipationRecords);
      }
  };

  const participationRecordHandlers = {
      updateBatch: async (activityId: string, newRecordsForActivity: ParticipationRecord[]) => {
          const otherRecords = participationRecords.filter(pr => pr.activityId !== activityId);
          const allNewRecords = [...otherRecords, ...newRecordsForActivity];
          await api.updateParticipationRecords(allNewRecords);
          setParticipationRecords(allNewRecords);
      }
  };

  // Simplified handlers for entities without complex cascades
  const academicYearHandlers = createHandlers(academicYears, setAcademicYears, api.updateAcademicYears);
  const teacherHandlers = {
       ...createHandlers(teachers, setTeachers, api.updateTeachers),
       remove: userHandlers.remove // Removing a teacher is same as removing a user
  };


  if (!isApiReady) {
    return <div className="flex items-center justify-center min-h-screen">Đang khởi tạo API...</div>;
  }

  if (!isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-xl text-center">
            <h1 className="text-3xl font-bold text-indigo-600">Hệ thống Quản lý Hoạt động</h1>
            <p className="mt-2 text-gray-500">Vui lòng đăng nhập bằng tài khoản Google của bạn để tiếp tục.</p>
            <p className="text-sm text-gray-500">Bạn sẽ cần cấp quyền cho ứng dụng để chỉnh sửa các trang tính liên quan đến ứng dụng này.</p>
            <button onClick={handleLogin} className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
              Đăng nhập bằng Google
            </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
      return <div className="flex items-center justify-center min-h-screen">Đang tải dữ liệu từ Google Sheets...</div>;
  }
  
  if (!currentUser) {
      return <div className="flex items-center justify-center min-h-screen">Đã đăng nhập, nhưng không thể xác định người dùng hiện tại. Vui lòng liên hệ quản trị viên.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Header currentUser={currentUser} onLogout={handleLogout} onChangePassword={() => openPasswordModal(currentUser, 'change')} />
      <main>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Dashboard
            currentUser={currentUser}
            data={{ users, academicYears, groups, teachers, activities, participationRecords }}
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
            // Password change now only takes new password as old password is not verifiable client-side
            onSubmit={(userId, newPass) => handlePasswordChange(userId, newPass)}
        />
      )}
    </div>
  );
};

export default App;
