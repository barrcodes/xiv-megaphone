import { useEffect, useState } from "react";
import { getVersion } from "../lib/ipc";

export function AppVersion() {
  const [version, setVersion] = useState<string>();

  useEffect(() => {
    getVersion().then(setVersion);
  }, []);

  if (!version) return null;

  return (
    <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      v{version}
      {import.meta.env.DEV && "-dev"}
    </span>
  );
}
