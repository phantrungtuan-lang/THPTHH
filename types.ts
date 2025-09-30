export enum UserRole {
  ADMIN = 'Admin',
  GROUP_LEADER = 'Tổ trưởng',
  TEACHER = 'Giáo viên',
}

export interface User {
  usersId: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  groupsId?: string | null;
}

export interface AcademicYear {
  academicYearsId: string;
  name: string;
}

export interface Group {
  groupsId: string;
  name: string;
  leaderUsersId?: string | null;
}

export interface Teacher {
  usersId: string; // Corresponds to User.usersId
  name: string;
  groupsId: string;
}

export interface Activity {
  activitiesId: string;
  name: string;
  date: string; // ISO date string
  academicYearsId: string;
}

export enum ParticipationStatus {
  ORGANIZER = 'Ban tổ chức',
  PARTICIPATED = 'Có tham gia',
  LATE = 'Đến trễ',
  LEFT_EARLY = 'Về sớm',
  ABSENT = 'Vắng',
}

export interface ParticipationRecord {
  participationRecordsId: string;
  usersId: string; // The teacher's user ID
  activitiesId: string;
  status: ParticipationStatus;
}
