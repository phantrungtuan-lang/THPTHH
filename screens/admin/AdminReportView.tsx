import React, { useState, useMemo } from 'react';
import { Card } from '../../components/Card';
import { User, AcademicYear, Group, Teacher, Activity, ParticipationRecord, ParticipationStatus } from '../../types';

interface AdminReportViewProps {
  data: {
    users: User[];
    academicYears: AcademicYear[];
    groups: Group[];
    teachers: Teacher[];
    activities: Activity[];
    participationRecords: ParticipationRecord[];
  };
}

export const AdminReportView: React.FC<AdminReportViewProps> = ({ data }) => {
    const [selectedYearId, setSelectedYearId] = useState<string>('all');
    const [selectedGroupId, setSelectedGroupId] = useState<string>('all');

    const filteredTeachers = useMemo(() => {
        if (selectedGroupId === 'all') {
            return data.teachers;
        }
        return data.teachers.filter(t => t.groupsId === selectedGroupId);
    }, [data.teachers, selectedGroupId]);

    const filteredActivities = useMemo(() => {
        if (selectedYearId === 'all') {
            return data.activities;
        }
        return data.activities.filter(a => a.academicYearsId === selectedYearId);
    }, [data.activities, selectedYearId]);

    const participationStats = useMemo(() => {
        const stats: Record<string, Record<ParticipationStatus, number> & { name: string, totalActivities: number, participated: number }> = {};
        const activityIds = new Set(filteredActivities.map(a => a.activitiesId));

        for (const teacher of filteredTeachers) {
            stats[teacher.usersId] = {
                name: teacher.name,
                totalActivities: activityIds.size,
                [ParticipationStatus.ORGANIZER]: 0,
                [ParticipationStatus.PARTICIPATED]: 0,
                [ParticipationStatus.LATE]: 0,
                [ParticipationStatus.LEFT_EARLY]: 0,
                [ParticipationStatus.ABSENT]: 0,
                participated: 0,
            };
        }
        
        for (const record of data.participationRecords) {
            if (stats[record.usersId] && activityIds.has(record.activitiesId)) {
                if(record.status in stats[record.usersId]) {
                    stats[record.usersId][record.status]++;
                }
                if (record.status === ParticipationStatus.PARTICIPATED || record.status === ParticipationStatus.LATE || record.status === ParticipationStatus.LEFT_EARLY) {
                    stats[record.usersId].participated++;
                }
            }
        }
        return Object.values(stats);

    }, [data.participationRecords, filteredTeachers, filteredActivities]);

    return (
        <Card title="Báo cáo tham gia hoạt động">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                    <label htmlFor="year-filter" className="block text-sm font-medium text-gray-700">Lọc theo năm học</label>
                    <select
                        id="year-filter"
                        value={selectedYearId}
                        onChange={(e) => setSelectedYearId(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                        <option value="all">Tất cả năm học</option>
                        {data.academicYears.map(year => (
                            <option key={year.academicYearsId} value={year.academicYearsId}>{year.name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex-1">
                    <label htmlFor="group-filter" className="block text-sm font-medium text-gray-700">Lọc theo tổ chuyên môn</label>
                    <select
                        id="group-filter"
                        value={selectedGroupId}
                        onChange={(e) => setSelectedGroupId(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                        <option value="all">Tất cả các tổ</option>
                        {data.groups.map(group => (
                            <option key={group.groupsId} value={group.groupsId}>{group.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giáo viên</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Có tham gia</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đến trễ</th>
                             <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Về sớm</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vắng</th>
                             <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng số buổi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {participationStats.map(stat => (
                            <tr key={stat.name}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{stat.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stat.participated}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stat[ParticipationStatus.LATE]}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stat[ParticipationStatus.LEFT_EARLY]}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stat[ParticipationStatus.ABSENT]}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stat.totalActivities}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};
