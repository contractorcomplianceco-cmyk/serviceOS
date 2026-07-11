import { useEffect, useState } from "react";
import { Loader2, AlertCircle, UserCircle, MapPin, Save } from "lucide-react";
import { useGetPortalMe, useUpdatePortalProfile } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function PortalProfile() {
  const { data, isLoading, isError } = useGetPortalMe();
  const updateMutation = useUpdatePortalProfile();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (data) {
      setEmail(data.email ?? "");
      setPhone(data.phone ?? "");
    }
  }, [data]);

  const dirty = !!data && (email !== (data.email ?? "") || phone !== (data.phone ?? ""));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirty) return;
    try {
      await updateMutation.mutateAsync({ data: { email: email.trim(), phone: phone.trim() } });
      toast({ title: "Profile updated", description: "Your contact details have been saved." });
    } catch {
      toast({ title: "Update failed", description: "Please try again.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24" data-testid="loading-portal-profile">
        <Loader2 className="w-8 h-8 animate-spin text-sc-blue" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="px-6 py-16 text-center" data-testid="error-portal-profile">
        <AlertCircle className="w-8 h-8 mx-auto text-destructive" />
        <p className="text-sc-2 mt-3">We couldn't load your profile.</p>
      </div>
    );
  }

  const locations = data.locations ?? [];

  return (
    <div className="px-6 py-6 space-y-5 animate-in fade-in duration-500 max-w-4xl">
      <div>
        <h1 className="text-[28px] leading-none font-bold tracking-tight text-sc" data-testid="text-portal-page-title">
          Profile
        </h1>
        <p className="text-sc-2 mt-2 text-sm">Your account details and service locations.</p>
      </div>

      <section className="sc-panel p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(67,166,255,0.12)", border: "1px solid rgba(67,166,255,0.25)" }}>
            <UserCircle className="w-6 h-6 text-sc-blue" />
          </div>
          <div>
            <div className="text-lg font-semibold text-sc" data-testid="text-portal-account-name">{data.name}</div>
            {data.industry && <div className="text-sm text-sc-3">{data.industry}</div>}
          </div>
        </div>

        <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="portal-profile-form">
          <div className="space-y-1.5">
            <Label htmlFor="profile-email" className="text-sc-2 text-xs uppercase tracking-wider font-semibold">Email</Label>
            <Input
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="billing@company.com"
              data-testid="input-profile-email"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-phone" className="text-sc-2 text-xs uppercase tracking-wider font-semibold">Phone</Label>
            <Input
              id="profile-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              data-testid="input-profile-phone"
            />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" className="bg-primary text-white font-semibold" disabled={!dirty || updateMutation.isPending} data-testid="button-save-profile">
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" /> Save Changes</>}
            </Button>
          </div>
        </form>
      </section>

      <section className="sc-panel p-6">
        <h2 className="text-[15px] font-semibold text-sc flex items-center gap-2 mb-4">
          <MapPin className="w-4 h-4 text-sc-blue" /> Service Locations
        </h2>
        {locations.length === 0 ? (
          <div className="text-center py-8 text-sc-3 text-sm" data-testid="empty-portal-locations">No locations on file.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {locations.map((loc) => (
              <div
                key={loc.id}
                data-testid={`card-portal-location-${loc.id}`}
                className="rounded-lg px-4 py-3"
                style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }}
              >
                <div className="text-sm font-semibold text-sc">{loc.name}</div>
                <div className="text-xs text-sc-3 mt-1">
                  {[loc.address, loc.city, loc.state, loc.zip].filter(Boolean).join(", ") || "No address on file"}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
