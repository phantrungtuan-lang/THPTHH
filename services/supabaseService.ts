import { createClient } from '@supabase/supabase-js';
import { User, AcademicYear, Group, Activity, ParticipationRecord } from '../types';

// Cấu hình Supabase client với thông tin của bạn
const SUPABASE_URL = 'https://lkonihsuecirpdluwtuj.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxrb25paHN1ZWNpcnBkbHV3dHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNjI4NTksImV4cCI6MjA3NDYzODg1OX0.o4bzXPT2p3cY0ezWKcxbSaMtlwNPLyST6cHcwMwRm9w';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Case Conversion Helpers ---

// Explicit mapping to prevent incorrect singularization of keys.
const keyMap: { [key: string]: string } = {
  usersId: 'users_id',
  groupsId: 'groups_id',
  leaderUsersId: 'leader_users_id',
  academicYearsId: 'academic_years_id',
  activitiesId: 'activities_id',
  activityId: 'activity_id', // Correct mapping for the foreign key
  teacherUsersId: 'teacher_users_id',
  participationRecordsId: 'participation_records_id'
};

// Automatically create the reverse mapping for converting from snake_case to camelCase.
const reverseKeyMap: { [key: string]: string } = Object.entries(keyMap).reduce((acc, [key, value]) => {
  acc[value] = key;
  return acc;
}, {} as { [key: string]: string });


const toCamel = (s: string): string => {
  // Prioritize the explicit map for accuracy.
  if (reverseKeyMap[s]) return reverseKeyMap[s];
  return s.replace(/([-_][a-z])/ig, ($1) => {
    return $1.toUpperCase()
      .replace('-', '')
      .replace('_', '');
  });
};

const toSnake = (s: string): string => {
  // Prioritize the explicit map for accuracy.
  if (keyMap[s]) return keyMap[s];
  // Fallback for other keys (e.g., 'name', 'email').
  return s.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

const convertKeys = (obj: any, converter: (s: string) => string): any => {
    if (Array.isArray(obj)) {
        return obj.map(v => convertKeys(v, converter));
    }
    if (obj && typeof obj === 'object' && obj.constructor === Object) {
        const newObj: { [key: string]: any } = {};
        for (const key of Object.keys(obj)) {
            let value = obj[key];
            if (converter === toSnake && key.match(/Id$/) && (value === '' || value === undefined)) {
                value = null;
            }
            newObj[converter(key)] = convertKeys(value, converter);
        }
        return newObj;
    }
    return obj;
};

// --- Primary Key Helper ---
const getPrimaryKeyInfo = (tableName: string) => {
    const pkMap: { [key: string]: { snake: string, camel: string } } = {
        'users': { snake: 'users_id', camel: 'usersId' },
        'academic_years': { snake: 'academic_years_id', camel: 'academicYearsId' },
        'groups': { snake: 'groups_id', camel: 'groupsId' },
        'activities': { snake: 'activities_id', camel: 'activitiesId' },
        'participation_records': { snake: 'participation_records_id', camel: 'participationRecordsId' },
    };
    const info = pkMap[tableName];
    if (!info) {
        throw new Error(`No primary key mapping found for table "${tableName}".`);
    }
    return info;
};

// --- Generic Data Functions ---

const handleError = (error: any, context: string) => {
    const message = error.message || 'An unknown error occurred.';
    console.error(`Error in ${context}:`, error);

    if (message.includes('permission denied')) {
        // ... (error hint logic is fine)
    }
    throw new Error(message);
};

export const getAll = async <T>(tableName: string): Promise<T[]> => {
    const { data, error } = await supabase.from(tableName).select('*');
    if (error) handleError(error, `getAll ${tableName}`);
    return convertKeys(data, toCamel) as T[] || [];
};

export const add = async <T extends object>(tableName: string, item: Omit<T, keyof T>): Promise<T> => {
    const snakeItem = convertKeys(item, toSnake);
    const { data, error } = await supabase.from(tableName).insert([snakeItem]).select().single();
    if (error) handleError(error, `add to ${tableName}`);
    return convertKeys(data, toCamel) as T;
};

export const update = async <T extends Record<string, any>>(tableName: string, itemWithId: T): Promise<T> => {
    const pkInfo = getPrimaryKeyInfo(tableName);
    const id = itemWithId[pkInfo.camel];
    if (!id) {
        throw new Error(`Primary key '${pkInfo.camel}' not found on item for table '${tableName}'`);
    }

    const { [pkInfo.camel]: _, ...payload } = itemWithId;
    
    const snakePayload = convertKeys(payload, toSnake);
    const { data, error } = await supabase.from(tableName).update(snakePayload).eq(pkInfo.snake, id).select().single();
    if (error) handleError(error, `update in ${tableName}`);
    return convertKeys(data, toCamel) as T;
};

export const remove = async (tableName: string, id: string): Promise<void> => {
    const pkInfo = getPrimaryKeyInfo(tableName);
    const { error } = await supabase.from(tableName).delete().eq(pkInfo.snake, id);
    if (error) handleError(error, `remove from ${tableName}`);
};

// --- Specific Data Functions ---

export const getUsers = () => getAll<User>('users');
export const getAcademicYears = () => getAll<AcademicYear>('academic_years');
export const getGroups = () => getAll<Group>('groups');
export const getActivities = () => getAll<Activity>('activities');
export const getParticipationRecords = () => getAll<ParticipationRecord>('participation_records');

export const addUser = (user: Omit<User, 'usersId'>) => add<User>('users', user);
export const addUsersBatch = async (users: Omit<User, 'usersId'>[]): Promise<User[]> => {
    const snakeUsers = convertKeys(users, toSnake);
    const { data, error } = await supabase.from('users').insert(snakeUsers).select();
    if (error) handleError(error, 'addUsersBatch');
    return convertKeys(data, toCamel) as User[];
};

export const updateUser = (userWithId: User) => update<User>('users', userWithId);
export const removeUser = (id: string) => remove('users', id);

export const updateParticipationBatch = async (activityId: string, newRecords: Omit<ParticipationRecord, 'participationRecordsId'>[]) => {
    const { error: deleteError } = await supabase
        .from('participation_records')
        .delete()
        .eq('activity_id', activityId); // FIX: Use the correct snake_case foreign key 'activity_id'

    if (deleteError) handleError(deleteError, `updateParticipationBatch (delete) for activity ${activityId}`);

    if (newRecords.length > 0) {
        const snakeRecords = newRecords.map(r => convertKeys(r, toSnake));
        const { error: insertError } = await supabase
            .from('participation_records')
            .insert(snakeRecords);

        if (insertError) handleError(insertError, `updateParticipationBatch (insert) for activity ${activityId}`);
    }
};
