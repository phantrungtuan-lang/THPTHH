import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '../../components/Card';
import { ParticipationBadge } from '../../components/ParticipationBadge';
import { User, Activity, Teacher, ParticipationRecord, AcademicYear, ParticipationStatus } from '../../types';

interface ReportParticipationViewProps {
  currentUser: User;
  data: {
    activities: Activity[];
    teachers: Teacher[];
    participationRecords: ParticipationRecord[];
    academicYears: AcademicYear[];
  };
  handlers: {
    participationRecordHandlers: any;
  };
  onReportSaved: (activityId: string) => void;
}

type ParticipationState = Record<string, ParticipationStatus>;

export const ReportParticipationView: React.FC<ReportParticipationViewProps> = ({ currentUser, data, handlers, onReportSaved }) => {
    const [selectedActivityId, setSelectedActivityId] = useState<string>('');
    const [participation, setParticipation] = useState<ParticipationState>({});
    const [isSaving, setIsSaving] = useState(false);

    const groupTeachers = useMemo(() => {
        return data.teachers.filter(t => t.groupsId === currentUser.groupsId);
    }, [data.teachers, currentUser.groupsId]);

    useEffect(() => {
        if (selectedActivityId) {
            const initialParticipation: ParticipationState = {};
            for (const teacher of groupTeachers) {
                const existingRecord = data.participationRecords.find(
                    p => p.activitiesId === selectedActivityId && p.usersId === teacher.usersId
                );
                initialParticipation[teacher.usersId] = existingRecord?.status || ParticipationStatus.PARTICIPATED;
            }
            setParticipation(initialParticipation);
        } else {
            setParticipation({});
        }
    }, [selectedActivityId, data.participationRecords, groupTeachers]);

    const handleStatusChange = (teacherId: string, status: ParticipationStatus) => {
        setParticipation(prev => ({ ...prev, [teacherId]: status }));
    };

    const handleSubmit = async () => {
        if (!selectedActivityId) {
            alert('Vui lòng chọn một hoạt động.');
            return;
        }
        setIsSaving(true);
        try {
            const newRecords = Object.entries(participation).map(([usersId, status]) => ({
                usersId,
                activitiesId: selectedActivityId,
                status,
            }));
            
            await handlers.participationRecordHandlers.updateBatch(selectedActivityId, newRecords);
            alert('Báo cáo đã được lưu thành công!');
            onReportSaved(selectedActivityId);
        } catch (error) {
            console.error('Failed to save participation report:', error);
            alert('Đã có lỗi xảy ra khi lưu báo cáo.');
        } finally {
            setIsSaving(false);
        }
    };
    
    const sortedActivities = useMemo(() => {
        return [...data.activities].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [data.activities]);

    return (
        <Card title="Điểm danh tham gia hoạt động">
            <div className="mb-6">
                <label htmlFor="activity-select" className="block text-sm font-medium text-gray-700">Chọn hoạt động</label>
                <select
                    id="activity-select"
                    value={selectedActivityId}
                    onChange={(e) => setSelectedActivityId(e.target.value)}
                    className="mt-1 block w-full md:w-1/2 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                    <option value="">-- Chọn hoạt động --</option>
                    {sortedActivities.map(activity => (
                        <option key={activity.activitiesId} value={activity.activitiesId}>
                            {activity.name} - {new Date(activity.date).toLocaleDateString('vi-VN')}
                        </option>
                    ))}
                </select>
            </div>

            {selectedActivityId && (
                <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">Danh sách giáo viên trong tổ</h4>
                    <div className="space-y-4">
                        {groupTeachers.map(teacher => (
                            <div key={teacher.usersId} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 rounded-lg">
                                <p className="font-medium text-gray-900">{teacher.name}</p>
                                <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                                    {Object.values(ParticipationStatus).filter(s => s !== ParticipationStatus.ORGANIZER).map(status => (
                                        <button
                                            key={status}
                                            onClick={() => handleStatusChange(teacher.usersId, status)}
                                            className={`px-3 py-1 text-xs font-medium rounded-full transition-transform transform hover:scale-105 ${
                                                participation[teacher.usersId] === status
                                                    ? 'ring-2 ring-offset-1 ring-indigo-500'
                                                    : 'opacity-60 hover:opacity-100'
                                            }`}
                                        >
                                           <ParticipationBadge status={status} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-8 flex justify-end">
                        <button 
                            onClick={handleSubmit}
                            disabled={isSaving}
                            className="px-6 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-indigo-300"
                        >
                            {isSaving ? 'Đang lưu...' : 'Lưu báo cáo'}
                        </button>
                    </div>
                </div>
            )}
        </Card>
    );
};
