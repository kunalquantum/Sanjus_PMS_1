import { Search, Sparkles } from 'lucide-react';
import { currency, percent } from '../../utils/format';

const toneStyles = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  danger: 'border-rose-200 bg-rose-50 text-rose-700',
  info: 'border-blue-200 bg-blue-50 text-blue-700',
  neutral: 'border-slate-200 bg-slate-100 text-slate-700',
};

export const StatusBadge = ({ status }) => {
  const normalized = `${status}`.toLowerCase();
  const tone = normalized.includes('approved') || normalized.includes('active') || normalized.includes('strong') || normalized.includes('disbursed') || normalized.includes('ready') || normalized.includes('success') || normalized.includes('healthy')
    ? 'success'
    : normalized.includes('warning') || normalized.includes('review') || normalized.includes('pending') || normalized.includes('scheduled') || normalized.includes('monitoring') || normalized.includes('invited')
      ? 'warning'
      : normalized.includes('critical') || normalized.includes('rejected') || normalized.includes('flagged') || normalized.includes('needs')
        ? 'danger'
        : normalized.includes('info') || normalized.includes('open') || normalized.includes('progress')
          ? 'info'
          : 'neutral';

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] shadow-sm ${toneStyles[tone]}`}>
      {status}
    </span>
  );
};

export const PageHeader = ({ eyebrow, title, description, actions }) => (
  <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
    <div className="max-w-3xl">
      {eyebrow ? (
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white/80 px-3 py-1">
          <Sparkles className="h-3.5 w-3.5 text-brand-500" />
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-brand-600">{eyebrow}</p>
        </div>
      ) : null}
      <h1 className="mt-4 font-display text-4xl font-bold tracking-[-0.04em] text-slate-950 sm:text-5xl">{title}</h1>
      {description ? <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">{description}</p> : null}
    </div>
    {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
  </div>
);

export const SectionCard = ({ title, subtitle, actions, children, className = '' }) => (
  <section className={`panel-sheen rounded-[32px] border border-white/60 bg-white/80 p-8 shadow-panel backdrop-blur-xl ${className}`}>
    {(title || subtitle || actions) && (
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 max-w-2xl">
          {title ? <h3 className="truncate text-2xl font-bold tracking-[-0.04em] text-slate-950" title={title}>{title}</h3> : null}
          {subtitle ? <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    )}
    {children}
  </section>
);

export const HeroSummary = ({ title, description, stats, color = 'brand' }) => (
  <div className="panel-sheen relative overflow-hidden rounded-[40px] border border-white/20 bg-slate-950 p-10 text-white shadow-panel lg:p-12">
    <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-brand-500/20 blur-[100px]" />
    <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-emerald-500/10 blur-[80px]" />
    
      <div className="relative grid min-w-0 gap-12 xl:grid-cols-[1.2fr,0.8fr]">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-brand-300" />
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-100/80">Command Center</p>
          </div>
          <h2 className="mt-8 font-display text-4xl font-bold tracking-[-0.04em] lg:text-6xl">{title}</h2>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">{description}</p>
        </div>

        <div className="grid min-w-0 gap-6 sm:grid-cols-2">
          {stats.map((stat) => (
            <div key={stat.label} className="min-w-0 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md transition-transform hover:scale-[1.02]">
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{stat.label}</p>
              <p className="mt-4 truncate text-3xl font-bold tracking-[-0.04em]">{stat.value}</p>
              <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-slate-500">{stat.helper}</p>
            </div>
          ))}
        </div>
      </div>
  </div>
);

export const KPIGrid = ({ items }) => (
  <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
    {items.map((item) => (
      <div
        key={item.label}
        className="panel-sheen group min-w-0 rounded-[32px] border border-white/60 bg-white/80 p-6 shadow-panel transition-all duration-300 hover:-translate-y-1 hover:bg-white/90"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400 group-hover:text-brand-500 transition-colors">{item.label}</p>
            <p className="mt-4 truncate text-3xl font-bold tracking-[-0.04em] text-slate-950" title={item.value}>{item.value}</p>
          </div>
          {item.badge ? <div className="flex-shrink-0"><StatusBadge status={item.badge} /></div> : null}
        </div>
        <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-slate-500">{item.helper}</p>
      </div>
    ))}
  </div>
);

export const FilterBar = ({ filters = [] }) => (
  <div className="rounded-[28px] border border-white/70 bg-white/88 p-4 shadow-panel backdrop-blur-xl">
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {filters.map((filter) => (
        <label key={filter.label} className="text-sm text-slate-500">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{filter.label}</span>
          {filter.type === 'search' ? (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                className="w-full bg-transparent outline-none placeholder:text-slate-400"
                placeholder={filter.placeholder}
                value={filter.value ?? ''}
                onChange={filter.onChange}
              />
            </div>
          ) : (
            <select
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none transition focus:border-brand-300 focus:bg-white"
              value={filter.value ?? filter.options?.[0]}
              onChange={filter.onChange}
            >
              {filter.options.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          )}
        </label>
      ))}
    </div>
  </div>
);

export const Table = ({ columns, rows }) => (
  <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white/92 shadow-panel backdrop-blur-xl">
    <div className="overflow-x-auto">
      <table className="min-w-full text-left">
        <thead className="data-grid border-b border-slate-200 bg-slate-50/90">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-6 py-5 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={row.id ?? rowIndex} className="group border-b border-slate-100/80 transition hover:bg-brand-50/35">
              {columns.map((column) => (
                <td key={column.key} className="px-6 py-5 align-middle text-sm text-slate-700 transition group-hover:text-slate-950">
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export const ProgressBar = ({ value, color = 'from-brand-500 to-brand-700' }) => (
  <div className="h-2.5 rounded-full bg-slate-100">
    <div className={`h-2.5 rounded-full bg-gradient-to-r ${color}`} style={{ width: `${value}%` }} />
  </div>
);

export const Tabs = ({ tabs, active, onChange }) => (
  <div className="rounded-[24px] border border-white/70 bg-white/88 p-2 shadow-panel backdrop-blur-xl">
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
            active === tab
              ? 'bg-slate-950 text-white shadow-soft'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  </div>
);

export const ModalCard = ({ title, description, children }) => (
  <div className="rounded-[28px] border border-dashed border-brand-200 bg-gradient-to-br from-brand-50/70 to-white p-5">
    <h4 className="text-lg font-bold tracking-[-0.02em] text-slate-950">{title}</h4>
    {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
    <div className="mt-4">{children}</div>
  </div>
);

export const FileUploadBox = ({ title = 'Upload receipt / proof' }) => (
  <div className="rounded-[28px] border-2 border-dashed border-brand-200 bg-gradient-to-br from-brand-50 to-white p-7 text-center">
    <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-600">{title}</p>
    <p className="mt-3 text-sm leading-6 text-slate-500">Drag and drop files here or browse local files. Supported: PDF, PNG, JPG.</p>
    <button className="mt-5 rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-soft">Choose File</button>
  </div>
);

export const TimelineList = ({ items }) => (
  <div className="space-y-4">
    {items.map((item) => (
      <div key={item.id} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex gap-3">
          <div className="mt-1 h-3 w-3 rounded-full bg-gradient-to-br from-brand-500 to-accent-500" />
          <div>
            <p className="text-sm font-semibold text-slate-900">{item.message}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">{item.actor} - {item.time}</p>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const MetricPill = ({ label, value, format = 'text' }) => (
  <div className="min-w-0 rounded-[22px] border border-slate-200 bg-slate-50/90 px-4 py-3">
    <p className="truncate text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{label}</p>
    <p className="mt-1 truncate text-lg font-bold tracking-[-0.03em] text-slate-950" title={value}>
      {format === 'currency' ? currency(value) : format === 'percent' ? percent(value) : value}
    </p>
  </div>
);
