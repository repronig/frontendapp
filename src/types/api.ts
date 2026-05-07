export interface ApiSuccess<T> {
  message: string;
  data: T;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  status?: number;
}

export interface PaginationMeta {
  current_page: number;
  from: number | null;
  last_page: number;
  path: string;
  per_page: number;
  to: number | null;
  total: number;
}

export interface PaginationLinks {
  first?: string | null;
  last?: string | null;
  prev?: string | null;
  next?: string | null;
}

export interface PaginatedResponse<T> {
  message: string;
  data: T[];
  meta: PaginationMeta;
  links: PaginationLinks;
}

export interface ListParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  category?: string;
  date_from?: string;
  date_to?: string;
  sort?: string;
  direction?: 'asc' | 'desc';
}
