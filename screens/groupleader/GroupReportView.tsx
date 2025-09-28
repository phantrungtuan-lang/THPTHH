import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '../../components/Card';
import { User, Activity, ParticipationStatus, Teacher, AcademicYear, ParticipationRecord } from '../../types';
import { ParticipationBadge } from '../../components/ParticipationBadge';

interface GroupReportViewProps {
  currentUser: User;
   data: {
    activities: Activity[];
    teachers: Teacher[];
    participationRecords: ParticipationRecord[];
    academicYears: AcademicYear[];
  };
  initialActivityId?: string | null;
  resetInitialActivityId?: () => void;
}

export const GroupReportView: React.FC<GroupReportViewProps> = ({ currentUser, data, initialActivityId, resetInitialActivityId }) => {
  const { activities, teachers, participationRecords, academicYears } = data;
  const [selectedYear, setSelectedYear] = useState<string>(academicYears.length > 0 ? academicYears[0].id : '');
  const [selectedActivity, setSelectedActivity] = useState<string>('all');
  
  const groupTeachers = useMemo(() => {
    return teachers.filter(t => t.groupId === currentUser.groupId);
  }, [currentUser.groupId, teachers]);

  const filteredActivities = useMemo(() => {
    return activities.filter(a => a.academicYearId === selectedYear);
  }, [selectedYear, activities]);

  useEffect(() => {
    if (initialActivityId && activities.length > 0) {
      const activityToSelect = activities.find(a => a.id === initialActivityId);
      if (activityToSelect) {
        setSelectedYear(activityToSelect.academicYearId);
        setSelectedActivity(activityToSelect.id);
      }
      if (resetInitialActivityId) {
        resetInitialActivityId();
      }
    }
  }, [initialActivityId, activities, resetInitialActivityId]);

  const reportData = useMemo(() => {
    const groupTeacherIds = new Set(groupTeachers.map(t => t.id));
    
    if (selectedActivity === 'all') {
        const summary: Record<string, Record<ParticipationStatus, number> & { name: string }> = {};
        groupTeachers.forEach(teacher => {
            summary[teacher.id] = {
                name: teacher.name,
                [ParticipationStatus.ORGANIZER]: 0,
                [ParticipationStatus.PARTICIPATED]: 0,
                [ParticipationStatus.LATE]: 0,
                [ParticipationStatus.LEFT_EARLY]: 0,
                [ParticipationStatus.ABSENT]: 0,
            };
        });

        participationRecords
            .filter(pr => groupTeacherIds.has(pr.teacherId) && filteredActivities.some(act => act.id === pr.activityId))
            .forEach(pr => {
                if (summary[pr.teacherId]) {
                    summary[pr.teacherId][pr.status]++;
                }
            });
        
        return Object.values(summary);
    } else {
        return participationRecords
            .filter(pr => groupTeacherIds.has(pr.teacherId) && pr.activityId === selectedActivity)
            .map(pr => ({
                teacherName: groupTeachers.find(t => t.id === pr.teacherId)?.name || 'Unknown',
                status: pr.status,
            }));
    }
  }, [selectedActivity, filteredActivities, groupTeachers, participationRecords]);

  return (
    <Card title="Thống kê tình hình tham gia hoạt động của tổ">
      <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div>
          <label htmlFor="year-select-group" className="block text-sm font-medium text-gray-700 mb-1">Năm học</label>
          <select id="year-select-group" value={selectedYear} onChange={e => {setSelectedYear(e.target.value); setSelectedActivity('all');}} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
            {academicYears.map(year => <option key={year.id} value={year.id}>{year.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="activity-select-group" className="block text-sm font-medium text-gray-700 mb-1">Hoạt động</label>
          <select id="activity-select-group" value={selectedActivity} onChange={e => setSelectedActivity(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
            <option value="all">Thống kê cả năm</option>
            {filteredActivities.map(act => <option key={act.id} value={act.id}>{act.name}</option>)}
          </select>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                {selectedActivity === 'all' ? (
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giáo viên</th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Tổ chức</th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Tham gia</th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Đi muộn</th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Vắng giữa buổi</th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Vắng cả buổi</th>
                    </tr>
                ) : (
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giáo viên</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                    </tr>
                )}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {reportData.length === 0 && (
                    <tr><td colSpan={selectedActivity === 'all' ? 6 : 2} className="text-center py-10 text-gray-500">Không có dữ liệu.</td></tr>
                )}
                {selectedActivity === 'all' ? (
                    (reportData as any[]).map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{row[ParticipationStatus.ORGANIZER]}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{row[ParticipationStatus.PARTICIPATED]}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{row[ParticipationStatus.LATE]}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{row[ParticipationStatus.LEFT_EARLY]}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{row[ParticipationStatus.ABSENT]}</td>
                        </tr>
                    ))
                ) : (
                    (reportData as any[]).map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.teacherName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><ParticipationBadge status={row.status} /></td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>
      </div>
    </Card>
  );
};