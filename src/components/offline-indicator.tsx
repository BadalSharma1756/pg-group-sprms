import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { WifiOff, RefreshCw } from "lucide-react";

export function OfflineIndicator() {
  const qc = useQueryClient();
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [justSynced, setJustSynced] = useState(false);

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      qc.invalidateQueries(); // auto-sync
      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 2500);
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [qc]);

  if (online && !justSynced) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-md border bg-card shadow-lg px-3 py-2 text-xs flex items-center gap-2">
      {online ? (
        <><RefreshCw className="size-4 text-emerald-500 animate-spin" /><span>Back online — syncing</span></>
      ) : (
        <><WifiOff className="size-4 text-amber-500" /><span>Offline — showing cached data</span></>
      )}
    </div>
  );
}