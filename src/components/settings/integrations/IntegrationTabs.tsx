
interface IntegrationTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  tabs: string[];
}

export function IntegrationTabs({ activeTab, setActiveTab, tabs }: IntegrationTabsProps) {
  return (
    <div className="flex items-center gap-4 border-b">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === tab
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab === "Connected" && (
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              {tab}
            </div>
          )}
          {tab !== "Connected" && tab}
        </button>
      ))}
    </div>
  );
}
