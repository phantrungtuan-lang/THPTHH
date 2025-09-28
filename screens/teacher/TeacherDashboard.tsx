
import React from 'react';
import { User, Activity, ParticipationRecord, AcademicYear } from '../../types';
import { MyReportView } from './MyReportView';

interface TeacherDashboardProps {
  currentUser: User;
  data: {
    activities: Activity[];
    participationRecords: ParticipationRecord[];
    academicYears: AcademicYear[];
  }
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ currentUser, data }) => {
  return (
    <div className="space-y-6">
      <MyReportView currentUser={currentUser} data={data} />
    </div>
  );
};
