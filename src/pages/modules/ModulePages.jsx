import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  FileUploadBox,
  FilterBar,
  KPIGrid,
  MetricPill,
  ModalCard,
  PageHeader,
  ProgressBar,
  SectionCard,
  StatusBadge,
  Table,
  Tabs,
} from '../../components/ui';
import {
  alerts,
  allUsers,
  attendanceRegister,
  auditLogs,
  disbursements,
  expenseRecords,
  marksUploads,
  notifications,
  programs,
  reportSnapshots,
  students,
} from '../../data/mockData';
import { currency } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { exportReportPackPDF, exportRowsToCSV } from '../../utils/exportUtils';

const ModalShell = ({ open, children }) =>
  open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl">{children}</div>
    </div>
  ) : null;

export const UserManagementPage = () => {
  const { addNotification } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [localUsers, setLocalUsers] = useState(allUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'PROJECT_MANAGER',
    status: 'Invited',
    program: 'General Access',
  });

  const handleCreateUser = () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      alert('Please enter both name and email.');
      return;
    }

    const newUser = {
      id: `u${localUsers.length + 1}`,
      name: formData.name.trim(),
      email: formData.email.trim(),
      role: formData.role,
      status: formData.status,
      lastSeen: 'Just invited',
      program: formData.program,
    };

    setLocalUsers([newUser, ...localUsers]);
    addNotification('New user invited', `${newUser.name} was added as ${newUser.role}.`, 'Success');
    setIsModalOpen(false);
    setFormData({
      name: '',
      email: '',
      role: 'PROJECT_MANAGER',
      status: 'Invited',
      program: 'General Access',
    });
  };

  const filteredUsers = localUsers.filter((user) => {
    const matchesSearch =
      !searchTerm ||
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'All Roles' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'All Statuses' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Access Control"
        title="User Management"
        description="Invite operational users, assign roles, and keep platform access audit-ready."
        actions={[
          <button key="add" onClick={() => setIsModalOpen(true)} className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">Add User</button>,
        ]}
      />
      <FilterBar
        filters={[
          { label: 'Search', type: 'search', placeholder: 'Search name or email', value: searchTerm, onChange: (e) => setSearchTerm(e.target.value) },
          { label: 'Role', options: ['All Roles', 'ADMIN', 'PROJECT_MANAGER', 'TEACHER', 'STUDENT', 'FUNDER'], value: roleFilter, onChange: (e) => setRoleFilter(e.target.value) },
          { label: 'Status', options: ['All Statuses', 'Active', 'Invited', 'Review'], value: statusFilter, onChange: (e) => setStatusFilter(e.target.value) },
        ]}
      />
      <Table
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'role', label: 'Role', render: (value) => <StatusBadge status={value} /> },
          { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value} /> },
          { key: 'lastSeen', label: 'Last Seen' },
          { key: 'action', label: 'Action', render: () => <button className="text-sm font-semibold text-brand-600">Manage</button> },
        ]}
        rows={filteredUsers}
      />

      <ModalShell open={isModalOpen}>
        <ModalCard title="Invite New User" description="Create a working frontend record and assign the initial operating role.">
          <div className="grid gap-4 md:grid-cols-2">
            <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="rounded-2xl border border-slate-200 bg-white px-4 py-3" placeholder="Full name" />
            <input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="rounded-2xl border border-slate-200 bg-white px-4 py-3" placeholder="Email address" />
            <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              {['ADMIN', 'PROJECT_MANAGER', 'TEACHER', 'STUDENT', 'FUNDER'].map((role) => <option key={role}>{role}</option>)}
            </select>
            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              {['Invited', 'Active', 'Review'].map((status) => <option key={status}>{status}</option>)}
            </select>
            <input value={formData.program} onChange={(e) => setFormData({ ...formData, program: e.target.value })} className="md:col-span-2 rounded-2xl border border-slate-200 bg-white px-4 py-3" placeholder="Assigned program or operating unit" />
          </div>
          <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-5">
            <button onClick={() => setIsModalOpen(false)} className="rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-600">Cancel</button>
            <button onClick={handleCreateUser} className="rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white">Create User</button>
          </div>
        </ModalCard>
      </ModalShell>
    </div>
  );
};

export const StudentManagementPage = () => {
  const { settings, addNotification } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [localStudents, setLocalStudents] = useState(students);
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('All Grades');
  const [programFilter, setProgramFilter] = useState('All Programs');
  const [riskFilter, setRiskFilter] = useState('All Risk');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [formData, setFormData] = useState({ name: '', grade: '10', school: '', program: 'STEM Excellence Scholarship' });
  const [bulkAssignProgram, setBulkAssignProgram] = useState('STEM Excellence Scholarship');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [importText, setImportText] = useState('');

  const rows = localStudents
    .filter((student) => {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        !search ||
        student.name.toLowerCase().includes(search) ||
        student.school.toLowerCase().includes(search) ||
        student.guardian.name.toLowerCase().includes(search);
      const matchesGrade = gradeFilter === 'All Grades' || `${student.grade}` === gradeFilter;
      const matchesProgram = programFilter === 'All Programs' || student.programName === programFilter;
      const matchesRisk = riskFilter === 'All Risk' || student.riskLevel === riskFilter;
      const matchesStatus = statusFilter === 'All Status' || student.academicStatus === statusFilter;
      return matchesSearch && matchesGrade && matchesProgram && matchesRisk && matchesStatus;
    })
    .map((student) => ({ ...student }));

  const handleCreateStudent = () => {
    if (!formData.name || !formData.school) {
      alert('Please fill in the student name and school.');
      return;
    }

    const newStudent = {
      id: `s${localStudents.length + 1}`,
      name: formData.name,
      grade: parseInt(formData.grade),
      school: formData.school,
      programName: formData.program,
      attendance: 100,
      average: 0,
      academicStatus: 'Review',
      riskLevel: 'Low',
      fundsReceived: 0,
      scholarshipApproved: settings.maxScholarship,
      region: 'Bengaluru Urban',
      guardian: { name: 'Not assigned', relation: '-', phone: '-' },
      attendanceHistory: [],
      marks: [],
      expenses: [],
      alerts: [],
      pendingDocs: ['Onboarding...'],
    };

    setLocalStudents([newStudent, ...localStudents]);
    addNotification('Student added', `${formData.name} was added to ${formData.program}.`, 'Success');
    setIsModalOpen(false);
    setFormData({ name: '', grade: '10', school: '', program: 'STEM Excellence Scholarship' });
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents((current) =>
      current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId]
    );
  };

  const handleBulkAssign = () => {
    if (!selectedStudents.length) {
      alert('Select at least one student before bulk assigning.');
      return;
    }

    setLocalStudents((current) =>
      current.map((student) =>
        selectedStudents.includes(student.id) ? { ...student, programName: bulkAssignProgram } : student
      )
    );
    addNotification('Bulk assignment completed', `${selectedStudents.length} students were moved to ${bulkAssignProgram}.`, 'Success');
    setBulkAssignOpen(false);
    setSelectedStudents([]);
  };

  const handleImportStudents = () => {
    const lines = importText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) {
      alert('Paste at least one student record to import.');
      return;
    }

    const imported = lines.map((line, index) => {
      const [name, grade = '10', school = 'Imported School', program = 'STEM Excellence Scholarship'] = line.split(',').map((part) => part.trim());
      return {
        id: `s${localStudents.length + index + 1}`,
        name,
        grade: parseInt(grade),
        school,
        programName: program,
        attendance: 100,
        average: 0,
        academicStatus: 'Review',
        riskLevel: 'Low',
        fundsReceived: 0,
        scholarshipApproved: settings.maxScholarship,
        region: 'Bengaluru Urban',
        guardian: { name: 'Imported guardian', relation: '-', phone: '-' },
        attendanceHistory: [],
        marks: [],
        expenses: [],
        alerts: [],
        pendingDocs: ['Imported profile'],
      };
    });

    setLocalStudents([...imported, ...localStudents]);
    addNotification('Student import completed', `${imported.length} students were added to the monitoring list.`, 'Success');
    setImportText('');
    setImportOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Student Operations"
        title="Student Management"
        description="Search, segment, and drill into scholarship beneficiaries using risk-aware academic and utilization signals."
        actions={[
          <button key="add-student" onClick={() => setIsModalOpen(true)} className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">Add Student</button>,
          <button key="bulk-assign" onClick={() => setBulkAssignOpen(true)} className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">Bulk Assign Program</button>,
          <button key="import" onClick={() => setImportOpen(true)} className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">Import Students</button>,
        ]}
      />
      <FilterBar
        filters={[
          { label: 'Search', type: 'search', placeholder: 'Search student, school, or guardian', value: searchTerm, onChange: (e) => setSearchTerm(e.target.value) },
          { label: 'Grade', options: ['All Grades', '6', '7', '8', '9', '10', '11', '12'], value: gradeFilter, onChange: (e) => setGradeFilter(e.target.value) },
          { label: 'Program', options: ['All Programs', ...programs.map((program) => program.name)], value: programFilter, onChange: (e) => setProgramFilter(e.target.value) },
          { label: 'Risk Level', options: ['All Risk', 'High', 'Medium', 'Low'], value: riskFilter, onChange: (e) => setRiskFilter(e.target.value) },
          { label: 'Status', options: ['All Status', 'Strong', 'Stable', 'Needs Attention', 'Review'], value: statusFilter, onChange: (e) => setStatusFilter(e.target.value) },
        ]}
      />
      
      <Table
        columns={[
          {
            key: 'select',
            label: 'Select',
            render: (_, row) => (
              <input
                type="checkbox"
                checked={selectedStudents.includes(row.id)}
                onChange={() => toggleStudentSelection(row.id)}
                className="h-4 w-4 rounded border-slate-300"
              />
            ),
          },
          {
            key: 'name',
            label: 'Name',
            render: (value, row) => (
              <Link className="font-semibold text-brand-700 hover:text-brand-500" to={`/students/${row.id}`}>
                {value}
              </Link>
            ),
          },
          { key: 'grade', label: 'Grade', render: (value) => `Grade ${value}` },
          { key: 'attendance', label: 'Attendance', render: (value) => `${value}%` },
          { key: 'academicStatus', label: 'Academic Status', render: (value) => <StatusBadge status={value} /> },
          { key: 'fundsReceived', label: 'Funds Received', render: (value) => currency(value) },
          { key: 'riskLevel', label: 'Risk', render: (value) => <StatusBadge status={value} /> },
          {
            key: 'action',
            label: 'Profile',
            render: (_, row) => (
              <Link className="text-sm font-semibold text-brand-600" to={`/students/${row.id}`}>
                View profile
              </Link>
            ),
          },
        ]}
        rows={rows}
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl">
            <ModalCard title="Add New Beneficiary" description="Complete the student profile to enroll them in a scholarship program.">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">FullName</p>
                  <input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500/20"
                    placeholder="e.g. Rahul Kumar"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Current Grade</p>
                  <select
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                  >
                    {['6', '7', '8', '9', '10', '11', '12'].map((g) => <option key={g} value={g}>Grade {g}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">School Name</p>
                  <input
                    value={formData.school}
                    onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500/20"
                    placeholder="e.g. GHS Sarjapur"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Assigned Program</p>
                  <select
                    value={formData.program}
                    onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                  >
                    {programs.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2 rounded-2xl bg-brand-50 p-4 border border-brand-100">
                  <p className="text-xs font-bold text-brand-700">Governance Note</p>
                  <p className="mt-1 text-[11px] text-brand-600">
                    The approved scholarship amount will be automatically set to the global system limit of <b>{currency(settings.maxScholarship)}</b>. Change this limit in Admin Settings if required.
                  </p>
                </div>
              </div>
              <div className="mt-8 flex justify-end gap-3 border-t pt-6">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-2xl px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateStudent}
                  className="rounded-2xl bg-slate-950 px-6 py-2.5 text-sm font-semibold text-white shadow-soft"
                >
                  Create Student
                </button>
              </div>
            </ModalCard>
          </div>
        </div>
        )}

      <ModalShell open={bulkAssignOpen}>
        <ModalCard title="Bulk Assign Program" description="Select a program and update all checked students in one action.">
          <div className="space-y-4">
            <select value={bulkAssignProgram} onChange={(e) => setBulkAssignProgram(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3">
              {programs.map((program) => <option key={program.id} value={program.name}>{program.name}</option>)}
            </select>
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              Selected students: <span className="font-semibold text-slate-900">{selectedStudents.length}</span>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3 border-t pt-5">
            <button onClick={() => setBulkAssignOpen(false)} className="rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-600">Cancel</button>
            <button onClick={handleBulkAssign} className="rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white">Apply Assignment</button>
          </div>
        </ModalCard>
      </ModalShell>

      <ModalShell open={importOpen}>
        <ModalCard title="Import Students" description="Paste CSV-style rows: name, grade, school, program">
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
            rows="8"
            placeholder={`Riya Sharma, 9, GHS Sarjapur, STEM Excellence Scholarship\nManoj Das, 11, PU College Hubballi, Girls Future Tech`}
          />
          <div className="mt-6 flex justify-end gap-3 border-t pt-5">
            <button onClick={() => setImportOpen(false)} className="rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-600">Cancel</button>
            <button onClick={handleImportStudents} className="rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white">Import Students</button>
          </div>
        </ModalCard>
      </ModalShell>

      <SectionCard title="Admin Operations Hub" subtitle="Operational shortcuts for the current session">
        <div className="grid gap-3 md:grid-cols-2">
          {[
            ['Assign project manager', 'Distribute ownership across field teams.'],
            ['Request missing documents', 'Trigger automated reminders.'],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
              <p className="font-semibold text-slate-900">{title}</p>
              <p className="mt-1 text-sm text-slate-500">{body}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
};

const OverviewTab = ({ student }) => (
  <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
    <SectionCard title="Profile" subtitle="Student, school, and guardian snapshot">
      <div className="grid gap-4">
        <MetricPill label="Student ID" value={student.id} />
        <MetricPill label="School" value={student.school} />
        <MetricPill label="Guardian" value={`${student.guardian.name} (${student.guardian.relation})`} />
        <MetricPill label="Phone" value={student.guardian.phone} />
      </div>
    </SectionCard>
    <SectionCard title="Scholarship Summary" subtitle="Why this student is in the program and how support is progressing">
      <div className="grid gap-4 md:grid-cols-2">
        <MetricPill label="Program" value={student.programName} />
        <MetricPill label="Approved" value={student.scholarshipApproved} format="currency" />
        <MetricPill label="Received" value={student.fundsReceived} format="currency" />
        <MetricPill label="Risk Level" value={student.riskLevel} />
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-sm text-slate-500"><span>Attendance health</span><span>{student.attendance}%</span></div>
        <ProgressBar value={student.attendance} color={student.attendance < 75 ? 'bg-rose-500' : 'bg-brand-500'} />
      </div>
    </SectionCard>
  </div>
);

const StudentMonitoringHeader = ({ student }) => {
  const totalUsed = student.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const approvedUsed = student.expenses
    .filter((expense) => expense.status === 'Approved')
    .reduce((sum, expense) => sum + expense.amount, 0);
  const weakSubject = student.marks.slice().sort((a, b) => a.latest - b.latest)[0];
  const nextInstallment = student.installments.find((item) => item.status !== 'Disbursed');

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
      <SectionCard title="Current Monitoring Summary" subtitle="Current funding, usage, and performance position for this student">
        <div className="grid gap-4 md:grid-cols-2">
          <MetricPill label="Current Status" value={student.academicStatus} />
          <MetricPill label="Risk Level" value={student.riskLevel} />
          <MetricPill label="Attendance" value={student.attendance} format="percent" />
          <MetricPill label="Academic Average" value={student.average} />
          <MetricPill label="Money Given" value={student.fundsReceived} format="currency" />
          <MetricPill label="Money Used" value={approvedUsed} format="currency" />
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Program</p>
            <p className="mt-1 font-semibold text-slate-900">{student.programName}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Weak Subject</p>
            <p className="mt-1 font-semibold text-slate-900">{weakSubject?.subject ?? 'None'}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Pending Docs</p>
            <p className="mt-1 font-semibold text-slate-900">{student.pendingDocs.length || 0}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Admin Monitoring Notes" subtitle="A readable operational summary without opening every tab">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">How much money was given</p>
            <p className="mt-1 text-sm text-slate-600">
              {currency(student.fundsReceived)} has been released out of {currency(student.scholarshipApproved)} approved.
              {nextInstallment ? ` Next payout: ${nextInstallment.label} (${nextInstallment.status}).` : ' All approved payouts are already completed.'}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Where the money was used</p>
            <p className="mt-1 text-sm text-slate-600">
              {currency(approvedUsed)} is already backed by approved usage proofs from a total claimed amount of {currency(totalUsed)}.
              Primary expense heads: {student.expenses.slice(0, 3).map((item) => item.category).join(', ')}.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">What is the current performance</p>
            <p className="mt-1 text-sm text-slate-600">
              Attendance is {student.attendance}% and academic average is {student.average}. Weakest subject currently is {weakSubject?.subject ?? 'not available'}.
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
};

const AttendanceTab = ({ student }) => (
  <div className="grid gap-6 xl:grid-cols-[1fr,1fr]">
    <SectionCard title="Monthly Attendance Chart" subtitle="Recent verified attendance trend">
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={student.attendanceHistory}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis domain={[50, 100]} />
            <Tooltip />
            <Bar dataKey="attendance" fill="#1d70f5" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
    <SectionCard title="Attendance History" subtitle="Month-level summary with variance notes">
      <Table
        columns={[
          { key: 'month', label: 'Month' },
          { key: 'attendance', label: 'Attendance', render: (value) => `${value}%` },
          { key: 'score', label: 'Academic Signal' },
        ]}
        rows={student.attendanceHistory}
      />
    </SectionCard>
  </div>
);

const AcademicsTab = ({ student }) => (
  <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
    <SectionCard title="Subject-wise Marks" subtitle="Term and latest marks view">
      <Table
        columns={[
          { key: 'subject', label: 'Subject' },
          { key: 'term1', label: 'Term 1' },
          { key: 'term2', label: 'Term 2' },
          { key: 'latest', label: 'Latest' },
        ]}
        rows={student.marks}
      />
    </SectionCard>
    <SectionCard title="Grade Trend" subtitle="Combined academic movement by month">
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={student.attendanceHistory}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis domain={[50, 100]} />
            <Tooltip />
            <Line type="monotone" dataKey="score" stroke="#159f6b" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">
        Weak subject highlight: {student.marks.slice().sort((a, b) => a.latest - b.latest)[0].subject} requires extra support.
      </div>
    </SectionCard>
  </div>
);

const ScholarshipsTab = ({ student }) => (
  <div className="space-y-6">
    <KPIGrid
      items={[
        { label: 'Approved Amount', value: currency(student.scholarshipApproved), helper: 'Current approved support' },
        { label: 'Released Amount', value: currency(student.fundsReceived), helper: 'Amount disbursed to date' },
        { label: 'Pending Installments', value: student.installments.filter((item) => item.status !== 'Disbursed').length, helper: 'Awaiting milestone completion' },
      ]}
    />
    <Table
      columns={[
        { key: 'label', label: 'Installment' },
        { key: 'amount', label: 'Amount', render: (value) => currency(value) },
        { key: 'date', label: 'Date' },
        { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value} /> },
      ]}
      rows={student.installments}
    />
  </div>
);

const ExpensesTab = ({ student }) => (
  <div className="space-y-6">
    <SectionCard title="Utilization Summary" subtitle="All submitted expenses under this student scholarship">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricPill label="Total Claimed" value={student.expenses.reduce((sum, expense) => sum + expense.amount, 0)} format="currency" />
        <MetricPill label="Approved Claims" value={student.expenses.filter((expense) => expense.status === 'Approved').length} />
        <MetricPill label="Pending Claims" value={student.expenses.filter((expense) => expense.status === 'Pending').length} />
      </div>
    </SectionCard>
    <Table
      columns={[
        { key: 'category', label: 'Category' },
        { key: 'amount', label: 'Amount', render: (value) => currency(value) },
        { key: 'date', label: 'Date' },
        { key: 'receipt', label: 'Receipt' },
        { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value} /> },
      ]}
      rows={student.expenses}
    />
  </div>
);

const AlertsTab = ({ student }) => (
  <div className="space-y-3">
    {student.alerts.length ? (
      student.alerts.map((alert) => (
        <div key={alert.id} className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-slate-900">{alert.type}</p>
            <StatusBadge status={alert.severity} />
          </div>
          <p className="mt-2 text-sm text-slate-500">{alert.message}</p>
          <p className="mt-3 text-xs text-slate-400">Status: {alert.status}</p>
        </div>
      ))
    ) : (
      <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">No active alerts for this student.</div>
    )}
  </div>
);

export const StudentProfilePage = () => {
  const { studentId } = useParams();
  const [activeTab, setActiveTab] = useState('Overview');
  const student = students.find((item) => item.id === studentId) || students[0];
  const tabs = ['Overview', 'Attendance', 'Academics', 'Scholarships', 'Expenses', 'Alerts'];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Student Detail" title={student.name} description={`Grade ${student.grade} - ${student.school} - ${student.programName}`} />
      <StudentMonitoringHeader student={student} />
      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
      {activeTab === 'Overview' && <OverviewTab student={student} />}
      {activeTab === 'Attendance' && <AttendanceTab student={student} />}
      {activeTab === 'Academics' && <AcademicsTab student={student} />}
      {activeTab === 'Scholarships' && <ScholarshipsTab student={student} />}
      {activeTab === 'Expenses' && <ExpensesTab student={student} />}
      {activeTab === 'Alerts' && <AlertsTab student={student} />}
    </div>
  );
};

export const AttendancePage = () => {
  const { addNotification } = useAuth();
  const [register, setRegister] = useState(attendanceRegister);
  const [selectedDate, setSelectedDate] = useState('2026-04-04');
  const [selectedClass, setSelectedClass] = useState('Grade 10');

  const updateStatus = (studentName, nextStatus) => {
    setRegister((current) =>
      current.map((row) =>
        row.studentName === studentName
          ? {
              ...row,
              status: nextStatus,
              remarks:
                nextStatus === 'Present'
                  ? 'Marked present'
                  : nextStatus === 'Late'
                    ? 'Late arrival noted'
                    : 'Follow-up required',
            }
          : row
      )
    );
  };

  const handleSave = () => {
    addNotification('Attendance saved', `Attendance for ${selectedClass} on ${selectedDate} was updated successfully.`, 'Success');
  };

  const summary = register.reduce(
    (acc, row) => {
      if (row.status === 'Present') acc.present += 1;
      if (row.status === 'Late') acc.late += 1;
      if (row.status === 'Absent') acc.absent += 1;
      return acc;
    },
    { present: 0, late: 0, absent: 0 }
  );

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Attendance Workflow" title="Attendance" description="Fast teacher-friendly attendance marking with day-level controls and trend visibility." />
      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <SectionCard title="Mark Attendance" subtitle="Mock save and update workflow">
          <div className="mb-4 grid gap-3 lg:grid-cols-[1fr,1fr,auto]">
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5" />
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5">
              {['Grade 8', 'Grade 9', 'Grade 10', 'Grade 11'].map((option) => <option key={option}>{option}</option>)}
            </select>
            <button onClick={handleSave} className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">Save Attendance</button>
          </div>
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <MetricPill label="Present" value={summary.present} />
            <MetricPill label="Late" value={summary.late} />
            <MetricPill label="Absent" value={summary.absent} />
          </div>
          <Table
            columns={[
              { key: 'studentName', label: 'Student' },
              { key: 'className', label: 'Class' },
              { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value} /> },
              { key: 'remarks', label: 'Remarks' },
              {
                key: 'toggle',
                label: 'Update',
                render: (_, row) => (
                  <div className="flex gap-2 text-xs">
                    {['Present', 'Late', 'Absent'].map((option) => (
                      <button
                        key={option}
                        onClick={() => updateStatus(row.studentName, option)}
                        className={`rounded-full px-3 py-1 font-semibold transition ${
                          row.status === option
                            ? 'bg-slate-950 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ),
              },
            ]}
            rows={register}
          />
        </SectionCard>
        <SectionCard title="Trend Summary" subtitle="Snapshot of recent class attendance health">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={students.slice(0, 6).map((student) => ({ name: student.name.split(' ')[0], attendance: student.attendance }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[60, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="attendance" stroke="#1d70f5" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export const AcademicRecordsPage = () => {
  const { addNotification } = useAuth();
  const [marksRows, setMarksRows] = useState(marksUploads);
  const [entryForm, setEntryForm] = useState({
    studentName: '',
    subject: '',
    assessment: '',
    latest: '',
    teacherRemark: '',
    className: 'Grade 10',
  });

  const saveEntry = (mode) => {
    if (!entryForm.studentName || !entryForm.subject || !entryForm.latest || !entryForm.assessment) {
      alert('Please complete class, student, assessment, and score.');
      return;
    }

    const newRow = {
      ...entryForm,
      latest: Number(entryForm.latest),
      status: mode === 'upload' ? 'Uploaded' : 'Draft',
    };

    setMarksRows([newRow, ...marksRows]);
    addNotification(mode === 'upload' ? 'Marks uploaded' : 'Draft saved', `${entryForm.subject} marks for ${entryForm.studentName} were ${mode === 'upload' ? 'uploaded' : 'saved as draft'}.`, 'Success');
    setEntryForm({ studentName: '', subject: '', assessment: '', latest: '', teacherRemark: '', className: 'Grade 10' });
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Academic Records" title="Academics" description="Subject-wise marks capture, remarking, and trend review in one workspace." />
      <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <SectionCard title="Marks Entry" subtitle="Frontend-only form preview for teacher uploads">
          <div className="grid gap-4 md:grid-cols-2">
            <select value={entryForm.className} onChange={(e) => setEntryForm({ ...entryForm, className: e.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              {['Grade 8', 'Grade 9', 'Grade 10', 'Grade 11'].map((grade) => <option key={grade}>{grade}</option>)}
            </select>
            <input value={entryForm.studentName} onChange={(e) => setEntryForm({ ...entryForm, studentName: e.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" placeholder="Student name" />
            <input value={entryForm.subject} onChange={(e) => setEntryForm({ ...entryForm, subject: e.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" placeholder="Subject" />
            <input value={entryForm.assessment} onChange={(e) => setEntryForm({ ...entryForm, assessment: e.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" placeholder="Assessment title" />
            <input value={entryForm.latest} onChange={(e) => setEntryForm({ ...entryForm, latest: e.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" placeholder="Latest marks" />
            <textarea value={entryForm.teacherRemark} onChange={(e) => setEntryForm({ ...entryForm, teacherRemark: e.target.value })} className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" rows="4" placeholder="Teacher remarks or interventions"></textarea>
          </div>
          <div className="mt-4">
            <FileUploadBox title="Upload result sheet" />
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={() => saveEntry('upload')} className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">Upload Result</button>
            <button onClick={() => saveEntry('draft')} className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">Save Draft</button>
          </div>
        </SectionCard>
        <SectionCard title="Recent Marks" subtitle="Latest subject scores and remarks">
          <Table
            columns={[
              { key: 'studentName', label: 'Student' },
              { key: 'className', label: 'Class' },
              { key: 'subject', label: 'Subject' },
              { key: 'assessment', label: 'Assessment' },
              { key: 'latest', label: 'Latest Score' },
              { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value || 'Uploaded'} /> },
              { key: 'teacherRemark', label: 'Remark' },
            ]}
            rows={marksRows}
          />
        </SectionCard>
      </div>
    </div>
  );
};

export const ProgramsPage = () => {
  const { addNotification } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [localPrograms, setLocalPrograms] = useState(programs);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    objective: '',
    funder: 'Infosys Social Impact',
    budget: '',
    region: 'Bengaluru Urban',
  });
  const [assignment, setAssignment] = useState({
    studentId: students[0]?.id || '',
    scholarshipAmount: '25000',
  });

  const handleCreateProgram = () => {
    if (!formData.name.trim() || !formData.budget) {
      alert('Please enter the program name and budget.');
      return;
    }

    const newProgram = {
      id: `p${localPrograms.length + 1}`,
      name: formData.name.trim(),
      objective: formData.objective.trim() || 'New scholarship program awaiting detailed objective.',
      budget: Number(formData.budget),
      allocated: 0,
      studentCount: 0,
      status: 'Draft',
      region: formData.region,
      funder: formData.funder,
    };

    setLocalPrograms([newProgram, ...localPrograms]);
    addNotification('Program created', `${newProgram.name} is now available for assignment and funding setup.`, 'Success');
    setIsModalOpen(false);
    setFormData({
      name: '',
      objective: '',
      funder: 'Infosys Social Impact',
      budget: '',
      region: 'Bengaluru Urban',
    });
  };

  const openAssignmentModal = (program) => {
    setSelectedProgram(program);
    setAssignment({ studentId: students[0]?.id || '', scholarshipAmount: '25000' });
    setAssignModalOpen(true);
  };

  const handleAssignStudent = () => {
    if (!selectedProgram || !assignment.studentId) return;

    const selectedStudent = students.find((student) => student.id === assignment.studentId);
    setLocalPrograms((current) =>
      current.map((program) =>
        program.id === selectedProgram.id
          ? {
              ...program,
              studentCount: program.studentCount + 1,
              allocated: program.allocated + Number(assignment.scholarshipAmount || 0),
              status: program.status === 'Draft' ? 'Active' : program.status,
            }
          : program
      )
    );
    addNotification('Student assigned', `${selectedStudent?.name || 'Student'} was assigned to ${selectedProgram.name}.`, 'Success');
    setAssignModalOpen(false);
    setSelectedProgram(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Programs & Scholarships"
        title="Programs"
        description="Manage scholarship portfolios, budgets, student assignment workflows, and delivery visibility."
        actions={[
          <button key="program" onClick={() => setIsModalOpen(true)} className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">Create Program</button>,
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {localPrograms.map((program) => (
          <SectionCard key={program.id} title={program.name} subtitle={program.objective}>
            <div className="grid gap-4 md:grid-cols-2">
              <MetricPill label="Budget" value={program.budget} format="currency" />
              <MetricPill label="Allocated" value={program.allocated} format="currency" />
              <MetricPill label="Students" value={program.studentCount} />
              <MetricPill label="Region" value={program.region} />
            </div>
            <div className="mt-4 flex items-center justify-between">
              <StatusBadge status={program.status} />
              <button onClick={() => openAssignmentModal(program)} className="rounded-2xl bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700">Assign Student</button>
            </div>
          </SectionCard>
        ))}
      </div>

      <ModalShell open={isModalOpen}>
        <ModalCard title="Create Program" description="Set up a new scholarship program with budget and operating region details.">
          <div className="grid gap-4 md:grid-cols-2">
            <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="rounded-2xl border border-slate-200 bg-white px-4 py-3" placeholder="Program name" />
            <input value={formData.budget} onChange={(e) => setFormData({ ...formData, budget: e.target.value })} className="rounded-2xl border border-slate-200 bg-white px-4 py-3" placeholder="Budget (INR)" />
            <select value={formData.funder} onChange={(e) => setFormData({ ...formData, funder: e.target.value })} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              {['Infosys Social Impact', 'Tata CSR Foundation', 'Wipro Education Trust'].map((funder) => <option key={funder}>{funder}</option>)}
            </select>
            <select value={formData.region} onChange={(e) => setFormData({ ...formData, region: e.target.value })} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              {['Bengaluru Urban', 'Mysuru', 'Tumakuru', 'Hubballi'].map((region) => <option key={region}>{region}</option>)}
            </select>
            <textarea value={formData.objective} onChange={(e) => setFormData({ ...formData, objective: e.target.value })} className="md:col-span-2 rounded-2xl border border-slate-200 bg-white px-4 py-3" rows="4" placeholder="Program objective and target cohort"></textarea>
          </div>
          <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-5">
            <button onClick={() => setIsModalOpen(false)} className="rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-600">Cancel</button>
            <button onClick={handleCreateProgram} className="rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white">Create Program</button>
          </div>
        </ModalCard>
      </ModalShell>

      <ModalShell open={assignModalOpen}>
        <ModalCard title="Assign Student To Program" description={selectedProgram ? `Add a beneficiary into ${selectedProgram.name} and increase the allocated amount.` : 'Assign a student into this program.'}>
          <div className="grid gap-4 md:grid-cols-2">
            <select value={assignment.studentId} onChange={(e) => setAssignment({ ...assignment, studentId: e.target.value })} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              {students.slice(0, 20).map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
            </select>
            <input value={assignment.scholarshipAmount} onChange={(e) => setAssignment({ ...assignment, scholarshipAmount: e.target.value })} className="rounded-2xl border border-slate-200 bg-white px-4 py-3" placeholder="Scholarship amount" />
          </div>
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            This is a frontend-only assignment flow. It updates the program card instantly so we can validate product behavior before backend integration.
          </div>
          <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-5">
            <button onClick={() => setAssignModalOpen(false)} className="rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-600">Cancel</button>
            <button onClick={handleAssignStudent} className="rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white">Assign Student</button>
          </div>
        </ModalCard>
      </ModalShell>
    </div>
  );
};

export const FundDisbursementPage = () => {
  const [programFilter, setProgramFilter] = useState('All Programs');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [dateFilter, setDateFilter] = useState('This Month');

  const filteredDisbursements = disbursements.filter((item) => {
    const matchesProgram = programFilter === 'All Programs' || item.programName === programFilter || item.programName.includes(programFilter.replace(' Scholarship', ''));
    const matchesStatus = statusFilter === 'All Status' || item.status === statusFilter;
    const matchesDate =
      dateFilter === 'This Month' ? item.dueDate.startsWith('2025-11') || item.dueDate.startsWith('2025-08') :
      dateFilter === 'Last Quarter' ? item.dueDate.startsWith('2025-07') || item.dueDate.startsWith('2025-08') || item.dueDate.startsWith('2025-11') :
      true;
    return matchesProgram && matchesStatus && matchesDate;
  });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Fund Movement" title="Fund Disbursement" description="Track student-wise allocation, installment readiness, and payout status with operational filters." />
      <FilterBar
        filters={[
          { label: 'Program', options: ['All Programs', ...programs.map((program) => program.name)], value: programFilter, onChange: (e) => setProgramFilter(e.target.value) },
          { label: 'Status', options: ['All Status', 'Disbursed', 'Pending', 'Scheduled'], value: statusFilter, onChange: (e) => setStatusFilter(e.target.value) },
          { label: 'Date Range', options: ['This Month', 'Last Quarter', 'FY 2025-26'], value: dateFilter, onChange: (e) => setDateFilter(e.target.value) },
        ]}
      />
      <div className="grid gap-4 md:grid-cols-3">
        {filteredDisbursements.slice(0, 3).map((item) => (
          <SectionCard key={item.id} title={item.studentName} subtitle={item.programName}>
            <div className="space-y-3 text-sm text-slate-500">
              <div className="flex items-center justify-between"><span>{item.installment}</span><span className="font-semibold text-slate-900">{currency(item.amount)}</span></div>
              <div className="flex items-center justify-between"><span>Mode</span><span>{item.mode}</span></div>
              <StatusBadge status={item.status} />
            </div>
          </SectionCard>
        ))}
      </div>
      <Table
        columns={[
          { key: 'studentName', label: 'Student' },
          { key: 'programName', label: 'Program' },
          { key: 'installment', label: 'Installment' },
          { key: 'amount', label: 'Amount', render: (value) => currency(value) },
          { key: 'dueDate', label: 'Due Date' },
          { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value} /> },
        ]}
        rows={filteredDisbursements.slice(0, 20)}
      />
    </div>
  );
};

export const ExpenseUploadPage = () => {
  const { user, addNotification } = useAuth();
  const student = students.find((item) => item.id === user.studentId) || students[0];
  const [submittedExpenses, setSubmittedExpenses] = useState(student.expenses);
  const [expenseForm, setExpenseForm] = useState({
    category: 'Books',
    amount: '',
    date: '2026-04-04',
    title: '',
    description: '',
  });

  const handleSubmitExpense = () => {
    if (!expenseForm.amount || !expenseForm.title || !expenseForm.description) {
      alert('Please complete amount, description, and purpose before submitting.');
      return;
    }

    const newExpense = {
      id: `exp-${submittedExpenses.length + 1}`,
      category: expenseForm.category,
      amount: Number(expenseForm.amount),
      date: expenseForm.date,
      status: 'Pending',
      title: expenseForm.title,
      description: expenseForm.description,
    };

    setSubmittedExpenses([newExpense, ...submittedExpenses]);
    addNotification('Expense submitted', `${expenseForm.category} expense for ${student.name} is now awaiting verification.`, 'Success');
    setExpenseForm({
      category: 'Books',
      amount: '',
      date: '2026-04-04',
      title: '',
      description: '',
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Expense Submission" title="Expenses" description="A mobile-friendly flow for students to submit utilization proofs, receipts, and remarks." />
      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <SectionCard title="Submit Expense" subtitle="Upload a new claim against your scholarship support">
          <div className="grid gap-4 sm:grid-cols-2">
            <select value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              {['Books', 'Transport', 'Tuition', 'Uniform', 'Digital Access'].map((category) => <option key={category}>{category}</option>)}
            </select>
            <input value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" placeholder="Amount" />
            <input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
            <input value={expenseForm.title} onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" placeholder="Short description" />
            <textarea value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} className="sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" rows="4" placeholder="Explain how the amount was used"></textarea>
          </div>
          <div className="mt-4">
            <FileUploadBox title="Upload receipt" />
          </div>
          <button onClick={handleSubmitExpense} className="mt-4 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white sm:w-auto">Submit Expense</button>
        </SectionCard>
        <SectionCard title="Submitted History" subtitle={`Previous expense records for ${student.name}`}>
          <Table
            columns={[
              { key: 'category', label: 'Category' },
              { key: 'amount', label: 'Amount', render: (value) => currency(value) },
              { key: 'date', label: 'Date' },
              { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value} /> },
            ]}
            rows={submittedExpenses}
          />
        </SectionCard>
      </div>
    </div>
  );
};

export const ExpenseVerificationPage = () => {
  const { addNotification } = useAuth();
  const [records, setRecords] = useState(expenseRecords);
  const [selectedExpense, setSelectedExpense] = useState(expenseRecords[0] ?? null);
  const [remarks, setRemarks] = useState('');
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [programFilter, setProgramFilter] = useState('All Programs');
  const [regionFilter, setRegionFilter] = useState('All Regions');

  const visibleRecords = records.filter((expense) => {
    const matchesStatus = statusFilter === 'All' || statusFilter === expense.status;
    const matchesProgram = programFilter === 'All Programs' || expense.programName === programFilter || expense.programName.includes(programFilter.replace(' Scholarship', ''));
    const matchesRegion = regionFilter === 'All Regions' || (expense.programName === 'STEM Excellence' && regionFilter === 'Bengaluru Urban') || (expense.programName === 'Rural Uplift' && regionFilter === 'Tumakuru') || (expense.programName === 'Girls Future Tech' && regionFilter === 'Hubballi');
    return matchesStatus && matchesProgram && matchesRegion;
  });

  const updateExpenseStatus = (status) => {
    if (!selectedExpense) return;

    setRecords((current) =>
      current.map((expense) =>
        expense.studentName === selectedExpense.studentName && expense.category === selectedExpense.category
          ? { ...expense, status, remarks }
          : expense
      )
    );

    addNotification(`Expense ${status.toLowerCase()}`, `${selectedExpense.studentName} - ${selectedExpense.category} was ${status.toLowerCase()}.`, status === 'Approved' ? 'Success' : 'Warning');
    setSelectedExpense((current) => (current ? { ...current, status, remarks } : null));
    setRemarks('');
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Verification Desk" title="Expense Verification" description="Review pending expense claims with receipt preview, remarks, and approve or reject actions." />
      <FilterBar
        filters={[
          { label: 'Status', options: ['All', 'Pending', 'Approved', 'Rejected'], value: statusFilter, onChange: (e) => setStatusFilter(e.target.value) },
          { label: 'Program', options: ['All Programs', ...programs.map((program) => program.name)], value: programFilter, onChange: (e) => setProgramFilter(e.target.value) },
          { label: 'Region', options: ['All Regions', 'Bengaluru Urban', 'Mysuru', 'Tumakuru', 'Hubballi'], value: regionFilter, onChange: (e) => setRegionFilter(e.target.value) },
        ]}
      />
      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {['All', 'Pending', 'Approved', 'Rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  statusFilter === status
                    ? 'bg-slate-950 text-white'
                    : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          <Table
            columns={[
              { key: 'studentName', label: 'Student' },
              { key: 'category', label: 'Category' },
              { key: 'amount', label: 'Amount', render: (value) => currency(value) },
              { key: 'programName', label: 'Program' },
              { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value} /> },
              {
                key: 'review',
                label: 'Review',
                render: (_, row) => (
                  <button onClick={() => setSelectedExpense(row)} className="text-sm font-semibold text-brand-600">Open</button>
                ),
              },
            ]}
            rows={visibleRecords.slice(0, 14)}
          />
        </div>
        <div className="space-y-6">
          <SectionCard title="Receipt Preview" subtitle="Mock preview panel for receipts and proofs">
            <div className="aspect-[4/5] rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6">
              <p className="text-sm text-slate-500">{selectedExpense ? `${selectedExpense.studentName} - ${selectedExpense.category}` : 'Select an expense to review'}</p>
              <p className="mt-2 text-xs text-slate-400">In backend phase this panel can support actual image or PDF previews.</p>
            </div>
            {selectedExpense ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <MetricPill label="Amount" value={selectedExpense.amount} format="currency" />
                <MetricPill label="Status" value={selectedExpense.status} />
                <MetricPill label="Program" value={selectedExpense.programName} />
                <MetricPill label="Date" value={selectedExpense.date || '2026-04-04'} />
              </div>
            ) : null}
            <div className="mt-4 flex gap-3">
              <button disabled={!selectedExpense} onClick={() => updateExpenseStatus('Approved')} className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Approve</button>
              <button disabled={!selectedExpense} onClick={() => updateExpenseStatus('Rejected')} className="rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Reject</button>
            </div>
          </SectionCard>
          <ModalCard title="Remarks Panel" description="Capture why a receipt is approved, flagged, or rejected.">
            <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3" rows="4" placeholder="Enter verification remarks"></textarea>
          </ModalCard>
        </div>
      </div>
    </div>
  );
};

export const AlertsPage = () => {
  const { addNotification } = useAuth();
  const [localAlerts, setLocalAlerts] = useState(alerts);
  const [selectedAlert, setSelectedAlert] = useState(alerts[0] ?? null);
  const [caseNote, setCaseNote] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All Severities');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [recipientType, setRecipientType] = useState('owner');
  const [mailForm, setMailForm] = useState({ to: '', subject: '', body: '' });
  const [communicationLog, setCommunicationLog] = useState([]);

  const adminUser = allUsers.find((user) => user.role === 'ADMIN');

  const buildRecipient = (alert, type) => {
    const studentProfile = students.find((student) => student.name === alert?.studentName);
    const ownerUser = allUsers.find((user) => user.name === alert?.owner);
    const studentUser = allUsers.find((user) => user.name === alert?.studentName || user.studentId === studentProfile?.studentId);

    if (type === 'student') {
      return {
        label: studentProfile?.name || alert?.studentName || 'Student',
        email: studentUser?.email || `${(alert?.studentName || 'student').toLowerCase().replace(/[^a-z0-9]+/g, '.')}@student.in`,
      };
    }

    if (type === 'admin') {
      return {
        label: adminUser?.name || 'Admin Desk',
        email: adminUser?.email || 'admin@ngo.org',
      };
    }

    return {
      label: ownerUser?.name || alert?.owner || 'Case Owner',
      email: ownerUser?.email || `${(alert?.owner || 'owner').toLowerCase().replace(/[^a-z0-9]+/g, '.')}@ngo.org`,
    };
  };

  const buildMailDraft = (alert, type) => {
    const recipient = buildRecipient(alert, type);
    const studentProfile = students.find((student) => student.name === alert?.studentName);
    const performanceSummary = studentProfile
      ? `Attendance: ${studentProfile.attendance}% | Academic average: ${studentProfile.average} | Funds received: ${currency(studentProfile.fundsReceived)}`
      : 'Performance snapshot will be synced once backend monitoring is connected.';
    const recommendedAction =
      alert?.type === 'Low Attendance'
        ? 'Please review the attendance pattern and initiate guardian follow-up within 48 hours.'
        : alert?.type === 'Poor Grades'
          ? 'Please schedule an academic intervention plan and update subject remediation notes.'
          : alert?.type === 'Missing Proofs'
            ? 'Please collect and validate the missing proof documents before the next approval cycle.'
            : 'Please review the case details and take the next operational step.';

    return {
      to: recipient.email,
      subject: `[${alert?.severity || 'Info'}] ${alert?.type || 'Student Alert'} - ${alert?.studentName || 'Beneficiary'}`,
      body: `Dear ${recipient.label},\n\nThis is an automated alert notification from the NGO Education Performance & Scholarship Management System.\n\nStudent: ${alert?.studentName || 'N/A'}\nAlert type: ${alert?.type || 'N/A'}\nSeverity: ${alert?.severity || 'N/A'}\nCurrent status: ${alert?.status || 'Open'}\n\nIssue summary:\n${alert?.message || 'No alert summary available.'}\n\nCurrent monitoring snapshot:\n${performanceSummary}\n\nRecommended next action:\n${recommendedAction}\n\nOperational notes:\n${caseNote || 'No additional case note has been added yet.'}\n\nPlease update the case workbench once action is completed.\n\nRegards,\nNGO Operations Desk`,
    };
  };

  useEffect(() => {
    if (!selectedAlert) return;

    const suggestedRecipient = selectedAlert.type === 'Missing Proofs' ? 'student' : selectedAlert.severity === 'Critical' ? 'owner' : 'admin';
    setRecipientType(suggestedRecipient);
    setMailForm(buildMailDraft(selectedAlert, suggestedRecipient));
  }, [selectedAlert, caseNote]);

  const updateAlertStatus = (targetAlert, nextStatus) => {
    setLocalAlerts((current) => current.map((alert) => (alert.id === targetAlert.id ? { ...alert, status: nextStatus, note: caseNote || alert.note } : alert)));
    setSelectedAlert((current) => (current?.id === targetAlert.id ? { ...current, status: nextStatus, note: caseNote || current.note } : current));
    addNotification('Alert updated', `${targetAlert.studentName} alert moved to ${nextStatus}.`, nextStatus === 'Resolved' ? 'Success' : 'Info');
    setCaseNote('');
  };

  const handleRecipientChange = (nextType) => {
    setRecipientType(nextType);
    if (selectedAlert) {
      setMailForm(buildMailDraft(selectedAlert, nextType));
    }
  };

  const handleSendMail = () => {
    if (!selectedAlert || !mailForm.to || !mailForm.subject.trim() || !mailForm.body.trim()) {
      alert('Please complete the recipient, subject, and email body before sending.');
      return;
    }

    const logEntry = {
      id: `mail-${Date.now()}`,
      studentName: selectedAlert.studentName,
      type: selectedAlert.type,
      recipient: mailForm.to,
      recipientLabel: buildRecipient(selectedAlert, recipientType).label,
      subject: mailForm.subject,
      status: 'Sent',
      sentAt: 'Just now',
    };

    setCommunicationLog((current) => [logEntry, ...current]);
    addNotification('Alert email sent', `Structured notification sent to ${mailForm.to} for ${selectedAlert.studentName}.`, 'Success');
  };

  const filteredAlerts = localAlerts.filter((alert) => {
    const matchesSeverity = severityFilter === 'All Severities' || alert.severity === severityFilter;
    const matchesType = typeFilter === 'All Types' || alert.type === typeFilter;
    const matchesStatus = statusFilter === 'All Status' || alert.status === statusFilter;
    return matchesSeverity && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Risk Engine" title="Alerts & Risk" description="Monitor students needing action due to low attendance, grades, missing proofs, or pending approvals." />
      <FilterBar
        filters={[
          { label: 'Severity', options: ['All Severities', 'Critical', 'Warning', 'Info'], value: severityFilter, onChange: (e) => setSeverityFilter(e.target.value) },
          { label: 'Type', options: ['All Types', 'Low Attendance', 'Poor Grades', 'Missing Proofs'], value: typeFilter, onChange: (e) => setTypeFilter(e.target.value) },
          { label: 'Status', options: ['All Status', 'Open', 'In Progress', 'Pending Approval', 'Resolved', 'Flagged'], value: statusFilter, onChange: (e) => setStatusFilter(e.target.value) },
        ]}
      />
      <div className="grid gap-4 xl:grid-cols-3">
        {filteredAlerts.slice(0, 6).map((alert) => (
          <SectionCard key={alert.id} title={alert.studentName} subtitle={alert.type}>
            <div className="space-y-3 text-sm text-slate-500">
              <StatusBadge status={alert.severity} />
              <p>{alert.message}</p>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setSelectedAlert(alert)} className="rounded-2xl bg-brand-50 px-4 py-2 text-xs font-semibold text-brand-700">Review</button>
                <button onClick={() => updateAlertStatus(alert, 'In Progress')} className="rounded-2xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white">Open case</button>
                <button onClick={() => updateAlertStatus(alert, 'Resolved')} className="rounded-2xl bg-white px-4 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">Resolve</button>
              </div>
            </div>
          </SectionCard>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <Table
          columns={[
            { key: 'studentName', label: 'Student' },
            { key: 'type', label: 'Type' },
            { key: 'severity', label: 'Severity', render: (value) => <StatusBadge status={value} /> },
            { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value} /> },
            { key: 'owner', label: 'Owner' },
            {
              key: 'actions',
              label: 'Actions',
              render: (_, row) => (
                <div className="flex gap-2">
                  <button onClick={() => setSelectedAlert(row)} className="text-sm font-semibold text-brand-600">Open</button>
                  <button onClick={() => updateAlertStatus(row, 'Resolved')} className="text-sm font-semibold text-emerald-600">Resolve</button>
                </div>
              ),
            },
          ]}
          rows={filteredAlerts}
        />
        <div className="space-y-6">
          <SectionCard title="Case Workbench" subtitle="Track the current alert, assign next action, and close the loop.">
            {selectedAlert ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <MetricPill label="Student" value={selectedAlert.studentName} />
                  <MetricPill label="Owner" value={selectedAlert.owner} />
                  <MetricPill label="Severity" value={selectedAlert.severity} />
                  <MetricPill label="Status" value={selectedAlert.status} />
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">{selectedAlert.message}</div>
                <textarea value={caseNote} onChange={(e) => setCaseNote(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3" rows="5" placeholder="Add intervention notes, guardian outreach details, or field follow-up actions"></textarea>
                <div className="flex gap-3 flex-wrap">
                  <button onClick={() => updateAlertStatus(selectedAlert, 'In Progress')} className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">Open Case</button>
                  <button onClick={() => updateAlertStatus(selectedAlert, 'Resolved')} className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">Resolve Case</button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Select an alert to begin case monitoring.</p>
            )}
          </SectionCard>

          <SectionCard title="Automated Notification Composer" subtitle="Generate a structured alert email for the appropriate recipient and send it from this workflow.">
            {selectedAlert ? (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    { key: 'owner', label: 'Case Owner' },
                    { key: 'student', label: 'Student' },
                    { key: 'admin', label: 'Admin Desk' },
                  ].map((option) => (
                    <button
                      key={option.key}
                      onClick={() => handleRecipientChange(option.key)}
                      className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${recipientType === option.key ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-700 ring-1 ring-slate-200'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="grid gap-4">
                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Recipient Email</p>
                    <input value={mailForm.to} onChange={(e) => setMailForm({ ...mailForm, to: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3" placeholder="recipient@example.com" />
                  </div>
                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Email Subject</p>
                    <input value={mailForm.subject} onChange={(e) => setMailForm({ ...mailForm, subject: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3" placeholder="Structured alert subject" />
                  </div>
                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Structured Email Body</p>
                    <textarea value={mailForm.body} onChange={(e) => setMailForm({ ...mailForm, body: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3" rows="12" placeholder="Automated message body"></textarea>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  <span>Recommended for this alert: <b className="text-slate-900">{buildRecipient(selectedAlert, recipientType).label}</b></span>
                  <button onClick={handleSendMail} className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">Send Email</button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Select an alert to generate a structured email draft.</p>
            )}
          </SectionCard>

          <SectionCard title="Communication Log" subtitle="Frontend-only sent history for operational validation.">
            {communicationLog.length ? (
              <div className="space-y-3">
                {communicationLog.map((mail) => (
                  <div key={mail.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{mail.subject}</p>
                        <p className="mt-1 text-sm text-slate-500">To: {mail.recipientLabel} ({mail.recipient})</p>
                      </div>
                      <StatusBadge status={mail.status} />
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-400">{mail.studentName} - {mail.type} - {mail.sentAt}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No alert emails sent yet in this session.</p>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
};

export const ReportsPage = () => {
  const { addNotification } = useAuth();
  const [dateFilter, setDateFilter] = useState('This Month');
  const [programFilter, setProgramFilter] = useState('All Programs');
  const [regionFilter, setRegionFilter] = useState('All Regions');
  const [studentFilter, setStudentFilter] = useState('All Students');
  const [funderFilter, setFunderFilter] = useState('All Funders');

  const filteredStudents = students.filter((student) => {
    const matchesProgram = programFilter === 'All Programs' || student.programName === programFilter;
    const matchesRegion = regionFilter === 'All Regions' || student.region === regionFilter;
    const matchesStudent = studentFilter === 'All Students' || student.name === studentFilter;
    return matchesProgram && matchesRegion && matchesStudent;
  });

  const filteredReports = reportSnapshots.filter((report) => {
    const matchesDate =
      dateFilter === 'This Month' ? report.period.includes('2025') || report.period.includes('12 Months') :
      dateFilter === 'Last Quarter' ? report.period.includes('Oct-Dec') || report.period.includes('12 Months') :
      true;
    const matchesProgram = programFilter === 'All Programs' || report.description.toLowerCase().includes(programFilter.split(' ')[0].toLowerCase());
    const matchesRegion = regionFilter === 'All Regions' || report.description.includes(regionFilter) || regionFilter === 'Bengaluru Urban';
    const matchesFunder = funderFilter === 'All Funders' || report.title.toLowerCase().includes('funder') || report.description.toLowerCase().includes(funderFilter.split(' ')[0].toLowerCase());
    return matchesDate && matchesProgram && matchesRegion && matchesFunder;
  });

  const handleExportReportPDF = (report) => {
    exportReportPackPDF({
      report,
      filters: {
        dateRange: dateFilter,
        program: programFilter,
        region: regionFilter,
        student: studentFilter,
        funder: funderFilter,
      },
      studentRows: filteredStudents.map((student) => ({
        student_name: student.name,
        program: student.programName,
        attendance: `${student.attendance}%`,
        marks: `${student.average}%`,
      })),
      filename: `${report.title.replace(/[^a-z0-9]+/gi, '_')}.pdf`,
    });
    addNotification('Report exported', `${report.title} was exported as PDF.`, 'Success');
  };

  const handleExportReportXLS = (report) => {
    const rows = filteredStudents.map((student) => ({
      report: report.title,
      reporting_period: report.period,
      student_name: student.name,
      grade: student.grade,
      region: student.region,
      program: student.programName,
      attendance_percent: student.attendance,
      academic_average: student.average,
      funds_received: student.fundsReceived,
      academic_status: student.academicStatus,
      risk_level: student.riskLevel,
    }));

    exportRowsToCSV(
      rows.length ? rows : [{ report: report.title, reporting_period: report.period, note: 'No student rows available for current filters' }],
      `${report.title.replace(/[^a-z0-9]+/gi, '_')}.csv`
    );
    addNotification('Report exported', `${report.title} was exported as CSV/XLS-ready data.`, 'Success');
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Reporting Center" title="Reports" description="Build NGO and CSR-friendly reporting views with export-oriented cards, filters, and narrative preview sections." />
      <KPIGrid
        items={[
          { label: 'Reports Ready', value: filteredReports.length, helper: 'Available for export in current filter view' },
          { label: 'Regions Covered', value: new Set(filteredStudents.map((student) => student.region)).size || 0, helper: 'Active regions in current scope' },
          { label: 'Students Included', value: filteredStudents.length, helper: 'Impact and finance reports scoped' },
          { label: 'Funder Packs', value: filteredReports.length, helper: 'Partner-specific transparency decks' },
        ]}
      />
      <FilterBar
        filters={[
          { label: 'Date Range', options: ['This Month', 'Last Quarter', 'FY 2025-26'], value: dateFilter, onChange: (e) => setDateFilter(e.target.value) },
          { label: 'Program', options: ['All Programs', ...programs.map((program) => program.name)], value: programFilter, onChange: (e) => setProgramFilter(e.target.value) },
          { label: 'Region', options: ['All Regions', 'Bengaluru Urban', 'Mysuru', 'Tumakuru', 'Hubballi'], value: regionFilter, onChange: (e) => setRegionFilter(e.target.value) },
          { label: 'Student', options: ['All Students', ...students.slice(0, 10).map((student) => student.name)], value: studentFilter, onChange: (e) => setStudentFilter(e.target.value) },
          { label: 'Funder', options: ['All Funders', 'Tata CSR Foundation', 'Infosys Social Impact', 'Wipro Education Trust'], value: funderFilter, onChange: (e) => setFunderFilter(e.target.value) },
        ]}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr,1fr]">
        <SectionCard title="Report Preview Cards" subtitle="Prepared report narratives and exports">
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <div key={report.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">{report.title}</p>
                  <StatusBadge status={report.status} />
                </div>
                <p className="mt-2 text-sm text-slate-500">{report.description}</p>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => handleExportReportPDF(report)} className="rounded-2xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white">Export PDF</button>
                  <button onClick={() => handleExportReportXLS(report)} className="rounded-2xl bg-white px-4 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">Export XLS</button>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Impact Trend" subtitle="Sample visual panel for reporting">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredStudents.slice(0, 6).map((student, index) => ({ name: studentFilter === 'All Students' ? `Cohort ${index + 1}` : student.name.split(' ')[0], attendance: student.attendance, marks: student.average }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="attendance" stroke="#1d70f5" strokeWidth={3} />
                <Line type="monotone" dataKey="marks" stroke="#159f6b" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export const AuditLogsPage = () => {
  const [entityFilter, setEntityFilter] = useState('All Entities');
  const [userFilter, setUserFilter] = useState('All Users');
  const [dateFilter, setDateFilter] = useState('Today');

  const filteredLogs = auditLogs.filter((log) => {
    const matchesEntity = entityFilter === 'All Entities' || log.entity === entityFilter;
    const matchesUser = userFilter === 'All Users' || log.actor === userFilter;
    const matchesDate =
      dateFilter === 'Today' ? log.timestamp.startsWith('2026-04-04') :
      dateFilter === 'Last 7 Days' ? log.timestamp.startsWith('2026-04') :
      true;
    return matchesEntity && matchesUser && matchesDate;
  });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Governance Trail" title="Audit Logs" description="A front-end audit trail preview for actions taken across users, entities, and workflow milestones." />
      <FilterBar
        filters={[
          { label: 'Entity', options: ['All Entities', 'Program', 'Student', 'Expense', 'Report', 'User'], value: entityFilter, onChange: (e) => setEntityFilter(e.target.value) },
          { label: 'User', options: ['All Users', 'Admin Desk', 'Kavya Reddy', 'Sahana Patil', 'System'], value: userFilter, onChange: (e) => setUserFilter(e.target.value) },
          { label: 'Date', options: ['Today', 'Last 7 Days', 'This Month'], value: dateFilter, onChange: (e) => setDateFilter(e.target.value) },
        ]}
      />
      <Table
        columns={[
          { key: 'timestamp', label: 'Timestamp' },
          { key: 'actor', label: 'Actor' },
          { key: 'action', label: 'Action', render: (value) => <StatusBadge status={value} /> },
          { key: 'entity', label: 'Entity' },
          { key: 'entityId', label: 'Entity ID' },
          { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value} /> },
        ]}
        rows={filteredLogs}
      />
    </div>
  );
};

export const NotificationsPage = () => {
  const { notifications, markNotificationRead, clearNotifications } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader 
        eyebrow="Inbox" 
        title="Notifications" 
        description="Stay updated with scholarship actions, required uploads, and performance acknowledgements across your NGO portfolio." 
        actions={[
          <button key="clear" onClick={clearNotifications} className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 transition">Clear All</button>
        ]}
      />
      <div className="grid gap-4">
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <SectionCard 
              key={notification.id} 
              className={`transition-all ${!notification.read ? 'border-brand-200 bg-brand-50/20' : ''}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4">
                  <div className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                    notification.type === 'Success' ? 'bg-emerald-100 text-emerald-600' :
                    notification.type === 'Warning' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h4 className={`text-lg font-bold ${!notification.read ? 'text-slate-950' : 'text-slate-600'}`}>{notification.title}</h4>
                      <StatusBadge status={notification.type} />
                      {!notification.read && <div className="h-2 w-2 rounded-full bg-brand-500 animate-pulse" />}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-slate-500">{notification.description}</p>
                    <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">{notification.time || 'Recently'}</p>
                  </div>
                </div>
                {!notification.read && (
                  <button 
                    onClick={() => markNotificationRead(notification.id)}
                    className="rounded-xl bg-slate-950 px-3 py-1.5 text-[11px] font-bold text-white shadow-soft hover:bg-slate-900 transition"
                  >
                    Mark as Read
                  </button>
                )}
              </div>
            </SectionCard>
          ))
        ) : (
          <SectionCard className="py-20 text-center">
            <Bell className="mx-auto h-12 w-12 text-slate-200" />
            <h3 className="mt-4 text-xl font-bold text-slate-950">No notifications yet</h3>
            <p className="mt-2 text-sm text-slate-500">We'll alert you here when something important happens.</p>
          </SectionCard>
        )}
      </div>
    </div>
  );
};

export const MyScholarshipPage = () => {
  const { user } = useAuth();
  const student = students.find((item) => item.id === user.studentId) || students[0];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Scholarship Overview" title="My Scholarship" description="Student-friendly summary of funding, conditions, and utilization expectations." />
      <KPIGrid
        items={[
          { label: 'Approved', value: currency(student.scholarshipApproved), helper: 'Total approved scholarship amount' },
          { label: 'Disbursed', value: currency(student.fundsReceived), helper: 'Received so far' },
          { label: 'Program', value: student.programName, helper: 'Primary support stream' },
          { label: 'Pending Proofs', value: student.pendingDocs.length || 1, helper: 'Needed before next installment' },
        ]}
      />
      <Table
        columns={[
          { key: 'label', label: 'Installment' },
          { key: 'amount', label: 'Amount', render: (value) => currency(value) },
          { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value} /> },
          { key: 'date', label: 'Date' },
        ]}
        rows={student.installments}
      />
    </div>
  );
};

export const StudentsImpactPage = () => (
  <div className="space-y-6">
    <PageHeader eyebrow="Impact Lens" title="Students Impact" description="A funder-facing rollup of beneficiary outcomes and story-ready operational evidence." />
    <div className="grid gap-6 lg:grid-cols-3">
      {students.slice(0, 6).map((student) => (
        <SectionCard key={student.id} title={student.name} subtitle={`${student.programName} - ${student.region}`}>
          <div className="grid gap-3">
            <MetricPill label="Attendance" value={student.attendance} format="percent" />
            <MetricPill label="Average" value={student.average} />
            <StatusBadge status={student.academicStatus} />
          </div>
        </SectionCard>
      ))}
    </div>
  </div>
);

export const FundUtilizationPage = () => {
  const summary = useMemo(() => programs.map((program) => ({ ...program, remaining: program.budget - program.allocated })), []);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Utilization Transparency" title="Fund Utilization" description="Program-wise spend tracking designed for CSR visibility and internal accountability." />
      <Table
        columns={[
          { key: 'name', label: 'Program' },
          { key: 'budget', label: 'Budget', render: (value) => currency(value) },
          { key: 'allocated', label: 'Utilized', render: (value) => currency(value) },
          { key: 'remaining', label: 'Remaining', render: (value) => currency(value) },
          { key: 'utilization', label: 'Utilization', render: (value) => `${value}%` },
        ]}
        rows={summary}
      />
    </div>
  );
};

export const AdminSettingsPage = () => {
  const { settings, updateSettings } = useAuth();
  const [localSettings, setLocalSettings] = useState(settings);

  const handleSave = () => {
    updateSettings(localSettings);
    alert('Global system settings updated successfully.');
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow="System Governance"
        title="Admin Settings"
        description="Configure global thresholds, financial limits, and operational frequencies for the entire NGO portfolio."
      />

      <div className="grid gap-6">
        <SectionCard title="Performance Thresholds" subtitle="Define the triggers for students needing attention and risk alerts.">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Attendance Low Threshold (%)</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="50"
                  max="95"
                  value={localSettings.attendanceThreshold}
                  onChange={(e) => setLocalSettings({ ...localSettings, attendanceThreshold: parseInt(e.target.value) })}
                  className="h-2 flex-1 accent-brand-500"
                />
                <span className="w-12 text-right font-bold text-slate-900">{localSettings.attendanceThreshold}%</span>
              </div>
              <p className="text-xs text-slate-500">Students below this attendance will trigger 'Critical' alerts for field managers.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Academic Underperformance (%)</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="35"
                  max="80"
                  value={localSettings.academicThreshold}
                  onChange={(e) => setLocalSettings({ ...localSettings, academicThreshold: parseInt(e.target.value) })}
                  className="h-2 flex-1 accent-brand-500"
                />
                <span className="w-12 text-right font-bold text-slate-900">{localSettings.academicThreshold}%</span>
              </div>
              <p className="text-xs text-slate-500">Marks averages below this point will be flagged for academic intervention.</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Operational Controls" subtitle="Standardize field visits and verification workflows.">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Home Visiting Frequency</label>
              <select
                value={localSettings.homeVisitFrequency}
                onChange={(e) => setLocalSettings({ ...localSettings, homeVisitFrequency: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500/10"
              >
                <option value="Weekly">Weekly</option>
                <option value="Bi-Weekly">Bi-Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
              </select>
              <p className="text-xs text-slate-500">Target frequency for field managers conducting home visits for high-risk cohorts.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">System Notification Mode</label>
              <select className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none opacity-50 cursor-not-allowed">
                <option>Active Alerts + Email</option>
                <option>Active Alerts Only</option>
              </select>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Financial Governance" subtitle="Set hard limits for individual scholarship allocations and disbursement caps.">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Maximum Student Scholarship (INR)</label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  value={localSettings.maxScholarship}
                  onChange={(e) => setLocalSettings({ ...localSettings, maxScholarship: parseInt(e.target.value) })}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500/10"
                />
              </div>
              <p className="text-xs text-slate-500">The total cumulative fund that can be approved for a single beneficiary per academic cycle.</p>
            </div>
          </div>
        </SectionCard>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className="rounded-2xl bg-slate-950 px-8 py-3.5 text-sm font-bold text-white shadow-soft transition-transform active:scale-95"
          >
            Save Global Settings
          </button>
        </div>
      </div>
    </div>
  );
};







