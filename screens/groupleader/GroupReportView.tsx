import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '../../components/Card';
import { ParticipationBadge } from '../../components/ParticipationBadge';
import { User, Activity, Teacher, ParticipationRecord, AcademicYear, ParticipationStatus } from '../../types';

interface GroupReportViewProps {
  currentUser: User;
  data: {
    activities: Activity[];
    teachers: Teacher[];
    participationRecords: ParticipationRecord[];
    academicYears: AcademicYear[];
  };
  initialActivityId: string | null;
  resetInitialActivityId: () => void;
}

export const GroupReportView: React.FC<GroupReportViewProps> = ({ currentUser, data, initialActivityId, resetInitialActivityId }) => {
    const [selectedActivityId, setSelectedActivityId] = useState<string>('all');
    
    useEffect(() => {
        if(initialActivityId) {
            setSelectedActivityId(initialActivityId);
            resetInitialActivityId();
        }
    }, [initialActivityId, resetInitialActivityId]);

    const groupTeachers = useMemo(() => {
        return data.teachers.filter(t => t.groupsId === currentUser.groupsId);
    }, [data.teachers, currentUser.groupsId]);

    const participationDetails = useMemo(() => {
        if (selectedActivityId === 'all') return [];

        return groupTeachers.map(teacher => {
            const record = data.participationRecords.find(
                p => p.activitiesId === selectedActivityId && p.usersId === teacher.usersId
            );
            return {
                teacherName: teacher.name,
                status: record?.status || ParticipationStatus.ABSENT, // Default to absent if no record
            };
        });
    }, [selectedActivityId, groupTeachers, data.participationRecords]);

    const sortedActivities = useMemo(() => {
        return [...data.activities].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [data.activities]);

    return (
        <Card title="Thống kê tham gia của tổ">
            <div className="mb-6">
                <label htmlFor="activity-select-stats" className="block text-sm font-medium text-gray-700">Xem theo hoạt động</label>
                <select
                    id="activity-select-stats"
                    value={selectedActivityId}
                    onChange={(e) => setSelectedActivityId(e.target.value)}
                    className="mt-1 block w-full md:w-1/2 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                    <option value="all">-- Chọn hoạt động để xem chi tiết --</option>
                     {sortedActivities.map(activity => (
                        <option key={activity.activitiesId} value={activity.activitiesId}>
                            {activity.name} - {new Date(activity.date).toLocaleDateString('vi-VN')}
                        </option>
                    ))}
                </select>
            </div>

            {selectedActivityId !== 'all' && (
                <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">Chi tiết điểm danh</h4>
                    <div className="space-y-2">
                        {participationDetails.map(detail => (
                            <div key={detail.teacherName} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <p className="font-medium text-gray-900">{detail.teacherName}</p>
                                <ParticipationBadge status={detail.status} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Card>
    );
};
