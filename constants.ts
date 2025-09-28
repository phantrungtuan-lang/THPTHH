
import { User, UserRole, AcademicYear, Group, Teacher, Activity, ParticipationStatus, ParticipationRecord } from './types';

export const USERS: User[] = [
  { id: 'user-admin', name: 'Admin User', role: UserRole.ADMIN, password: '123' },
  { id: 'user-leader-1', name: 'Tổ trưởng Toán', role: UserRole.GROUP_LEADER, groupId: 'group-1', password: '123' },
  { id: 'user-leader-2', name: 'Tổ trưởng Văn', role: UserRole.GROUP_LEADER, groupId: 'group-2', password: '123' },
  { id: 'user-teacher-1', name: 'Nguyễn Văn A', role: UserRole.TEACHER, groupId: 'group-1', password: '123' },
  { id: 'user-teacher-2', name: 'Trần Thị B', role: UserRole.TEACHER, groupId: 'group-1', password: '123' },
  { id: 'user-teacher-3', name: 'Lê Văn C', role: UserRole.TEACHER, groupId: 'group-2', password: '123' },
  { id: 'user-teacher-4', name: 'Phạm Thị D', role: UserRole.TEACHER, groupId: 'group-2', password: '123' },
];

export const ACADEMIC_YEARS: AcademicYear[] = [
  { id: 'year-1', name: 'Năm học 2023-2024' },
  { id: 'year-2', name: 'Năm học 2024-2025' },
];

export const GROUPS: Group[] = [
  { id: 'group-1', name: 'Tổ Toán - Tin', leaderId: 'user-leader-1' },
  { id: 'group-2', name: 'Tổ Ngữ Văn', leaderId: 'user-leader-2' },
  { id: 'group-3', name: 'Tổ Ngoại Ngữ', leaderId: 'user-teacher-5' }, // Assuming another teacher is leader
];

export const TEACHERS: Teacher[] = [
  { id: 'user-teacher-1', name: 'Nguyễn Văn A', groupId: 'group-1' },
  { id: 'user-teacher-2', name: 'Trần Thị B', groupId: 'group-1' },
  { id: 'user-teacher-3', name: 'Lê Văn C', groupId: 'group-2' },
  { id: 'user-teacher-4', name: 'Phạm Thị D', groupId: 'group-2' },
  { id: 'user-teacher-5', name: 'Hoàng Thị E', groupId: 'group-3' },
];

export const ACTIVITIES: Activity[] = [
  { id: 'act-1', name: 'Họp hội đồng tháng 9', date: '2023-09-05', academicYearId: 'year-1' },
  { id: 'act-2', name: 'Tập huấn chuyên môn', date: '2023-10-20', academicYearId: 'year-1' },
  { id: 'act-3', name: 'Lễ kỷ niệm 20/11', date: '2023-11-20', academicYearId: 'year-1' },
  { id: 'act-4', name: 'Họp hội đồng đầu năm', date: '2024-09-05', academicYearId: 'year-2' },
];

export const PARTICIPATION_RECORDS: ParticipationRecord[] = [
  { id: 'pr-1', teacherId: 'user-teacher-1', activityId: 'act-1', status: ParticipationStatus.PARTICIPATED },
  { id: 'pr-2', teacherId: 'user-teacher-2', activityId: 'act-1', status: ParticipationStatus.LATE },
  { id: 'pr-3', teacherId: 'user-teacher-3', activityId: 'act-1', status: ParticipationStatus.PARTICIPATED },
  { id: 'pr-4', teacherId: 'user-teacher-4', activityId: 'act-1', status: ParticipationStatus.ABSENT },
  { id: 'pr-5', teacherId: 'user-teacher-1', activityId: 'act-2', status: ParticipationStatus.ORGANIZER },
  { id: 'pr-6', teacherId: 'user-teacher-2', activityId: 'act-2', status: ParticipationStatus.PARTICIPATED },
  { id: 'pr-7', teacherId: 'user-teacher-3', activityId: 'act-2', status: ParticipationStatus.PARTICIPATED },
  { id: 'pr-8', teacherId: 'user-teacher-4', activityId: 'act-2', status: ParticipationStatus.LEFT_EARLY },
  { id: 'pr-9', teacherId: 'user-teacher-1', activityId: 'act-3', status: ParticipationStatus.PARTICIPATED },
];