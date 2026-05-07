export interface DocumentResource {
  id: number;
  external_id?: string | null;
  category?: string | null;
  title?: string | null;
  document_type: string | null;
  visibility?: string | null;
  description?: string | null;
  checksum?: string | null;
  file_name?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  file_url: string | null;
  download_url: string | null;
  metadata?: unknown;
  uploaded_by?: { id: number | null; name: string | null } | null;
  created_at: string | null;
}
