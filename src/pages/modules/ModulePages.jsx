import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
import { AlertCircle, AlertTriangle } from 'lucide-react';
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
  auditLogs,
  disbursements,
  expenseRecords,
  notifications,
  programs,
  students,
} from '../../data/mockData';
import { currency } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { exportReportPackPDF, exportRowsToCSV } from '../../utils/exportUtils';
import { supabase } from '../../lib/supabaseClient';
import { importWorkbookToSupabase, parseSchoolWorkbook } from '../../utils/schoolImport';
import { sendDbAuditLog } from '../../utils/dbAudit';

const ModalShell = ({ open, children }) =>
  open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto">{children}</div>
    </div>
  ) : null;

const playWriteAlertTone = () => {
  if (typeof window === 'undefined') return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const notes = [
    { frequency: 523.25, duration: 0.08 },
    { frequency: 659.25, duration: 0.12 },
  ];

  let cursor = context.currentTime;
  notes.forEach((note) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = note.frequency;
    gain.gain.setValueAtTime(0.0001, cursor);
    gain.gain.exponentialRampToValueAtTime(0.03, cursor + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, cursor + note.duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(cursor);
    oscillator.stop(cursor + note.duration);
    cursor += note.duration + 0.03;
  });
};

const WriteConfirmModal = ({
  open,
  title,
  description,
  impactLines = [],
  confirmationLabel = 'Confirm write',
  acknowledge,
  onAcknowledge,
  onCancel,
  onConfirm,
  busy = false,
}) => (
  <ModalShell open={open}>
    <ModalCard title={title} description={description}>
      <div className="space-y-5">
        <div className="rounded-[24px] border border-amber-200 bg-amber-50/90 p-5 dark:border-amber-500/25 dark:bg-amber-500/10">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-amber-100 p-3 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">This action writes to the live database.</p>
              <div className="space-y-1 text-sm text-slate-600 dark:text-white/70">
                {impactLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/75">
          <input type="checkbox" checked={acknowledge} onChange={(e) => onAcknowledge(e.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300" />
          <span>I understand this change will update live records and should be logged as an operational action.</span>
        </label>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-5 dark:border-white/10">
          <button onClick={onCancel} className="rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:text-white/70 dark:hover:bg-white/5">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!acknowledge || busy}
            className="rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Applying...' : confirmationLabel}
          </button>
        </div>
      </div>
    </ModalCard>
  </ModalShell>
);

const studentStorageKey = 'school_master_students';

const modalFieldClass =
  'w-full appearance-none rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-white/10 dark:bg-[#2a211c] dark:text-white dark:placeholder:text-white/35 dark:focus:border-brand-400 dark:focus:ring-brand-500/20';

const modalLabelClass = 'mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-white/55';

const schoolSections = ['A', 'B', 'C'];

const getClassLabel = (grade) => {
  if (grade <= 0) return 'Nursery/PP3';
  return `Grade ${grade}`;
};

const getSectionCode = (student, index = 0) => schoolSections[index % schoolSections.length] || student.sectionCode || 'A';

const inferGender = (student) => {
  const femaleNames = ['Ananya', 'Priyanka', 'Juhi', 'Mansi', 'Meghana'];
  const firstName = student.name?.split(' ')[0];
  return femaleNames.includes(firstName) ? 'Female' : 'Male';
};

const padStudentNumber = (value) => `${value}`.replace(/\D/g, '').padStart(10, '0').slice(0, 10);

const buildSchoolStudent = (student, index = 0) => {
  const classLabel = student.classLabel || getClassLabel(student.grade);
  const sectionCode = student.sectionCode || getSectionCode(student, index);
  const entryStatus =
    student.entryStatus ||
    (student.pendingDocs?.length ? 'In Progress' : student.academicStatus === 'Review' ? 'Draft' : 'Completed');
  const updatedBy = student.updatedBy || (student.academicStatus === 'Needs Attention' ? 'AM' : 'PM');
  const updatedById = student.updatedById || '27221100349';

  return {
    ...student,
    classLabel,
    sectionCode,
    sectionLabel: `${sectionCode} (${classLabel.replace('Grade ', 'Std ')})`,
    academicYear: student.academicYear || '2025-26',
    pen: student.pen || padStudentNumber(student.studentId || student.id || index + 1),
    gender: student.gender || inferGender(student),
    dateOfBirth: student.dateOfBirth || `15/0${(index % 8) + 1}/20${12 + (index % 8)}`,
    entryStatus,
    aadhaarVerified: student.aadhaarVerified ?? student.attendance >= 85,
    updatedOn: student.updatedOn || (student.riskLevel === 'High' ? '12/01/2026 08:49:56' : '16/09/2025 07:00:49'),
    updatedBy,
    updatedById,
    isNewStudent: student.isNewStudent ?? index < 2,
    incompleteCount: student.incompleteCount ?? (student.pendingDocs?.length || (entryStatus === 'Completed' ? 0 : 1)),
    enrolmentProfile: {
      schoolName: student.school,
      program: student.programName,
      currentGrade: classLabel,
      section: sectionCode,
      admissionType: student.fundsReceived > 0 ? 'Scholarship Renewal' : 'Fresh Entry',
      rollNumber: student.studentId || `ROLL-${index + 1}`,
      region: student.region,
      guardianName: student.guardian?.name || 'Not assigned',
      guardianPhone: student.guardian?.phone || '-',
      ...(student.enrolmentProfile || {}),
    },
    facilityProfile: {
      transport: student.expenses?.some((expense) => expense.category.toLowerCase().includes('bus')) ? 'Enabled' : 'Not Assigned',
      books: student.expenses?.some((expense) => expense.category.toLowerCase().includes('book')) ? 'Issued' : 'Pending',
      digitalAccess: student.expenses?.some((expense) => expense.category.toLowerCase().includes('internet') || expense.category.toLowerCase().includes('laptop')) ? 'Enabled' : 'Not Required',
      scholarshipSupport: currency(student.scholarshipApproved || 0),
      interventionLevel: student.riskLevel,
      notes: student.pendingDocs?.length ? `Pending: ${student.pendingDocs.join(', ')}` : 'All core facilities mapped.',
      ...(student.facilityProfile || {}),
    },
  };
};

const loadStoredStudents = () => {
  try {
    const stored = localStorage.getItem(studentStorageKey);
    if (!stored) {
      return students.map((student, index) => buildSchoolStudent(student, index));
    }
    const parsed = JSON.parse(stored);
    return parsed.map((student, index) => buildSchoolStudent(student, index));
  } catch {
    return students.map((student, index) => buildSchoolStudent(student, index));
  }
};

const persistStudents = (rows) => {
  localStorage.setItem(studentStorageKey, JSON.stringify(rows));
};

const formatStudentDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB');
};

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getPreviewAttendanceValue = (previewProfile = {}, generalProfile = {}) => {
  return toFiniteNumber(
    previewProfile.attendance_percent ??
    previewProfile.attendance ??
    generalProfile.attendance_percent ??
    0
  );
};

const getPreviewAverageValue = (previewProfile = {}, enrolmentProfile = {}) => {
  return toFiniteNumber(
    previewProfile.academic_average ??
    previewProfile.average ??
    enrolmentProfile.academic_average ??
    0
  );
};

const mapSchoolDataRow = (row, index = 0) => {
  const generalProfile = row.general_profile || {};
  const enrolmentProfile = row.enrolment_profile || {};
  const facilityProfile = row.facility_profile || {};
  const previewProfile = row.preview_profile || {};
  const fallbackGrade = row.class_name?.match(/\d+/)?.[0];
  const grade = fallbackGrade ? Number(fallbackGrade) : 10;

  return buildSchoolStudent(
    {
      id: row.id,
      pen: row.pen,
      name: row.student_name,
      grade,
      classLabel: row.class_name || getClassLabel(grade),
      sectionCode: row.section_name || 'A',
      school: row.school_name || generalProfile.school_name || 'Not available',
      gender: row.gender || 'Unknown',
      dateOfBirth: formatStudentDate(row.date_of_birth),
      entryStatus: row.entry_status || 'Draft',
      aadhaarVerified: row.aadhaar_verified,
      updatedOn: row.updated_on ? new Date(row.updated_on).toLocaleString('en-GB') : 'Not updated',
      updatedBy: row.updated_by || 'ADMIN',
      updatedById: row.updated_by_id || 'system',
      isNewStudent: row.is_new_student,
      programName: row.program_name || enrolmentProfile.future_goal || 'Not assigned',
      scholarshipApproved: Number(row.approved_amount || 0),
      fundsReceived: Number(row.received_amount || 0),
      guardian: {
        name: row.guardian_name || enrolmentProfile.guardianName || 'Not assigned',
        relation: generalProfile.guardian_relation || '-',
        phone: row.guardian_phone || generalProfile.parent_contact_no || '-',
      },
      academicYear: row.academic_year || '2025-26',
      attendance: getPreviewAttendanceValue(previewProfile, generalProfile),
      average: getPreviewAverageValue(previewProfile, enrolmentProfile),
      academicStatus: previewProfile.academic_status || row.entry_status || 'Draft',
      riskLevel: facilityProfile.interventionLevel || previewProfile.risk_level || 'Low',
      pendingDocs: previewProfile.pending_docs || [],
      enrolmentProfile: {
        schoolName: row.school_name,
        program: row.program_name,
        currentGrade: row.class_name,
        section: row.section_name,
        admissionType: enrolmentProfile.admission_type || 'Fresh Entry',
        rollNumber: enrolmentProfile.roll_number || row.pen,
        region: enrolmentProfile.region || row.source_sheet || '-',
        guardianName: row.guardian_name || 'Not assigned',
        guardianPhone: row.guardian_phone || '-',
        futureGoal: enrolmentProfile.future_goal || '-',
        collegeName11th: enrolmentProfile.college_name_11th || '-',
        enrolledIn11th: enrolmentProfile.enrolled_in_11th || '-',
        coachingClassName: enrolmentProfile.coaching_class_name || '-',
      },
      facilityProfile: {
        transport: facilityProfile.transport || 'Not Assigned',
        books: facilityProfile.books || 'Pending',
        digitalAccess: facilityProfile.digitalAccess || 'Not Required',
        scholarshipSupport: currency(Number(row.approved_amount || 0)),
        interventionLevel: facilityProfile.interventionLevel || 'Low',
        notes: facilityProfile.notes || previewProfile.notes || 'No notes recorded.',
        amount11th: facilityProfile.amount_11th || 0,
        amount12th: facilityProfile.amount_12th || 0,
        amount14th: facilityProfile.amount_14th || 0,
        amount15th: facilityProfile.amount_15th || 0,
      },
      previewProfile: previewProfile,
      marks: previewProfile.marks || [],
      expenses: previewProfile.expenses || [],
      attendanceHistory: previewProfile.attendance_history || [],
      alerts: previewProfile.alerts || [],
      region: enrolmentProfile.region || row.source_sheet || '-',
    },
    index
  );
};

const fetchSchoolDataStudents = async () => {
  const { data, error } = await supabase.from('school_data').select('*').order('student_name');
  if (error) throw error;
  return (data || []).map((row, index) => mapSchoolDataRow(row, index));
};

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
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [studentsData, setStudentsData] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [studentError, setStudentError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('All Classes');
  const [sectionFilter, setSectionFilter] = useState('All Sections');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [expandedClass, setExpandedClass] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    academicYear: '2025-26',
    grade: 'Nursery/PP3',
    section: 'A',
    pen: '',
    dateOfBirth: '',
    school: '',
    gender: 'Male',
    guardianName: '',
    guardianPhone: '',
    program: 'STEM Excellence Scholarship',
    approvedAmount: '',
    receivedAmount: '0',
    entryStatus: 'Draft',
  });
  const [bulkAssignProgram, setBulkAssignProgram] = useState('STEM Excellence Scholarship');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [confirmState, setConfirmState] = useState({ open: false, title: '', description: '', impactLines: [], confirmationLabel: 'Confirm write', acknowledge: false, busy: false, onConfirm: null });

  useEffect(() => {
    if (confirmState.open) {
      playWriteAlertTone();
    }
  }, [confirmState.open]);

  const openWriteConfirmation = ({ title, description, impactLines, confirmationLabel, onConfirm }) => {
    setConfirmState({
      open: true,
      title,
      description,
      impactLines,
      confirmationLabel: confirmationLabel || 'Confirm write',
      acknowledge: false,
      busy: false,
      onConfirm,
    });
  };

  const closeWriteConfirmation = () =>
    setConfirmState({ open: false, title: '', description: '', impactLines: [], confirmationLabel: 'Confirm write', acknowledge: false, busy: false, onConfirm: null });

  const loadStudents = async () => {
    try {
      setLoadingStudents(true);
      setStudentError('');
      const { data, error } = await supabase.from('school_data').select('*').order('student_name');
      if (error) throw error;
      const normalized = (data || []).map((row, index) => mapSchoolDataRow(row, index));
      setStudentsData(normalized);
      if (!expandedClass && normalized.length) {
        setExpandedClass(normalized[0].classLabel);
      }
    } catch (error) {
      setStudentError(error.message || 'Unable to load student data from Supabase.');
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const classOptions = useMemo(
    () => ['All Classes', ...new Set(studentsData.map((student) => student.classLabel))],
    [studentsData]
  );

  const filteredStudents = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return studentsData.filter((student) => {
      const matchesSearch =
        !search ||
        student.name.toLowerCase().includes(search) ||
        student.school.toLowerCase().includes(search) ||
        student.pen.toLowerCase().includes(search) ||
        student.guardian.name.toLowerCase().includes(search);
      const matchesClass = gradeFilter === 'All Classes' || student.classLabel === gradeFilter;
      const matchesSection = sectionFilter === 'All Sections' || student.sectionCode === sectionFilter;
      const matchesStatus = statusFilter === 'All Status' || student.entryStatus === statusFilter;
      return matchesSearch && matchesClass && matchesSection && matchesStatus;
    });
  }, [gradeFilter, searchTerm, sectionFilter, statusFilter, studentsData]);

  const classSummaryRows = useMemo(
    () =>
      [...new Set(filteredStudents.map((student) => student.classLabel))]
        .map((classLabel) => {
          const classStudents = filteredStudents.filter((student) => student.classLabel === classLabel);
          return {
            id: classLabel,
            classLabel,
            boys: classStudents.filter((student) => student.gender === 'Male').length,
            girls: classStudents.filter((student) => student.gender === 'Female').length,
            transgender: classStudents.filter((student) => student.gender === 'Transgender').length,
            totalStudents: classStudents.length,
            incompleteStudents: classStudents.filter((student) => student.entryStatus !== 'Completed').length,
          };
        })
        .sort((a, b) => a.classLabel.localeCompare(b.classLabel, undefined, { numeric: true })),
    [filteredStudents]
  );

  const activeClass = gradeFilter !== 'All Classes' ? gradeFilter : expandedClass || classSummaryRows[0]?.classLabel || '';

  const sectionSummaryRows = useMemo(
    () =>
      schoolSections
        .map((sectionCode) => {
          const sectionStudents = filteredStudents.filter(
            (student) => student.classLabel === activeClass && student.sectionCode === sectionCode
          );
          return {
            id: `${activeClass}-${sectionCode}`,
            classLabel: activeClass,
            sectionAlias: `${sectionCode} (${activeClass?.replace('Grade ', 'Std ') || 'Section'})`,
            sectionCode,
            boys: sectionStudents.filter((student) => student.gender === 'Male').length,
            girls: sectionStudents.filter((student) => student.gender === 'Female').length,
            transgender: sectionStudents.filter((student) => student.gender === 'Transgender').length,
            totalStudents: sectionStudents.length,
            incompleteStudents: sectionStudents.filter((student) => student.entryStatus !== 'Completed').length,
          };
        })
        .filter((section) => section.totalStudents > 0 || sectionFilter !== 'All Sections'),
    [activeClass, filteredStudents, sectionFilter]
  );

  const activeSection = sectionFilter !== 'All Sections' ? sectionFilter : sectionSummaryRows[0]?.sectionCode || 'A';

  const registerRows = useMemo(
    () =>
      filteredStudents.filter(
        (student) => student.classLabel === activeClass && student.sectionCode === activeSection
      ),
    [activeClass, activeSection, filteredStudents]
  );

  const resetStudentForm = () =>
    setFormData({
      name: '',
      academicYear: '2025-26',
      grade: 'Nursery/PP3',
      section: 'A',
      pen: '',
      dateOfBirth: '',
      school: '',
      gender: 'Male',
      guardianName: '',
      guardianPhone: '',
      program: 'STEM Excellence Scholarship',
      approvedAmount: '',
      receivedAmount: '0',
      entryStatus: 'Draft',
    });

  const handleCreateStudent = async () => {
    if (!formData.name.trim() || !formData.school.trim() || !formData.pen.trim()) {
      alert('Please fill in student name, PEN, and school.');
      return;
    }

    const className = formData.grade;
    const approvedAmount = Number(formData.approvedAmount || settings.maxScholarship || 0);
    const receivedAmount = Number(formData.receivedAmount || 0);
    const payload = {
      academic_year: formData.academicYear,
      source_sheet: 'Manual Entry',
      class_name: className,
      section_name: formData.section,
      pen: formData.pen.trim(),
      student_name: formData.name.trim(),
      gender: formData.gender,
      date_of_birth: formData.dateOfBirth || null,
      school_name: formData.school.trim(),
      guardian_name: formData.guardianName.trim() || null,
      guardian_phone: formData.guardianPhone.trim() || null,
      aadhaar_verified: false,
      entry_status: formData.entryStatus,
      is_new_student: true,
      updated_on: new Date().toISOString(),
      updated_by: 'ADMIN',
      updated_by_id: 'manual-create',
      program_name: formData.program,
      approved_amount: approvedAmount,
      received_amount: receivedAmount,
      general_profile: {
        guardian_relation: 'Parent',
        parent_contact_no: formData.guardianPhone.trim() || null,
      },
      enrolment_profile: {
        section: formData.section,
        roll_number: formData.pen.trim(),
        school_name: formData.school.trim(),
        guardianName: formData.guardianName.trim() || null,
        guardianPhone: formData.guardianPhone.trim() || null,
        region: 'Manual Entry',
      },
      facility_profile: {
        scholarshipSupport: currency(approvedAmount),
        interventionLevel: formData.entryStatus === 'Completed' ? 'Low' : 'Moderate',
      },
      preview_profile: {
        attendance: 0,
        academic_average: 0,
        academic_status: formData.entryStatus,
        pending_docs: formData.entryStatus === 'Completed' ? [] : ['Complete student profile'],
      },
    };

    openWriteConfirmation({
      title: 'Confirm Student Creation',
      description: 'Review the write before adding a new live student record.',
      impactLines: [
        `Student: ${payload.student_name}`,
        `Class: ${className} / Section ${formData.section}`,
        `PEN: ${payload.pen}`,
      ],
      confirmationLabel: 'Create student',
      onConfirm: async () => {
        try {
          setConfirmState((current) => ({ ...current, busy: true }));
          setStudentError('');

          const { error } = await supabase.from('school_data').insert([payload]);
          if (error) throw error;
          await sendDbAuditLog({
            action: 'INSERT',
            entity: 'school_data',
            summary: `Student created: ${payload.student_name}`,
            payload: { pen: payload.pen, class_name: payload.class_name, section_name: payload.section_name },
          });
          addNotification('Student added', `${formData.name.trim()} was added to ${className} - Section ${formData.section}.`, 'Success');
          closeWriteConfirmation();
          setIsModalOpen(false);
          resetStudentForm();
          setExpandedClass(className);
          setGradeFilter(className);
          setSectionFilter(formData.section);
          await loadStudents();
        } catch (error) {
          setStudentError(error.message || 'Unable to create student.');
          setConfirmState((current) => ({ ...current, busy: false }));
        }
      },
    });
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

    openWriteConfirmation({
      title: 'Confirm Bulk Program Assignment',
      description: 'This will update the selected live student records.',
      impactLines: [
        `Students selected: ${selectedStudents.length}`,
        `New program: ${bulkAssignProgram}`,
      ],
      confirmationLabel: 'Apply assignment',
      onConfirm: async () => {
        try {
          setConfirmState((current) => ({ ...current, busy: true }));
          const { error } = await supabase
            .from('school_data')
            .update({ program_name: bulkAssignProgram, updated_on: new Date().toISOString(), updated_by: 'ADMIN', updated_by_id: 'bulk-assign' })
            .in('id', selectedStudents);
          if (error) throw error;
          await sendDbAuditLog({
            action: 'UPDATE',
            entity: 'school_data',
            summary: `Bulk program assignment applied to ${selectedStudents.length} students`,
            payload: { student_ids: selectedStudents, program_name: bulkAssignProgram },
          });
          addNotification('Bulk assignment completed', `${selectedStudents.length} students were moved to ${bulkAssignProgram}.`, 'Success');
          closeWriteConfirmation();
          setBulkAssignOpen(false);
          setSelectedStudents([]);
          await loadStudents();
        } catch (error) {
          setStudentError(error.message || 'Unable to bulk assign students.');
          setConfirmState((current) => ({ ...current, busy: false }));
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      <WriteConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        impactLines={confirmState.impactLines}
        confirmationLabel={confirmState.confirmationLabel}
        acknowledge={confirmState.acknowledge}
        onAcknowledge={(value) => setConfirmState((current) => ({ ...current, acknowledge: value }))}
        onCancel={closeWriteConfirmation}
        onConfirm={() => confirmState.onConfirm?.()}
        busy={confirmState.busy}
      />
      <PageHeader
        eyebrow="School Master"
        title="Class And Student Register"
        description="Live student register powered by Supabase `school_data`, organized in the same class -> section -> student workflow discussed earlier."
        actions={[
          <button key="add-student" onClick={() => setIsModalOpen(true)} className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">Add Student</button>,
          <button key="bulk-assign" onClick={() => setBulkAssignOpen(true)} className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">Bulk Assign Program</button>,
          <button key="refresh" onClick={loadStudents} className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">Refresh</button>,
        ]}
      />
      {studentError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{studentError}</div> : null}
      <KPIGrid
        items={[
          { label: 'Classes In Scope', value: classSummaryRows.length, helper: 'Visible after current filters' },
          { label: 'Students Listed', value: filteredStudents.length, helper: 'Current register count' },
          { label: 'Incomplete Profiles', value: filteredStudents.filter((student) => student.entryStatus !== 'Completed').length, helper: 'Need follow-up before completion' },
          { label: 'Selected Students', value: selectedStudents.length, helper: 'Ready for bulk assignment' },
        ]}
      />
      <FilterBar
        filters={[
          { label: 'Search', type: 'search', placeholder: 'Search student, PEN, school, or guardian', value: searchTerm, onChange: (e) => setSearchTerm(e.target.value) },
          { label: 'Class/Grade', options: classOptions, value: gradeFilter, onChange: (e) => { setGradeFilter(e.target.value); setExpandedClass(e.target.value === 'All Classes' ? classSummaryRows[0]?.classLabel || '' : e.target.value); } },
          { label: 'Section', options: ['All Sections', ...schoolSections], value: sectionFilter, onChange: (e) => setSectionFilter(e.target.value) },
          { label: 'Entry Status', options: ['All Status', 'Completed', 'In Progress', 'Draft'], value: statusFilter, onChange: (e) => setStatusFilter(e.target.value) },
        ]}
      />
      {loadingStudents ? <SectionCard><p className="text-sm text-slate-500">Loading students from Supabase...</p></SectionCard> : null}
      {!loadingStudents ? (
        <>
          <SectionCard title="Class Summary" subtitle="Top-level class totals similar to the client reference screens.">
            <div className="overflow-hidden rounded-[28px] border border-slate-200">
              <div className="grid grid-cols-[1.4fr,0.7fr,0.7fr,0.9fr,1fr,1.1fr] bg-slate-900 px-5 py-4 text-sm font-bold text-white">
                <span>Class/Grade</span>
                <span>Boys</span>
                <span>Girls</span>
                <span>Transgender</span>
                <span>Total Students</span>
                <span>Incomplete Students</span>
              </div>
              <div className="divide-y divide-slate-200 bg-white">
                {classSummaryRows.map((row) => (
                  <button
                    key={row.id}
                    onClick={() => {
                      setExpandedClass(row.classLabel);
                      setGradeFilter(row.classLabel);
                      setSectionFilter('All Sections');
                    }}
                    className={`grid w-full grid-cols-[1.4fr,0.7fr,0.7fr,0.9fr,1fr,1.1fr] px-5 py-5 text-left text-sm transition ${
                      activeClass === row.classLabel ? 'bg-brand-100/70 text-slate-950' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-semibold">{row.classLabel}</span>
                    <span>{row.boys}</span>
                    <span>{row.girls}</span>
                    <span>{row.transgender}</span>
                    <span>{row.totalStudents}</span>
                    <span>{row.incompleteStudents}</span>
                  </button>
                ))}
              </div>
            </div>
          </SectionCard>

          <SectionCard title={`${activeClass || 'Class'} Sections`} subtitle="Section-wise split under the selected class.">
            <Table
              columns={[
                { key: 'classLabel', label: 'Class/Grade' },
                { key: 'sectionAlias', label: 'Section (Alias)' },
                { key: 'boys', label: 'Boys' },
                { key: 'girls', label: 'Girls' },
                { key: 'transgender', label: 'Transgender' },
                { key: 'totalStudents', label: 'Total Students' },
                { key: 'incompleteStudents', label: 'Incomplete Students' },
                {
                  key: 'action',
                  label: 'Action',
                  render: (_, row) => (
                    <button onClick={() => setSectionFilter(row.sectionCode)} className="rounded-xl border border-brand-300 px-3 py-1.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50">
                      View/Manage
                    </button>
                  ),
                },
              ]}
              rows={sectionSummaryRows}
            />
          </SectionCard>

          <SectionCard title="Student Register" subtitle={`Showing ${activeClass || 'all classes'}${sectionFilter !== 'All Sections' ? ` - Section ${activeSection}` : ''}`}>
            <Table
              columns={[
                {
                  key: 'select',
                  label: 'Select',
                  render: (_, row) => (
                    <input type="checkbox" checked={selectedStudents.includes(row.id)} onChange={() => toggleStudentSelection(row.id)} className="h-4 w-4 rounded border-slate-300" />
                  ),
                },
                { key: 'classLabel', label: 'Class/Grade' },
                { key: 'sectionCode', label: 'Section' },
                {
                  key: 'pen',
                  label: 'PEN',
                  render: (value, row) => (
                    <div>
                      <p className="font-semibold text-slate-900">{value}</p>
                      {row.isNewStudent ? <span className="mt-1 inline-flex rounded-lg bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">New Student</span> : null}
                    </div>
                  ),
                },
                {
                  key: 'name',
                  label: "Student's Name",
                  render: (value, row) => (
                    <button onClick={() => navigate(`/students/${row.id}`)} className="text-left font-semibold text-brand-700 hover:text-brand-500">
                      {value}
                    </button>
                  ),
                },
                { key: 'gender', label: 'Gender' },
                { key: 'dateOfBirth', label: 'Date of Birth' },
                { key: 'entryStatus', label: 'Entry Status', render: (value) => <StatusBadge status={value} /> },
                {
                  key: 'updatedOn',
                  label: 'Last Updated (On/By)',
                  render: (_, row) => (
                    <div className="space-y-1">
                      <div className="flex gap-1.5">
                        {['GP', 'EP', 'FP'].map((item) => (
                          <span key={item} className="rounded-lg bg-accent-500 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">{item}</span>
                        ))}
                      </div>
                      <p className="text-xs text-slate-500">Updated on {row.updatedOn}</p>
                      <p className="text-xs italic text-slate-700">{row.updatedBy} by {row.updatedById}</p>
                    </div>
                  ),
                },
              ]}
              rows={registerRows}
            />
          </SectionCard>
        </>
      ) : null}

      <ModalShell open={isModalOpen}>
        <ModalCard title="Add New Student" description="Create a live student record in Supabase with the same school-style fields used in the register.">
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className={modalLabelClass}>Student Name</span>
              <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={modalFieldClass} placeholder="Student name" />
            </label>
            <label>
              <span className={modalLabelClass}>PEN</span>
              <input value={formData.pen} onChange={(e) => setFormData({ ...formData, pen: e.target.value })} className={modalFieldClass} placeholder="Permanent Education Number" />
            </label>
            <label>
              <span className={modalLabelClass}>Academic Year</span>
              <select value={formData.academicYear} onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })} className={modalFieldClass}>
                {['2025-26', '2026-27', '2027-28'].map((year) => <option key={year} value={year} className="bg-white text-slate-900 dark:bg-[#221b17] dark:text-white">{year}</option>)}
              </select>
            </label>
            <label>
              <span className={modalLabelClass}>Class / Grade</span>
              <select value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value })} className={modalFieldClass}>
                {['Nursery/PP3', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map((grade) => <option key={grade} value={grade} className="bg-white text-slate-900 dark:bg-[#221b17] dark:text-white">{grade}</option>)}
              </select>
            </label>
            <label>
              <span className={modalLabelClass}>Section</span>
              <select value={formData.section} onChange={(e) => setFormData({ ...formData, section: e.target.value })} className={modalFieldClass}>
                {schoolSections.map((section) => <option key={section} value={section} className="bg-white text-slate-900 dark:bg-[#221b17] dark:text-white">Section {section}</option>)}
              </select>
            </label>
            <label>
              <span className={modalLabelClass}>Gender</span>
              <select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} className={modalFieldClass}>
                {['Male', 'Female', 'Transgender'].map((gender) => <option key={gender} className="bg-white text-slate-900 dark:bg-[#221b17] dark:text-white">{gender}</option>)}
              </select>
            </label>
            <label>
              <span className={modalLabelClass}>Date Of Birth</span>
              <input type="date" value={formData.dateOfBirth} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} className={modalFieldClass} />
            </label>
            <label>
              <span className={modalLabelClass}>School Name</span>
              <input value={formData.school} onChange={(e) => setFormData({ ...formData, school: e.target.value })} className={modalFieldClass} placeholder="School name" />
            </label>
            <label>
              <span className={modalLabelClass}>Guardian Name</span>
              <input value={formData.guardianName} onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })} className={modalFieldClass} placeholder="Guardian name" />
            </label>
            <label>
              <span className={modalLabelClass}>Guardian Phone</span>
              <input value={formData.guardianPhone} onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })} className={modalFieldClass} placeholder="Guardian phone" />
            </label>
            <label>
              <span className={modalLabelClass}>Program</span>
              <select value={formData.program} onChange={(e) => setFormData({ ...formData, program: e.target.value })} className={modalFieldClass}>
                {programs.map((p) => <option key={p.id} value={p.name} className="bg-white text-slate-900 dark:bg-[#221b17] dark:text-white">{p.name}</option>)}
              </select>
            </label>
            <label>
              <span className={modalLabelClass}>Approved Amount</span>
              <input value={formData.approvedAmount} onChange={(e) => setFormData({ ...formData, approvedAmount: e.target.value })} className={modalFieldClass} placeholder={`Default ${settings.maxScholarship}`} />
            </label>
            <label>
              <span className={modalLabelClass}>Received Amount</span>
              <input value={formData.receivedAmount} onChange={(e) => setFormData({ ...formData, receivedAmount: e.target.value })} className={modalFieldClass} placeholder="Received amount" />
            </label>
            <label>
              <span className={modalLabelClass}>Entry Status</span>
              <select value={formData.entryStatus} onChange={(e) => setFormData({ ...formData, entryStatus: e.target.value })} className={modalFieldClass}>
                {['Draft', 'In Progress', 'Completed'].map((status) => <option key={status} value={status} className="bg-white text-slate-900 dark:bg-[#221b17] dark:text-white">{status}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-white/5 dark:text-white/65">
            This form writes directly to <code>public.school_data</code> and refreshes the class register after insert.
          </div>
          <div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-6 dark:border-white/10">
            <button onClick={() => { setIsModalOpen(false); resetStudentForm(); }} className="rounded-2xl px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:text-white/70 dark:hover:bg-white/5">Cancel</button>
            <button onClick={handleCreateStudent} className="rounded-2xl bg-slate-950 px-6 py-2.5 text-sm font-semibold text-white shadow-soft">Create Student</button>
          </div>
        </ModalCard>
      </ModalShell>

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
    </div>
  );
};

const OverviewTab = ({ student }) => (
  <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
    <SectionCard title="Profile" subtitle="Student, school, and guardian snapshot">
      <div className="grid gap-4">
        <MetricPill label="Student Name" value={student.name} />
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

const StudentProfileDetailTable = ({ rows }) => (
  <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
    <table className="min-w-full text-left">
      <tbody>
        {rows.map((row, index) => (
          <tr key={row.label} className="border-b border-slate-100 last:border-b-0">
            <td className="w-14 px-4 py-4 text-sm font-bold text-slate-500">{index + 1}.</td>
            <td className="w-[38%] px-4 py-4 text-sm font-semibold text-slate-700">{row.label}</td>
            <td className="px-4 py-4 text-sm text-slate-900">{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const StudentProfileHeaderCard = ({ student }) => (
  <SectionCard className="border-sky-200 bg-gradient-to-r from-sky-50 to-white shadow-soft">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <span><strong>Student Name</strong> - {student.name}</span>
          <span className="text-slate-300">|</span>
          <span><strong>Class</strong> - {student.classLabel}</span>
          <span className="text-slate-300">|</span>
          <span><strong>Section</strong> - {student.sectionCode}</span>
          <span className="text-slate-300">|</span>
          <span><strong>Academic Year</strong> - {student.academicYear}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <span><strong>Permanent Education Number</strong> - {student.pen}</span>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${student.aadhaarVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
            {student.aadhaarVerified ? 'Student Aadhaar Verified' : 'Aadhaar Verification Pending'}
          </span>
        </div>
      </div>
      <Link to="/students" className="inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
        Back
      </Link>
    </div>
  </SectionCard>
);

const StudentProfileSteps = ({ activeTab, tabs, onChange }) => (
  <div className="grid gap-4 lg:grid-cols-4">
    {tabs.map((tab, index) => (
      <button
        key={tab}
        onClick={() => onChange(tab)}
        className={`rounded-[24px] border px-5 py-5 text-left transition ${
          activeTab === tab ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
        }`}
      >
        <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full border text-sm font-bold ${activeTab === tab ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 text-slate-600'}`}>
          {index + 1}
        </div>
        <p className="text-lg font-semibold">{tab}</p>
      </button>
    ))}
  </div>
);

export const StudentProfilePage = () => {
  const { studentId } = useParams();
  const [activeTab, setActiveTab] = useState('General Profile');
  const [student, setStudent] = useState(null);
  const [loadingStudent, setLoadingStudent] = useState(true);
  const [studentError, setStudentError] = useState('');
  const tabs = ['General Profile', 'Enrolment Profile', 'Facility Profile', 'Profile Preview'];

  useEffect(() => {
    const loadStudent = async () => {
      try {
        setLoadingStudent(true);
        setStudentError('');
        const { data, error } = await supabase.from('school_data').select('*').eq('id', studentId).single();
        if (error) throw error;
        setStudent(mapSchoolDataRow(data));
      } catch (error) {
        setStudentError(error.message || 'Unable to load student profile.');
      } finally {
        setLoadingStudent(false);
      }
    };

    loadStudent();
  }, [studentId]);

  if (loadingStudent) {
    return <SectionCard><p className="text-sm text-slate-500">Loading student profile...</p></SectionCard>;
  }

  if (studentError || !student) {
    return <SectionCard><p className="text-sm text-rose-700">{studentError || 'Student not found.'}</p></SectionCard>;
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Student Detail" title={student.name} description="A school-style student profile built around the class register workflow." />
      <StudentProfileHeaderCard student={student} />
      <StudentProfileSteps activeTab={activeTab} tabs={tabs} onChange={setActiveTab} />
      {activeTab === 'General Profile' && (
        <SectionCard title="General Information Of Student" subtitle="Core identity details aligned to the school record view.">
          <StudentProfileDetailTable
            rows={[
              { label: "Student's Name (as per school record / admission register)", value: student.name },
              { label: 'Gender (as per school record / admission register)', value: student.gender },
              { label: 'Date of Birth (DD/MM/YYYY)', value: student.dateOfBirth },
              { label: 'Permanent Education Number', value: student.pen },
              { label: 'School Name', value: student.school },
              { label: 'Guardian Name', value: `${student.guardian.name} (${student.guardian.relation})` },
              { label: 'Guardian Contact Number', value: student.guardian.phone },
              { label: 'Current Entry Status', value: student.entryStatus },
            ]}
          />
        </SectionCard>
      )}
      {activeTab === 'Enrolment Profile' && (
        <SectionCard title="Enrolment Profile" subtitle="Class placement, school mapping, and operational enrolment fields.">
          <StudentProfileDetailTable
            rows={[
              { label: 'Academic Year', value: student.academicYear },
              { label: 'Class / Grade', value: student.classLabel },
              { label: 'Section', value: student.sectionCode },
              { label: 'Program Mapping', value: student.programName },
              { label: 'Admission Type', value: student.enrolmentProfile.admissionType },
              { label: 'Roll Number / Student Code', value: student.enrolmentProfile.rollNumber },
              { label: 'Region', value: student.enrolmentProfile.region },
              { label: 'Future Goal', value: student.enrolmentProfile.futureGoal || '-' },
            ]}
          />
        </SectionCard>
      )}
      {activeTab === 'Facility Profile' && (
        <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
          <SectionCard title="Facility Profile" subtitle="Support services, scholarship details, and assistance visibility.">
            <StudentProfileDetailTable
              rows={[
                { label: 'Transport Support', value: student.facilityProfile.transport },
                { label: 'Books / Stationery', value: student.facilityProfile.books },
                { label: 'Digital Access', value: student.facilityProfile.digitalAccess },
                { label: 'Scholarship Support', value: student.facilityProfile.scholarshipSupport },
                { label: 'Intervention Level', value: student.facilityProfile.interventionLevel },
                { label: 'Facility Notes', value: student.facilityProfile.notes },
              ]}
            />
          </SectionCard>
          <SectionCard title="Financial Snapshot" subtitle="Simple scholarship summary pulled from the live row.">
            <div className="grid gap-4 md:grid-cols-2">
              <MetricPill label="Approved Amount" value={student.scholarshipApproved} format="currency" />
              <MetricPill label="Received Amount" value={student.fundsReceived} format="currency" />
              <MetricPill label="11th Amount" value={student.facilityProfile.amount11th} format="currency" />
              <MetricPill label="12th Amount" value={student.facilityProfile.amount12th} format="currency" />
            </div>
          </SectionCard>
        </div>
      )}
      {activeTab === 'Profile Preview' && (
        <div className="space-y-6">
          <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
            Note: After verifying all the filled student data, users should proceed to complete the data entry and lock the profile.
          </div>
          <KPIGrid
            items={[
              { label: 'General Profile', value: 'Completed', helper: 'Identity details mapped', badge: 'Success' },
              { label: 'Enrolment Profile', value: 'Completed', helper: 'Class, section, and school assigned', badge: 'Success' },
              { label: 'Facility Profile', value: student.entryStatus === 'Completed' ? 'Completed' : 'Review', helper: 'Support mapping and services', badge: student.entryStatus === 'Completed' ? 'Success' : 'Warning' },
              { label: 'Profile Status', value: student.entryStatus, helper: 'Current completion state' },
            ]}
          />
          <SectionCard title="Profile Preview" subtitle="Combined view before final completion.">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Completion Status</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{student.entryStatus}</p>
                <p className="mt-2 text-sm text-slate-500">Last updated on {student.updatedOn} by {student.updatedBy} ({student.updatedById}).</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Verification State</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{student.aadhaarVerified ? 'Verified' : 'Pending'}</p>
                <p className="mt-2 text-sm text-slate-500">Profile is ready for completion once all required school details are checked.</p>
              </div>
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
};

export const AttendancePage = () => {
  const { addNotification } = useAuth();
  const [register, setRegister] = useState([]);
  const [selectedDate, setSelectedDate] = useState('2026-04-04');
  const [selectedClass, setSelectedClass] = useState('All Classes');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmState, setConfirmState] = useState({ open: false, acknowledge: false, busy: false });

  useEffect(() => {
    if (confirmState.open) playWriteAlertTone();
  }, [confirmState.open]);

  useEffect(() => {
    fetchSchoolDataStudents()
      .then((students) => {
        setRegister(
          students.map((student) => ({
            id: student.id,
            studentName: student.name,
            className: student.classLabel,
            status:
              student.previewProfile.attendance_status ||
              (student.attendance >= 90 ? 'Present' : student.attendance >= 75 ? 'Late' : 'Absent'),
            remarks: student.previewProfile.attendance_remark || (student.attendance ? `${student.attendance}% attendance score` : 'No attendance recorded'),
            previewProfile: student.previewProfile || {},
          }))
        );
      })
      .catch((err) => setError(err.message || 'Unable to load attendance data.'))
      .finally(() => setLoading(false));
  }, []);

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

  const handleSave = async () => {
    const rowsToSave = register.filter((row) => selectedClass === 'All Classes' || row.className === selectedClass);
    setConfirmState({
      open: true,
      acknowledge: false,
      busy: false,
      title: 'Confirm Attendance Update',
      description: 'This will update live attendance records in the database.',
      impactLines: [`Date: ${selectedDate}`, `Rows to update: ${rowsToSave.length}`, `Scope: ${selectedClass}`],
      confirmationLabel: 'Save attendance',
      onConfirm: async () => {
        try {
          setConfirmState((current) => ({ ...current, busy: true }));
          for (const row of rowsToSave) {
            const nextPreview = {
              ...row.previewProfile,
              attendance_status: row.status,
              attendance_remark: row.remarks,
              attendance_date: selectedDate,
            };
            const { error } = await supabase
              .from('school_data')
              .update({ preview_profile: nextPreview, updated_on: new Date().toISOString(), updated_by: 'ADMIN', updated_by_id: 'attendance-page' })
              .eq('id', row.id);
            if (error) throw error;
          }
          await sendDbAuditLog({
            action: 'UPDATE',
            entity: 'school_data',
            summary: `Attendance saved for ${rowsToSave.length} student rows`,
            payload: { date: selectedDate, className: selectedClass, rowCount: rowsToSave.length },
          });
          addNotification('Attendance saved', `Attendance for ${selectedClass} on ${selectedDate} was updated successfully.`, 'Success');
          setConfirmState({ open: false, acknowledge: false, busy: false });
        } catch (err) {
          setError(err.message || 'Unable to save attendance.');
          setConfirmState((current) => ({ ...current, busy: false }));
        }
      },
    });
  };

  const filteredRegister = register.filter((row) => selectedClass === 'All Classes' || row.className === selectedClass);

  const summary = filteredRegister.reduce(
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
      <WriteConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        impactLines={confirmState.impactLines || []}
        confirmationLabel={confirmState.confirmationLabel}
        acknowledge={confirmState.acknowledge}
        onAcknowledge={(value) => setConfirmState((current) => ({ ...current, acknowledge: value }))}
        onCancel={() => setConfirmState({ open: false, acknowledge: false, busy: false })}
        onConfirm={() => confirmState.onConfirm?.()}
        busy={confirmState.busy}
      />
      <PageHeader eyebrow="Attendance Workflow" title="Attendance" description="Fast teacher-friendly attendance marking with day-level controls and trend visibility." />
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <SectionCard title="Mark Attendance" subtitle="Live attendance updates backed by the school data table.">
          <div className="mb-4 grid gap-3 lg:grid-cols-[1fr,1fr,auto]">
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5" />
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5">
              {['All Classes', ...new Set(register.map((row) => row.className))].map((option) => <option key={option}>{option}</option>)}
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
            rows={filteredRegister}
          />
        </SectionCard>
        <SectionCard title="Trend Summary" subtitle="Snapshot of recent class attendance health">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredRegister.slice(0, 6).map((student) => ({ name: student.studentName.split(' ')[0], attendance: student.status === 'Present' ? 100 : student.status === 'Late' ? 80 : 60 }))}>
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
  const [marksRows, setMarksRows] = useState([]);
  const [studentDirectory, setStudentDirectory] = useState([]);
  const [error, setError] = useState('');
  const [confirmState, setConfirmState] = useState({ open: false, acknowledge: false, busy: false });
  const [entryForm, setEntryForm] = useState({
    studentId: '',
    subject: '',
    assessment: '',
    latest: '',
    teacherRemark: '',
    className: 'All Classes',
  });

  useEffect(() => {
    fetchSchoolDataStudents()
      .then((students) => {
        setStudentDirectory(students);
        const rows = students.flatMap((student) =>
          (student.marks?.length ? student.marks : [{ subject: 'Overall', latest: student.average || 0, term1: student.average || 0, term2: student.average || 0 }]).map((mark) => ({
            id: `${student.id}-${mark.subject}`,
            studentId: student.id,
            studentName: student.name,
            className: student.classLabel,
            subject: mark.subject,
            assessment: 'Imported',
            latest: mark.latest,
            status: 'Uploaded',
            teacherRemark: mark.teacherRemark || 'Imported from profile data',
          }))
        );
        setMarksRows(rows);
      })
      .catch((err) => setError(err.message || 'Unable to load academic records.'));
  }, []);

  useEffect(() => {
    if (confirmState.open) playWriteAlertTone();
  }, [confirmState.open]);

  const saveEntry = async (mode) => {
    if (!entryForm.studentId || !entryForm.subject || !entryForm.latest || !entryForm.assessment) {
      alert('Please complete class, student, assessment, and score.');
      return;
    }

    const student = studentDirectory.find((item) => item.id === entryForm.studentId);
    const newRow = {
      ...entryForm,
      studentName: student?.name || '',
      latest: Number(entryForm.latest),
      status: mode === 'upload' ? 'Uploaded' : 'Draft',
    };

    const existingMarks = student?.marks || [];
    const nextMarks = [
      ...existingMarks.filter((mark) => mark.subject !== entryForm.subject),
      { subject: entryForm.subject, latest: Number(entryForm.latest), term1: Number(entryForm.latest), term2: Number(entryForm.latest), teacherRemark: entryForm.teacherRemark },
    ];
    const nextPreview = {
      ...(student?.previewProfile || {}),
      marks: nextMarks,
      academic_average: Number(entryForm.latest),
    };

    setConfirmState({
      open: true,
      acknowledge: false,
      busy: false,
      title: mode === 'upload' ? 'Confirm Marks Upload' : 'Confirm Draft Save',
      description: 'This action will update live academic data for the selected student.',
      impactLines: [
        `Student: ${student?.name || 'Student'}`,
        `Subject: ${entryForm.subject}`,
        `Score: ${entryForm.latest}`,
      ],
      confirmationLabel: mode === 'upload' ? 'Upload marks' : 'Save draft',
      onConfirm: async () => {
        try {
          setConfirmState((current) => ({ ...current, busy: true }));
          setMarksRows([newRow, ...marksRows]);
          const { error } = await supabase
            .from('school_data')
            .update({ preview_profile: nextPreview, updated_on: new Date().toISOString(), updated_by: 'ADMIN', updated_by_id: 'academics-page' })
            .eq('id', entryForm.studentId);
          if (error) throw error;
          await sendDbAuditLog({
            action: 'UPDATE',
            entity: 'school_data',
            summary: `Academic record ${mode} for ${student?.name || 'student'}`,
            payload: { studentId: entryForm.studentId, subject: entryForm.subject, latest: Number(entryForm.latest) },
          });
          addNotification(mode === 'upload' ? 'Marks uploaded' : 'Draft saved', `${entryForm.subject} marks for ${student?.name || 'student'} were ${mode === 'upload' ? 'uploaded' : 'saved as draft'}.`, 'Success');
          setConfirmState({ open: false, acknowledge: false, busy: false });
          setEntryForm({ studentId: '', subject: '', assessment: '', latest: '', teacherRemark: '', className: 'All Classes' });
        } catch (err) {
          setError(err.message || 'Unable to save academic record.');
          setConfirmState((current) => ({ ...current, busy: false }));
        }
      },
    });
  };

  const filteredMarksRows = marksRows.filter((row) => entryForm.className === 'All Classes' || row.className === entryForm.className);

  return (
    <div className="space-y-6">
      <WriteConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        impactLines={confirmState.impactLines || []}
        confirmationLabel={confirmState.confirmationLabel}
        acknowledge={confirmState.acknowledge}
        onAcknowledge={(value) => setConfirmState((current) => ({ ...current, acknowledge: value }))}
        onCancel={() => setConfirmState({ open: false, acknowledge: false, busy: false })}
        onConfirm={() => confirmState.onConfirm?.()}
        busy={confirmState.busy}
      />
      <PageHeader eyebrow="Academic Records" title="Academics" description="Subject-wise marks capture, remarking, and trend review in one workspace." />
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <SectionCard title="Marks Entry" subtitle="Live marks capture and updates stored against each student profile.">
          <div className="grid gap-4 md:grid-cols-2">
            <select value={entryForm.className} onChange={(e) => setEntryForm({ ...entryForm, className: e.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              {['All Classes', ...new Set(studentDirectory.map((student) => student.classLabel))].map((grade) => <option key={grade}>{grade}</option>)}
            </select>
            <select value={entryForm.studentId} onChange={(e) => setEntryForm({ ...entryForm, studentId: e.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <option value="">Select student</option>
              {studentDirectory
                .filter((student) => entryForm.className === 'All Classes' || student.classLabel === entryForm.className)
                .map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
            </select>
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
            rows={filteredMarksRows}
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
  const [liveStudents, setLiveStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [dateFilter, setDateFilter] = useState('This Month');
  const [programFilter, setProgramFilter] = useState('All Programs');
  const [regionFilter, setRegionFilter] = useState('All Regions');
  const [studentFilter, setStudentFilter] = useState('All Students');
  const [tableSearch, setTableSearch] = useState('');

  useEffect(() => {
    const loadStudents = async () => {
      try {
        setLoading(true);
        setLoadError('');
        const students = await fetchSchoolDataStudents();
        setLiveStudents(students);
      } catch (error) {
        setLoadError(error.message || 'Unable to load report data.');
        setLiveStudents([]);
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, []);

  const matchesDateRange = (student) => {
    if (dateFilter === 'FY 2025-26') return true;
    const sourceDate = student.updatedOn || '';
    const parsed = new Date(sourceDate);
    if (Number.isNaN(parsed.getTime())) return dateFilter !== 'This Month';
    const now = new Date();

    if (dateFilter === 'This Month') {
      return parsed.getMonth() === now.getMonth() && parsed.getFullYear() === now.getFullYear();
    }

    if (dateFilter === 'Last Quarter') {
      const quarterStart = new Date(now.getFullYear(), Math.max(0, now.getMonth() - 3), 1);
      return parsed >= quarterStart && parsed <= now;
    }

    return true;
  };

  const filteredStudents = useMemo(
    () =>
      liveStudents.filter((student) => {
        const matchesProgram = programFilter === 'All Programs' || student.programName === programFilter;
        const matchesRegion = regionFilter === 'All Regions' || student.region === regionFilter;
        const matchesStudent = studentFilter === 'All Students' || student.name === studentFilter;
        const matchesSearch =
          !tableSearch.trim() ||
          [student.name, student.programName, student.region, student.school]
            .filter(Boolean)
            .some((value) => `${value}`.toLowerCase().includes(tableSearch.trim().toLowerCase()));

        return matchesProgram && matchesRegion && matchesStudent && matchesSearch && matchesDateRange(student);
      }),
    [dateFilter, liveStudents, programFilter, regionFilter, studentFilter, tableSearch]
  );

  const reportSummary = useMemo(() => {
    const totalApproved = filteredStudents.reduce((sum, student) => sum + (student.scholarshipApproved || 0), 0);
    const totalReceived = filteredStudents.reduce((sum, student) => sum + (student.fundsReceived || 0), 0);
    const completed = filteredStudents.filter((student) => `${student.entryStatus}`.toLowerCase() === 'completed').length;
    const avgAttendance = filteredStudents.length
      ? Math.round(filteredStudents.reduce((sum, student) => sum + Number(student.attendance || 0), 0) / filteredStudents.length)
      : 0;

    return {
      totalApproved,
      totalReceived,
      completed,
      avgAttendance,
      regions: new Set(filteredStudents.map((student) => student.region)).size || 0,
    };
  }, [filteredStudents]);

  const filteredReports = useMemo(
    () => [
      { id: 'r1', title: 'Class Register Summary', description: `Live rollup for ${filteredStudents.length} students currently in scope.`, period: dateFilter, status: filteredStudents.length ? 'Ready' : 'Open' },
      { id: 'r2', title: 'Completion And Verification Pack', description: `${reportSummary.completed} profiles are completed under the current filters.`, period: dateFilter, status: filteredStudents.length ? 'Ready' : 'Open' },
      { id: 'r3', title: 'Scholarship Allocation Snapshot', description: `${currency(reportSummary.totalReceived)} received against ${currency(reportSummary.totalApproved)} approved support.`, period: dateFilter, status: filteredStudents.length ? 'Ready' : 'Open' },
    ],
    [dateFilter, filteredStudents.length, reportSummary.completed, reportSummary.totalApproved, reportSummary.totalReceived]
  );

  const reportRows = useMemo(
    () =>
      filteredStudents.map((student) => ({
        student_name: student.name,
        program: student.programName || '-',
        region: student.region || '-',
        school: student.school || '-',
        attendance: `${toFiniteNumber(student.attendance)}%`,
        marks: `${toFiniteNumber(student.average)}%`,
        approved: currency(student.scholarshipApproved || 0),
        received: currency(student.fundsReceived || 0),
        status: student.entryStatus,
      })),
    [filteredStudents]
  );

  const exportCurrentScopeCSV = () => {
    exportRowsToCSV(
      reportRows.length ? reportRows : [{ note: 'No student rows available for current filters' }],
      `reports_current_scope_${dateFilter.replace(/[^a-z0-9]+/gi, '_')}.csv`
    );
    addNotification('Scope exported', 'Current filtered report rows were exported as CSV.', 'Success');
  };

  const handleExportReportPDF = (report) => {
    exportReportPackPDF({
      report,
      filters: {
        dateRange: dateFilter,
        program: programFilter,
        region: regionFilter,
        student: studentFilter,
        funder: 'Live school data scope',
      },
      studentRows: filteredStudents.map((student) => ({
        student_name: student.name,
        program: student.programName,
        attendance: `${toFiniteNumber(student.attendance)}%`,
        marks: `${toFiniteNumber(student.average)}%`,
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
      attendance_percent: toFiniteNumber(student.attendance),
      academic_average: toFiniteNumber(student.average),
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
      <PageHeader
        eyebrow="Reporting Center"
        title="Reports"
        description="Generate live NGO and CSR-ready report views from the connected database with exports tied to the current filter scope."
        actions={[
          <button key="export-scope" onClick={exportCurrentScopeCSV} className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">Export Current Scope</button>,
        ]}
      />
      {loadError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{loadError}</div> : null}
      <KPIGrid
        items={[
          { label: 'Reports Ready', value: filteredReports.length, helper: 'Available for export in current filter view' },
          { label: 'Regions Covered', value: reportSummary.regions, helper: 'Active regions in current scope' },
          { label: 'Students Included', value: filteredStudents.length, helper: 'Impact and finance reports scoped' },
          { label: 'Approved Support', value: currency(reportSummary.totalApproved), helper: 'Total approved amount in current scope' },
        ]}
      />
      <FilterBar
        filters={[
          { label: 'Date Range', options: ['This Month', 'Last Quarter', 'FY 2025-26'], value: dateFilter, onChange: (e) => setDateFilter(e.target.value) },
          { label: 'Program', options: ['All Programs', ...new Set(liveStudents.map((student) => student.programName))], value: programFilter, onChange: (e) => setProgramFilter(e.target.value) },
          { label: 'Region', options: ['All Regions', ...new Set(liveStudents.map((student) => student.region))], value: regionFilter, onChange: (e) => setRegionFilter(e.target.value) },
          { label: 'Student', options: ['All Students', ...liveStudents.slice(0, 20).map((student) => student.name)], value: studentFilter, onChange: (e) => setStudentFilter(e.target.value) },
          { label: 'Search', type: 'search', placeholder: 'Search student, school, region', value: tableSearch, onChange: (e) => setTableSearch(e.target.value) },
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
      <div className="grid gap-6 xl:grid-cols-[0.8fr,1.2fr]">
        <SectionCard title="Reporting Summary" subtitle="What the current report scope contains">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Current Scope</p>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <p>Date range: <span className="font-semibold text-slate-900">{dateFilter}</span></p>
                <p>Program: <span className="font-semibold text-slate-900">{programFilter}</span></p>
                <p>Region: <span className="font-semibold text-slate-900">{regionFilter}</span></p>
                <p>Student: <span className="font-semibold text-slate-900">{studentFilter}</span></p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricPill label="Completed Profiles" value={`${reportSummary.completed}/${filteredStudents.length || 0}`} />
              <MetricPill label="Average Attendance" value={reportSummary.avgAttendance} format="percent" />
              <MetricPill label="Approved Support" value={reportSummary.totalApproved} format="currency" />
              <MetricPill label="Received Support" value={reportSummary.totalReceived} format="currency" />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Live Report Rows" subtitle="Rows currently included in the report exports">
          <Table
            columns={[
              { key: 'student_name', label: 'Student' },
              { key: 'program', label: 'Program' },
              { key: 'region', label: 'Region' },
              { key: 'school', label: 'School' },
              { key: 'attendance', label: 'Attendance' },
              { key: 'marks', label: 'Marks' },
              { key: 'approved', label: 'Approved' },
              { key: 'received', label: 'Received' },
              { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value} /> },
            ]}
            rows={reportRows.length ? reportRows : [{ student_name: 'No matching students', program: '-', region: '-', school: '-', attendance: '-', marks: '-', approved: '-', received: '-', status: 'Open' }]}
          />
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

export const StudentsImpactPage = () => {
  const [liveStudents, setLiveStudents] = useState([]);

  useEffect(() => {
    fetchSchoolDataStudents().then(setLiveStudents).catch(() => setLiveStudents([]));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Impact Lens" title="Students Impact" description="A funder-facing rollup of beneficiary outcomes and story-ready operational evidence." />
      <div className="grid gap-6 lg:grid-cols-3">
        {liveStudents.slice(0, 6).map((student) => (
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
};

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
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importError, setImportError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [confirmState, setConfirmState] = useState({ open: false, acknowledge: false, busy: false });

  useEffect(() => {
    if (confirmState.open) playWriteAlertTone();
  }, [confirmState.open]);

  const handleSave = () => {
    updateSettings(localSettings);
    alert('Global system settings updated successfully.');
  };

  const handleExcelSelection = async (event) => {
    const file = event.target.files?.[0];
    setImportFile(file || null);
    setImportError('');
    setImportPreview(null);

    if (!file) return;

    try {
      const preview = await parseSchoolWorkbook(file);
      setImportPreview(preview);
    } catch (error) {
      setImportError(error.message || 'Unable to parse workbook.');
    }
  };

  const handleWorkbookImport = async () => {
    if (!importPreview) {
      setImportError('Select a valid workbook before importing.');
      return;
    }

    setConfirmState({
      open: true,
      acknowledge: false,
      busy: false,
      title: 'Confirm Workbook Import',
      description: 'This import will upsert live student records into the database.',
      impactLines: [
        `Workbook: ${importPreview.workbookName}`,
        `Student rows: ${importPreview.totalRows}`,
        `Class/section groups: ${importPreview.classes.length}`,
      ],
      confirmationLabel: 'Import workbook',
      onConfirm: async () => {
        try {
          setConfirmState((current) => ({ ...current, busy: true }));
          setIsImporting(true);
          setImportError('');
          const result = await importWorkbookToSupabase({ supabase, parsedWorkbook: importPreview });
          await sendDbAuditLog({
            action: 'UPSERT',
            entity: 'school_data',
            summary: `Workbook imported: ${importPreview.workbookName}`,
            payload: { importedStudents: result.importedStudents, importedClasses: result.importedClasses },
          });
          closeImportConfirmation();
          alert(`Import completed. ${result.importedStudents} student rows and ${result.importedClasses} class/section groups were pushed to school_data.`);
          setImportFile(null);
          setImportPreview(null);
        } catch (error) {
          setImportError(error.message || 'Import failed while writing to Supabase.');
          setConfirmState((current) => ({ ...current, busy: false }));
        } finally {
          setIsImporting(false);
        }
      },
    });
  };

  const closeImportConfirmation = () => setConfirmState({ open: false, acknowledge: false, busy: false });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <WriteConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        impactLines={confirmState.impactLines || []}
        confirmationLabel={confirmState.confirmationLabel}
        acknowledge={confirmState.acknowledge}
        onAcknowledge={(value) => setConfirmState((current) => ({ ...current, acknowledge: value }))}
        onCancel={closeImportConfirmation}
        onConfirm={() => confirmState.onConfirm?.()}
        busy={confirmState.busy}
      />
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

        <SectionCard title="Excel Data Upload" subtitle="Admin upload for the same workbook format you shared, mapped into the single `school_data` table.">
          <div className="space-y-5">
            <div className="rounded-3xl border border-dashed border-brand-200 bg-brand-50/40 p-6">
              <label className="block text-sm font-semibold text-slate-800">Select Excel Workbook</label>
              <p className="mt-1 text-sm text-slate-500">Supported flow: upload the same scholarship workbook and push it into the single `school_data` table for admin-managed CRUD.</p>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcelSelection}
                className="mt-4 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
              />
              {importFile ? <p className="mt-3 text-sm text-slate-600">Selected file: <span className="font-semibold">{importFile.name}</span></p> : null}
            </div>

            {importError ? (
              <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{importError}</span>
              </div>
            ) : null}

            {importPreview ? (
              <div className="grid gap-4 md:grid-cols-3">
                <MetricPill label="Workbook" value={importPreview.workbookName} />
                <MetricPill label="Detected Students" value={importPreview.totalRows} />
                <MetricPill label="Detected Classes" value={importPreview.classes.length} />
              </div>
            ) : null}

            {importPreview ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-900">Import Preview</p>
                <p className="mt-1 text-sm text-slate-500">The importer reads the `All Batch`, `Batch - 2`, and `Batch - 3` sheets and stores detailed workbook fields inside the JSON columns on each `school_data` row.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {importPreview.classes.map((item) => (
                    <span key={`${item.class_name}-${item.section_name}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {item.class_name} / Section {item.section_name}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setImportFile(null);
                  setImportPreview(null);
                  setImportError('');
                }}
                className="rounded-2xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"
              >
                Clear
              </button>
              <button
                onClick={handleWorkbookImport}
                disabled={!importPreview || isImporting}
                className="rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isImporting ? 'Importing...' : 'Upload To Supabase'}
              </button>
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







