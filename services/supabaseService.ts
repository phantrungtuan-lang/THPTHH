import { createClient } from '@supabase/supabase-js';
import { User, AcademicYear, Group, Activity, ParticipationRecord } from '../types';

// Cấu hình Supabase client với thông tin của bạn
const SUPABASE_URL = 'https://lkonihsuecirpdluwtuj.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxrb25paHN1ZWNpcnBkbHV3dHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNjI4NTksImV4cCI6MjA3NDYzODg1OX0.o4bzXPT2p3cY0ezWKcxbSaMtlwNPLyST6cHcwMwRm9w';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Case Conversion Helpers ---
// Converts snake_case_string to camelCaseString
const toCamel = (s: string): string => {
  return s.replace(/([-_][a-z])/ig, ($1) => {
    return $1.toUpperCase()
      .replace('-', '')
      .replace('_', '');
  });
};

// Converts camelCaseString to snake_case_string
const toSnake = (s: string): string => {
  return s.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

// Recursively converts keys of an object or array of objects using a converter function
const convertKeys = (obj: any, converter: (s: string) => string): any => {
    if (Array.isArray(obj)) {
        return obj.map(v => convertKeys(v, converter));
    }
    // Check if it's a plain object (and not null, a Date, etc.)
    if (obj && typeof obj === 'object' && obj.constructor === Object) {
        const newObj: { [key: string]: any } = {};
        for (const key of Object.keys(obj)) {
            let value = obj[key];
            // When converting to snake_case for the DB, if a field is a Foreign Key (ending in 'Id')
            // and its value is empty string or undefined, convert it to null for DB integrity.
            if (converter === toSnake && key.endsWith('Id') && (value === '' || value === undefined)) {
                value = null;
            }
            // Convert the key and recursively convert the value
            newObj[converter(key)] = convertKeys(value, converter);
        }
        return newObj;
    }
    return obj; // Return primitives and other types as is
};


// --- Generic Data Functions ---

const handleError = (error: any, context: string) => {
    const message = error.message || 'An unknown error occurred.';
    console.error(`Error in ${context}:`, error);

    if (message.includes('permission denied')) {
        const operation = context.split(' ')[0].toLowerCase();
        const tableName = context.split(' ').pop();
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
    // 1. Delete all existing records for this activity to ensure a clean update.
    const { error: deleteError } = await supabase
        .from('participation_records')
        .delete()
        .eq('activity_id', activityId); // Use correct snake_case column name

    if (deleteError) handleError(deleteError, `updateParticipationBatch (delete) for activity ${activityId}`);

    // 2. Insert the new batch of records if there are any.
    if (newRecords.length > 0) {
        // The generic 'add' function can't be used here because we're inserting a batch, not a single item.
        // So, we convert keys to snake_case manually before inserting.
        const snakeRecords = newRecords.map(r => convertKeys(r, toSnake));
        const { error: insertError } = await supabase
            .from('participation_records')
            .insert(snakeRecords);

        if (insertError) handleError(insertError, `updateParticipationBatch (insert) for activity ${activityId}`);
    }
};