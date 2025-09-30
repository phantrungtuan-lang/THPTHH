import { createClient } from '@supabase/supabase-js';
import { User, AcademicYear, Group, Activity, ParticipationRecord } from '../types';

const supabaseUrl = "https://lkonihsuecirpdluwtuj.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxrb25paHN1ZWNpcnBkbHV3dHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNjI4NTksImV4cCI6MjA3NDYzODg1OX0.o4bzXPT2p3cY0ezWKcxbSaMtlwNPLyST6cHcwMwRm9w";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- HELPERS to convert between JS camelCase and Supabase snake_case ---

const keyMap: { [key: string]: string } = {
    usersId: 'users_id',
    groupsId: 'groups_id',
    academicYearsId: 'academic_years_id',
    leaderUsersId: 'leader_users_id',
    activitiesId: 'activities_id',
    participationRecordsId: 'participation_records_id',
};

const toSnakeCase = (obj: Record<string, any>): Record<string, any> => {
    const newObj: Record<string, any> = {};
    for (const key in obj) {
        newObj[keyMap[key] || key] = obj[key];
    }
    return newObj;
};

const toCamelCase = <T>(obj: Record<string, any>): T => {
    const newObj: Record<string, any> = {};
    for (const key in obj) {
        const camelKey = Object.keys(keyMap).find(k => keyMap[k] === key) || key;
        newObj[camelKey] = obj[key];
    }
    return newObj as T;
};


// --- GENERIC API FUNCTIONS ---

const handleResponse = <T>(response: { data: any, error: any }, isSingle: boolean = false): T => {
    if (response.error) {
        console.error('Supabase error:', response.error);
        throw new Error(response.error.message);
    }
    if (!response.data) {
        return (isSingle ? null : []) as T;
    }
    if (Array.isArray(response.data)) {
        return response.data.map(toCamelCase) as T;
    }
    return toCamelCase(response.data) as T;
};

const getAll = async <T>(tableName: string): Promise<T[]> => {
    const response = await supabase.from(tableName).select('*');
    return handleResponse<T[]>(response);
};

export const add = async <T extends Record<string, any>>(tableName: string, item: Omit<T, keyof T>): Promise<T> => {
    const snakeItem = toSnakeCase(item);
    const response = await supabase.from(tableName).insert(snakeItem).select().single();
    return handleResponse<T>(response, true);
};

export const update = async <T extends Record<string, any>>(tableName: string, updatedItem: T): Promise<void> => {
    const snakeItem = toSnakeCase(updatedItem);
    const primaryKey = Object.keys(keyMap).find(key => key in updatedItem && key.endsWith('Id')) || '';
    const primaryDbKey = keyMap[primaryKey];
    
    if (!primaryDbKey) throw new Error(`Could not determine primary key for table ${tableName}`);

    const { [primaryDbKey]: id, ...updateData } = snakeItem;
    
    const { error } = await supabase.from(tableName).update(updateData).eq(primaryDbKey, id);
    if (error) {
        console.error('Supabase update error:', error);
        throw new Error(error.message);
    }
};

export const remove = async (tableName: string, id: string): Promise<void> => {
    // We need to find the correct primary key column name for the given table
    const tableToPkMap: { [key:string]: string } = {
        'users': 'users_id',
        'academic_years': 'academic_years_id',
        'groups': 'groups_id',
        'activities': 'activities_id'
    };
    const primaryKey = tableToPkMap[tableName];
    if (!primaryKey) throw new Error(`Primary key for table ${tableName} not defined in mapping.`);

    const { error } = await supabase.from(tableName).delete().eq(primaryKey, id);
    if (error) {
        console.error('Supabase remove error:', error);
        throw new Error(error.message);
    }
};


// --- SPECIFIC API FUNCTIONS ---

export const getUsers = (): Promise<User[]> => getAll<User>('users');
export const getAcademicYears = (): Promise<AcademicYear[]> => getAll<AcademicYear>('academic_years');
export const getGroups = (): Promise<Group[]> => getAll<Group>('groups');
export const getActivities = (): Promise<Activity[]> => getAll<Activity>('activities');
export const getParticipationRecords = (): Promise<ParticipationRecord[]> => getAll<ParticipationRecord>('participation_records');


export const addUser = async (item: Omit<User, 'usersId'>): Promise<User> => {
    return add<User>('users', item);
};

export const addUsersBatch = async (items: Omit<User, 'usersId'>[]): Promise<User[]> => {
    const snakeItems = items.map(toSnakeCase);
    const response = await supabase.from('users').insert(snakeItems).select();
    return handleResponse<User[]>(response);
};

export const updateUser = (updatedItem: User): Promise<void> => update('users', updatedItem);

export const removeUser = (id: string): Promise<void> => remove('users', id);

export const updateParticipationBatch = async (activityId: string, newRecordsForActivity: Omit<ParticipationRecord, 'participationRecordsId'>[]): Promise<void> => {
    // This is a transaction-like operation: delete old records for the users in this batch, then insert new ones.
    
    // 1. Get the list of user IDs involved in this update
    const userIdsInBatch = newRecordsForActivity.map(r => r.usersId);
    if(userIdsInBatch.length === 0) return; // Nothing to do

    // 2. Delete existing records for this specific activity and these specific users
    const { error: deleteError } = await supabase
        .from('participation_records')
        .delete()
        .eq('activities_id', activityId)
        .in('users_id', userIdsInBatch);

    if (deleteError) {
        console.error('Supabase batch delete error:', deleteError);
        throw new Error(deleteError.message);
    }

    // 3. Insert the new records
    const recordsToInsert = newRecordsForActivity.map(r => toSnakeCase(r));
    const { error: insertError } = await supabase.from('participation_records').insert(recordsToInsert);

    if (insertError) {
        console.error('Supabase batch insert error:', insertError);
        throw new Error(insertError.message);
    }
};