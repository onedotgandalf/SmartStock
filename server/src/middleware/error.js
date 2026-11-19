// The last middleware: every error in the app ends up here and is turned
// into a clean JSON response. Internal details are logged on the server
// but never sent to the browser.
import { ZodError } from "zod";
import { HttpError } from "../utils/httpError.js";

// PostgreSQL error codes we can explain to the user
const PG_ERRORS = {
  "23505": [409, "This record already exists (a unique value is used twice)."],
  "23503": [409, "This record is linked to other data, or refers to something that doesn't exist."],
  "23514": [400, "The data breaks a business rule (for example, stock would go below zero)."],
  "22P02": [400, "A value has the wrong format."]
};

export function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Please check the highlighted fields.",
      details: err.issues.map(i => ({ field: i.path.join("."), message: i.message }))
    });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "The request body is not valid JSON." });
  }
  if (PG_ERRORS[err.code]) {
    const [status, message] = PG_ERRORS[err.code];
    return res.status(status).json({ error: message, details: err.detail });
  }

  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server. Please try again." });
}
