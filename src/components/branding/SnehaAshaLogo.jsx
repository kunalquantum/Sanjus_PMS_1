import wordmark from '../../assets/snehasha-logo.png';

export const SnehaAshaLogo = ({ compact = false, className = '' }) => {
  return (
    <div className={`inline-flex ${className}`}>
      <div
        className={`rounded-[28px] border border-slate-200/70 bg-white px-4 py-3 shadow-soft dark:border-white/10 dark:bg-white/95 ${
          compact ? 'max-w-[220px]' : 'max-w-[420px]'
        }`}
      >
        <img
          src={wordmark}
          alt="Sneha Asha - A Step Towards A Better Future"
          className={`h-auto w-full object-contain ${compact ? 'max-h-14' : 'max-h-36'}`}
        />
      </div>
    </div>
  );
};

export default SnehaAshaLogo;
