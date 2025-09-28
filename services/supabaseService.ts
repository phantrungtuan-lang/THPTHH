import { createClient, Session, User as SupabaseUser } from '@supabase/supabase-js';
import { User, AcademicYear, Group, Activity, ParticipationRecord, UserRole } from '../types';

// Cấu hình Supabase client với thông tin của bạn
const SUPABASE_URL = 'https://lkonihsuecirpdluwtuj.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxrb25paHN1ZWNpcnBkbHV3dHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNjI4NTksImV4cCI6MjA3NDYzODg1OX0.o4bzXPT2p3cY0ezWKcxbSaMtlwNPLyST6cHcwMwRm9w';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Authentication Functions ---

export const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
    });
    if (error) console.error('Error logging in with Google:', error.message);
};

export const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error logging out:', error.message);
};

export const getSession = async (): Promise<Session | null> => {
    const { data } = await supabase.auth.getSession();
    return data.session;
};

export const onAuthStateChange = (callback: (event: string, session: Session | null) => void) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return subscription;
};

export const getUserProfile = async (email: string): Promise<User | null> => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
        
    if (error && error.code !== 'PGRST116') { // PGRST116: single row not found, which is ok
        console.error('Error fetching user profile:', error);
        return null;
    }
    return data;
};

// --- Generic Data Functions ---

const handleError = (error: any, context: string) => {
    console.error(`Error in ${context}:`, error);
    throw error;
};

export const getAll = async <T>(tableName: string): Promise<T[]> => {
    const { data, error } = await supabase.from(tableName).select('*');
    if (error) handleError(error, `getAll ${tableName}`);
    return data as T[] || [];
};

export const add = async <T>(tableName: string, item: Omit<T, 'id'>): Promise<T> => {
    const { data, error } = await supabase.from(tableName).insert(item).select().single();
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

    if (deleteError) handleError(deleteError, 'updateParticipationBatch (delete)');

    // 2. Insert the new batch of records
    if (newRecords.length > 0) {
        const { error: insertError } = await supabase
            .from('participation_records')
            .insert(newRecords);

        if (insertError) handleError(insertError, 'updateParticipationBatch (insert)');
    }
};