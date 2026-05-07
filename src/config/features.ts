/**
 * WIPO Connect outbox UI (super integrations: health, enqueue-by-work-id, outbox table).
 * Admin detail modals no longer mount the outbox block (Pass F). Set
 * `VITE_SHOW_WIPO_CONNECT_OUTBOX_UI=true` in the SPA env to show super outbox tools again.
 */
export const showWipoConnectOutboxUi = import.meta.env.VITE_SHOW_WIPO_CONNECT_OUTBOX_UI === 'true';
