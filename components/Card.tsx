
import React, { ReactNode } from 'react';

interface CardProps {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}

export const Card: React.FC<CardProps> = ({ title, children, actions }) => {
  return (
    <div className="bg-white shadow-lg rounded-xl overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
        {actions && <div className="flex-shrink-0">{actions}</div>}
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};
