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
import { HeroSummary, KPIGrid, MetricPill, PageHeader, ProgressBar, SectionCard, StatusBadge, TimelineList } from '../../components/ui';
import {
  activityLogs,
  alerts,
  fundTrend,
  funders,
  impactSummary,
  notifications,
  programDistribution,
  programs,
  reportSnapshots,
  studentGrowthTrend,
  students,
} from '../../data/mockData';
import { currency, percent } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { exportAdminSnapshotPDF, exportFunderImpactPDF } from '../../utils/exportUtils';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

const colors = ['#1d70f5', '#159f6b', '#f59e0b', '#7c3aed'];

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

const ChartBlock = ({ title, subtitle, children }) => (
  <SectionCard title={title} subtitle={subtitle} className="h-full">
    <div className="h-72">{children}</div>
  </SectionCard>
);

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const { addNotification } = useAuth();
  const totalAllocated = programs.reduce((sum, program) => sum + program.budget, 0);
  const totalUtilized = programs.reduce((sum, program) => sum + program.allocated, 0);
  const totalStudents = students.length;
  const activePrograms = programs.filter((program) => program.status !== 'Closed').length;
  const openAlerts = alerts.filter((alert) => alert.status !== 'Resolved').length;
  const pendingApprovals = 14;
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
        { label: 'Total Students', value: totalStudents, helper: 'Across active NGO programs' },
        { label: 'Funds Allocated', value: currency(totalAllocated), helper: 'Committed scholarship budget' },
        { label: 'Utilization', value: percent((totalUtilized / totalAllocated) * 100), helper: 'Verified active spend' },
        { label: 'Active Programs', value: activePrograms, helper: 'Programs currently running' },
        { label: 'Pending Approvals', value: pendingApprovals, helper: 'Expense and fund reviews' },
        { label: 'Open Alerts', value: openAlerts, helper: 'Governance follow-ups' },
      ],
      programRows: programs.map((program) => ({
        name: program.name,
        budget: currency(program.budget),
        allocated: currency(program.allocated),
        students: program.studentCount,
      })),
      alertRows: alerts.slice(0, 8).map((alert) => ({
        student: alert.studentName,
        type: alert.type,
        severity: alert.severity,
        owner: alert.owner,
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

      <div id="admin-snapshot" className="space-y-10">

      <HeroSummary
        title="NGO Portfolio Overview"
        description="A unified executive view of scholarships, educational progress, program efficiency, and governance risk across all active operating regions."
        stats={[
          { label: 'Total Students', value: students.length, helper: 'Across 4 programs' },
          { label: 'Funds Allocated', value: currency(totalAllocated), helper: 'Committed budget' },
          { label: 'Utilization', value: percent((totalUtilized / totalAllocated) * 100), helper: 'Active spend' },
          { label: 'Active Programs', value: programs.filter((p) => p.status !== 'Closed').length, helper: 'Currently running' },
        ]}
      />

      <KPIGrid
        items={[
          { label: 'Pending Approvals', value: 14, helper: 'Expense proofs and fund requests', badge: 'Warning' },
          { label: 'Open Alerts', value: alerts.filter((alert) => alert.status !== 'Resolved').length, helper: 'High-priority follow-ups', badge: 'Critical' },
          { label: 'Report Readiness', value: '3/4', helper: 'One funder pack in draft', badge: 'In Progress' },
          { label: 'Proof Compliance', value: '87%', helper: 'Receipts matched against claims' },
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
                <Area type="monotone" dataKey="allocated" stroke="#1d70f5" fill="url(#allocatedFill)" strokeWidth={2} />
                <Area type="monotone" dataKey="utilized" stroke="#159f6b" fill="url(#utilizedFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartBlock>

          <ChartBlock title="Student Growth Trend" subtitle="Scholar coverage expansion over the last six months">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={studentGrowthTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="students" stroke="#1d70f5" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartBlock>

          <ChartBlock title="Program Distribution" subtitle="Students supported by scholarship program">
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
          <SectionCard title="Alerts Panel" subtitle="Items requiring immediate governance attention">
            <div className="space-y-3">
              {alerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-950">{alert.studentName}</p>
                    <StatusBadge status={alert.severity} />
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{alert.message}</p>
                  <p className="mt-3 text-xs text-slate-400">Owner: {alert.owner}</p>
                  <button
                    onClick={() => openAdminRoute('/alerts', `Alert: ${alert.type}`, `Opening alerts workspace for ${alert.studentName}.`)}
                    className="mt-4 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                  >
                    Review Alert
                  </button>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Recent Activity" subtitle="Live operations feed">
            <TimelineList items={activityLogs} />
          </SectionCard>
        </div>
      </div>
    </div>
  </div>
);
};

export const ProjectManagerDashboard = () => {
  const { settings } = useAuth();
  const highRisk = students.filter((student) => student.riskLevel === 'High');
  const lowAttendance = students.filter((student) => student.attendance < settings.attendanceThreshold);
  const lowMarks = students.filter((student) => student.average < settings.academicThreshold);

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Field Operations"
        title="Project Manager Dashboard"
        description="Track student recovery, proof verification, teacher follow-through, and operational interventions across assigned cohorts."
      />
      <HeroSummary
        title="Field Operations Desk"
        description="Track student recovery, proof verification, teacher follow-through, and operational interventions across your assigned cohorts."
        stats={[
          { label: 'Assigned Students', value: 18, helper: 'Direct monitoring' },
          { label: 'Low Attendance', value: lowAttendance.length, helper: 'Critical alerts', badge: 'Critical' },
          { label: 'Low Marks', value: lowMarks.length, helper: 'Intervention needed' },
          { label: 'Requests', value: 7, helper: 'Awaiting review' },
        ]}
      />

      <KPIGrid
        items={[
          { label: 'Expense Verifications', value: 9, helper: 'Four claims missing receipts', badge: 'Warning' },
          { label: 'Update Completion', value: '82%', helper: 'Attendance and marks submissions' },
          { label: 'Site Visits', value: settings.homeVisitFrequency, helper: 'Target operational cadence', badge: 'Active' },
          { label: 'Cohort Health', value: 'Good', helper: 'Based on recent movement', badge: 'Healthy' },
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
                  <MetricPill label="Funds" value={student.fundsReceived} format="currency" />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <ChartBlock title="Teacher Update Completion" subtitle="Completion rate across school partners">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={students.slice(0, 5).map((student, index) => ({ name: `Teacher ${index + 1}`, completion: 76 + index * 4 }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="completion" fill="#1d70f5" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBlock>

        <SectionCard title="Recent Interventions" subtitle="Mock workflows and follow-up notes">
          <div className="space-y-4">
            {[
              'Transport support approved for 3 low-attendance students in Tumakuru.',
              'Parent counseling session scheduled for Grade 10 board exam cohort.',
              'Teacher reminders sent for missing science marks upload.',
              'Expense discrepancy flagged for two device purchase claims.',
            ].map((item) => (
              <div key={item} className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">{item}</div>
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
  const focusStudents = students.filter((student) => student.average < settings.academicThreshold || student.attendance < settings.attendanceThreshold).slice(0, 6);
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
      <KPIGrid
        items={[
          { label: 'Assigned Students', value: 10, helper: 'Across two active classes' },
          { label: 'Attendance Pending Today', value: 18, helper: 'Morning session not finalized yet', badge: 'Open' },
          { label: 'Marks Upload Pending', value: 12, helper: 'Subject-wise marks for the latest assessment' },
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
                    <p className="text-sm text-slate-500">Grade {student.grade} - {student.school}</p>
                  </div>
                  <StatusBadge status={student.academicStatus} />
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
              <LineChart data={studentGrowthTrend.map((entry, index) => ({ month: entry.month, score: 61 + index * 4 }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[50, 90]} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#159f6b" strokeWidth={3} />
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
  const student = students.find((item) => item.id === user.studentId) || students[0];

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Student Workspace"
        title={`Welcome back, ${student.name.split(' ')[0]}`}
        description="Track your scholarship support, progress in school, and any pending uploads that need your action."
      />
      <KPIGrid
        items={[
          { label: 'Scholarship Received', value: currency(student.fundsReceived), helper: 'Total disbursed so far this year' },
          { label: 'Attendance', value: percent(student.attendance), helper: 'Based on latest verified month' },
          { label: 'Academic Average', value: student.average, helper: 'Across your core subjects' },
          { label: 'Pending Uploads', value: student.pendingDocs.length || 1, helper: 'Receipts and progress proofs awaiting submission', badge: 'Open' },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <div className="space-y-6">
          <ChartBlock title="Your Grade Trend" subtitle="Progress across recent months">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={student.attendanceHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[50, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#1d70f5" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </ChartBlock>

          <SectionCard title="Installment History" subtitle="Planned and completed scholarship installments">
            <div className="space-y-3">
              {student.installments.map((installment) => (
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
              {(student.pendingDocs.length ? student.pendingDocs : ['April transport receipt']).map((item) => (
                <div key={item} className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">{item}</div>
              ))}
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
  const totalFunded = funders.reduce((sum, funder) => sum + funder.commitment, 0);
  const totalStudents = funders.reduce((sum, funder) => sum + funder.studentsSupported, 0);
  const totalProgramUtilized = programs.reduce((sum, program) => sum + program.allocated, 0);
  const totalProgramBudget = programs.reduce((sum, program) => sum + program.budget, 0);
  const utilizationRate = totalProgramBudget ? percent((totalProgramUtilized / totalProgramBudget) * 100) : '0%';

  const handleExportFunderImpact = () => {
    exportFunderImpactPDF({
      metrics: [
        { label: 'Total Funded Amount', value: currency(totalFunded), helper: 'Across active funders' },
        { label: 'Students Supported', value: totalStudents, helper: 'Direct beneficiaries in scope' },
        { label: 'Utilization', value: utilizationRate, helper: 'Verified against approved use' },
        { label: 'Impact Summary', value: 'Strong', helper: 'Attendance and grade stability improving' },
      ],
      programRows: programs.map((program) => ({
        program: program.name,
        budget: currency(program.budget),
        utilized: currency(program.allocated),
        status: program.status,
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
            <BarChart data={programs.map((program) => ({ name: program.name.split(' ')[0], budget: program.budget / 100000, utilized: program.allocated / 100000 }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="budget" fill="#1d70f5" radius={[8, 8, 0, 0]} />
              <Bar dataKey="utilized" fill="#159f6b" radius={[8, 8, 0, 0]} />
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
  return <AdminDashboard />;
};

