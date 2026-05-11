import { Navigate, useParams } from 'react-router-dom';

const ADMIN_SUPPORT = '/admin/support';

/** Maps old `/admin/support-tickets/...` and `/super-admin/support-tickets/...` to the canonical staff inbox. */
export function AdminSupportTicketsLegacyRedirect() {
  const { ticketId } = useParams<{ ticketId: string }>();
  if (ticketId) {
    return <Navigate to={`${ADMIN_SUPPORT}/${ticketId}`} replace />;
  }
  return <Navigate to={ADMIN_SUPPORT} replace />;
}
