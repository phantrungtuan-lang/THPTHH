import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './screens/Dashboard';
import { User, AcademicYear, Group, Teacher, Activity, ParticipationRecord, UserRole } from './types';
import { USERS, ACADEMIC_YEARS as initialAcademicYears, GROUPS as initialGroups, TEACHERS as initialTeachers, ACTIVITIES as initialActivities, PARTICIPATION_RECORDS as initialParticipationRecords } from './constants';
import { LoginScreen } from './screens/LoginScreen';
import { PasswordChangeModal } from './components/PasswordChangeModal';

const App: React.FC = () => {
  const [users, setUsers] = useState<User[]>(USERS);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>(initialAcademicYears);
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [teachers, setTeachers] = useState<Teacher[]>(initialTeachers);
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [participationRecords, setParticipationRecords] = useState<ParticipationRecord[]>(initialParticipationRecords);
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [passwordModal, setPasswordModal] = useState<{ isOpen: boolean; user: User | null; mode: 'change' | 'reset' }>({ isOpen: false, user: null, mode: 'change' });

  useEffect(() => {
    try {
      const loggedInUserId = localStorage.getItem('loggedInUserId');
      if (loggedInUserId) {
        const user = users.find(u => u.id === loggedInUserId);
        setCurrentUser(user || null);
      }
    } catch (error) {
      console.error("Could not access localStorage:", error);
    }
    setIsLoading(false);
  }, [users]); // Depend on users to re-fetch current user if user list changes (e.g., password update)

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
    // 'change' mode requires old password validation
    if (oldPassword !== undefined && userToUpdate.password !== oldPassword) {
        return { success: false, message: "Mật khẩu cũ không chính xác." };
    }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, password: newPassword } : u));
    return { success: true };
  };

  const openPasswordModal = (user: User, mode: 'change' | 'reset') => {
    setPasswordModal({ isOpen: true, user, mode });
  };

  const closePasswordModal = () => {
    setPasswordModal({ isOpen: false, user: null, mode: 'change' });
  };
  
  // Generic CRUD Handlers
  const handleEntityChange = <T extends {id: string}>(setter: React.Dispatch<React.SetStateAction<T[]>>) => ({
    add: (item: Omit<T, 'id'> & { id?: string }) => {
      const newItem = { ...item, id: item.id || `new-${Date.now()}` } as T;
      setter(prev => [...prev, newItem]);
      return newItem;
    },
    update: (updatedItem: T) => {
      setter(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
    },
  });

  // Specific Handlers with Cascade Logic
  const activityHandlers = {
      ...handleEntityChange(setActivities),
      remove: (id: string) => {
          // Remove participation records for this activity
          setParticipationRecords(prev => prev.filter(pr => pr.activityId !== id));
          // Remove the activity
          setActivities(prev => prev.filter(a => a.id !== id));
      }
  };

  const academicYearHandlers = {
      ...handleEntityChange(setAcademicYears),
      remove: (id: string) => {
          // Get all activities in the year and remove them (which also removes their records)
          const activitiesInYear = activities.filter(a => a.academicYearId === id);
          activitiesInYear.forEach(a => activityHandlers.remove(a.id));
          // Finally remove the year
          setAcademicYears(prev => prev.filter(ay => ay.id !== id));
      }
  };
    
  const userHandlers = {
      ...handleEntityChange(setUsers),
      add: (item: Omit<User, 'id'>) => {
          const newUser = { ...item, id: `user-${Date.now()}` } as User;
          setUsers(prev => [...prev, newUser]);
          if(item.role === UserRole.TEACHER || item.role === UserRole.GROUP_LEADER) {
            teacherHandlers.add({ name: item.name, groupId: item.groupId || '', id: newUser.id });
          }
          return newUser;
      },
      update: (updatedItem: User) => {
        setUsers(prevUsers => {
            const originalUser = prevUsers.find(u => u.id === updatedItem.id);
            if (!originalUser) return prevUsers;

            const finalUpdatedItem = {
                ...updatedItem,
                password: updatedItem.password ? updatedItem.password : originalUser.password,
            };

            // Sync with Teachers list based on role changes
            setTeachers(prevTeachers => {
                const isTeacherOrLeader = (role: UserRole) => role === UserRole.TEACHER || role === UserRole.GROUP_LEADER;
                const wasTeacher = isTeacherOrLeader(originalUser.role);
                const isNowTeacher = isTeacherOrLeader(finalUpdatedItem.role);

                if (!wasTeacher && isNowTeacher) { // Promoted to teacher/leader
                    return [...prevTeachers, { id: finalUpdatedItem.id, name: finalUpdatedItem.name, groupId: finalUpdatedItem.groupId || '' }];
                }
                if (wasTeacher && !isNowTeacher) { // Demoted from teacher/leader
                    return prevTeachers.filter(t => t.id !== updatedItem.id);
                }
                if (wasTeacher && isNowTeacher) { // Was and is teacher/leader, update info
                    return prevTeachers.map(t =>
                        t.id === updatedItem.id
                            ? { ...t, name: finalUpdatedItem.name, groupId: finalUpdatedItem.groupId || '' }
                            : t
                    );
                }
                return prevTeachers; // No role change affecting teacher list
            });

            return prevUsers.map(user => user.id === updatedItem.id ? finalUpdatedItem : user);
        });
      },
      remove: (id: string) => {
        setParticipationRecords(prev => prev.filter(pr => pr.teacherId !== id));
        setGroups(prev => prev.map(g => g.leaderId === id ? { ...g, leaderId: '' } : g)); // Unset as leader
        setTeachers(prev => prev.filter(t => t.id !== id));
        setUsers(prev => prev.filter(u => u.id !== id));
      }
  };

  const teacherHandlers = {
      ...handleEntityChange(setTeachers),
      remove: (id: string) => {
          userHandlers.remove(id); // Deleting a teacher deletes the user and all related data
      }
  };

  const groupHandlers = {
      ...handleEntityChange(setGroups),
      remove: (id: string) => {
          // Remove all teachers (and their user accounts) in the group
          const teachersInGroup = teachers.filter(t => t.groupId === id);
          teachersInGroup.forEach(t => userHandlers.remove(t.id));
          // Finally remove the group
          setGroups(prev => prev.filter(g => g.id !== id));
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
                data={{ users, academicYears, groups, teachers, activities, participationRecords, setParticipationRecords }}
                handlers={{ userHandlers, academicYearHandlers, groupHandlers, teacherHandlers, activityHandlers, requestPasswordReset: (user: User) => openPasswordModal(user, 'reset') }}
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