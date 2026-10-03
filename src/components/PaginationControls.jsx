function PaginationControls({ pagination, onPageChange }) {
    if (!pagination) return null;
    const start = pagination.totalResults === 0
        ? 0
        : (pagination.page - 1) * pagination.limit + 1;
    const end = Math.min(pagination.page * pagination.limit, pagination.totalResults);
    return (
        <nav className="pagination-controls" aria-label="Results pages">
            <span>Showing {start}–{end} of {pagination.totalResults}</span>
            <div>
                <button
                    type="button"
                    onClick={() => onPageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                >
                    Previous
                </button>
                <span>Page {pagination.page} of {pagination.totalPages}</span>
                <button
                    type="button"
                    onClick={() => onPageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                >
                    Next
                </button>
            </div>
        </nav>
    );
}

export default PaginationControls;
