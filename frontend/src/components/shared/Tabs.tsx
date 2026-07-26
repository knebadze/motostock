"use client";

import { useState, type ReactNode } from "react";

export type TabItem = {
  key: string;
  label: string;
  content: ReactNode;
};

export function Tabs({ tabs, defaultTab }: { tabs: TabItem[]; defaultTab?: string }) {
  const [activeKey, setActiveKey] = useState(defaultTab ?? tabs[0]?.key);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveKey(tab.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeKey === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Inactive tabs stay mounted (just hidden) so their field state and
          the description editors don't reset when switching tabs. */}
      {tabs.map((tab) => (
        <div key={tab.key} className={activeKey === tab.key ? "flex flex-col gap-4" : "hidden"}>
          {tab.content}
        </div>
      ))}
    </div>
  );
}
