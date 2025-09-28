
import React from 'react';
import { ParticipationStatus } from '../types';

interface ParticipationBadgeProps {
  status: ParticipationStatus;
}

export const ParticipationBadge: React.FC<ParticipationBadgeProps> = ({ status }) => {
  const statusStyles: Record<ParticipationStatus, string> = {
    [ParticipationStatus.ORGANIZER]: 'bg-purple-100 text-purple-800',
    [ParticipationStatus.PARTICIPATED]: 'bg-green-100 text-green-800',
    [ParticipationStatus.LATE]: 'bg-yellow-100 text-yellow-800',
    [ParticipationStatus.LEFT_EARLY]: 'bg-orange-100 text-orange-800',
    [ParticipationStatus.ABSENT]: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusStyles[status]}`}>
      {status}
    </span>
  );
};
