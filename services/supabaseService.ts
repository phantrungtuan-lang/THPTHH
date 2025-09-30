import { User, AcademicYear, Group, Activity, ParticipationRecord, UserRole, ParticipationStatus } from '../types';

// --- MOCK DATA and HELPERS ---
const MOCK_DELAY = 300; // ms

const createId = () => Math.random().toString(36).substring(2, 11);

const initializeLocalStorage = () => {
  const data = {
    users: [
      { usersId: 'admin1', name: 'Admin', email: 'admin@example.com', password: '123', role: UserRole.ADMIN, groupsId: null },
      { usersId: 'leader1', name: 'Tổ trưởng Toán', email: 'lead.math@example.com', password: '123', role: UserRole.GROUP_LEADER, groupsId: 'group1' },
      { usersId: 'teacher1', name: 'Giáo viên Toán 1', email: 'teacher.math1@example.com', password: '123', role: UserRole.TEACHER, groupsId: 'group1' },
      { usersId: 'leader2', name: 'Tổ trưởng Lý', email: 'lead.phys@example.com', password: '123', role: UserRole.GROUP_LEADER, groupsId: 'group2' },
      { usersId: 'teacher2', name: 'Giáo viên Lý 1', email: 'teacher.phys1@example.com', password: '123', role: UserRole.TEACHER, groupsId: 'group2' },
    ],
    academic_years: [
      { academicYearsId: 'year1', name: '2023-2024' },
      { academicYearsId: 'year2', name: '2024-2025' },
    ],
    groups: [
      { groupsId: 'group1', name: 'Tổ Toán', leaderUsersId: 'leader1' },
      { groupsId: 'group2', name: 'Tổ Lý - Tin', leaderUsersId: 'leader2' },
    ],
    activities: [
      { activitiesId: 'activity1', name: 'Họp tổ chuyên môn tháng 9', date: '2024-09-05', academicYearsId: 'year2' },
      { activitiesId: 'activity2', name: 'Tập huấn chuyên đề A', date: '2024-09-15', academicYearsId: 'year2' },
    ],
    participation_records: [
        { participationRecordsId: 'pr1', usersId: 'leader1', activitiesId: 'activity1', status: ParticipationStatus.ORGANIZER },
        { participationRecordsId: 'pr2', usersId: 'teacher1', activitiesId: 'activity1', status: ParticipationStatus.PARTICIPATED },
        { participationRecordsId: 'pr3', usersId: 'leader2', activitiesId: 'activity1', status: ParticipationStatus.PARTICIPATED },
        { participationRecordsId: 'pr4', usersId: 'teacher2', activitiesId: 'activity1', status: ParticipationStatus.LATE },
    ],
  };

  Object.entries(data).forEach(([key, value]) => {
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  });
};

initializeLocalStorage();

const getTable = <T>(tableName: string): T[] => {
    try {
        return JSON.parse(localStorage.getItem(tableName) || '[]');
    } catch {
        return [];
    }
};

const setTable = <T>(tableName: string, data: T[]): void => {
    localStorage.setItem(tableName, JSON.stringify(data));
};

// --- API FUNCTIONS ---

const mockRequest = <T>(data: T): Promise<T> => {
    return new Promise(resolve => setTimeout(() => resolve(data), MOCK_DELAY));
};

export const getUsers = (): Promise<User[]> => mockRequest(getTable<User>('users'));
export const getAcademicYears = (): Promise<AcademicYear[]> => mockRequest(getTable<AcademicYear>('academic_years'));
export const getGroups = (): Promise<Group[]> => mockRequest(getTable<Group>('groups'));
export const getActivities = (): Promise<Activity[]> => mockRequest(getTable<Activity>('activities'));
export const getParticipationRecords = (): Promise<ParticipationRecord[]> => mockRequest(getTable<ParticipationRecord>('participation_records'));

export const add = async <T extends { [key: string]: any }>(tableName: string, item: Omit<T, keyof T>): Promise<T> => {
    const table = getTable<T>(tableName);
    // simplified primary key assumption
    const primaryKey = `${tableName.replace(/_s$/, '').replace(/ies$/, 'y')}Id`; 
    const newItem = { ...item, [primaryKey]: createId() } as T;
    setTable(tableName, [...table, newItem]);
    return mockRequest(newItem);
};

export const update = async <T extends { [key: string]: any }>(tableName: string, updatedItem: T): Promise<void> => {
    const table = getTable<T>(tableName);
    const primaryKey = Object.keys(updatedItem).find(k => k.endsWith('Id'));
    if (!primaryKey) throw new Error(`Could not find primary key for update in table ${tableName}`);
    const newTable = table.map(item => item[primaryKey] === updatedItem[primaryKey] ? updatedItem : item);
    setTable(tableName, newTable);
    return mockRequest(undefined);
};

export const remove = async (tableName: string, id: string): Promise<void> => {
    const table = getTable<any>(tableName);
    if(table.length === 0) return mockRequest(undefined);
    const primaryKey = Object.keys(table[0] || {}).find(k => k.endsWith('Id'));
    if (!primaryKey) throw new Error(`Could not find primary key for remove in table ${tableName}`);
    const newTable = table.filter(item => item[primaryKey] !== id);
    setTable(tableName, newTable);
    return mockRequest(undefined);
};

// Specific handlers for more complex logic

export const addUser = async (item: Omit<User, 'usersId'>): Promise<User> => {
    const users = getTable<User>('users');
    const newUser: User = { ...item, usersId: createId() };
    setTable('users', [...users, newUser]);
    return mockRequest(newUser);
};

export const addUsersBatch = async (items: Omit<User, 'usersId'>[]): Promise<User[]> => {
    const users = getTable<User>('users');
    const newUsers: User[] = items.map(item => ({ ...item, usersId: createId() }));
    setTable('users', [...users, ...newUsers]);
    return mockRequest(newUsers);
};

export const updateUser = (updatedItem: User): Promise<void> => update('users', updatedItem);

export const removeUser = async (id: string): Promise<void> => {
    // Also remove related participation records
    const records = getTable<ParticipationRecord>('participation_records');
    const newRecords = records.filter(r => r.usersId !== id);
    setTable('participation_records', newRecords);
    await remove('users', id);
};

export const updateParticipationBatch = async (activityId: string, newRecordsForActivity: Omit<ParticipationRecord, 'participationRecordsId'>[]): Promise<void> => {
    let allRecords = getTable<ParticipationRecord>('participation_records');
    // Remove old records for this activity and the teachers involved
    const usersInBatch = new Set(newRecordsForActivity.map(r => r.usersId));
    allRecords = allRecords.filter(r => !(r.activitiesId === activityId && usersInBatch.has(r.usersId)));
    
    // Add new records
    const newRecordsWithIds: ParticipationRecord[] = newRecordsForActivity.map(r => ({ ...r, participationRecordsId: createId() }));
    setTable('participation_records', [...allRecords, ...newRecordsWithIds]);
    return mockRequest(undefined);
};
