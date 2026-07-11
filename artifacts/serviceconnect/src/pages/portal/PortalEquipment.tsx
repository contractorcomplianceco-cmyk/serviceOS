import { Loader2, AlertCircle, HardHat } from "lucide-react";
import { useListPortalEquipment } from "@workspace/api-client-react";
import { shortDate } from "@/lib/ui";

export default function PortalEquipment() {
  const { data, isLoading, isError } = useListPortalEquipment();

  return (
    <div className="px-6 py-6 space-y-5 animate-in fade-in duration-500">
      <div>
        <h1 className="text-[28px] leading-none font-bold tracking-tight text-sc" data-testid="text-portal-page-title">
          Equipment
        </h1>
        <p className="text-sc-2 mt-2 text-sm">Assets we service at your locations.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24" data-testid="loading-portal-equipment">
          <Loader2 className="w-8 h-8 animate-spin text-sc-blue" />
        </div>
      ) : isError ? (
        <div className="px-6 py-16 text-center" data-testid="error-portal-equipment">
          <AlertCircle className="w-8 h-8 mx-auto text-destructive" />
          <p className="text-sc-2 mt-3">We couldn't load your equipment.</p>
        </div>
      ) : !data || data.length === 0 ? (
        <div className="sc-panel p-12 text-center" data-testid="empty-portal-equipment">
          <HardHat className="w-10 h-10 mx-auto text-sc-3" />
          <p className="text-sc-2 mt-3 font-medium">No equipment on file</p>
          <p className="text-sc-3 text-sm mt-1">Serviced assets will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.map((eq) => (
            <div key={eq.id} data-testid={`card-portal-equipment-${eq.id}`} className="sc-panel p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(67,166,255,0.1)" }}>
                  <HardHat className="w-5 h-5 text-sc-blue" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-sc truncate">{eq.assetName}</div>
                  {eq.model && <div className="text-xs text-sc-3 mt-0.5">{eq.model}</div>}
                </div>
              </div>
              <div className="mt-4 space-y-1.5 text-sm">
                {eq.serialNumber && (
                  <div className="flex items-center justify-between">
                    <span className="text-sc-3">Serial</span>
                    <span className="text-sc-2 font-medium">{eq.serialNumber}</span>
                  </div>
                )}
                {eq.lastServiced && (
                  <div className="flex items-center justify-between">
                    <span className="text-sc-3">Last Serviced</span>
                    <span className="text-sc-2 font-medium">{shortDate(eq.lastServiced)}</span>
                  </div>
                )}
                {eq.warrantyInfo && (
                  <div className="flex items-center justify-between">
                    <span className="text-sc-3">Warranty</span>
                    <span className="text-sc-2 font-medium">{eq.warrantyInfo}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
