import React from "react";
import { Clock, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";

export default function TrialBanner({ user }) {
  if (!user || user.role === "admin" || user.has_access || user.plan_type !== "trial") return null;

  const trialExpires = user.trial_expires ? new Date(user.trial_expires) : null;
  const now = new Date();
  const daysLeft = trialExpires ? Math.max(0, Math.ceil((trialExpires - now) / (1000 * 60 * 60 * 24))) : 0;

  return (
    <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-6 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2 text-yellow-400 text-xs">
        <Clock className="w-3.5 h-3.5" />
        <span className="font-semibold">Free Trial:</span>
        <span className="text-yellow-300">{daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining</span>
        <span className="text-yellow-600">— Upgrade to keep access after trial ends</span>
      </div>
      <a href={createPageUrl("Home")}>
        <Button size="sm" className="bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 text-yellow-400 text-xs h-6 gap-1">
          <Key className="w-3 h-3" /> Redeem Key
        </Button>
      </a>
    </div>
  );
}