import { createClient } from '@supabase/supabase-js';
import { User, AcademicYear, Group, Activity, ParticipationRecord } from '../types';

// Cấu hình Supabase client với thông tin của bạn
const SUPABASE_URL = 'https://lkonihsuecirpdluwtuj.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxrb25paHN1ZWNpcnBkbHV3dHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNjI4NTksImV4cCI6MjA3NDYzODg1OX0.o4bzXPT2p3cY0ezWKcxbSaMtlwNPLyST6cHcwMwRm9w';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Case Conversion Helpers ---
const toCamel = (s: string): string => {
  return s.split('_').reduce((acc, part, i) => {
    if (i === 0) return part;
    return acc + part.charAt(0).toUpperCase() + part.slice(1);
  }, '');
};
const toSnake = (s: string) => s.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

const convertKeys = (obj: any, converter: (s: string) => string): any => {
    if (Array.isArray(obj)) {
        return obj.map(v => convertKeys(v, converter));
    }
    // Use a more robust check for objects
    if (obj !== null && typeof obj === 'object' && !Array.isArray(obj)) {
        const newObj: { [key: string]: any } = {};
        for (const key in obj) {
            // Ensure we only process own properties
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                let value = obj[key];
                // When converting to snake_case for DB, if a field is an FK and is empty/undefined, make it null
                if (converter === toSnake && key.endsWith('Id') && (value === '' || value === undefined)) {
                    value = null;
                }
                newObj[converter(key)] = convertKeys(value, converter);
            }
        }
        return newObj;
    }
    return obj;
};


// --- Generic Data Functions ---

const handleError = (error: any, context: string) => {
    const message = error.message || 'An unknown error occurred.';
    console.error(`Error in ${context}:`, error);

    // Add a developer hint about Row Level Security, as it's a common issue.
    if (message.includes('permission denied')) {
        const operation = context.split(' ')[0].toLowerCase(); // e.g., "getall", "add"
        const tableName = context.split(' ').pop(); // Gets the last word, likely the table name
        let policyType = 'READ (SELECT)';
        if (operation.includes('add')) policyType = 'CREATE (INSERT)';
        if (operation.includes('update')) policyType = 'UPDATE';
        if (operation.includes('remove') || operation.includes('delete')) policyType = 'DELETE';

        console.warn(
            `Supabase RLS Hint: The error "permission denied" for table "${tableName}" suggests that Row Level Security (RLS) is enabled, ` +
            `but there is no policy allowing the 'anon' role to perform the '${policyType}' operation. ` +
            `You may need to create or modify a policy in your Supabase dashboard.`
        );
    }
    // Throw a new, cleaner error object that will be caught by the UI layer.
    throw new Error(message);
};

export const getAll = async <T>(tableName: string): Promise<T[]> => {
    const { data, error } = await supabase.from(tableName).select('*');
    if (error) handleError(error, `getAll ${tableName}`);
    return convertKeys(data, toCamel) as T[] || [];
};

export const add = async <T>(tableName: string, item: Omit<T, 'id'>): Promise<T> => {
    const snakeItem = convertKeys(item, toSnake);
    const { data, error } = await supabase.from(tableName).insert([snakeItem]).select().single();
    if (error) handleError(error, `add to ${tableName}`);
    return convertKeys(data, toCamel) as T;
};

export const update = async <T>(tableName: string, id: string, item: Partial<T>): Promise<T> => {
    const snakeItem = convertKeys(item, toSnake);
    const { data, error } = await supabase.from(tableName).update(snakeItem).eq('id', id).select().single();
    if (error) handleError(error, `update in ${tableName}`);
    return convertKeys(data, toCamel) as T;
};

export const remove = async (tableName: string, id: string): Promise<void> => {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) handleError(error, `remove from ${tableName}`);
};

// --- Specific Data Functions ---

export const getUsers = () => getAll<User>('users');
export const getAcademicYears = () => getAll<AcademicYear>('academic_years');
export const getGroups = () => getAll<Group>('groups');
export const getActivities = () => getAll<Activity>('activities');
export const getParticipationRecords = () => getAll<ParticipationRecord>('participation_records');

export const addUser = (user: Omit<User, 'id'>) => add<User>('users', user);
export const updateUser = (id: string, user: Partial<User>) => update<User>('users', id, user);
export const removeUser = (id: string) => remove('users', id);


export const updateParticipationBatch = async (activityId: string, newRecords: Omit<ParticipationRecord, 'id'>[]) => {
    // 1. Delete all existing records for this activity
    // FIX: Use snake_case 'activity_id' for the column name in the query.
    const { error: deleteError } = await supabase
        .from('participation_records')
        .delete()
        .eq('activity_id', activityId);

    if (deleteError) handleError(deleteError, `updateParticipationBatch (delete) for activity ${activityId}`);

    // 2. Insert the new batch of records
    if (newRecords.length > 0) {
        const snakeRecords = newRecords.map(r => convertKeys(r, toSnake));
        const { error: insertError } = await supabase
            .from('participation_records')
            .insert(snakeRecords);

        if (insertError) handleError(insertError, `updateParticipationBatch (insert) for activity ${activityId}`);
    }
};