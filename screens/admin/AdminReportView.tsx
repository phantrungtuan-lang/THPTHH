
import React, { useState, useMemo } from 'react';
import { Card } from '../../components/Card';
import { ParticipationBadge } from '../../components/ParticipationBadge';
import { Activity, ParticipationStatus, Teacher, AcademicYear, Group, ParticipationRecord, User } from '../../types';

interface AdminReportViewProps {
  data: {
    academicYears: AcademicYear[];
    activities: Activity[];
    teachers: Teacher[];
    participationRecords: ParticipationRecord[];
    groups: Group[];
  };
}

export const AdminReportView: React.FC<AdminReportViewProps> = ({ data }) => {
  const { academicYears, activities, teachers, participationRecords, groups } = data;
  const [selectedYear, setSelectedYear] = useState<string>(academicYears.length > 0 ? academicYears[0].id : '');
  const [selectedActivity, setSelectedActivity] = useState<string>('all');

  const filteredActivities = useMemo(() => {
    return activities.filter(a => a.academicYearId === selectedYear);
  }, [selectedYear, activities]);

  const reportData = useMemo(() => {
    if (selectedActivity === 'all') {
        const summary: Record<string, Record<ParticipationStatus, number> & { name: string, group: string }> = {};
        teachers.forEach(teacher => {
            summary[teacher.id] = {
                name: teacher.name,
                group: groups.find(g => g.id === teacher.groupId)?.name || 'N/A',
                [ParticipationStatus.ORGANIZER]: 0,
                [ParticipationStatus.PARTICIPATED]: 0,
                [ParticipationStatus.LATE]: 0,
                [ParticipationStatus.LEFT_EARLY]: 0,
                [ParticipationStatus.ABSENT]: 0,
            };
        });

        participationRecords
            .filter(pr => filteredActivities.some(act => act.id === pr.activityId))
            .forEach(pr => {
                if (summary[pr.teacherId]) {
                    summary[pr.teacherId][pr.status]++;
                }
            });
        
        const summaryList = Object.values(summary);
        summaryList.sort((a, b) => {
            if (a.group < b.group) return -1;
            if (a.group > b.group) return 1;
            if (a.name < b.name) return -1;
            if (a.name > b.name) return 1;
            return 0;
        });
        return summaryList;
    } else {
        const singleActivityData = participationRecords
            .filter(pr => pr.activityId === selectedActivity)
            .map(pr => {
                const teacher = teachers.find(t => t.id === pr.teacherId);
                const group = groups.find(g => g.id === teacher?.groupId);
                return {
                    teacherName: teacher?.name || 'Unknown',
                    groupName: group?.name || 'Unknown',
                    status: pr.status,
                };
            });
        
        singleActivityData.sort((a, b) => {
            if (a.groupName < b.groupName) return -1;
            if (a.groupName > b.groupName) return 1;
            if (a.teacherName < b.teacherName) return -1;
            if (a.teacherName > b.teacherName) return 1;
            return 0;
        });

        return singleActivityData;
    }
  }, [selectedActivity, filteredActivities, teachers, groups, participationRecords]);

  return (
    <Card title="Báo cáo tình hình tham gia hoạt động">
      <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div>
          <label htmlFor="year-select" className="block text-sm font-medium text-gray-700 mb-1">Năm học</label>
          <select id="year-select" value={selectedYear} onChange={e => {setSelectedYear(e.target.value); setSelectedActivity('all');}} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
            {academicYears.map(year => <option key={year.id} value={year.id}>{year.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="activity-select" className="block text-sm font-medium text-gray-700 mb-1">Hoạt động</label>
          <select id="activity-select" value={selectedActivity} onChange={e => setSelectedActivity(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
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
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổ chuyên môn</th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Tổ chức</th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Tham gia</th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Đi muộn</th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Vắng giữa buổi</th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Vắng cả buổi</th>
                    </tr>
                ) : (
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giáo viên</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổ chuyên môn</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                    </tr>
                )}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {selectedActivity === 'all' ? (
                    (reportData as any[]).map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.group}</td>
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
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.groupName}</td>
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
