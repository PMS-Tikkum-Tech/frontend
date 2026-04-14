export interface ApiPaginationMeta {
  current_page: number;
  next_page: number | null;
  prev_page: number | null;
  total_pages: number;
  total_count: number;
  per_page: number;
  [key: string]: unknown;
}

export interface ApiResponse<T, M = Record<string, unknown> | undefined> {
  success: boolean;
  message: string;
  data: T;
  meta?: M;
  errors?: string[];
}
