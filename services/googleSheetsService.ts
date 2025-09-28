import { User, AcademicYear, Group, Teacher, Activity, ParticipationRecord } from '../types';
import { USERS, ACADEMIC_YEARS, GROUPS, TEACHERS, ACTIVITIES, PARTICIPATION_RECORDS } from '../constants';

const SHEET_KEYS = {
    USERS: 'gs_users',
    ACADEMIC_YEARS: 'gs_academic_years',
    GROUPS: 'gs_groups',
    TEACHERS: 'gs_teachers',
    ACTIVITIES: 'gs_activities',
    PARTICIPATION_RECORDS: 'gs_participation_records',
};

const SIMULATED_LATENCY = 200; // ms

// --- Generic Helpers ---

const getData = async <T>(key: string): Promise<T[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            try {
                const data = localStorage.getItem(key);
                resolve(data ? JSON.parse(data) : []);
            } catch (error) {
                console.error(`Failed to parse data from localStorage for key "${key}":`, error);
                resolve([]);
            }
        }, SIMULATED_LATENCY);
    });
};

const saveData = async <T>(key: string, data: T[]): Promise<void> => {
     return new Promise((resolve) => {
        setTimeout(() => {
            try {
                localStorage.setItem(key, JSON.stringify(data));
            } catch (error) {
                console.error(`Failed to save data to localStorage for key "${key}":`, error);
            }
            resolve();
        }, SIMULATED_LATENCY);
    });
};

// --- Initialization ---

export const initializeDatabase = async () => {
    const isInitialized = localStorage.getItem('gs_initialized');
    if (!isInitialized) {
        await Promise.all([
            saveData(SHEET_KEYS.USERS, USERS),
            saveData(SHEET_KEYS.ACADEMIC_YEARS, ACADEMIC_YEARS),
            saveData(SHEET_KEYS.GROUPS, GROUPS),
            saveData(SHEET_KEYS.TEACHERS, TEACHERS),
            saveData(SHEET_KEYS.ACTIVITIES, ACTIVITIES),
            saveData(SHEET_KEYS.PARTICIPATION_RECORDS, PARTICIPATION_RECORDS),
        ]);
        localStorage.setItem('gs_initialized', 'true');
    }
};


// --- Specific Getters ---

export const getUsers = () => getData<User>(SHEET_KEYS.USERS);
export const getAcademicYears = () => getData<AcademicYear>(SHEET_KEYS.ACADEMIC_YEARS);
export const getGroups = () => getData<Group>(SHEET_KEYS.GROUPS);
export const getTeachers = () => getData<Teacher>(SHEET_KEYS.TEACHERS);
export const getActivities = () => getData<Activity>(SHEET_KEYS.ACTIVITIES);
export const getParticipationRecords = () => getData<ParticipationRecord>(SHEET_KEYS.PARTICIPATION_RECORDS);

// --- Specific Savers ---

export const saveUsers = (data: User[]) => saveData(SHEET_KEYS.USERS, data);
export const saveAcademicYears = (data: AcademicYear[]) => saveData(SHEET_KEYS.ACADEMIC_YEARS, data);
export const saveGroups = (data: Group[]) => saveData(SHEET_KEYS.GROUPS, data);
export const saveTeachers = (data: Teacher[]) => saveData(SHEET_KEYS.TEACHERS, data);
export const saveActivities = (data: Activity[]) => saveData(SHEET_KEYS.ACTIVITIES, data);
export const saveParticipationRecords = (data: ParticipationRecord[]) => saveData(SHEET_KEYS.PARTICIPATION_RECORDS, data);
