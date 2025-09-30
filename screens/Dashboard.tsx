import React from 'react';
import { User, UserRole, AcademicYear, Group, Teacher, Activity, ParticipationRecord } from '../types';
import { AdminDashboard } from './admin/AdminDashboard';
import { GroupLeaderDashboard } from './groupleader/GroupLeaderDashboard';
import { TeacherDashboard } from './teacher/TeacherDashboard';

interface DashboardProps {
  currentUser: User;
  data: {
    users: User[];
    academicYears: AcademicYear[];
    groups: Group[];
    teachers: Teacher[];
    activities: Activity[];
    participationRecords: ParticipationRecord[];
  };
  handlers: {
    userHandlers: any;
    academicYearHandlers: any;
    groupHandlers: any;
    teacherHandlers: any;
    activityHandlers: any;
    participationRecordHandlers: any;
    requestPasswordReset: (user: User) => void;
  };
}

export const Dashboard: React.FC<DashboardProps> = ({ currentUser, data, handlers }) => {
  switch (currentUser.role) {
    case UserRole.ADMIN:
      return <AdminDashboard currentUser={currentUser} data={data} handlers={handlers} />;
    case UserRole.GROUP_LEADER:
      return <GroupLeaderDashboard currentUser={currentUser} data={data} handlers={handlers} />;
    case UserRole.TEACHER:
      return <TeacherDashboard currentUser={currentUser} data={data} />;
    default:
      return <div>Invalid user role.</div>;
  }
};