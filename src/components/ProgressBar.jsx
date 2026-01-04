function ProgressBar({ progress }) {
  return (
    <div className="w-full">
      <div className="h-3 bg-forest-900/50 rounded-full overflow-hidden relative">
        {/* Progress fill */}
        <div
          className="h-full bg-gradient-to-r from-moss-500 to-forest-500 rounded-full transition-all duration-300 ease-out relative"
          style={{ width: `${Math.min(progress, 100)}%` }}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
        </div>

        {/* Scanning line overlay */}
        {progress < 100 && progress > 0 && (
          <div
            className="absolute top-0 h-full w-8 bg-gradient-to-r from-transparent via-moss-300/40 to-transparent"
            style={{
              left: `${Math.min(progress, 100)}%`,
              transform: 'translateX(-50%)',
              animation: 'shimmer 1.5s infinite',
            }}
          />
        )}
      </div>

      {/* Percentage text */}
      <div className="flex justify-between items-center mt-2">
        <span className="text-xs text-bark-400">Processing...</span>
        <span className="text-sm font-medium text-moss-400">
          {Math.round(progress)}%
        </span>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default ProgressBar;
