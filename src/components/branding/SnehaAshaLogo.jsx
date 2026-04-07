import handMark from '../../assets/snehasha-logo.png';
import { useTheme } from '../../context/ThemeContext';

export const SnehaAshaLogo = ({ compact = false, className = '' }) => {
  const { theme } = useTheme();
  const wordmarkTone = theme === 'dark' ? 'text-white' : 'text-slate-950';
  const taglineTone = theme === 'dark' ? 'text-white/70' : 'text-slate-500';

  return (
    <div className={`flex items-center gap-3 ${compact ? 'text-left' : 'flex-col text-center'} ${className}`}>
      <div className={`overflow-hidden ${compact ? 'h-12 w-12 rounded-2xl' : 'h-20 w-20 rounded-[28px]'} bg-brand-50/20`}>
        <img
          src={handMark}
          alt="Sneha Asha"
          className={`h-full w-full object-cover ${compact ? 'object-top' : 'object-top'}`}
        />
      </div>
      <div>
        <h1 className={`font-display font-bold leading-none tracking-[-0.05em] ${wordmarkTone} ${compact ? 'text-3xl' : 'text-5xl lg:text-6xl'}`}>
          sneha asha
        </h1>
        <p className={`mt-1 text-[10px] font-bold uppercase tracking-[0.42em] ${taglineTone}`}>
          A Step Towards A Better Future.
        </p>
      </div>
    </div>
  );
};

export default SnehaAshaLogo;
