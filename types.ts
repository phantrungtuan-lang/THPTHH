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
  usersId: string;
  name: string;
  email: string;
  role: UserRole;
  password: string;
  groupsId?: string; 
}

export interface AcademicYear {
  academicYearsId: string;
  name: string;
}

export interface Group {
  groupsId: string;
  name: string;
  leaderUsersId?: string;
}

// This is a derived type for display purposes
export interface Teacher {
  usersId: string;
  name: string;
  groupsId: string;
}

export interface Activity {
  activitiesId: string;
  name: string;
  date: string; // ISO string
  academicYearsId: string;
}

export interface ParticipationRecord {
  participationRecordsId: string;
  teacherUsersId: string;
  activityId: string;
  status: ParticipationStatus;
}
