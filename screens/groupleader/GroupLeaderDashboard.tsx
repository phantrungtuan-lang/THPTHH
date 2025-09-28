import React, { useState } from 'react';
import { User, Activity, AcademicYear, Group, ParticipationRecord, Teacher } from '../../types';
import { ChartBarIcon, ClipboardListIcon } from '../../components/icons';
import { ReportParticipationView } from './ReportParticipationView';
import { GroupReportView } from './GroupReportView';

interface GroupLeaderDashboardProps {
  currentUser: User;
  data: {
    activities: Activity[];
    teachers: Teacher[];
    participationRecords: ParticipationRecord[];
    academicYears: AcademicYear[];
  };
  handlers: {
    participationRecordHandlers: any;
  }
}

type GroupLeaderTab = 'report' | 'stats';

export const GroupLeaderDashboard: React.FC<GroupLeaderDashboardProps> = ({ currentUser, data, handlers }) => {
  const [activeTab, setActiveTab] = useState<GroupLeaderTab>('report');
  const [initialActivityId, setInitialActivityId] = useState<string | null>(null);

  const handleReportSaved = (activityId: string) => {
    setInitialActivityId(activityId);
    setActiveTab('stats');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'report':
        return <ReportParticipationView currentUser={currentUser} data={data} handlers={handlers} onReportSaved={handleReportSaved} />;
      case 'stats':
        return <GroupReportView currentUser={currentUser} data={data} initialActivityId={initialActivityId} resetInitialActivityId={() => setInitialActivityId(null)} />;
      default:
        return null;
    }
  };
  
    const TabButton: React.FC<{tab: GroupLeaderTab, icon: React.ReactNode, label: string}> = ({tab, icon, label}) => (
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
            <TabButton tab="report" icon={<ClipboardListIcon className="w-5 h-5"/>} label="Báo cáo điểm danh"/>
            <TabButton tab="stats" icon={<ChartBarIcon className="w-5 h-5"/>} label="Thống kê của tổ"/>
        </div>
      </div>
      <div>{renderContent()}</div>
    </div>
  );
};
