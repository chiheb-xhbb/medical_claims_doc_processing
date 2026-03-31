export const normalizeListFilters = (filters) => ({
  search: (filters?.search || '').trim(),
  status: filters?.status || '',
  fromDate: filters?.fromDate || '',
  toDate: filters?.toDate || ''
});

export const buildListQueryParams = (page = 1, filters = {}, sort = {}) => {
  const params = { page };
  const normalizedFilters = normalizeListFilters(filters);

  if (normalizedFilters.search) {
    params.search = normalizedFilters.search;
  }

  if (normalizedFilters.status) {
    params.status = normalizedFilters.status;
  }

  if (normalizedFilters.fromDate) {
    params.from_date = normalizedFilters.fromDate;
  }

  if (normalizedFilters.toDate) {
    params.to_date = normalizedFilters.toDate;
  }

  if (sort?.sortBy) {
    params.sort_by = sort.sortBy;
  }

  if (sort?.sortDirection) {
    params.sort_direction = sort.sortDirection;
  }

  return params;
};

export const getNextSortState = (currentSort, sortBy) => ({
  sortBy,
  sortDirection:
    currentSort?.sortBy === sortBy && currentSort?.sortDirection === 'asc'
      ? 'desc'
      : 'asc'
});

export const hasAnyListFilter = (filters) => {
  const normalized = normalizeListFilters(filters);
  return Boolean(normalized.search || normalized.status || normalized.fromDate || normalized.toDate);
};

export const isDefaultSort = (sort, defaultSort) => {
  return sort?.sortBy === defaultSort?.sortBy && sort?.sortDirection === defaultSort?.sortDirection;
};
