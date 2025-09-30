
import { createClient } from '@supabase/supabase-js';
import { User, AcademicYear, Group, Activity, ParticipationRecord } from '../types';

// Directly using the provided Supabase credentials
const supabaseUrl = "https://lkonihsuecirpdluwtuj.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxrb25paHN1ZWNpcnBkbHV3dHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNjI4NTksImV4cCI6MjA3NDYzODg1OX0.o4bzXPT2p3cY0ezWKcxbSaMtlwNPLyST6cHcwMwRm9w";

const supabase = createClient(supabaseUrl, supabaseKey);

// --- Generic Handlers ---

// This is a workaround for App.tsx not passing the primary key name to update/remove.
const primaryKeys: Record<string, string> = {
    'activities': 'activitiesId',
    'academic_years': 'academicYearsId',
    'groups': 'groupsId',
    'participation_records': 'participationRecordsId'
};

// The type signature for `item` in App.tsx `createHandlers` is incorrect (Omit<T, keyof T>).
// We use `any` here to match the actual runtime usage.
export const add = async <T extends Record<string, any>>(tableName: string, item: any): Promise<T> => {
    const { data, error } = await supabase
        .from(tableName)
        .insert(item)
        .select()
        .single();
    if (error) throw error;
    if (!data) throw new Error(`Insert failed on table ${tableName}, no data returned.`);
    return data as T;
};

export const update = async <T extends Record<string, any>>(tableName: string, updatedItem: T): Promise<void> => {
    const primaryKey = primaryKeys[tableName];
    if (!primaryKey) {
        throw new Error(`No primary key defined for table: ${tableName} in supabaseService.`);
    }
    const id = updatedItem[primaryKey];
    // Supabase update doesn't need the primary key in the payload.
    const itemData = { ...updatedItem };
    delete itemData[primaryKey];

    const { error } = await supabase
        .from(tableName)
        .update(itemData)
        .match({ [primaryKey]: id });
    if (error) throw error;
};

export const remove = async (tableName: string, id: string): Promise<void> => {
    const primaryKey = primaryKeys[tableName];
    if (!primaryKey) {
        throw new Error(`No primary key defined for table: ${tableName} in supabaseService.`);
    }
    const { error } = await supabase
        .from(tableName)
        .delete()
        .match({ [primaryKey]: id });
    if (error) throw error;
};


// --- Data Fetching ---

export const getUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase.from('users').select('*').order('name');
  if (error) throw error;
  return data || [];
};

export const getAcademicYears = async (): Promise<AcademicYear[]> => {
  const { data, error } = await supabase.from('academic_years').select('*').order('name', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const getGroups = async (): Promise<Group[]> => {
  const { data, error } = await supabase.from('groups').select('*').order('name');
  if (error) throw error;
  return data || [];
};

export const getActivities = async (): Promise<Activity[]> => {
  const { data, error } = await supabase.from('activities').select('*').order('date', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const getParticipationRecords = async (): Promise<ParticipationRecord[]> => {
  const { data, error } = await supabase.from('participation_records').select('*');
  if (error) throw error;
  return data || [];
};


// --- User Specific Handlers ---

export const addUser = async (user: Omit<User, 'usersId'>): Promise<User> => {
    const { data, error } = await supabase
        .from('users')
        .insert(user)
        .select()
        .single();
    if (error) throw error;
    if (!data) throw new Error("Insert failed for user.");
    return data;
};

export const addUsersBatch = async (users: Omit<User, 'usersId'>[]): Promise<User[]> => {
    const { data, error } = await supabase
        .from('users')
        .insert(users)
        .select();
    if (error) throw error;
    return data || [];
};

export const updateUser = async (user: User): Promise<void> => {
    const { usersId, ...rest } = user;
    const { error } = await supabase
        .from('users')
        .update(rest)
        .match({ usersId: usersId });
    if (error) throw error;
};

export const removeUser = async (id: string): Promise<void> => {
    // 1. Unset this user as a leader from any group they might be leading.
    const { error: groupUpdateError } = await supabase
      .from('groups')
      .update({ leader_users_id: null })
      .match({ leader_users_id: id });

    if (groupUpdateError) {
      console.error('Error unsetting group leader:', groupUpdateError);
      throw groupUpdateError;
    }

    // 2. Delete all participation records for this user.
    const { error: participationDeleteError } = await supabase
      .from('participation_records')
      .delete()
      .match({ teacher_users_id: id });
    
    if (participationDeleteError) {
        console.error('Error deleting participation records:', participationDeleteError);
        throw participationDeleteError;
    }
    
    // 3. Finally, delete the user.
    const { error: userDeleteError } = await supabase
        .from('users')
        .delete()
        .match({ usersId: id });

    if (userDeleteError) {
        console.error('Error deleting user:', userDeleteError);
        throw userDeleteError;
    }
};

// --- Participation Record Specific Handlers ---

export const updateParticipationBatch = async (activityId: string, records: Omit<ParticipationRecord, 'participationRecordsId'>[]): Promise<void> => {
    // This should ideally be a single transaction. With Supabase JS client, we do it in two steps.
    // An RPC call to a Postgres function would be more robust.

    // 1. Delete all existing records for the given activity.
    const { error: deleteError } = await supabase
        .from('participation_records')
        .delete()
        .match({ activityId: activityId });

    if (deleteError) {
        console.error("Error deleting old participation records:", deleteError);
        throw deleteError;
    }

    // 2. Insert the new set of records.
    if (records && records.length > 0) {
        const { error: insertError } = await supabase
            .from('participation_records')
            .insert(records);
        
        if (insertError) {
            console.error("Error inserting new participation records:", insertError);
            throw insertError;
        }
    }
};
