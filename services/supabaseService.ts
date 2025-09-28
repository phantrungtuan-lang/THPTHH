import { createClient } from '@supabase/supabase-js';
import { User, AcademicYear, Group, Activity, ParticipationRecord } from '../types';

// Cấu hình Supabase client với thông tin của bạn
const SUPABASE_URL = 'https://lkonihsuecirpdluwtuj.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxrb25paHN1ZWNpcnBkbHV3dHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNjI4NTksImV4cCI6MjA3NDYzODg1OX0.o4bzXPT2p3cY0ezWKcxbSaMtlwNPLyST6cHcwMwRm9w';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
    return data as T[] || [];
};

export const add = async <T>(tableName: string, item: Omit<T, 'id'>): Promise<T> => {
    // Wrap the single item in an array, which is the standard format for insert.
    const { data, error } = await supabase.from(tableName).insert([item]).select().single();
    if (error) handleError(error, `add to ${tableName}`);
    return data as T;
};

export const update = async <T>(tableName: string, id: string, item: Partial<T>): Promise<T> => {
    const { data, error } = await supabase.from(tableName).update(item).eq('id', id).select().single();
    if (error) handleError(error, `update in ${tableName}`);
    return data as T;
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
    const { error: deleteError } = await supabase
        .from('participation_records')
        .delete()
        .eq('activityId', activityId);

    if (deleteError) handleError(deleteError, `updateParticipationBatch (delete) for activity ${activityId}`);

    // 2. Insert the new batch of records
    if (newRecords.length > 0) {
        const { error: insertError } = await supabase
            .from('participation_records')
            .insert(newRecords);

        if (insertError) handleError(insertError, `updateParticipationBatch (insert) for activity ${activityId}`);
    }
};