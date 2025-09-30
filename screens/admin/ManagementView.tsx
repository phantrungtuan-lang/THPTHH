import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { PlusIcon, PencilIcon, TrashIcon, KeyIcon, UploadIcon, DownloadIcon } from '../../components/icons';
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
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Activity filters
    const [activityYearFilter, setActivityYearFilter] = useState<string>('all');
    const [activityDateFilter, setActivityDateFilter] = useState<string>('');

    const openModal = (type: ModalState['type'], mode: ModalState['mode'], dataToEdit?: any) => {
        setModal({ type, mode, data: dataToEdit });
        if (mode === 'add') {
             if (type === 'user') {
                setFormData({ role: UserRole.TEACHER });
             } else {
                setFormData({});
             }
        } else {
            setFormData(dataToEdit || {});
        }
    };

    const closeModal = () => {
        setModal(null);
        setFormData({});
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const newFormData = { ...formData, [e.target.name]: e.target.value };
        if (e.target.name === 'role' && e.target.value === UserRole.ADMIN) {
            newFormData.groupsId = ''; 
        }
        setFormData(newFormData);
    };
    
    const handleFileImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleDownloadTemplate = () => {
        const headers = ["name", "email", "groupName"];
        const worksheet = XLSX.utils.json_to_sheet([
            { name: "Nguyễn Văn A", email: "nguyenvana@example.com", groupName: "Tổ Toán" },
            { name: "Trần Thị B", email: "tranthib@example.com", groupName: "Tổ Lý - Tin" }
        ], { header: headers });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Mau_Danh_Sach_Giao_Vien");

        // Set column widths for better readability
        worksheet["!cols"] = [
            { wch: 30 }, // name
            { wch: 30 }, // email
            { wch: 20 }  // groupName
        ];

        XLSX.writeFile(workbook, "File_Mau_Import_Tai_Khoan.xlsx");
    };

    const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const fileData = await file.arrayBuffer();
            const workbook = XLSX.read(fileData, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json: any[] = XLSX.utils.sheet_to_json(worksheet);

            const groupMap = new Map(data.groups.map(g => [g.name.toLowerCase().trim(), g.groupsId]));
            const existingEmails = new Set(data.users.map(u => u.email.toLowerCase()));
            
            const newUsers: Omit<User, 'usersId'>[] = [];
            const failedImports: string[] = [];

            json.forEach((row, index) => {
                const name = row.name?.trim();
                const email = row.email?.trim().toLowerCase();
                const groupName = row.groupName?.trim().toLowerCase();
                
                if (!name || !email || !groupName) {
                    failedImports.push(`Dòng ${index + 2}: Thiếu tên, email, hoặc tên tổ.`);
                    return;
                }
                if (existingEmails.has(email)) {
                    failedImports.push(`Dòng ${index + 2}: Email '${row.email}' đã tồn tại.`);
                    return;
                }
                const groupsId = groupMap.get(groupName);
                if (!groupsId) {
                    failedImports.push(`Dòng ${index + 2}: Tổ '${row.groupName}' không tồn tại.`);
                    return;
                }

                newUsers.push({
                    name,
                    email,
                    groupsId,
                    role: UserRole.TEACHER,
                    password: '123' // Default password
                });
                existingEmails.add(email); // Prevent duplicate emails within the same file
            });
            
            if (newUsers.length > 0) {
                await handlers.userHandlers.addBatch(newUsers);
            }

            let alertMessage = `Hoàn tất import.\n\n- ${newUsers.length} tài khoản được thêm thành công.`;
            if (failedImports.length > 0) {
                alertMessage += `\n\n- ${failedImports.length} tài khoản không thể thêm:\n${failedImports.join('\n')}`;
            }
            alert(alertMessage);

        } catch (error) {
            console.error("Failed to import file:", error);
            alert("Đã có lỗi xảy ra khi đọc hoặc xử lý file. Vui lòng kiểm tra lại định dạng file và dữ liệu.");
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
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
            const dataToSubmit = { ...formData };
            if (modal.mode === 'edit' && 'password' in dataToSubmit && dataToSubmit.password === '') {
                delete dataToSubmit.password;
            }
            if (modal.mode === "add") {
                await handler.add(dataToSubmit);
            } else {
                await handler.update(dataToSubmit);
            }
            closeModal();
        } catch (error: any) {
            console.error("Failed to save data:", error);
            const errorMessage = error.message || "Không rõ nguyên nhân.";
            alert(`Đã có lỗi xảy ra khi lưu dữ liệu.\n\nChi tiết: ${errorMessage}`);
        } finally {
            setIsSaving(false);
        }
    };

    const filteredTeachers = useMemo(() => {
        if (!selectedGroupId || selectedGroupId === 'all') {
            return data.teachers;
        }
        return data.teachers.filter(teacher => teacher.groupsId === selectedGroupId);
    }, [data.teachers, selectedGroupId]);
    
    const filteredActivities = useMemo(() => {
        return data.activities
            .filter(activity => {
                const yearMatch = activityYearFilter === 'all' || activity.academicYearsId === activityYearFilter;
                const dateMatch = !activityDateFilter || new Date(activity.date).toDateString() === new Date(activityDateFilter).toDateString();
                return yearMatch && dateMatch;
            })
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [data.activities, activityYearFilter, activityDateFilter]);

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
                      <SelectField name="groupsId" label="Tổ chuyên môn" value={formData.groupsId || ''} onChange={handleFormChange} options={data.groups.map(g => ({value: g.groupsId, label: g.name}))}/>
                    }
                </>;
            case 'group':
                 return <>
                    <InputField name="name" label="Tên tổ" value={formData.name || ''} onChange={handleFormChange} required/>
                    <SelectField name="leaderUsersId" label="Tổ trưởng" value={formData.leaderUsersId || ''} onChange={handleFormChange} options={data.users.filter(u => u.role === UserRole.TEACHER || u.role === UserRole.GROUP_LEADER).map(t => ({value: t.usersId, label: t.name}))}/>
                 </>;
            case 'teacher': 
                 return <p>Vui lòng chỉnh sửa thông tin giáo viên thông qua mục 'Tài khoản'.</p>
            case 'year':
                return <InputField name="name" label="Tên năm học (VD: 2024-2025)" value={formData.name || ''} onChange={handleFormChange} required/>;
            case 'activity':
                 return <>
                    <InputField name="name" label="Tên hoạt động" value={formData.name || ''} onChange={handleFormChange} required/>
                    <InputField name="date" label="Ngày" type="date" value={formData.date || ''} onChange={handleFormChange} required/>
                    <SelectField name="academicYearsId" label="Năm học" value={formData.academicYearsId || ''} onChange={handleFormChange} options={data.academicYears.map(y => ({value: y.academicYearsId, label: y.name}))} required/>
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
            <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileImport}
                className="hidden"
                accept=".xlsx, .xls, .csv"
            />
            <ManagementCard 
                title="Tài khoản" 
                actions={
                    <div className="flex items-center space-x-2">
                        <button onClick={handleDownloadTemplate} className="flex items-center gap-1 text-sm text-white bg-cyan-500 px-3 py-1 rounded-md hover:bg-cyan-600"><DownloadIcon/>Tải file mẫu</button>
                        <button onClick={handleFileImportClick} className="flex items-center gap-1 text-sm text-white bg-green-500 px-3 py-1 rounded-md hover:bg-green-600"><UploadIcon/>Import</button>
                        <button onClick={() => openModal('user', 'add')} className="flex items-center gap-1 text-sm text-white bg-indigo-500 px-3 py-1 rounded-md hover:bg-indigo-600"><PlusIcon/>Thêm</button>
                    </div>
                }
            >
                {data.users.map(user => {
                    const isCurrentUser = user.usersId === currentUser.usersId;
                    return (
                        <ItemRow 
                            key={user.usersId} 
                            name={`${user.name} (${user.role})`} 
                            onEdit={() => openModal('user', 'edit', user)} 
                            onDelete={!isCurrentUser ? () => handlers.userHandlers.remove(user.usersId) : undefined}
                            onResetPassword={!isCurrentUser ? () => handlers.requestPasswordReset(user) : undefined}
                        />
                    );
                })}
            </ManagementCard>
            <ManagementCard title="Tổ chuyên môn" onAdd={() => openModal('group', 'add')}>
                {data.groups.map(group => <ItemRow key={group.groupsId} name={group.name} onEdit={() => openModal('group', 'edit', group)} onDelete={() => handlers.groupHandlers.remove(group.groupsId)}/>)}
            </ManagementCard>
             <ManagementCard title="Giáo viên">
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
                            <option key={group.groupsId} value={group.groupsId}>{group.name}</option>
                        ))}
                    </select>
                </div>
                {filteredTeachers.map(teacher => {
                    const user = data.users.find(u => u.usersId === teacher.usersId);
                    return <ItemRow 
                        key={teacher.usersId} 
                        name={teacher.name} 
                        onEdit={user ? () => openModal('user', 'edit', user) : undefined} 
                        onDelete={user ? () => handlers.teacherHandlers.remove(teacher.usersId) : undefined}
                    />
                })}
            </ManagementCard>
            <ManagementCard title="Năm học" onAdd={() => openModal('year', 'add')}>
                {data.academicYears.map(year => <ItemRow key={year.academicYearsId} name={year.name} onEdit={() => openModal('year', 'edit', year)} onDelete={() => handlers.academicYearHandlers.remove(year.academicYearsId)}/>)}
            </ManagementCard>
            <ManagementCard title="Hoạt động" onAdd={() => openModal('activity', 'add')}>
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <div className="flex-1">
                         <label htmlFor="year-activity-filter" className="block text-sm font-medium text-gray-700">Năm học</label>
                         <select
                            id="year-activity-filter"
                            value={activityYearFilter}
                            onChange={(e) => setActivityYearFilter(e.target.value)}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                        >
                            <option value="all">Tất cả năm học</option>
                            {data.academicYears.map(year => (
                                <option key={year.academicYearsId} value={year.academicYearsId}>{year.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label htmlFor="date-activity-filter" className="block text-sm font-medium text-gray-700">Ngày</label>
                        <input
                            id="date-activity-filter"
                            type="date"
                            value={activityDateFilter}
                            onChange={(e) => setActivityDateFilter(e.target.value)}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                        />
                    </div>
                </div>
                 {filteredActivities.map(activity => <ItemRow key={activity.activitiesId} name={`${activity.name} - ${new Date(activity.date).toLocaleDateString('vi-VN')}`} onEdit={() => openModal('activity', 'edit', activity)} onDelete={() => handlers.activityHandlers.remove(activity.activitiesId)}/>)}
            </ManagementCard>
        </div>
    );
};

// Helper components
const ManagementCard: React.FC<{title: string, onAdd?: () => void, children: React.ReactNode, actions?: React.ReactNode}> = ({ title, onAdd, children, actions }) => (
    <Card 
        title={title} 
        actions={actions || (onAdd && <button onClick={onAdd} className="flex items-center gap-1 text-sm text-white bg-indigo-500 px-3 py-1 rounded-md hover:bg-indigo-600"><PlusIcon/>Thêm</button>)}>
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