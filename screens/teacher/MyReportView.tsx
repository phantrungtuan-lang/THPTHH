import React, { useState, useMemo } from 'react';
import { Card } from '../../components/Card';
import { ParticipationBadge } from '../../components/ParticipationBadge';
import { User, Activity, ParticipationRecord, AcademicYear } from '../../types';

interface MyReportViewProps {
  currentUser: User;
  data: {
    activities: Activity[];
    participationRecords: ParticipationRecord[];
    academicYears: AcademicYear[];
  };
}

export const MyReportView: React.FC<MyReportViewProps> = ({ currentUser, data }) => {
    const [selectedYearId, setSelectedYearId] = useState<string>('all');
    
    const myParticipationHistory = useMemo(() => {
        const myRecords = data.participationRecords.filter(p => p.usersId === currentUser.usersId);
        const activitiesMap = new Map(data.activities.map(a => [a.activitiesId, a]));

        return myRecords
            .map(record => {
                const activity = activitiesMap.get(record.activitiesId);
                if (!activity) return null;
                return { ...record, activity };
            })
            .filter((record): record is ParticipationRecord & { activity: Activity } => record !== null)
            .filter(record => selectedYearId === 'all' || record.activity.academicYearsId === selectedYearId)
            .sort((a, b) => new Date(b.activity.date).getTime() - new Date(a.activity.date).getTime());

    }, [currentUser.usersId, data.participationRecords, data.activities, selectedYearId]);

    return (
        <Card title="Lịch sử tham gia hoạt động của tôi">
            <div className="mb-6">
                <label htmlFor="year-filter-teacher" className="block text-sm font-medium text-gray-700">Lọc theo năm học</label>
                <select
                    id="year-filter-teacher"
                    value={selectedYearId}
                    onChange={(e) => setSelectedYearId(e.target.value)}
                    className="mt-1 block w-full md:w-1/2 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                    <option value="all">Tất cả năm học</option>
                    {data.academicYears.map(year => (
                        <option key={year.academicYearsId} value={year.academicYearsId}>{year.name}</option>
                    ))}
                </select>
            </div>

            <div className="space-y-3">
                {myParticipationHistory.length > 0 ? (
                    myParticipationHistory.map(record => (
                        <div key={record.participationRecordsId} className="flex justify-between items-center p-4 bg-white shadow rounded-lg border border-gray-200">
                           <div>
                             <p className="font-semibold text-gray-800">{record.activity.name}</p>
                             <p className="text-sm text-gray-500">{new Date(record.activity.date).toLocaleDateString('vi-VN')}</p>
                           </div>
                           <ParticipationBadge status={record.status} />
                        </div>
                    ))
                ) : (
                    <p className="text-center text-gray-500 py-4">Không có dữ liệu tham gia nào.</p>
                )}
            </div>
        </Card>
    );
};
