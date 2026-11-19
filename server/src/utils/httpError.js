// An error that carries an HTTP status code.
// throw new HttpError(404, "Product not found")
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
