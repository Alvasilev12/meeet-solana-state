interface LiveIndicatorProps {
  isConnected: boolean;
  label?: string;
  className?: string;
}

const LiveIndicator = ({ isConnected, label = "LIVE", className = "" }: LiveIndicatorProps) => {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="relative flex h-2 w-2">
        {isConnected && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? "bg-emerald-400" : "bg-muted-foreground/40"}`} />
      </span>
      <span className={`text-[10px] font-bold uppercase tracking-wider ${isConnected ? "text-emerald-400" : "text-muted-foreground"}`}>
        {isConnected ? label : "Connecting..."}
      </span>
    </span>
  );
};

export default LiveIndicator;
