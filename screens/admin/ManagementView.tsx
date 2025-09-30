import React, { useState, useMemo } from 'react';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { PlusIcon, PencilIcon, TrashIcon, KeyIcon } from '../../components/icons';
import { User, Group, Teacher, AcademicYear, Activity, UserRole } from '../../types';

interface ManagementViewProps {
  currentUser: User;
  data: {
    users: User[];
    academicYears: AcademicYear[];
    groups: Group[];
    teachers: Teacher[];
    activities: Activity[];
  };
  handlers: {
    userHandlers: any;
    academicYearHandlers: any;
    groupHandlers: any;
    teacherHandlers: any;
    activityHandlers: any;
    requestPasswordReset: (user: User) => void;
  };
  selectedGroupId: string;
  onGroupFilterChange: (groupId: string) => void;
}

type ModalState = {
    type: 'user' | 'group' | 'teacher' | 'year' | 'activity' | null;
    mode: 'add' | 'edit';
    data?: any;
}

export const ManagementView: React.FC<ManagementViewProps> = ({ currentUser, data, handlers, selectedGroupId, onGroupFilterChange }) => {
    const [modal, setModal] = useState<ModalState | null>(null);
    const [formData, setFormData] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);

    const openModal = (type: ModalState['type'], mode: ModalState['mode'], data?: any) => {
        setModal({ type, mode, data });
        setFormData(data || { role: UserRole.TEACHER }); // Default role to Teacher when adding a user
    };
    const closeModal = () => {
        setModal(null);
        setFormData({});
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!modal || !modal.type || isSaving) return;

        setIsSaving(true);

        let handler;

        switch (modal.type) {
            case "user": handler = handlers.userHandlers; break;
            case "group": handler = handlers.groupHandlers; break;
            case "teacher": handler = handlers.teacherHandlers; break;
            case "year": handler = handlers.academicYearHandlers; break;
            case "activity": handler = handlers.activityHandlers; break;
            default:
                console.error("Unknown modal type:", modal.type);
                setIsSaving(false);
                return;
        }

        try {
            const payload = { ...formData };
            
            // For edit mode, if password is empty string, do not send it for update
            if (modal.mode === 'edit' && 'password' in payload && payload.password === '') {
                delete payload.password;
            }

            if (modal.mode === "add") {
                await handler.add(payload);
            } else {
                await handler.update(payload);
            }
        } catch (error) {
            console.error("Failed to save data:", error);
            alert("Đã có lỗi xảy ra khi lưu dữ liệu.");
        } finally {
            setIsSaving(false);
            closeModal();
        }
    };

    const filteredTeachers = useMemo(() => {
        if (!selectedGroupId || selectedGroupId === 'all') {
            return data.teachers;
        }
        return data.teachers.filter(teacher => teacher.groupId === selectedGroupId);
    }, [data.teachers, selectedGroupId]);
    
    const renderFormFields = () => {
        if (!modal) return null;
        switch (modal.type) {
            case 'user':
                return <>
                    <InputField name="name" label="Tên người dùng" value={formData.name || ''} onChange={handleFormChange} required/>
                    <InputField name="email" label="Email đăng nhập" type="email" value={formData.email || ''} onChange={handleFormChange} required/>
                    <InputField name="password" label="Mật khẩu" type="password" value={formData.password || ''} onChange={handleFormChange} placeholder={modal?.mode === 'edit' ? "Để trống nếu không đổi" : ""} required={modal?.mode === 'add'}/>
                    <SelectField name="role" label="Vai trò" value={formData.role || ''} onChange={handleFormChange} options={Object.values(UserRole).map(r => ({value: r, label: r}))} required/>
                    {(formData.role === UserRole.TEACHER || formData.role === UserRole.GROUP_LEADER) &&
                      <SelectField name="groupId" label="Tổ chuyên môn" value={formData.groupId || ''} onChange={handleFormChange} options={data.groups.map(g => ({value: g.id, label: g.name}))}/>
                    }
                </>;
            case 'group':
                 return <>
                    <InputField name="name" label="Tên tổ" value={formData.name || ''} onChange={handleFormChange} required/>
                    <SelectField name="leaderId" label="Tổ trưởng" value={formData.leaderId || ''} onChange={handleFormChange} options={data.users.filter(u => u.role === UserRole.TEACHER || u.role === UserRole.GROUP_LEADER).map(t => ({value: t.id, label: t.name}))}/>
                 </>;
            // "teacher" form is handled by "user" form now.
            case 'teacher': 
                 return <p>Vui lòng chỉnh sửa thông tin giáo viên thông qua mục 'Tài khoản'.</p>
            case 'year':
                return <InputField name="name" label="Tên năm học (VD: 2024-2025)" value={formData.name || ''} onChange={handleFormChange} required/>;
            case 'activity':
                 return <>
                    <InputField name="name" label="Tên hoạt động" value={formData.name || ''} onChange={handleFormChange} required/>
                    <InputField name="date" label="Ngày" type="date" value={formData.date || ''} onChange={handleFormChange} required/>
                    <SelectField name="academicYearId" label="Năm học" value={formData.academicYearId || ''} onChange={handleFormChange} options={data.academicYears.map(y => ({value: y.id, label: y.name}))} required/>
                 </>;
            default: return null;
        }
    };

    const renderModalContent = () => {
        if (!modal) return null;
        const title = `${modal.mode === 'add' ? 'Thêm mới' : 'Chỉnh sửa'} ${
            {user: 'tài khoản', group: 'tổ chuyên môn', teacher: 'giáo viên', year: 'năm học', activity: 'hoạt động'}[modal.type!]
        }`;
        return (
            <Modal isOpen={!!modal} onClose={closeModal} title={title}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {renderFormFields()}
                    <div className="flex justify-end pt-4">
                        <button type="submit" className="px-6 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-indigo-300" disabled={isSaving}>
                            {isSaving ? 'Đang lưu...' : 'Lưu'}
                        </button>
                    </div>
                </form>
            </Modal>
        );
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderModalContent()}
            <ManagementCard title="Tài khoản" onAdd={() => openModal('user', 'add')}>
                {data.users.map(user => {
                    const isCurrentUser = user.id === currentUser.id;
                    return (
                        <ItemRow 
                            key={user.id} 
                            name={`${user.name} (${user.role})`} 
                            onEdit={() => openModal('user', 'edit', user)} 
                            onDelete={!isCurrentUser ? () => handlers.userHandlers.remove(user.id) : undefined}
                            onResetPassword={!isCurrentUser ? () => handlers.requestPasswordReset(user) : undefined}
                        />
                    );
                })}
            </ManagementCard>
            <ManagementCard title="Tổ chuyên môn" onAdd={() => openModal('group', 'add')}>
                {data.groups.map(group => <ItemRow key={group.id} name={group.name} onEdit={() => openModal('group', 'edit', group)} onDelete={() => handlers.groupHandlers.remove(group.id)}/>)}
            </ManagementCard>
             <ManagementCard title="Giáo viên" onAdd={() => alert("Vui lòng thêm giáo viên thông qua mục 'Tài khoản' để đảm bảo dữ liệu đồng bộ.")}>
                <div className="mb-4">
                    <label htmlFor="group-filter" className="block text-sm font-medium text-gray-700">Lọc theo tổ</label>
                    <select
                        id="group-filter"
                        value={selectedGroupId}
                        onChange={(e) => onGroupFilterChange(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                        <option value="all">Tất cả các tổ</option>
                        {data.groups.map(group => (
                            <option key={group.id} value={group.id}>{group.name}</option>
                        ))}
                    </select>
                </div>
                {filteredTeachers.map(teacher => {
                    const user = data.users.find(u => u.id === teacher.id);
                    return <ItemRow 
                        key={teacher.id} 
                        name={teacher.name} 
                        onEdit={user ? () => openModal('user', 'edit', user) : undefined} 
                        onDelete={user ? () => handlers.teacherHandlers.remove(teacher.id) : undefined}
                    />
                })}
            </ManagementCard>
            <ManagementCard title="Năm học" onAdd={() => openModal('year', 'add')}>
                {data.academicYears.map(year => <ItemRow key={year.id} name={year.name} onEdit={() => openModal('year', 'edit', year)} onDelete={() => handlers.academicYearHandlers.remove(year.id)}/>)}
            </ManagementCard>
            <ManagementCard title="Hoạt động" onAdd={() => openModal('activity', 'add')}>
                 {data.activities.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(activity => <ItemRow key={activity.id} name={`${activity.name} - ${new Date(activity.date).toLocaleDateString('vi-VN')}`} onEdit={() => openModal('activity', 'edit', activity)} onDelete={() => handlers.activityHandlers.remove(activity.id)}/>)}
            </ManagementCard>
        </div>
    );
};

// Helper components for ManagementView
const ManagementCard: React.FC<{title: string, onAdd: () => void, children: React.ReactNode}> = ({ title, onAdd, children }) => (
    <Card title={title} actions={<button onClick={onAdd} className="flex items-center gap-1 text-sm text-white bg-indigo-500 px-3 py-1 rounded-md hover:bg-indigo-600"><PlusIcon/>Thêm</button>}>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">{children}</div>
    </Card>
);

const ItemRow: React.FC<{name: string, onEdit?: () => void, onDelete?: () => void, onResetPassword?: () => void}> = ({ name, onEdit, onDelete, onResetPassword }) => (
    <div className="flex justify-between items-center p-2 bg-gray-50 rounded-md hover:bg-gray-100">
        <span className="text-gray-800">{name}</span>
        <div className="flex gap-3">
            {onResetPassword && <button onClick={onResetPassword} title="Reset mật khẩu" className="text-gray-500 hover:text-gray-700"><KeyIcon/></button>}
            {onEdit && <button onClick={onEdit} className="text-blue-500 hover:text-blue-700"><PencilIcon/></button>}
            {onDelete && <button onClick={() => window.confirm('Bạn có chắc chắn muốn xóa? Thao tác này có thể ảnh hưởng đến các dữ liệu liên quan.') && onDelete()} className="text-red-500 hover:text-red-700"><TrashIcon/></button>}
        </div>
    </div>
);

const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & {label: string}> = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <input {...props} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
    </div>
);

const SelectField: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & {label: string, options: {value: string, label: string}[]}> = ({ label, options, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <select {...props} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
            <option value="">-- Chọn --</option>
            {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
    </div>
);