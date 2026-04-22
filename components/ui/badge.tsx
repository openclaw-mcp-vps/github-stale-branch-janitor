import * as React from "react";

import { cn } from "@/lib/utils";

function Badge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-[#30363d] bg-[#21262d] px-2.5 py-1 text-xs font-medium text-[#8b949e]",
        className
      )}
      {...props}
    />
  );
}

export { Badge };
