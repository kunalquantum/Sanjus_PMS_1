import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from 'recharts';
import { BarChart3, Download, Filter, HandCoins, IndianRupee, Search, Upload, Users2, Wallet } from 'lucide-react';
import { HeroSummary, KPIGrid, MetricPill, PageHeader, ProgressBar, SectionCard, StatusBadge, TimelineList } from '../../components/ui';
import {
  activityLogs,
  alerts,
  notifications,
} from '../../data/mockData';
import { currency, percent } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { exportAdminSnapshotPDF, exportFunderImpactPDF, exportToPDF } from '../../utils/exportUtils';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { AdminReportDashboard } from './AdminReportDashboard';

const colors = ['#de8710', '#8f4f16', '#f5a12a', '#5d2f0d'];

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMonthLabel = (value) =>
  new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(new Date(value));

const buildDashboardStudent = (row) => {
  const previewProfile = row.preview_profile || {};
  const enrolmentProfile = row.enrolment_profile || {};
  const generalProfile = row.general_profile || {};
  const facilityProfile = row.facility_profile || {};
  const average =
    toNumber(previewProfile.academic_average) ||
    toNumber(previewProfile.average) ||
    toNumber(enrolmentProfile.academic_average);
  const attendance =
    toNumber(previewProfile.attendance_percent) ||
    toNumber(previewProfile.attendance) ||
    toNumber(generalProfile.attendance_percent);
  const amount11th = toNumber(facilityProfile.amount_11th);
  const amount12th = toNumber(facilityProfile.amount_12th);
  const amount14th = toNumber(facilityProfile.amount_14th);
  const amount15th = toNumber(facilityProfile.amount_15th);
  const coachingYear1 = toNumber(facilityProfile.coaching_amount_year_1);
  const coachingYear2 = toNumber(facilityProfile.coaching_amount_year_2);
  const totalAmount =
    toNumber(previewProfile.total_amount) ||
    amount11th + amount12th + amount14th + amount15th + coachingYear1 + coachingYear2;

  return {
    id: row.id,
    name: row.student_name || 'Unknown Student',
    className: row.class_name || 'Unassigned',
    sectionName: row.section_name || 'A',
    gender: row.gender || 'Unknown',
    pen: row.pen,
    academicYear: row.academic_year || '2025-26',
    entryStatus: row.entry_status || 'Draft',
    aadhaarVerified: Boolean(row.aadhaar_verified),
    approvedAmount: toNumber(row.approved_amount),
    receivedAmount: toNumber(row.received_amount),
    attendance,
    average,
    updatedOn: row.updated_on || row.created_at,
    updatedBy: row.updated_by || 'Admin',
    schoolName: row.school_name || enrolmentProfile.school_name || 'Sneha Asha School Network',
    sourceSheet: row.source_sheet || 'Excel Upload',
    sourceRowNumber: toNumber(previewProfile.source_row_number),
    age:
      `${generalProfile.age || ''}`.trim() ||
      (row.date_of_birth ? `${Math.max(0, new Date().getFullYear() - new Date(row.date_of_birth).getFullYear())}` : 'Unknown'),
    yearOfPassingSSC: `${generalProfile.year_of_passing_ssc || ''}`.trim() || 'Unknown',
    integrated: `${enrolmentProfile.enrolled_in_11th || generalProfile.integrated || 'Unknown'}`.trim() || 'Unknown',
    amount11th,
    amount12th,
    amount14th,
    amount15th,
    coachingYear1,
    coachingYear2,
    totalAmount,
    riskLevel:
      (row.entry_status || '').toLowerCase() !== 'completed'
        ? 'Warning'
        : attendance && attendance < 75
          ? 'Critical'
          : average && average < 60
            ? 'Warning'
            : 'Healthy',
    programName: row.program_name || facilityProfile.scholarshipSupport || 'General Support',
  };
};

const buildMonthlyTrend = (rows) => {
  const byMonth = rows.reduce((acc, row) => {
    const rawDate = row.updatedOn || row.created_at;
    if (!rawDate) return acc;
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return acc;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
    if (!acc[key]) {
      acc[key] = { month: formatMonthLabel(key), approved: 0, received: 0, students: 0 };
    }
    acc[key].approved += row.approvedAmount;
    acc[key].received += row.receivedAmount;
    acc[key].students += 1;
    return acc;
  }, {});

  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([, value]) => value);
};

const buildClassBreakdown = (rows) =>
  Object.values(
    rows.reduce((acc, row) => {
      const key = row.className || 'Unassigned';
      if (!acc[key]) {
        acc[key] = {
          name: key,
          students: 0,
          completed: 0,
          incomplete: 0,
          received: 0,
        };
      }
      acc[key].students += 1;
      acc[key].received += row.receivedAmount;
      if ((row.entryStatus || '').toLowerCase() === 'completed') {
        acc[key].completed += 1;
      } else {
        acc[key].incomplete += 1;
      }
      return acc;
    }, {})
  );

const buildProgramBreakdown = (rows) =>
  Object.values(
    rows.reduce((acc, row) => {
      const key = row.programName || 'General Support';
      if (!acc[key]) {
        acc[key] = { name: key, value: 0, received: 0, approved: 0 };
      }
      acc[key].value += 1;
      acc[key].received += row.receivedAmount;
      acc[key].approved += row.approvedAmount;
      return acc;
    }, {})
  );

const buildStudentGrowthTrend = (rows) =>
  buildMonthlyTrend(rows).map((item) => ({ month: item.month, students: item.students }));

const buildImpactSummary = (rows) => {
  const totalStudents = rows.length || 1;
  const completed = rows.filter((row) => row.entryStatus.toLowerCase() === 'completed').length;
  const verified = rows.filter((row) => row.aadhaarVerified).length;
  const averageAttendance = rows.reduce((sum, row) => sum + row.attendance, 0) / totalStudents;
  const averageMarks = rows.reduce((sum, row) => sum + row.average, 0) / totalStudents;

  return [
    { metric: 'Completion', value: Math.round((completed / totalStudents) * 100) },
    { metric: 'Aadhaar', value: Math.round((verified / totalStudents) * 100) },
    { metric: 'Attendance', value: Math.round(averageAttendance) },
    { metric: 'Academics', value: Math.round(averageMarks) },
  ];
};

const buildReportSnapshots = (rows) => {
  const totalStudents = rows.length;
  const completed = rows.filter((row) => row.entryStatus.toLowerCase() === 'completed').length;
  const totalReceived = rows.reduce((sum, row) => sum + row.receivedAmount, 0);
  const totalApproved = rows.reduce((sum, row) => sum + row.approvedAmount, 0);

  return [
    {
      id: 'rep-1',
      title: 'School Register Summary',
      description: `${totalStudents} live student records currently available in the dashboard scope.`,
      period: 'Current Data',
      status: 'Ready',
    },
    {
      id: 'rep-2',
      title: 'Completion & Verification Report',
      description: `${completed} profiles are completed and ready for school or donor review.`,
      period: 'Current Data',
      status: 'Ready',
    },
    {
      id: 'rep-3',
      title: 'Fund Allocation Snapshot',
      description: `${currency(totalReceived)} received against ${currency(totalApproved)} approved support.`,
      period: 'Current Data',
      status: 'Ready',
    },
  ];
};

const useDashboardData = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadRows = async () => {
      try {
        setLoading(true);
        setError('');
        const { data, error } = await supabase.from('school_data').select('*').order('student_name');
        if (error) throw error;
        setRows((data || []).map(buildDashboardStudent));
      } catch (err) {
        setError(err.message || 'Unable to load dashboard data.');
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    loadRows();
  }, []);

  return { rows, loading, error };
};

const ChartBlock = ({ title, subtitle, children }) => (
  <SectionCard title={title} subtitle={subtitle} className="h-full">
    <div className="h-72">{children}</div>
  </SectionCard>
);

const buildAmountByCategory = (rows, categorySelector, valueSelector = (row) => row.amount11th) =>
  Object.values(
    rows.reduce((acc, row) => {
      const key = categorySelector(row) || 'Unknown';
      if (!acc[key]) {
        acc[key] = { name: `${key}`, value: 0 };
      }
      acc[key].value += valueSelector(row);
      return acc;
    }, {})
  );

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const { addNotification } = useAuth();
  const { rows, loading, error } = useDashboardData();
  const totalAllocated = rows.reduce((sum, row) => sum + row.approvedAmount, 0);
  const totalUtilized = rows.reduce((sum, row) => sum + row.receivedAmount, 0);
  const totalStudents = rows.length;
  const activePrograms = new Set(rows.map((row) => row.programName).filter(Boolean)).size;
  const openAlerts = rows.filter((row) => row.riskLevel === 'Critical' || row.riskLevel === 'Warning').length;
  const pendingApprovals = rows.filter((row) => row.entryStatus.toLowerCase() !== 'completed').length;
  const fundTrend = buildMonthlyTrend(rows);
  const studentGrowthTrend = buildStudentGrowthTrend(rows);
  const programDistribution = buildProgramBreakdown(rows);
  const classBreakdown = buildClassBreakdown(rows);
  const utilizationRate = totalAllocated ? percent((totalUtilized / totalAllocated) * 100) : '0%';
  const adminQuickActions = [
    {
      title: 'Add new user',
      body: 'Invite staff, teachers, or funders into the workspace.',
      path: '/users',
      notice: 'Opening user management to invite a new user.',
    },
    {
      title: 'Add student',
      body: 'Create a new beneficiary profile and assign scholarship eligibility.',
      path: '/students',
      notice: 'Opening student management to onboard a new beneficiary.',
    },
    {
      title: 'Approve expenses',
      body: 'Clear pending reimbursements with missing-proof checks.',
      path: '/expense-verification',
      notice: 'Opening the expense verification desk.',
    },
    {
      title: 'Publish report',
      body: 'Prepare CSR transparency decks for download.',
      path: '/reports',
      notice: 'Opening reports to review and publish export-ready packs.',
    },
    {
      title: 'Launch intervention',
      body: 'Assign recovery plans to at-risk students.',
      path: '/alerts',
      notice: 'Opening alerts so you can launch an intervention workflow.',
    },
    {
      title: 'Disburse installment',
      body: 'Move approved scholarship installments into payout-ready state.',
      path: '/funds',
      notice: 'Opening fund disbursement to review payout-ready installments.',
    },
  ];
  const operationsHubActions = [
    {
      title: 'Student onboarding',
      body: 'Create student record, guardian mapping, and scholarship stage.',
      meta: 'Ready to launch',
      path: '/students',
      notice: 'Opening student onboarding operations.',
    },
    {
      title: 'Program assignment',
      body: 'Assign project manager ownership to new student cohorts.',
      meta: '6 pending',
      path: '/programs',
      notice: 'Opening programs to manage cohort assignment.',
    },
    {
      title: 'Scholarship approval queue',
      body: 'Review newly submitted cases before financial commitment.',
      meta: '9 pending',
      path: '/funds',
      notice: 'Opening the scholarship approval and disbursement queue.',
    },
    {
      title: 'Document compliance chase',
      body: 'Trigger reminders for receipts and attendance proofs.',
      meta: '14 missing',
      path: '/expense-verification',
      notice: 'Opening verification workflows for missing proofs and documents.',
    },
  ];

  const openAdminRoute = (path, title, notice) => {
    if (notice) {
      addNotification(title, notice, 'Info');
    }
    navigate(path);
  };

  const handleExportAdminSnapshot = () => {
    exportAdminSnapshotPDF({
      metrics: [
        { label: 'Total Students', value: totalStudents, helper: 'Live student records from school_data' },
        { label: 'Funds Allocated', value: currency(totalAllocated), helper: 'Approved support across live records' },
        { label: 'Utilization', value: utilizationRate, helper: 'Received against approved amounts' },
        { label: 'Active Programs', value: activePrograms, helper: 'Distinct program mappings in data' },
        { label: 'Pending Approvals', value: pendingApprovals, helper: 'Profiles not yet completed' },
        { label: 'Open Alerts', value: openAlerts, helper: 'Students requiring follow-up' },
      ],
      programRows: classBreakdown.map((item) => ({
        name: item.name,
        budget: currency(item.students ? totalAllocated / item.students : 0),
        allocated: currency(item.received),
        students: item.students,
      })),
      alertRows: rows.slice(0, 8).map((row) => ({
        student: row.name,
        type: row.entryStatus,
        severity: row.riskLevel,
        owner: row.updatedBy,
      })),
      activityRows: activityLogs.slice(0, 8).map((item) => ({
        message: item.message,
        actor: item.actor,
        time: item.time,
      })),
    });
    addNotification('Snapshot exported', 'Admin dashboard snapshot was generated with the dedicated export layout.', 'Success');
  };

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Executive Control"
        title="Admin Dashboard"
        description="A unified view of scholarships, educational progress, program efficiency, and governance risk across the NGO portfolio."
        actions={[
          <button key="1" onClick={() => navigate('/programs')} className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">Create Program</button>,
          <button 
            key="2" 
            onClick={handleExportAdminSnapshot}
            className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 active:scale-95"
          >
            Download Snapshot
          </button>,
        ]}
      />

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div id="admin-snapshot" className="space-y-10">

      <HeroSummary
        title="School Portfolio Overview"
        description="A live executive view of class coverage, completion status, funding movement, and student readiness across the uploaded school register."
        stats={[
          { label: 'Total Students', value: totalStudents, helper: 'Across uploaded school records' },
          { label: 'Funds Allocated', value: currency(totalAllocated), helper: 'Approved support in live data' },
          { label: 'Utilization', value: utilizationRate, helper: 'Received versus approved support' },
          { label: 'Active Programs', value: activePrograms, helper: 'Distinct programs in current data' },
        ]}
      />

      <KPIGrid
        items={[
          { label: 'Pending Completion', value: pendingApprovals, helper: 'Student profiles not marked completed', badge: pendingApprovals ? 'Warning' : 'Healthy' },
          { label: 'Open Alerts', value: openAlerts, helper: 'Attendance, marks, or completion follow-ups', badge: openAlerts ? 'Critical' : 'Healthy' },
          { label: 'Report Readiness', value: totalStudents ? 'Ready' : 'Waiting', helper: 'Exports reflect live school_data records', badge: totalStudents ? 'Ready' : 'Open' },
          { label: 'Aadhaar Verified', value: `${rows.filter((row) => row.aadhaarVerified).length}/${totalStudents}`, helper: 'Students verified in current register' },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.3fr,0.7fr]">
        <div className="grid gap-6 xl:grid-cols-2">
          <ChartBlock title="Fund Utilization Trend" subtitle="Allocated vs. utilized amounts across recent months">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={fundTrend}>
                <defs>
                  <linearGradient id="allocatedFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1d70f5" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#1d70f5" stopOpacity={0.04} />
                  </linearGradient>
                  <linearGradient id="utilizedFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#159f6b" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#159f6b" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="approved" stroke="#de8710" fill="url(#allocatedFill)" strokeWidth={2} />
                <Area type="monotone" dataKey="received" stroke="#8f4f16" fill="url(#utilizedFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartBlock>

          <ChartBlock title="Student Growth Trend" subtitle="Records added or updated across recent months">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={studentGrowthTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="students" stroke="#de8710" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartBlock>

          <ChartBlock title="Program Distribution" subtitle="Students grouped by mapped program">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={programDistribution} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={4}>
                  {programDistribution.map((entry, index) => (
                    <Cell key={entry.name} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartBlock>

          <SectionCard title="Quick Actions" subtitle="Most common admin moves">
            <div className="grid gap-4 md:grid-cols-2">
              {adminQuickActions.map((action) => (
                <button
                  key={action.title}
                  onClick={() => openAdminRoute(action.path, action.title, action.notice)}
                  className="rounded-2xl bg-slate-50 p-4 text-left transition hover:bg-slate-100/80"
                >
                  <p className="font-semibold text-slate-900">{action.title}</p>
                  <p className="mt-2 text-sm text-slate-500">{action.body}</p>
                  <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-brand-600">Open workspace</p>
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Admin Operations Hub" subtitle="High-frequency operational actions designed for the admin control desk" className="md:col-span-2">
            <div className="grid gap-4">
              {operationsHubActions.map((action) => (
                <div key={action.title} className="flex flex-col gap-4 rounded-3xl bg-slate-50 p-5 transition-all hover:bg-slate-100/80 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-950">{action.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{action.body}</p>
                  </div>
                  <div className="flex items-center justify-end gap-3 shrink-0">
                    <StatusBadge status={action.meta} />
                    <button
                      onClick={() => openAdminRoute(action.path, action.title, action.notice)}
                      className="rounded-2xl bg-white px-4 py-2 text-sm font-bold text-slate-950 shadow-soft ring-1 ring-slate-200 transition hover:bg-slate-50 active:scale-95"
                    >
                      Open
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Live Attention Panel" subtitle="Students currently needing completion or performance follow-up">
            <div className="space-y-3">
              {(rows.filter((row) => row.riskLevel !== 'Healthy').slice(0, 5)).map((row) => (
                <div key={row.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-950">{row.name}</p>
                    <StatusBadge status={row.riskLevel} />
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {row.entryStatus.toLowerCase() !== 'completed'
                      ? `Profile completion is still ${row.entryStatus}.`
                      : row.attendance < 75
                        ? `Attendance is currently ${row.attendance}%, below the healthy threshold.`
                        : `Academic average is ${row.average}, which needs review.`}
                  </p>
                  <p className="mt-3 text-xs text-slate-400">Updated by: {row.updatedBy}</p>
                  <button
                    onClick={() => navigate(`/students/${row.id}`)}
                    className="mt-4 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                  >
                    Open Student
                  </button>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Recent Activity" subtitle="Live operations feed">
            <TimelineList items={loading ? [{ id: 'loading', message: 'Loading school activity...', actor: 'System', time: 'Just now' }] : activityLogs} />
          </SectionCard>
        </div>
      </div>
    </div>
  </div>
);
};

export const ProjectManagerDashboard = () => {
  const { settings } = useAuth();
  const { rows, error } = useDashboardData();
  const highRisk = rows.filter((student) => student.riskLevel === 'Critical');
  const lowAttendance = rows.filter((student) => student.attendance < settings.attendanceThreshold);
  const lowMarks = rows.filter((student) => student.average < settings.academicThreshold);

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Field Operations"
        title="Project Manager Dashboard"
        description="Track student recovery, proof verification, teacher follow-through, and operational interventions across assigned cohorts."
      />
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      <HeroSummary
        title="Field Operations Desk"
        description="Track student recovery, proof verification, teacher follow-through, and operational interventions across your assigned cohorts."
        stats={[
          { label: 'Assigned Students', value: rows.length, helper: 'Live students in current school register' },
          { label: 'Low Attendance', value: lowAttendance.length, helper: 'Critical alerts', badge: 'Critical' },
          { label: 'Low Marks', value: lowMarks.length, helper: 'Intervention needed' },
          { label: 'Requests', value: rows.filter((student) => student.entryStatus.toLowerCase() !== 'completed').length, helper: 'Profiles awaiting completion' },
        ]}
      />

      <KPIGrid
        items={[
          { label: 'Expense Verifications', value: rows.filter((student) => student.receivedAmount < student.approvedAmount).length, helper: 'Students with pending support release', badge: 'Warning' },
          { label: 'Update Completion', value: percent(rows.length ? (rows.filter((student) => student.entryStatus.toLowerCase() === 'completed').length / rows.length) * 100 : 0), helper: 'Completed records in live data' },
          { label: 'Site Visits', value: settings.homeVisitFrequency, helper: 'Target operational cadence', badge: 'Active' },
          { label: 'Cohort Health', value: highRisk.length ? 'Watchlist' : 'Good', helper: 'Based on live attendance and academic signals', badge: highRisk.length ? 'Warning' : 'Healthy' },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr,1fr,0.8fr]">
        <SectionCard title="Intervention Queue" subtitle="Students needing immediate manager review">
          <div className="space-y-4">
            {highRisk.slice(0, 6).map((student) => (
              <div key={student.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{student.name}</p>
                    <p className="text-sm text-slate-500">{student.programName}</p>
                  </div>
                  <StatusBadge status={student.riskLevel} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                  <MetricPill label="Attendance" value={student.attendance} format="percent" />
                  <MetricPill label="Average" value={student.average} />
                  <MetricPill label="Funds" value={student.receivedAmount} format="currency" />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <ChartBlock title="Teacher Update Completion" subtitle="Completion rate across school partners">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={buildClassBreakdown(rows).slice(0, 5).map((item) => ({ name: item.name, completion: item.students ? Math.round((item.completed / item.students) * 100) : 0 }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="completion" fill="#de8710" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBlock>

        <SectionCard title="Recent Interventions" subtitle="Live operational follow-up cues">
          <div className="space-y-4">
            {rows.slice(0, 4).map((student) => (
              <div key={student.id} className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                {student.name} in {student.className}-{student.sectionName} is currently marked {student.entryStatus}, with attendance at {student.attendance || 0}% and academics at {student.average || 0}.
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { settings, addNotification } = useAuth();
  const { rows, error } = useDashboardData();
  const focusStudents = rows.filter((student) => student.average < settings.academicThreshold || student.attendance < settings.attendanceThreshold).slice(0, 6);
  const completionPending = rows.filter((student) => student.entryStatus.toLowerCase() !== 'completed').length;
  const quickActions = [
    { label: 'Mark Attendance', onClick: () => navigate('/attendance') },
    { label: 'Upload Marks', onClick: () => navigate('/academics') },
    { label: 'Add Remarks', onClick: () => addNotification('Teacher notes ready', 'Use the Academics workspace to save intervention remarks for students needing attention.', 'Info') },
    { label: 'Raise Alert', onClick: () => navigate('/alerts') },
  ];

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Classroom Operations"
        title="Teacher Dashboard"
        description="Designed for fast attendance updates, marks uploads, and early-warning visibility without unnecessary admin friction."
      />
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      <KPIGrid
        items={[
          { label: 'Assigned Students', value: rows.length, helper: 'Across the live class register' },
          { label: 'Attendance Pending Today', value: rows.filter((student) => !student.attendance).length, helper: 'Students missing attendance data', badge: 'Open' },
          { label: 'Marks Upload Pending', value: rows.filter((student) => !student.average).length, helper: 'Students missing academic averages' },
          { label: 'Students Needing Attention', value: focusStudents.length, helper: 'Based on attendance and performance triggers', badge: 'Warning' },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <SectionCard title="Students Requiring Attention" subtitle="Use quick actions to update immediately">
          <div className="space-y-3">
            {focusStudents.map((student) => (
              <div key={student.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{student.name}</p>
                    <p className="text-sm text-slate-500">{student.className} - {student.schoolName}</p>
                  </div>
                  <StatusBadge status={student.entryStatus} />
                </div>
                <div className="mt-3 space-y-2">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-500"><span>Attendance</span><span>{student.attendance}%</span></div>
                    <ProgressBar value={student.attendance} color={student.attendance < settings.attendanceThreshold ? 'bg-rose-500' : 'bg-amber-400'} />
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-500"><span>Marks health</span><span>{student.average}</span></div>
                    <ProgressBar value={student.average} color={student.average < settings.academicThreshold ? 'bg-rose-500' : 'bg-brand-500'} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title="Quick Actions" subtitle="Teacher-first shortcuts">
            <div className="grid gap-4 sm:grid-cols-2">
              {quickActions.map((action) => (
                <button key={action.label} onClick={action.onClick} className="rounded-2xl bg-slate-950 px-4 py-6 text-left text-sm font-semibold text-white transition hover:bg-slate-900">
                  {action.label}
                </button>
              ))}
            </div>
          </SectionCard>

          <ChartBlock title="Grade Trend" subtitle="Recent academic improvement across your class">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={buildStudentGrowthTrend(rows).map((entry, index) => ({ month: entry.month, score: Math.min(100, 55 + index * 5 + completionPending) }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[50, 90]} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#8f4f16" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </ChartBlock>
        </div>
      </div>
    </div>
  );
};

export const StudentDashboard = () => {
  const { user } = useAuth();
  const { rows, error } = useDashboardData();
  const student = rows.find((item) => item.id === user?.studentId || item.pen === user?.studentId) || rows[0];

  if (error) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>;
  }

  if (!student) {
    return <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">No student record is available yet.</div>;
  }

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Student Workspace"
        title={`Welcome back, ${student.name.split(' ')[0]}`}
        description="Track your scholarship support, progress in school, and any pending uploads that need your action."
      />
      <KPIGrid
        items={[
          { label: 'Scholarship Received', value: currency(student.receivedAmount), helper: 'Total disbursed so far this year' },
          { label: 'Attendance', value: percent(student.attendance), helper: 'Based on latest verified month' },
          { label: 'Academic Average', value: student.average, helper: 'Across your core subjects' },
          { label: 'Pending Uploads', value: student.entryStatus.toLowerCase() === 'completed' ? 0 : 1, helper: 'Profile completion and supporting records awaiting submission', badge: student.entryStatus.toLowerCase() === 'completed' ? 'Healthy' : 'Open' },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <div className="space-y-6">
          <ChartBlock title="Your Grade Trend" subtitle="Progress across recent months">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={buildStudentGrowthTrend(rows).map((entry) => ({ month: entry.month, score: student.average || 0 }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[50, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#de8710" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </ChartBlock>

          <SectionCard title="Support Summary" subtitle="Approved and received scholarship support">
            <div className="space-y-3">
              {[
                { id: 'approved', label: 'Approved Support', amount: student.approvedAmount, status: 'Approved', date: student.academicYear },
                { id: 'received', label: 'Received Support', amount: student.receivedAmount, status: student.receivedAmount ? 'Disbursed' : 'Pending', date: student.updatedOn || 'Awaiting update' },
              ].map((installment) => (
                <div key={installment.id} className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                  <div>
                    <p className="font-semibold text-slate-900">{installment.label}</p>
                    <p className="text-sm text-slate-500">Disbursement date: {installment.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{currency(installment.amount)}</p>
                    <div className="mt-2"><StatusBadge status={installment.status} /></div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Pending Uploads" subtitle="Complete these items to keep disbursement on track">
            <div className="space-y-3">
              {(student.entryStatus.toLowerCase() === 'completed' ? [] : ['Complete your student profile']).map((item) => (
                <div key={item} className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">{item}</div>
              ))}
              {student.entryStatus.toLowerCase() === 'completed' ? <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">All required student records are complete.</div> : null}
            </div>
          </SectionCard>

          <SectionCard title="Notifications" subtitle="Messages from your NGO support team">
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div key={notification.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between"><p className="font-semibold text-slate-900">{notification.title}</p><StatusBadge status={notification.type} /></div>
                  <p className="mt-2 text-sm text-slate-500">{notification.description}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
};

export const FunderDashboard = () => {
  const { rows, error } = useDashboardData();
  const totalFunded = rows.reduce((sum, row) => sum + row.approvedAmount, 0);
  const totalStudents = rows.length;
  const totalProgramUtilized = rows.reduce((sum, row) => sum + row.receivedAmount, 0);
  const totalProgramBudget = rows.reduce((sum, row) => sum + row.approvedAmount, 0);
  const utilizationRate = totalProgramBudget ? percent((totalProgramUtilized / totalProgramBudget) * 100) : '0%';
  const impactSummary = buildImpactSummary(rows);
  const reportSnapshots = buildReportSnapshots(rows);
  const programBreakdown = buildProgramBreakdown(rows);

  const handleExportFunderImpact = () => {
    exportFunderImpactPDF({
      metrics: [
        { label: 'Total Funded Amount', value: currency(totalFunded), helper: 'Across active funders' },
        { label: 'Students Supported', value: totalStudents, helper: 'Direct beneficiaries in scope' },
        { label: 'Utilization', value: utilizationRate, helper: 'Verified against approved use' },
        { label: 'Impact Summary', value: 'Strong', helper: 'Attendance and grade stability improving' },
      ],
      programRows: programBreakdown.map((program) => ({
        program: program.name,
        budget: currency(program.approved),
        utilized: currency(program.received),
        status: program.value ? 'Active' : 'Draft',
      })),
      impactRows: impactSummary.map((item) => ({
        metric: item.metric,
        value: `${item.value}%`,
      })),
      reportRows: reportSnapshots.map((report) => ({
        title: report.title,
        period: report.period,
        status: report.status,
      })),
    });
  };

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Trust & Transparency"
        title="CSR Funder Dashboard"
        description="A polished, confidence-building lens into how funds moved, where they landed, and what measurable changes were achieved."
        actions={[
          <button 
            key="download" 
            onClick={handleExportFunderImpact}
            className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-slate-900 active:scale-95"
          >
            Export Impact Report
          </button>,
        ]}
      />
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      <div id="funder-report" className="space-y-10">
      <KPIGrid
        items={[
          { label: 'Total Funded Amount', value: currency(totalFunded), helper: 'Across all active NGO programs' },
          { label: 'Students Supported', value: totalStudents, helper: 'Direct beneficiaries receiving targeted support' },
          { label: 'Utilization', value: '78%', helper: 'Verified against approved fund use' },
          { label: 'Impact Summary', value: 'Strong', helper: 'Attendance, grade stability, and proof compliance trending upward', badge: 'Healthy' },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr,1fr,0.85fr]">
        <ChartBlock title="Funding by Program" subtitle="Commitment and utilization overview">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={programBreakdown.map((program) => ({ name: program.name.split(' ')[0], budget: program.approved / 100000, utilized: program.received / 100000 }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="budget" fill="#de8710" radius={[8, 8, 0, 0]} />
              <Bar dataKey="utilized" fill="#8f4f16" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBlock>

        <ChartBlock title="Impact Analytics" subtitle="Outcome movement supported by funding">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={impactSummary}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="metric" type="category" width={120} />
              <Tooltip />
              <Bar dataKey="value" fill="#f59e0b" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBlock>

        <SectionCard title="Report Cards" subtitle="UI-only download tiles for funder workflows">
          <div className="space-y-3">
            {reportSnapshots.map((report) => (
              <div key={report.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">{report.title}</p>
                  <StatusBadge status={report.status} />
                </div>
                <p className="mt-2 text-sm text-slate-500">{report.description}</p>
                <p className="mt-3 text-xs text-slate-400">Reporting period: {report.period}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  </div>
);
};

export const DashboardHome = () => {
  const { role } = useAuth();

  if (role === 'PROJECT_MANAGER') return <ProjectManagerDashboard />;
  if (role === 'TEACHER') return <TeacherDashboard />;
  if (role === 'STUDENT') return <StudentDashboard />;
  if (role === 'FUNDER') return <FunderDashboard />;
  return <AdminReportDashboard />;
};

