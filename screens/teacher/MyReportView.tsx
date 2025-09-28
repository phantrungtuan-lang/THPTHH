
import React, { useMemo } from 'react';
import { Card } from '../../components/Card';
import { User, Activity, ParticipationRecord, AcademicYear } from '../../types';
import { ParticipationBadge } from '../../components/ParticipationBadge';

interface MyReportViewProps {
  currentUser: User;
  data: {
    activities: Activity[];
    participationRecords: ParticipationRecord[];
    academicYears: AcademicYear[];
  }
}

export const MyReportView: React.FC<MyReportViewProps> = ({ currentUser, data }) => {
  const { activities, participationRecords, academicYears } = data;
  
  const myParticipation = useMemo(() => {
    return participationRecords
      .filter(pr => pr.teacherId === currentUser.id)
      .map(pr => {
        const activity = activities.find(a => a.id === pr.activityId);
        const academicYear = academicYears.find(ay => ay.id === activity?.academicYearId);
        return {
          ...pr,
          activityName: activity?.name || 'Unknown Activity',
          activityDateRaw: activity?.date,
          activityDate: activity ? new Date(activity.date).toLocaleDateString('vi-VN') : 'N/A',
          academicYearName: academicYear?.name || 'N/A',
        };
      })
      .sort((a, b) => {
        const dateA = a.activityDateRaw ? new Date(a.activityDateRaw).getTime() : 0;
        const dateB = b.activityDateRaw ? new Date(b.activityDateRaw).getTime() : 0;
        return dateB - dateA;
      });
  }, [currentUser.id, participationRecords, activities, academicYears]);

  return (
    <Card title={`Báo cáo tham gia hoạt động của ${currentUser.name}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Năm học</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hoạt động</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {myParticipation.length > 0 ? myParticipation.map(record => (
                    <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.academicYearName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{record.activityName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.activityDate}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm"><ParticipationBadge status={record.status} /></td>
                    </tr>
                )) : (
                    <tr>
                        <td colSpan={4} className="text-center py-10 text-gray-500">Chưa có dữ liệu tham gia.</td>
                    </tr>
                )}
            </tbody>
        </table>
      </div>
    </Card>
  );
};
