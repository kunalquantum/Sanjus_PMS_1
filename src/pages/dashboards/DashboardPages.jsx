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
import { currency, percent } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { exportAdminSnapshotPDF, exportFunderImpactPDF, exportToPDF } from '../../utils/exportUtils';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import SnehaAshaLogo from '../../components/branding/SnehaAshaLogo';

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
  const [rawRows, setRawRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadRows = async () => {
      try {
        setLoading(true);
        setError('');
        const { data, error } = await supabase.from('school_data').select('*').order('student_name');
        if (error) throw error;
        setRawRows(data || []);
        setRows((data || []).map(buildDashboardStudent));
      } catch (err) {
        setError(err.message || 'Unable to load dashboard data.');
        setRawRows([]);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    loadRows();
  }, []);

  return { rows, rawRows, loading, error };
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

const compactNumber = (value) =>
  new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(toNumber(value));

const formatTransactionValue = (value) => {
  const amount = toNumber(value);
  return amount ? currency(amount) : '-';
};

const normalizeFilterValue = (value, fallback = 'Unknown') => {
  const text = `${value ?? ''}`.trim();
  return text || fallback;
};

const chartToolbar = (
  <div className="flex items-center gap-3 text-slate-400">
    <button className="transition hover:text-slate-600" aria-label="Filter chart">
      <Filter className="h-4 w-4" />
    </button>
    <button className="transition hover:text-slate-600" aria-label="Download chart">
      <Download className="h-4 w-4" />
    </button>
  </div>
);

const SummaryCard = ({ label, value, icon }) => (
  <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <div className="rounded-2xl bg-slate-100 p-3 text-slate-600">{icon}</div>
    </div>
    <p className="mt-8 text-5xl font-bold tracking-[-0.04em] text-slate-900">{value}</p>
  </div>
);

const DetailPill = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
    <p className="mt-2 text-lg font-bold text-slate-900">{value}</p>
  </div>
);

const AdminReportDashboard = () => {
  const navigate = useNavigate();
  const { addNotification } = useAuth();
  const { rows, rawRows, loading, error } = useDashboardData();
  const [selectedSheet, setSelectedSheet] = useState('All Batch');
  const [selectedGender, setSelectedGender] = useState('All');
  const [selectedAge, setSelectedAge] = useState('All');
  const [selectedPassingYear, setSelectedPassingYear] = useState('All');
  const [selectedIntegrated, setSelectedIntegrated] = useState('All');
  const [tableSearch, setTableSearch] = useState('');
  const [viewMode, setViewMode] = useState('dashboard');

  const sheetCounts = useMemo(() => {
    const counts = rows.reduce((acc, row) => {
      const key = normalizeFilterValue(row.sourceSheet);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return [
      { key: 'Summary Dashboard', count: Object.keys(counts).length },
      ...Object.entries(counts).map(([key, count]) => ({ key, count })),
    ];
  }, [rows]);

  const availableSheets = useMemo(
    () => sheetCounts.map((item) => item.key),
    [sheetCounts]
  );

  useEffect(() => {
    if (!availableSheets.includes(selectedSheet) && availableSheets.includes('All Batch')) {
      setSelectedSheet('All Batch');
    }
  }, [availableSheets, selectedSheet]);

  const sheetRows = useMemo(() => {
    if (selectedSheet === 'Summary Dashboard') {
      return rows;
    }
    return rows.filter((row) => normalizeFilterValue(row.sourceSheet) === selectedSheet);
  }, [rows, selectedSheet]);

  const filterOptions = useMemo(() => {
    const uniqueValues = (selector) => [
      'All',
      ...new Set(sheetRows.map(selector).map((value) => normalizeFilterValue(value))).values(),
    ];

    return {
      genders: uniqueValues((row) => row.gender),
      ages: uniqueValues((row) => row.age),
      passingYears: uniqueValues((row) => row.yearOfPassingSSC),
      integrated: uniqueValues((row) => row.integrated),
    };
  }, [sheetRows]);

  const filteredRows = useMemo(
    () =>
      sheetRows.filter((row) => {
        if (selectedGender !== 'All' && normalizeFilterValue(row.gender) !== selectedGender) return false;
        if (selectedAge !== 'All' && normalizeFilterValue(row.age) !== selectedAge) return false;
        if (selectedPassingYear !== 'All' && normalizeFilterValue(row.yearOfPassingSSC) !== selectedPassingYear) return false;
        if (selectedIntegrated !== 'All' && normalizeFilterValue(row.integrated) !== selectedIntegrated) return false;
        return true;
      }),
    [sheetRows, selectedGender, selectedAge, selectedPassingYear, selectedIntegrated]
  );

  const searchedRows = useMemo(() => {
    const query = tableSearch.trim().toLowerCase();
    if (!query) return filteredRows;
    return filteredRows.filter((row) =>
      [row.name, row.schoolName, row.pen, row.programName]
        .filter(Boolean)
        .some((value) => `${value}`.toLowerCase().includes(query))
    );
  }, [filteredRows, tableSearch]);

  const totalTransactions = filteredRows.length;
  const totalDonations = filteredRows.reduce((sum, row) => sum + row.totalAmount, 0);
  const averageGift = totalTransactions ? totalDonations / totalTransactions : 0;
  const fieldCount = useMemo(() => {
    const keys = new Set();
    rawRows.forEach((row) => {
      Object.keys(row || {}).forEach((key) => keys.add(key));
    });
    return keys.size;
  }, [rawRows]);
  const totalSheets = useMemo(
    () => new Set(rows.map((row) => normalizeFilterValue(row.sourceSheet))).size,
    [rows]
  );
  const totalSchools = useMemo(
    () => new Set(filteredRows.map((row) => normalizeFilterValue(row.schoolName))).size,
    [filteredRows]
  );
  const totalBeneficiaries = useMemo(
    () => new Set(filteredRows.map((row) => row.pen || row.id)).size,
    [filteredRows]
  );
  const completedProfiles = useMemo(
    () => filteredRows.filter((row) => `${row.entryStatus}`.toLowerCase() === 'completed').length,
    [filteredRows]
  );
  const totalApproved = useMemo(
    () => filteredRows.reduce((sum, row) => sum + row.approvedAmount, 0),
    [filteredRows]
  );
  const totalReceived = useMemo(
    () => filteredRows.reduce((sum, row) => sum + row.receivedAmount, 0),
    [filteredRows]
  );
  const completionRate = totalTransactions ? Math.round((completedProfiles / totalTransactions) * 100) : 0;
  const avgAttendance = totalTransactions
    ? Math.round(filteredRows.reduce((sum, row) => sum + toNumber(row.attendance), 0) / totalTransactions)
    : 0;
  const avgAcademics = totalTransactions
    ? Math.round(filteredRows.reduce((sum, row) => sum + toNumber(row.average), 0) / totalTransactions)
    : 0;
  const uniquePrograms = useMemo(
    () => new Set(filteredRows.map((row) => normalizeFilterValue(row.programName))).size,
    [filteredRows]
  );

  const amount11thTrend = useMemo(
    () =>
      buildMonthlyTrend(filteredRows).map((item) => ({
        month: item.month,
        amount11th: filteredRows
          .filter((row) => formatMonthLabel(row.updatedOn || row.created_at || new Date()) === item.month)
          .reduce((sum, row) => sum + row.amount11th, 0),
      })),
    [filteredRows]
  );

  const topStudentsBy11th = useMemo(
    () =>
      [...filteredRows]
        .filter((row) => row.amount11th > 0)
        .sort((a, b) => b.amount11th - a.amount11th)
        .slice(0, 10)
        .map((row) => ({
          name: row.name.length > 18 ? `${row.name.slice(0, 18)}...` : row.name,
          amount11th: row.amount11th,
        })),
    [filteredRows]
  );

  const amount11thBy14th = useMemo(
    () =>
      Object.values(
        filteredRows.reduce((acc, row) => {
          const key = row.amount14th ? `${row.amount14th}` : 'Unknown';
          if (!acc[key]) {
            acc[key] = { name: key, amount11th: 0 };
          }
          acc[key].amount11th += row.amount11th;
          return acc;
        }, {})
      ),
    [filteredRows]
  );

  const amountShareBy14th = useMemo(
    () =>
      amount11thBy14th.map((item, index) => ({
        ...item,
        fill: colors[index % colors.length],
      })),
    [amount11thBy14th]
  );

  const schoolComboData = useMemo(
    () =>
      Object.values(
        filteredRows.reduce((acc, row) => {
          const key = normalizeFilterValue(row.schoolName);
          if (!acc[key]) {
            acc[key] = {
              name: key.length > 22 ? `${key.slice(0, 22)}...` : key,
              amount11th: 0,
              amount12th: 0,
              coachingYear1: 0,
              coachingYear2: 0,
              totalAmount: 0,
            };
          }
          acc[key].amount11th += row.amount11th;
          acc[key].amount12th += row.amount12th;
          acc[key].coachingYear1 += row.coachingYear1;
          acc[key].coachingYear2 += row.coachingYear2;
          acc[key].totalAmount += row.totalAmount;
          return acc;
        }, {})
      )
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 8),
    [filteredRows]
  );

  const coachingShareByAge = useMemo(
    () =>
      Object.values(
        filteredRows.reduce((acc, row) => {
          const key = normalizeFilterValue(row.age);
          if (!acc[key]) {
            acc[key] = { name: key, value: 0 };
          }
          acc[key].value += row.coachingYear1;
          return acc;
        }, {})
      ),
    [filteredRows]
  );

  const ageDistribution = useMemo(
    () =>
      Object.values(
        filteredRows.reduce((acc, row) => {
          const key = normalizeFilterValue(row.age);
          if (!acc[key]) {
            acc[key] = { name: key, students: 0 };
          }
          acc[key].students += 1;
          return acc;
        }, {})
      ).sort((a, b) => b.students - a.students),
    [filteredRows]
  );

  const schoolBreakdown = useMemo(
    () =>
      Object.values(
        filteredRows.reduce((acc, row) => {
          const key = normalizeFilterValue(row.schoolName);
          if (!acc[key]) {
            acc[key] = { name: key, students: 0, totalAmount: 0 };
          }
          acc[key].students += 1;
          acc[key].totalAmount += row.totalAmount;
          return acc;
        }, {})
      )
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 6),
    [filteredRows]
  );

  const detailedTableRows = useMemo(
    () =>
      searchedRows.map((row) => ({
        ...row,
        ageLabel: normalizeFilterValue(row.age),
        passingYearLabel: normalizeFilterValue(row.yearOfPassingSSC),
        integratedLabel: normalizeFilterValue(row.integrated),
        schoolLabel: normalizeFilterValue(row.schoolName),
        receivedLabel: formatTransactionValue(row.receivedAmount),
        approvedLabel: formatTransactionValue(row.approvedAmount),
      })),
    [searchedRows]
  );

  const handleExport = () => {
    exportToPDF('admin-report-dashboard', 'snehasha-dashboard.pdf', {
      title: 'SnehaAsha Dashboard',
    });
    addNotification('Dashboard export', 'The donor-ready dashboard PDF was generated from live school data.', 'Success');
  };

  return (
    <div className="space-y-6">
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            <BarChart3 className="h-4 w-4" />
            Sheets
          </div>
          {sheetCounts.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedSheet(tab.key)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                selectedSheet === tab.key
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-brand-200 hover:text-slate-900'
              }`}
            >
              <span>{tab.key}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${selectedSheet === tab.key ? 'bg-white/20 text-white' : 'bg-amber-400 text-slate-900'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div id="admin-report-dashboard" className="space-y-6 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 gap-5">
            <SnehaAshaLogo compact className="shrink-0" />
            <div className="min-w-0">
              <h1 className="font-display text-4xl font-bold tracking-[-0.04em] text-slate-900">Snehasha Dashboard</h1>
              <p className="mt-1 text-sm text-slate-500">
                {selectedSheet} · {totalTransactions} transactions · {fieldCount} fields · {totalSheets} sheets
              </p>
              <p className="mt-2 text-base text-slate-600">
                Live database reporting view generated from the connected `school_data` records.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-full bg-amber-100 p-1">
              {['dashboard', 'donorProfiles'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                    viewMode === mode ? 'bg-slate-900 text-white' : 'text-slate-600'
                  }`}
                >
                  {mode === 'dashboard' ? 'Dashboard' : 'Donor Profiles'}
                </button>
              ))}
            </div>
            <button onClick={handleExport} className="rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300">
              Export PDF
            </button>
            <button
              onClick={() => navigate('/students')}
              className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              New Upload
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <select value={selectedSheet} onChange={(event) => setSelectedSheet(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none">
            {availableSheets.map((sheet) => (
              <option key={sheet} value={sheet}>{sheet}</option>
            ))}
          </select>
          <select value={selectedGender} onChange={(event) => setSelectedGender(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none">
            {filterOptions.genders.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select value={selectedAge} onChange={(event) => setSelectedAge(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none">
            {filterOptions.ages.map((option) => <option key={option} value={option}>{option === 'All' ? 'Age' : option}</option>)}
          </select>
          <select value={selectedPassingYear} onChange={(event) => setSelectedPassingYear(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none">
            {filterOptions.passingYears.map((option) => <option key={option} value={option}>{option === 'All' ? 'Year Of Passing SSC' : option}</option>)}
          </select>
          <select value={selectedIntegrated} onChange={(event) => setSelectedIntegrated(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none">
            {filterOptions.integrated.map((option) => <option key={option} value={option}>{option === 'All' ? 'Integrated Yes Or No' : option}</option>)}
          </select>
        </div>

        <div className="grid gap-4 xl:grid-cols-4">
          <SummaryCard label="Total Transactions" value={compactNumber(totalTransactions)} icon={<span className="text-2xl font-bold">#</span>} />
          <SummaryCard label="Total Beneficiaries" value={compactNumber(totalBeneficiaries)} icon={<Users2 className="h-6 w-6" />} />
          <SummaryCard label="Total Donations" value={compactNumber(totalDonations)} icon={<IndianRupee className="h-6 w-6" />} />
          <SummaryCard label="Schools Covered" value={compactNumber(totalSchools)} icon={<Wallet className="h-6 w-6" />} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
          <SectionCard title="Portfolio Detail" subtitle="Live summary generated from the active filters and selected batch">
            <div className="grid gap-3 md:grid-cols-3">
              <DetailPill label="Completed Profiles" value={`${completedProfiles}/${totalTransactions || 0}`} />
              <DetailPill label="Completion Rate" value={`${completionRate}%`} />
              <DetailPill label="Programs" value={uniquePrograms} />
              <DetailPill label="Approved Amount" value={currency(totalApproved)} />
              <DetailPill label="Received Amount" value={currency(totalReceived)} />
              <DetailPill label="Average Gift" value={currency(averageGift)} />
              <DetailPill label="Average Attendance" value={`${avgAttendance}%`} />
              <DetailPill label="Average Academics" value={`${avgAcademics}`} />
              <DetailPill label="Current Search Rows" value={searchedRows.length} />
            </div>
          </SectionCard>

          <SectionCard title="Filter Snapshot" subtitle="What the current dashboard slice is showing from the database">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailPill label="Sheet" value={selectedSheet} />
                <DetailPill label="Gender Filter" value={selectedGender} />
                <DetailPill label="Age Filter" value={selectedAge} />
                <DetailPill label="SSC Year" value={selectedPassingYear} />
                <DetailPill label="Integrated" value={selectedIntegrated} />
                <DetailPill label="Fields Detected" value={fieldCount} />
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Top Schools by Total Amount</p>
                <div className="mt-4 space-y-3">
                  {schoolBreakdown.map((school) => (
                    <div key={school.name} className="flex items-center justify-between gap-4 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{school.name}</p>
                        <p className="text-slate-500">{school.students} students</p>
                      </div>
                      <p className="font-semibold text-slate-900">{currency(school.totalAmount)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <SectionCard title="11th College Amount Over Time" actions={chartToolbar}>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={amount11thTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => currency(value)} />
                  <Line type="monotone" dataKey="amount11th" stroke="#1f3b69" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="Top 10 Name Of Student by 11th College Amount" actions={chartToolbar}>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topStudentsBy11th}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-20} textAnchor="end" height={70} />
                  <YAxis />
                  <Tooltip formatter={(value) => currency(value)} />
                  <Bar dataKey="amount11th" fill="#1f3b69" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="11th College Amount by 14th College Amount" actions={chartToolbar}>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={amount11thBy14th}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-20} textAnchor="end" height={60} />
                  <YAxis />
                  <Tooltip formatter={(value) => currency(value)} />
                  <Bar dataKey="amount11th" fill="#1f3b69" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="11th College Amount Share by 14th College Amount" actions={chartToolbar}>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={amountShareBy14th} dataKey="amount11th" nameKey="name" innerRadius={65} outerRadius={100} paddingAngle={3}>
                    {amountShareBy14th.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => currency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="11th College Amount & 12th College Amount & 1st Year Coaching Amount" actions={chartToolbar}>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={schoolComboData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-20} textAnchor="end" height={70} />
                  <YAxis />
                  <Tooltip formatter={(value) => currency(value)} />
                  <Legend />
                  <Bar dataKey="amount11th" fill="#1f3b69" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="amount12th" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="coachingYear1" fill="#2ca6a4" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="1st Year Coaching Amount Share by Age" actions={chartToolbar}>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={coachingShareByAge} dataKey="value" nameKey="name" innerRadius={65} outerRadius={100} paddingAngle={3}>
                    {coachingShareByAge.map((entry, index) => (
                      <Cell key={entry.name} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => currency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="Age Distribution by Beneficiary Count" actions={chartToolbar}>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="students" fill="#8f4f16" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>

        <SectionCard
          title={viewMode === 'dashboard' ? 'Donor Transactions' : 'Donor Profiles'}
          actions={(
            <div className="flex items-center gap-3 rounded-2xl bg-amber-400 px-4 py-2 text-slate-900">
              <Search className="h-4 w-4" />
              <input
                value={tableSearch}
                onChange={(event) => setTableSearch(event.target.value)}
                placeholder="Search..."
                className="bg-transparent text-sm font-medium outline-none placeholder:text-slate-700/70"
              />
            </div>
          )}
        >
          <div className="mb-4 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1">Rows: {searchedRows.length}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">Current Sheet: {selectedSheet}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">Live Source: school_data</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[1600px] border-separate border-spacing-0 overflow-hidden rounded-3xl">
              <thead>
                <tr className="bg-amber-400 text-left text-sm font-semibold text-slate-900">
                  {[
                    'Student',
                    'PEN',
                    'Program',
                    'Batch',
                    'School',
                    'Age',
                    'SSC Year',
                    'Integrated',
                    'Status',
                    '11th',
                    '12th',
                    'Coaching Y1',
                    'Coaching Y2',
                    '14th',
                    'Approved',
                    'Received',
                    'Total',
                  ].map((heading) => (
                    <th key={heading} className="sticky top-0 px-4 py-3 whitespace-nowrap">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(loading ? [] : detailedTableRows).slice(0, 40).map((row, index) => (
                  <tr key={row.id} className={`border-b border-slate-100 text-sm text-slate-700 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}>
                    <td className="px-4 py-3">
                      <div className="min-w-[180px]">
                        <p className="font-semibold text-slate-900">{row.name}</p>
                        <p className="text-xs text-slate-500">{row.gender}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{row.pen || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{row.programName || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{row.sourceSheet || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{row.schoolLabel}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{row.ageLabel}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{row.passingYearLabel}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{row.integratedLabel}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.entryStatus} /></td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatTransactionValue(row.amount11th)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatTransactionValue(row.amount12th)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatTransactionValue(row.coachingYear1)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatTransactionValue(row.coachingYear2)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatTransactionValue(row.amount14th)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{row.approvedLabel}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{row.receivedLabel}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-semibold text-slate-900">{formatTransactionValue(row.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && detailedTableRows.length > 40 ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Showing first 40 rows out of {detailedTableRows.length} matching records. Use search and filters to narrow further.
            </div>
          ) : null}
          {!loading && !searchedRows.length ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              No rows matched the selected filters.
            </div>
          ) : null}
        </SectionCard>
      </div>
    </div>
  );
};

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
      activityRows: rows.slice(0, 8).map((row) => ({
        message: `${row.name} updated in ${row.className} / ${row.sectionName}`,
        actor: row.updatedBy || 'System',
        time: row.updatedOn || 'Recently',
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
            <TimelineList
              items={
                loading
                  ? [{ id: 'loading', message: 'Loading school activity...', actor: 'System', time: 'Just now' }]
                  : rows.slice(0, 8).map((row) => ({
                      id: row.id,
                      message: `${row.name} record synced from ${row.sourceSheet}`,
                      actor: row.updatedBy || 'System',
                      time: row.updatedOn || 'Recently',
                    }))
              }
            />
          </SectionCard>

          <SectionCard title="Database Snapshot" subtitle="Directly derived from the connected school_data table">
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricPill label="Rows Loaded" value={rows.length} />
              <MetricPill label="Fields Detected" value={fieldCount} />
              <MetricPill label="Sheets Found" value={totalSheets} />
              <MetricPill label="Schools Found" value={new Set(rows.map((row) => normalizeFilterValue(row.schoolName))).size} />
            </div>
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
              {rows.slice(0, 4).map((notificationRow) => (
                <div key={notificationRow.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between"><p className="font-semibold text-slate-900">Scholarship update</p><StatusBadge status={notificationRow.entryStatus} /></div>
                  <p className="mt-2 text-sm text-slate-500">
                    {notificationRow.name} has {currency(notificationRow.receivedAmount)} received against {currency(notificationRow.approvedAmount)} approved.
                  </p>
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

