import { Loader2, AlertCircle, FolderOpen, FileText } from "lucide-react";
import { useListPortalDocuments } from "@workspace/api-client-react";
import { shortDate } from "@/lib/ui";

export default function PortalDocuments() {
  const { data, isLoading, isError } = useListPortalDocuments();

  return (
    <div className="px-6 py-6 space-y-5 animate-in fade-in duration-500">
      <div>
        <h1 className="text-[28px] leading-none font-bold tracking-tight text-sc" data-testid="text-portal-page-title">
          Documents
        </h1>
        <p className="text-sc-2 mt-2 text-sm">Documents shared with your account.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24" data-testid="loading-portal-documents">
          <Loader2 className="w-8 h-8 animate-spin text-sc-blue" />
        </div>
      ) : isError ? (
        <div className="px-6 py-16 text-center" data-testid="error-portal-documents">
          <AlertCircle className="w-8 h-8 mx-auto text-destructive" />
          <p className="text-sc-2 mt-3">We couldn't load your documents.</p>
        </div>
      ) : !data || data.length === 0 ? (
        <div className="sc-panel p-12 text-center" data-testid="empty-portal-documents">
          <FolderOpen className="w-10 h-10 mx-auto text-sc-3" />
          <p className="text-sc-2 mt-3 font-medium">No documents yet</p>
          <p className="text-sc-3 text-sm mt-1">Shared documents will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.map((doc) => (
            <div key={doc.id} data-testid={`card-portal-document-${doc.id}`} className="sc-panel p-5 flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(67,166,255,0.1)" }}>
                <FileText className="w-5 h-5 text-sc-blue" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-sc truncate">{doc.name}</div>
                <div className="text-xs text-sc-3 mt-0.5">{doc.type}</div>
                {doc.expiration && (
                  <div className="text-[11px] text-sc-3 mt-1">Expires {shortDate(doc.expiration)}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
