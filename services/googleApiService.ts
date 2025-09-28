// Fix: Declare gapi and google as any to resolve "Cannot find name" errors.
declare const gapi: any;
declare const google: any;

// This file handles all communication with the Google Sheets API.

// --- CONFIGURATION ---
// PASTE YOUR GOOGLE CLOUD CLIENT ID HERE
const CLIENT_ID = '898316656993-169omrkcusg064sod0l0jfuljgvv66kc.apps.googleusercontent.com'; // <--- PASTE YOUR CLIENT ID
const SPREADSHEET_ID = '1vPy4LQUXwKmcmd4fQ0YkyR7lr3lL3wy7GQ-uKq8gRhQ';
// --- END CONFIGURATION ---

const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

let tokenClient: google.accounts.oauth2.TokenClient;
let gapiInited = false;
let gisInited = false;

const SHEET_NAMES = {
  USERS: 'Users',
  ACADEMIC_YEARS: 'AcademicYears',
  GROUPS: 'Groups',
  TEACHERS: 'Teachers',
  ACTIVITIES: 'Activities',
  PARTICIPATION_RECORDS: 'ParticipationRecords',
};

// Defines the exact order of columns for writing back to Google Sheets.
const SHEET_HEADERS = {
  [SHEET_NAMES.USERS]: ['id', 'name', 'role', 'password', 'groupId'],
  [SHEET_NAMES.ACADEMIC_YEARS]: ['id', 'name'],
  [SHEET_NAMES.GROUPS]: ['id', 'name', 'leaderId'],
  [SHEET_NAMES.TEACHERS]: ['id', 'name', 'groupId'],
  [SHEET_NAMES.ACTIVITIES]: ['id', 'name', 'date', 'academicYearId'],
  [SHEET_NAMES.PARTICIPATION_RECORDS]: ['id', 'teacherId', 'activityId', 'status'],
};


// --- Public Functions ---

// Helper to load a script dynamically
function loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.body.appendChild(script);
    });
}

/**
 * Initializes the Google API client and Google Identity Services in the correct order.
 * This function now handles loading the necessary scripts dynamically to avoid race conditions.
 */
export async function initClient(updateSigninStatus: (isSignedIn: boolean) => void) {
    try {
        await loadScript('https://apis.google.com/js/api.js');
        await new Promise<void>(resolve => gapi.load('client', resolve));
        await gapi.client.init({
            discoveryDocs: [DISCOVERY_DOC],
        });
        gapiInited = true;

        await loadScript('https://accounts.google.com/gsi/client');
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (resp: { error: any; access_token: any; }) => {
                if (resp.error) {
                    throw new Error(resp.error);
                }
                gapi.client.setToken({ access_token: resp.access_token });
                updateSigninStatus(true);
            },
        });
        gisInited = true;
    } catch (error) {
        console.error("Error initializing Google API client:", error);
        throw error;
    }
}


export function signIn() {
  if (!gisInited || !gapiInited) {
    console.error("API not initialized yet!");
    alert("API chưa sẵn sàng, vui lòng thử lại sau giây lát.");
    return;
  }
  if (CLIENT_ID === 'YOUR_CLIENT_ID' || !CLIENT_ID) {
    alert("Lỗi cấu hình: Vui lòng cung cấp Client ID trong tệp services/googleApiService.ts");
    return;
  }
  tokenClient.requestAccessToken({ prompt: 'consent' });
}

export function signOut() {
  const token = gapi.client.getToken();
  if (token !== null) {
    google.accounts.oauth2.revoke(token.access_token, () => {});
    gapi.client.setToken(null);
  }
}

export function isSignedIn(): boolean {
    return gapi.client.getToken() !== null;
}

export function getSignedInUserEmail(): string | null {
    // This is a placeholder. A real implementation would require 'email' scope
    // and parsing the identity token, which is beyond the current scope.
    return "user@example.com";
}

// --- Data Fetching and Updating ---

function sheetValuesToObjects<T>(values: any[][]): T[] {
  if (!values || values.length < 1) {
    return [];
  }
  const headers = values[0].map(h => String(h).trim());
  if(headers.length === 0) return [];
  
  return values.slice(1).map(row => {
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = index < row.length ? row[index] : undefined;
    });
    return obj as T;
  });
}

function objectsToSheetValues<T extends { [key: string]: any }>(data: T[], headers: string[]): any[][] {
  const values = data.map(obj => headers.map(header => obj[header] !== undefined && obj[header] !== null ? obj[header] : ''));
  return [headers, ...values];
}


async function getSheetData<T>(sheetName: string): Promise<T[]> {
  try {
    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: sheetName,
    });
    return sheetValuesToObjects<T>(response.result.values || []);
  } catch (err: any) {
    console.error(`Error getting sheet "${sheetName}":`, err);
    alert(`Lỗi khi đọc dữ liệu từ trang tính "${sheetName}": ${err.result?.error?.message || 'Unknown error'}`);
    return [];
  }
}

async function updateSheetData<T extends { [key: string]: any }>(sheetName: string, data: T[], headers: string[]) {
  const values = objectsToSheetValues(data, headers);

  try {
    // Clear the entire sheet first
    await gapi.client.sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: sheetName,
    });

    // Write the new data (including headers)
    await gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        resource: {
            values: values,
        },
    });
  } catch (err: any) {
    console.error(`Error updating sheet "${sheetName}":`, err);
    alert(`Lỗi khi cập nhật trang tính "${sheetName}": ${err.result?.error?.message || 'Unknown error'}`);
  }
}

// --- Specific Getters ---
export const getUsers = () => getSheetData<import('../types').User>(SHEET_NAMES.USERS);
export const getAcademicYears = () => getSheetData<import('../types').AcademicYear>(SHEET_NAMES.ACADEMIC_YEARS);
export const getGroups = () => getSheetData<import('../types').Group>(SHEET_NAMES.GROUPS);
export const getTeachers = () => getSheetData<import('../types').Teacher>(SHEET_NAMES.TEACHERS);
export const getActivities = () => getSheetData<import('../types').Activity>(SHEET_NAMES.ACTIVITIES);
export const getParticipationRecords = () => getSheetData<import('../types').ParticipationRecord>(SHEET_NAMES.PARTICIPATION_RECORDS);

// --- Specific Updaters ---
export const updateUsers = (data: import('../types').User[]) => updateSheetData(SHEET_NAMES.USERS, data, SHEET_HEADERS.Users);
export const updateAcademicYears = (data: import('../types').AcademicYear[]) => updateSheetData(SHEET_NAMES.ACADEMIC_YEARS, data, SHEET_HEADERS.AcademicYears);
export const updateGroups = (data: import('../types').Group[]) => updateSheetData(SHEET_NAMES.GROUPS, data, SHEET_HEADERS.Groups);
export const updateTeachers = (data: import('../types').Teacher[]) => updateSheetData(SHEET_NAMES.TEACHERS, data, SHEET_HEADERS.Teachers);
export const updateActivities = (data: import('../types').Activity[]) => updateSheetData(SHEET_NAMES.ACTIVITIES, data, SHEET_HEADERS.Activities);
export const updateParticipationRecords = (data: import('../types').ParticipationRecord[]) => updateSheetData(SHEET_NAMES.PARTICIPATION_RECORDS, data, SHEET_HEADERS.ParticipationRecords);