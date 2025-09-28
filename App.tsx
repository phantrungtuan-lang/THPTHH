import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './screens/Dashboard';
import { User, AcademicYear, Group, Teacher, Activity, ParticipationRecord, UserRole } from './types';
import * as sheetService from './services/googleSheetsService';
import { LoginScreen } from './screens/LoginScreen';
import { PasswordChangeModal } from './components/PasswordChangeModal';

const App: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [participationRecords, setParticipationRecords] = useState<ParticipationRecord[]>([]);
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [passwordModal, setPasswordModal] = useState<{ isOpen: boolean; user: User | null; mode: 'change' | 'reset' }>({ isOpen: false, user: null, mode: 'change' });

  useEffect(() => {
    const loadData = async () => {
      await sheetService.initializeDatabase();
      const [
        loadedUsers,
        loadedAcademicYears,
        loadedGroups,
        loadedTeachers,
        loadedActivities,
        loadedParticipationRecords,
      ] = await Promise.all([
        sheetService.getUsers(),
        sheetService.getAcademicYears(),
        sheetService.getGroups(),
        sheetService.getTeachers(),
        sheetService.getActivities(),
        sheetService.getParticipationRecords(),
      ]);
      setUsers(loadedUsers);
      setAcademicYears(loadedAcademicYears);
      setGroups(loadedGroups);
      setTeachers(loadedTeachers);
      setActivities(loadedActivities);
      setParticipationRecords(loadedParticipationRecords);

      try {
        const loggedInUserId = localStorage.getItem('loggedInUserId');
        if (loggedInUserId) {
          const user = loadedUsers.find(u => u.id === loggedInUserId);
          setCurrentUser(user || null);
        }
      } catch (error) {
        console.error("Could not access localStorage:", error);
      }
      setIsLoading(false);
    };

    loadData();
  }, []);

  const handleLogin = (userId: string, password: string): boolean => {
    const user = users.find(u => u.id === userId);
    if (user && user.password === password) {
      setCurrentUser(user);
      try {
        localStorage.setItem('loggedInUserId', user.id);
      } catch (error) {
        console.error("Could not access localStorage:", error);
      }
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('loggedInUserId');
    } catch (error) {
      console.error("Could not access localStorage:", error);
    }
  };

  const handlePasswordChange = (userId: string, newPassword: string, oldPassword?: string): { success: boolean, message?: string } => {
    const userToUpdate = users.find(u => u.id === userId);
    if (!userToUpdate) {
        return { success: false, message: "Không tìm thấy người dùng." };
    }
    if (oldPassword !== undefined && userToUpdate.password !== oldPassword) {
        return { success: false, message: "Mật khẩu cũ không chính xác." };
    }
    const updatedUsers = users.map(u => u.id === userId ? { ...u, password: newPassword } : u);
    sheetService.saveUsers(updatedUsers);
    setUsers(updatedUsers);
    return { success: true };
  };

  const openPasswordModal = (user: User, mode: 'change' | 'reset') => {
    setPasswordModal({ isOpen: true, user, mode });
  };

  const closePasswordModal = () => {
    setPasswordModal({ isOpen: false, user: null, mode: 'change' });
  };
  
  const handleEntityChange = <T extends {id: string}>(
    state: T[],
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    saver: (data: T[]) => Promise<void>
  ) => ({
    add: async (item: Omit<T, 'id'> & { id?: string }) => {
      const newItem = { ...item, id: item.id || `new-${Date.now()}` } as T;
      const newState = [...state, newItem];
      await saver(newState);
      setter(newState);
      return newItem;
    },
    update: async (updatedItem: T) => {
      const newState = state.map(item => item.id === updatedItem.id ? updatedItem : item);
      await saver(newState);
      setter(newState);
    },
  });

  const activityHandlers = {
      ...handleEntityChange(activities, setActivities, sheetService.saveActivities),
      remove: async (id: string) => {
          const newParticipationRecords = participationRecords.filter(pr => pr.activityId !== id);
          const newActivities = activities.filter(a => a.id !== id);
          await Promise.all([
            sheetService.saveParticipationRecords(newParticipationRecords),
            sheetService.saveActivities(newActivities),
          ]);
          setParticipationRecords(newParticipationRecords);
          setActivities(newActivities);
      }
  };

  const academicYearHandlers = {
      ...handleEntityChange(academicYears, setAcademicYears, sheetService.saveAcademicYears),
      remove: async (id: string) => {
          const activitiesInYear = activities.filter(a => a.academicYearId === id);
          let newParticipationRecords = [...participationRecords];
          activitiesInYear.forEach(a => {
            newParticipationRecords = newParticipationRecords.filter(pr => pr.activityId !== a.id)
          });
          const newActivities = activities.filter(a => a.academicYearId !== id);
          const newAcademicYears = academicYears.filter(ay => ay.id !== id);
          
          await Promise.all([
            sheetService.saveParticipationRecords(newParticipationRecords),
            sheetService.saveActivities(newActivities),
            sheetService.saveAcademicYears(newAcademicYears)
          ]);

          setParticipationRecords(newParticipationRecords);
          setActivities(newActivities);
          setAcademicYears(newAcademicYears);
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
            sheetService.saveUsers(newUsers),
            sheetService.saveTeachers(newTeachers)
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
            sheetService.saveUsers(newUsers),
            sheetService.saveTeachers(newTeachers)
        ]);
        setUsers(newUsers);
        setTeachers(newTeachers);
      },
      remove: async (id: string) => {
        const newParticipationRecords = participationRecords.filter(pr => pr.teacherId !== id);
        const newGroups = groups.map(g => g.leaderId === id ? { ...g, leaderId: '' } : g);
        const newTeachers = teachers.filter(t => t.id !== id);
        const newUsers = users.filter(u => u.id !== id);

        await Promise.all([
            sheetService.saveParticipationRecords(newParticipationRecords),
            sheetService.saveGroups(newGroups),
            sheetService.saveTeachers(newTeachers),
            sheetService.saveUsers(newUsers)
        ]);
        setParticipationRecords(newParticipationRecords);
        setGroups(newGroups);
        setTeachers(newTeachers);
        setUsers(newUsers);
      }
  };
  
  const teacherHandlers = {
      ...handleEntityChange(teachers, setTeachers, sheetService.saveTeachers),
      add: async (item: Omit<Teacher, 'id'>) => {
        alert("Vui lòng thêm giáo viên thông qua mục 'Tài khoản' để đảm bảo dữ liệu đồng bộ.");
      },
      update: async(updatedItem: Teacher) => {
        const newTeachers = teachers.map(t => t.id === updatedItem.id ? updatedItem : t);
        const newUsers = users.map(u => u.id === updatedItem.id ? {...u, name: updatedItem.name, groupId: updatedItem.groupId } : u);
        await Promise.all([sheetService.saveTeachers(newTeachers), sheetService.saveUsers(newUsers)]);
        setTeachers(newTeachers);
        setUsers(newUsers);
      },
      remove: async (id: string) => {
          await userHandlers.remove(id); // Deleting a teacher deletes the user and all related data
      }
  };

  const groupHandlers = {
      ...handleEntityChange(groups, setGroups, sheetService.saveGroups),
      remove: async (id: string) => {
          const teachersInGroup = teachers.filter(t => t.groupId === id);
          let newUsers = [...users];
          let newParticipationRecords = [...participationRecords];
          teachersInGroup.forEach(t => {
            newUsers = newUsers.filter(u => u.id !== t.id);
            newParticipationRecords = newParticipationRecords.filter(pr => pr.teacherId !== t.id);
          });
          const newTeachers = teachers.filter(t => t.groupId !== id);
          const newGroups = groups.filter(g => g.id !== id);

          await Promise.all([
            sheetService.saveUsers(newUsers),
            sheetService.saveParticipationRecords(newParticipationRecords),
            sheetService.saveTeachers(newTeachers),
            sheetService.saveGroups(newGroups)
          ]);
          setUsers(newUsers);
          setParticipationRecords(newParticipationRecords);
          setTeachers(newTeachers);
          setGroups(newGroups);
      }
  };

  const participationRecordHandlers = {
      updateBatch: async (activityId: string, newRecordsForActivity: ParticipationRecord[]) => {
          const otherRecords = participationRecords.filter(pr => pr.activityId !== activityId);
          const allNewRecords = [...otherRecords, ...newRecordsForActivity];
          await sheetService.saveParticipationRecords(allNewRecords);
          setParticipationRecords(allNewRecords);
      }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl font-semibold text-gray-500">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {!currentUser ? (
        <LoginScreen onLogin={handleLogin} users={users} />
      ) : (
        <>
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
        </>
      )}
      {passwordModal.isOpen && passwordModal.user && (
        <PasswordChangeModal
            isOpen={passwordModal.isOpen}
            onClose={closePasswordModal}
            user={passwordModal.user}
            mode={passwordModal.mode}
            onSubmit={handlePasswordChange}
        />
      )}
    </div>
  );
};

export default App;
