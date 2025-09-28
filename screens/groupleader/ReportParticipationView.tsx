import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '../../components/Card';
import { User, Activity, Teacher, ParticipationStatus, ParticipationRecord } from '../../types';

interface ReportParticipationViewProps {
  currentUser: User;
  data: {
    activities: Activity[];
    teachers: Teacher[];
    participationRecords: ParticipationRecord[];
  };
  handlers: {
    participationRecordHandlers: any;
  }
  onReportSaved: (activityId: string) => void;
}

type StatusMap = Record<string, ParticipationStatus>;

export const ReportParticipationView: React.FC<ReportParticipationViewProps> = ({ currentUser, data, handlers, onReportSaved }) => {
  const { activities, teachers, participationRecords } = data;
  const [selectedActivityId, setSelectedActivityId] = useState<string>(activities.length > 0 ? activities[0].id : '');
  const [isSaving, setIsSaving] = useState(false);
  
  const groupTeachers = useMemo(() => {
    return teachers.filter(t => t.groupId === currentUser.groupId);
  }, [currentUser.groupId, teachers]);

  const [statuses, setStatuses] = useState<StatusMap>({});

  useEffect(() => {
    if (selectedActivityId) {
        const initialStatuses: StatusMap = {};
        const existingRecords = participationRecords.filter(pr => pr.activityId === selectedActivityId);

        groupTeachers.forEach(teacher => {
            const record = existingRecords.find(pr => pr.teacherId === teacher.id);
            initialStatuses[teacher.id] = record ? record.status : ParticipationStatus.PARTICIPATED;
        });
        setStatuses(initialStatuses);
    }
  }, [selectedActivityId, groupTeachers, participationRecords]);

  const handleStatusChange = (teacherId: string, status: ParticipationStatus) => {
    setStatuses(prev => ({...prev, [teacherId]: status}));
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    
    const newRecords: ParticipationRecord[] = Object.entries(statuses).map(([teacherId, status]) => ({
        id: `pr-${teacherId}-${selectedActivityId}-${Math.random()}`,
        teacherId,
        activityId: selectedActivityId,
        status,
    }));
    
    try {
        await handlers.participationRecordHandlers.updateBatch(selectedActivityId, newRecords);
        alert('Đã cập nhật báo cáo thành công!');
        onReportSaved(selectedActivityId);
    } catch (error) {
        console.error("Failed to save participation records:", error);
        alert("Có lỗi xảy ra khi lưu báo cáo.");
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Card title="Báo cáo tình hình tham gia hoạt động của tổ">
      <div className="mb-6">
        <label htmlFor="activity-select-leader" className="block text-sm font-medium text-gray-700 mb-1">Chọn hoạt động</label>
        <select id="activity-select-leader" value={selectedActivityId} onChange={e => setSelectedActivityId(e.target.value)} className="mt-1 block w-full md:w-1/2 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
          {activities.map(act => (
            <option key={act.id} value={act.id}>{act.name} - {new Date(act.date).toLocaleDateString('vi-VN')}</option>
          ))}
        </select>
      </div>
      
      <div className="space-y-4">
        {groupTeachers.map(teacher => (
            <div key={teacher.id} className="grid grid-cols-1 md:grid-cols-2 items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-800">{teacher.name}</p>
                <select 
                    value={statuses[teacher.id] || ''}
                    onChange={e => handleStatusChange(teacher.id, e.target.value as ParticipationStatus)}
                    className="w-full mt-1 md:mt-0 block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                    {Object.values(ParticipationStatus).map(status => (
                        <option key={status} value={status}>{status}</option>
                    ))}
                </select>
            </div>
        ))}
      </div>

      <div className="mt-6 text-right">
        <button 
          onClick={handleSave}
          className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
          disabled={!selectedActivityId || groupTeachers.length === 0 || isSaving}
        >
          {isSaving ? 'Đang lưu...' : 'Lưu báo cáo'}
        </button>
      </div>
    </Card>
  );
};
