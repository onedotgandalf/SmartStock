// Checks req.body / req.query / req.params against zod schemas BEFORE the
// controller runs. Bad data is rejected with a 400 and a list of problems.
//
//   router.post("/login", validate({ body: loginSchema }), login);
//
// The cleaned values are saved on req.valid.body / req.valid.query / req.valid.params.
export function validate(schemas) {
  return (req, res, next) => {
    req.valid = {};
    for (const part of ["body", "query", "params"]) {
      if (schemas[part]) req.valid[part] = schemas[part].parse(req[part] ?? {});
    }
    next();
  };
}
