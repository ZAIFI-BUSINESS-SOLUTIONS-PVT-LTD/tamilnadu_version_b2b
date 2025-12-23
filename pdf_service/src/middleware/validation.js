export const validatePdfRequest = (req, res, next) => {
  const { studentId, testId } = req.query;
  
  if (!studentId || !testId) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Missing required parameters',
      required: ['studentId', 'testId']
    });
  }
  
  // Sanitize inputs
  if (typeof studentId !== 'string' || typeof testId !== 'string') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Parameters must be strings'
    });
  }
  
  // Basic validation
  if (studentId.length > 100 || testId.length > 100) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Parameter values too long'
    });
  }
  
  next();
};
