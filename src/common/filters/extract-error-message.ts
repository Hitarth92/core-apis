type ValidationItem = { field?: string; message?: string };

function formatValidationErrors(errors: unknown[]): string {
  const parts = errors
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        const row = item as ValidationItem;
        if (row.field && row.message) return `${row.field}: ${row.message}`;
        if (row.message) return row.message;
      }
      return null;
    })
    .filter((value): value is string => Boolean(value));

  return parts.join('; ');
}

const GENERIC_ERRORS = new Set([
  'Bad Request',
  'Unauthorized',
  'Forbidden',
  'Not Found',
  'Internal Server Error',
  'Database Error',
]);

/** Turn Nest/RPC/validation payloads into one user-facing string. */
export function extractErrorMessage(response: string | object): string {
  if (typeof response === 'string' && response.trim()) {
    return response;
  }

  if (!response || typeof response !== 'object') {
    return 'Request failed';
  }

  const body = response as Record<string, unknown>;

  if (Array.isArray(body.errors) && body.errors.length > 0) {
    return formatValidationErrors(body.errors);
  }

  const message = body.message;
  if (typeof message === 'string' && message.trim()) {
    return message;
  }
  if (Array.isArray(message) && message.length > 0) {
    return message.map(String).filter(Boolean).join('; ');
  }

  if (typeof body.error === 'string' && body.error.trim() && !GENERIC_ERRORS.has(body.error)) {
    return body.error;
  }

  return 'Request failed';
}
