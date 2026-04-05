export function notFoundHandler(req, res) {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err, req, res, next) {
    if (res.headersSent) {
        return next(err);
    }

    console.error("Unhandled server error:", err);

    const statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
    const message = statusCode >= 500 ? "Internal server error" : (err?.message || "Request failed");

    res.status(statusCode).json({ error: message });
}
