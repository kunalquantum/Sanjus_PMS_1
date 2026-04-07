import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Download, Search, Upload } from 'lucide-react';
import { SectionCard } from '../../components/ui';
import { currency, percent } from '../../utils/format';
import { exportToPDF } from '../../utils/exportUtils';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

const colors = ['#1e3b68', '#f5a12a', '#3aa89f', '#8f4f16'];
const numberValue = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const filterSelectClass =
  'rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none dark:border-white/10 dark:bg-[#2a211c] dark:text-white';

const mapRow = (row) => {
  const general = row.general_profile || {};
  const enrolment = row.enrolment_profile || {};
  const facility = row.facility_profile || {};
  const preview = row.preview_profile || {};
  const amount11th = numberValue(facility.amount_11th);
  const amount12th = numberValue(facility.amount_12th);
  const amount14th = numberValue(facility.amount_14th);
  const coachingYear1 = numberValue(facility.coaching_amount_year_1);
  const coachingYear2 = numberValue(facility.coaching_amount_year_2);

  return {
    id: row.id,
    sourceSheet: row.source_sheet || 'All Batch',
    name: row.student_name || 'Unknown Student',
    pen: row.pen || '',
    gender: row.gender || 'Unknown',
    schoolName: row.school_name || 'Unknown',
    age: `${general.age || 'Unknown'}`,
    yearOfPassingSSC: `${general.year_of_passing_ssc || 'Unknown'}`,
    integrated: `${enrolment.enrolled_in_11th || general.integrated || 'Unknown'}`,
    amount11th,
    amount12th,
    amount14th,
    coachingYear1,
    coachingYear2,
    totalAmount: numberValue(preview.total_amount) || amount11th + amount12th + amount14th + coachingYear1 + coachingYear2,
    updatedLabel: row.updated_on ? new Date(row.updated_on).toLocaleDateString('en-GB') : 'Manual',
  };
};

const chartBlock = (title, children) => (
  <SectionCard title={title} subtitle="" className="h-full">
    <div className="h-72">{children}</div>
  </SectionCard>
);

export const AdminReportDashboard = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [batch, setBatch] = useState('All Batch');
  const [gender, setGender] = useState('All');
  const [age, setAge] = useState('All');
  const [year, setYear] = useState('All');
  const [integrated, setIntegrated] = useState('All');
  const [search, setSearch] = useState('');
  const [tableSearch, setTableSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    supabase.from('school_data').select('*').order('student_name').then(({ data, error }) => {
      if (error) setError(error.message || 'Unable to load dashboard.');
      else setRows((data || []).map(mapRow));
    });
  }, []);

  const filtered = useMemo(() => rows.filter((row) => {
    const term = search.trim().toLowerCase();
    return (batch === 'Summary Dashboard' || (batch === 'All Batch' ? row.sourceSheet === 'All Batch' || !rows.some((item) => item.sourceSheet === 'All Batch') : row.sourceSheet === batch))
      && (gender === 'All' || row.gender === gender)
      && (age === 'All' || row.age === age)
      && (year === 'All' || row.yearOfPassingSSC === year)
      && (integrated === 'All' || row.integrated === integrated)
      && (!term || row.name.toLowerCase().includes(term) || row.pen.toLowerCase().includes(term) || row.schoolName.toLowerCase().includes(term));
  }), [age, batch, gender, integrated, rows, search, year]);

  const stats = {
    transactions: filtered.length,
    donors: new Set(filtered.map((row) => row.pen || row.name)).size,
    donations: filtered.reduce((sum, row) => sum + row.totalAmount, 0),
    avgGift: filtered.length ? filtered.reduce((sum, row) => sum + row.totalAmount, 0) / filtered.length : 0,
  };

  const trend = filtered.slice(0, 16).map((row, index) => ({ label: row.updatedLabel || `Tx ${index + 1}`, amount11th: row.amount11th }));
  const topStudents = filtered.slice().sort((a, b) => b.amount11th - a.amount11th).slice(0, 10).map((row) => ({ name: row.name, amount11th: row.amount11th }));
  const by14th = Object.values(filtered.reduce((acc, row) => {
    const key = row.amount14th ? `${row.amount14th}` : 'Unknown';
    acc[key] = acc[key] || { name: key, value: 0 };
    acc[key].value += row.amount11th;
    return acc;
  }, {}));
  const byAge = Object.values(filtered.reduce((acc, row) => {
    acc[row.age] = acc[row.age] || { name: row.age, value: 0 };
    acc[row.age].value += row.totalAmount || 1;
    return acc;
  }, {}));
  const bySchool = Object.values(filtered.reduce((acc, row) => {
    const key = row.schoolName || 'Unknown';
    acc[key] = acc[key] || { name: key.length > 18 ? `${key.slice(0, 18)}..` : key, amount11th: 0, amount12th: 0, coachingYear1: 0 };
    acc[key].amount11th += row.amount11th;
    acc[key].amount12th += row.amount12th;
    acc[key].coachingYear1 += row.coachingYear1;
    return acc;
  }, {})).slice(0, 8);

  const tableRows = filtered.filter((row) => {
    const term = tableSearch.trim().toLowerCase();
    return !term || row.name.toLowerCase().includes(term) || row.schoolName.toLowerCase().includes(term) || row.pen.toLowerCase().includes(term);
  });
  const pageCount = Math.max(1, Math.ceil(tableRows.length / 10));
  const pageRows = tableRows.slice((page - 1) * 10, page * 10);

  useEffect(() => setPage(1), [search, tableSearch, batch, gender, age, year, integrated]);

  const batches = ['Summary Dashboard', 'All Batch', 'Batch - 2', 'Batch - 3'];
  const ageOptions = ['All', ...new Set(rows.map((row) => row.age))];
  const yearOptions = ['All', ...new Set(rows.map((row) => row.yearOfPassingSSC))];
  const integratedOptions = ['All', ...new Set(rows.map((row) => row.integrated))];

  return (
    <div id="snehasha-report-dashboard" className="space-y-6">
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      <SectionCard className="p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {batches.map((item) => <button key={item} onClick={() => setBatch(item)} className={`rounded-full border px-4 py-2 text-sm font-semibold ${batch === item ? 'border-slate-950 bg-slate-950 text-white dark:border-brand-500 dark:bg-brand-500 dark:text-slate-950' : 'border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/75'}`}>{item}</button>)}
            </div>
            <div>
              <h1 className="font-display text-4xl font-bold tracking-[-0.05em] text-slate-950 dark:text-white">Snehasha Dashboard</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-white/60">{batch} · {stats.transactions} transactions · report ready</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => exportToPDF('snehasha-report-dashboard', `SnehaAsha_${batch.replace(/\s+/g, '_')}.pdf`, { title: `Sneha Asha Dashboard - ${batch}` })} className="inline-flex items-center gap-2 rounded-2xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-soft"><Download className="h-4 w-4" />Export PDF</button>
            <button onClick={() => navigate('/settings')} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"><Upload className="h-4 w-4" />New Upload</button>
          </div>
        </div>
      </SectionCard>

      <SectionCard className="p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="xl:col-span-2"><div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]"><Search className="h-4 w-4 text-brand-500" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student, PEN, school..." className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-white/35" /></div></div>
          {[{ value: gender, setValue: setGender, options: ['All', 'Male', 'Female', 'Transgender', 'Unknown'] }, { value: age, setValue: setAge, options: ageOptions }, { value: year, setValue: setYear, options: yearOptions }, { value: integrated, setValue: setIntegrated, options: integratedOptions }].map((filter, index) => (
            <select key={index} value={filter.value} onChange={(e) => filter.setValue(e.target.value)} className={filterSelectClass}>
              {filter.options.map((option) => (
                <option key={option} value={option} className="bg-white text-slate-900 dark:bg-[#2a211c] dark:text-white">
                  {option}
                </option>
              ))}
            </select>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[['Total Transactions', stats.transactions], ['Total Donors', stats.donors], ['Total Donations', currency(stats.donations)], ['Average Gift', currency(stats.avgGift)]].map(([label, value]) => <SectionCard key={label} className="p-5"><p className="text-sm font-medium text-slate-500 dark:text-white/50">{label}</p><p className="mt-5 text-4xl font-bold tracking-[-0.04em] text-slate-950 dark:text-white">{value}</p></SectionCard>)}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {chartBlock('11th College Amount Over Time', <ResponsiveContainer width="100%" height="100%"><AreaChart data={trend}><defs><linearGradient id="amountFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1e3b68" stopOpacity={0.35} /><stop offset="95%" stopColor="#1e3b68" stopOpacity={0.04} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" tick={{ fontSize: 10 }} /><YAxis /><Tooltip /><Legend /><Area type="monotone" dataKey="amount11th" name="11th College Amount" stroke="#1e3b68" fill="url(#amountFill)" strokeWidth={2} /></AreaChart></ResponsiveContainer>)}
        {chartBlock('Top 10 Name Of Student by 11th College Amount', <ResponsiveContainer width="100%" height="100%"><BarChart data={topStudents}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" angle={-28} textAnchor="end" height={90} tick={{ fontSize: 10 }} /><YAxis /><Tooltip /><Legend /><Bar dataKey="amount11th" name="11th College Amount" fill="#1e3b68" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer>)}
        {chartBlock('11th College Amount by 14th College Amount', <ResponsiveContainer width="100%" height="100%"><BarChart data={by14th}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Bar dataKey="value" name="11th College Amount" fill="#1e3b68" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer>)}
        {chartBlock('11th College Amount Share by Age', <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={byAge} dataKey="value" nameKey="name" innerRadius={55} outerRadius={96} paddingAngle={3}>{byAge.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>)}
        {chartBlock('11th, 12th & 1st Year Coaching Amount', <ResponsiveContainer width="100%" height="100%"><BarChart data={bySchool}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" angle={-24} textAnchor="end" height={80} tick={{ fontSize: 10 }} /><YAxis /><Tooltip /><Legend /><Bar dataKey="amount11th" stackId="support" name="11th College Amount" fill="#1e3b68" /><Bar dataKey="amount12th" stackId="support" name="12th College Amount" fill="#f5a12a" /><Bar dataKey="coachingYear1" stackId="support" name="1st Year Coaching Amount" fill="#3aa89f" /></BarChart></ResponsiveContainer>)}
      </div>

      <SectionCard title="Donor Transactions" subtitle="">
        <div className="mb-4 flex justify-end"><div className="flex items-center gap-3 rounded-2xl bg-brand-500 px-4 py-3 text-slate-950 shadow-soft"><Search className="h-4 w-4" /><input value={tableSearch} onChange={(e) => setTableSearch(e.target.value)} placeholder="Search..." className="w-48 bg-transparent text-sm font-medium outline-none placeholder:text-slate-700/60" /></div></div>
        <div className="overflow-hidden rounded-[24px] border border-brand-200/60 bg-white dark:border-brand-500/20 dark:bg-white/[0.03]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-brand-500 text-slate-950"><tr>{['Student', 'Gender', 'Age', 'Year Of Passing SSC', '11th College Amount', '12th College Amount', '1st Year Coaching', '2nd Year Coaching', '14th College Amount', 'Total Amount'].map((column) => <th key={column} className="whitespace-nowrap px-4 py-4 text-xs font-bold uppercase tracking-[0.18em]">{column}</th>)}</tr></thead>
              <tbody>{pageRows.map((row) => <tr key={row.id} className="border-b border-slate-200 text-sm text-slate-700 dark:border-white/10 dark:text-white/80"><td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-950 dark:text-white">{row.name}</td><td className="px-4 py-4">{row.gender}</td><td className="px-4 py-4">{row.age}</td><td className="px-4 py-4">{row.yearOfPassingSSC}</td><td className="px-4 py-4">{currency(row.amount11th)}</td><td className="px-4 py-4">{currency(row.amount12th)}</td><td className="px-4 py-4">{currency(row.coachingYear1)}</td><td className="px-4 py-4">{currency(row.coachingYear2)}</td><td className="px-4 py-4">{currency(row.amount14th)}</td><td className="px-4 py-4 font-semibold">{currency(row.totalAmount)}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-4 text-sm text-slate-500 dark:border-white/10 dark:text-white/55"><span>{tableRows.length} rows</span><div className="flex items-center gap-3"><button onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1} className="rounded-xl bg-brand-50 px-3 py-1.5 font-semibold text-brand-700 disabled:opacity-40 dark:bg-brand-500/10 dark:text-brand-300">Prev</button><span>{page} / {pageCount}</span><button onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={page === pageCount} className="rounded-xl bg-brand-500 px-3 py-1.5 font-semibold text-slate-950 disabled:opacity-40">Next</button></div></div>
        </div>
      </SectionCard>
    </div>
  );
};
