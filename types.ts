
export enum UserRole {
  ADMIN = 'Quản trị',
  GROUP_LEADER = 'Tổ trưởng',
  TEACHER = 'Giáo viên',
}

export enum ParticipationStatus {
  ORGANIZER = 'Tham gia tổ chức',
  PARTICIPATED = 'Tham gia',
  LATE = 'Đi muộn',
  LEFT_EARLY = 'Vắng giữa buổi',
  ABSENT = 'Vắng cả buổi',
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  // Fix: Corrected the typo in the password property definition from a semicolon to a colon.
  password: string;
  groupId?: string; // For Group Leaders and Teachers
}

export interface AcademicYear {
  id: string;
  name: string;
}

export interface Group {
  id: string;
  name: string;
  leaderId: string;
}

export interface Teacher {
  id: string;
  name: string;
  groupId: string;
}

export interface Activity {
  id: string;
  name: string;
  date: string; // ISO string
  academicYearId: string;
}

export interface ParticipationRecord {
  id: string;
  teacherId: string;
  activityId: string;
  status: ParticipationStatus;
}