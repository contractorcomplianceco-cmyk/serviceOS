import { Switch, Route, Redirect } from "wouter";
import PortalLayout from "@/components/portal/PortalLayout";
import PortalDashboard from "./PortalDashboard";
import PortalWorkOrders from "./PortalWorkOrders";
import PortalWorkOrderDetail from "./PortalWorkOrderDetail";
import PortalRequests from "./PortalRequests";
import PortalQuotes from "./PortalQuotes";
import PortalInvoices from "./PortalInvoices";
import PortalPayments from "./PortalPayments";
import PortalDocuments from "./PortalDocuments";
import PortalEquipment from "./PortalEquipment";
import PortalProfile from "./PortalProfile";
import PortalLogin from "./PortalLogin";

export { default as PortalLogin } from "./PortalLogin";

export function PortalShell() {
  return (
    <PortalLayout>
      <Switch>
        <Route path="/portal" component={PortalDashboard} />
        <Route path="/portal/work-orders" component={PortalWorkOrders} />
        <Route path="/portal/work-orders/:id" component={PortalWorkOrderDetail} />
        <Route path="/portal/requests" component={PortalRequests} />
        <Route path="/portal/quotes" component={PortalQuotes} />
        <Route path="/portal/invoices" component={PortalInvoices} />
        <Route path="/portal/payments" component={PortalPayments} />
        <Route path="/portal/documents" component={PortalDocuments} />
        <Route path="/portal/equipment" component={PortalEquipment} />
        <Route path="/portal/profile" component={PortalProfile} />
        <Route><Redirect to="/portal" /></Route>
      </Switch>
    </PortalLayout>
  );
}
