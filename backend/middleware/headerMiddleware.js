export const apiVersionHeaderMiddleware = (req, res, next) => {
  res.setHeader('X-Api-version', '1.0');
  next();
};
