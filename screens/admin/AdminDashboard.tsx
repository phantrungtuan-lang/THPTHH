import React, { useState } from 'react';
import { User, AcademicYear, Group, Teacher, Activity, ParticipationRecord } from '../../types';
import { ClipboardListIcon, ChartBarIcon } from '../../components/icons';
import { ManagementView } from './ManagementView';
import { AdminReportView } from './AdminReportView';

interface AdminDashboardProps {
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
    requestPasswordReset: (user: User) => void;
  };
}

type AdminTab = 'management' | 'reports';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, data, handlers }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('management');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');

  const renderContent = () => {
    switch (activeTab) {
      case 'management':
        return <ManagementView 
                  currentUser={currentUser} 
                  data={data} 
                  handlers={handlers} 
                  selectedGroupId={selectedGroupId}
                  onGroupFilterChange={setSelectedGroupId}
               />;
      case 'reports':
        return <AdminReportView data={data} />;
      default:
        return null;
    }
  };

  const TabButton: React.FC<{tab: AdminTab, icon: React.ReactNode, label: string}> = ({tab, icon, label}) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
        activeTab === tab 
        ? 'bg-indigo-600 text-white shadow-md' 
        : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
      }`}
    >
      {icon}
      <span className="ml-3">{label}</span>
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex space-x-2">
            <TabButton tab="management" icon={<ClipboardListIcon className="w-5 h-5"/>} label="Quản lý chung"/>
            <TabButton tab="reports" icon={<ChartBarIcon className="w-5 h-5"/>} label="Báo cáo & Thống kê"/>
        </div>
      </div>
      <div>{renderContent()}</div>
    </div>
  );
};