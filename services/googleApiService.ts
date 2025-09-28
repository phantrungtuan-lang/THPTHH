// Fix: Replaced corrupted file content with a functional mock of the Google API service.
import * as sheets from './googleSheetsService';
import { User, AcademicYear, Group, Teacher, Activity, ParticipationRecord } from '../types';

// Mock Google Auth
// In a real application, this would use the Google Identity Services library (gsi).
// For this simulation, we'll use localStorage to persist the sign-in state.

let signedIn = false;
let authChangeCallback: ((isSignedIn: boolean) => void) | null = null;
const MOCK_USER_EMAIL = 'admin.user@example.com';

/**
 * Initializes the API client. In a real app, this would load the gapi client.
 * @param callback - A function to call when the sign-in state changes.
 */
export const initClient = async (callback: (isSignedIn: boolean) => void): Promise<void> => {
    authChangeCallback = callback;
    // Ensure the mock database is seeded with initial data if it hasn't been already.
    await sheets.initializeDatabase();
    
    // Check if user was previously signed in.
    const wasSignedIn = localStorage.getItem('google_auth_signed_in') === 'true';
    if (wasSignedIn) {
        signedIn = true;
    }
    // The App component will call handleAuthChange after this resolves.
};

/**
 * Signs the user in.
 */
export const signIn = (): void => {
    signedIn = true;
    localStorage.setItem('google_auth_signed_in', 'true');
    if (authChangeCallback) {
        authChangeCallback(true);
    }
};

/**
 * Signs the user out.
 */
export const signOut = (): void => {
    signedIn = false;
    localStorage.removeItem('google_auth_signed_in');
    if (authChangeCallback) {
        authChangeCallback(false);
    }
};

/**
 * Checks if the user is currently signed in.
 * @returns {boolean} True if signed in, false otherwise.
 */
export const isSignedIn = (): boolean => {
    // We also check localStorage as a fallback for the initial load state before initClient sets the variable.
    return signedIn || localStorage.getItem('google_auth_signed_in') === 'true';
};

/**
 * Gets the email of the signed-in user.
 * @returns {string | null} The user's email or null if not signed in.
 */
export const getSignedInUserEmail = (): string | null => {
    return isSignedIn() ? MOCK_USER_EMAIL : null;
};


// --- Data Functions ---
// These functions act as a pass-through to the googleSheetsService,
// simulating the layer that would normally make API calls to Google Sheets.

export const getUsers = (): Promise<User[]> => sheets.getUsers();
export const getAcademicYears = (): Promise<AcademicYear[]> => sheets.getAcademicYears();
export const getGroups = (): Promise<Group[]> => sheets.getGroups();
export const getTeachers = (): Promise<Teacher[]> => sheets.getTeachers();
export const getActivities = (): Promise<Activity[]> => sheets.getActivities();
export const getParticipationRecords = (): Promise<ParticipationRecord[]> => sheets.getParticipationRecords();

export const updateUsers = (data: User[]): Promise<void> => sheets.saveUsers(data);
export const updateAcademicYears = (data: AcademicYear[]): Promise<void> => sheets.saveAcademicYears(data);
export const updateGroups = (data: Group[]): Promise<void> => sheets.saveGroups(data);
export const updateTeachers = (data: Teacher[]): Promise<void> => sheets.saveTeachers(data);
export const updateActivities = (data: Activity[]): Promise<void> => sheets.saveActivities(data);
export const updateParticipationRecords = (data: ParticipationRecord[]): Promise<void> => sheets.saveParticipationRecords(data);
