import pdfService from '../services/pdfService.js';
import logger from '../utils/logger.js';
import config from '../config/index.js';
import fs from 'fs';
import path from 'path';

export const generatePdf = async (req, res) => {
  // Accept multiple possible param names for classId (camelCase, snake_case, lowercase)
  const { studentId, testId } = req.query;
  const classId = req.query.classId || req.query.class_id || req.query.class || req.query.classid || req.query.classID;
  // Extract JWT token from Authorization header if present
  let jwtToken = undefined;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    jwtToken = authHeader.replace(/^Bearer /, '');
  }
  
  // Get origin from request headers
  const origin = req.headers.origin || config.tenants.defaultOrigin;
  
  try {
    logger.info('PDF generation request received', { studentId, testId, classId, origin });
    const result = await pdfService.generatePdf(studentId, testId, jwtToken, origin, classId);
    
    // Handle S3 streaming if PDF exists in S3
    if (result.fromS3 && result.s3Key) {
      await pdfService.streamFromS3(result.s3Key, res);
      logger.info('PDF streamed from S3', { studentId, testId, classId, s3Key: result.s3Key });
      return;
    }
    
    // Handle normal generation flow
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Length', result.buffer.length);
    res.send(result.buffer);
    if (config.nodeEnv === 'production') {
      pdfService.cleanup(result.filePath);
    }
    logger.info('PDF sent successfully', { studentId, testId, classId, filename: result.filename });
  } catch (error) {
    logger.error('PDF generation request failed', {
      studentId,
      testId,
      error: error.message
    });
    const isDevelopment = config.nodeEnv === 'development';
    res.status(500).json({
      error: 'PDF Generation Failed',
      message: 'Unable to generate PDF report',
      ...(isDevelopment && { details: error.message })
    });
  }
};

export const generateBulkPdfZip = async (req, res) => {
  // Accept classId in different body formats
  const { studentIds, testId } = req.body;
  const classId = req.body.classId || req.body.class_id || req.body.class || req.body.classid || req.body.classID;
  let jwtToken = undefined;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    jwtToken = authHeader.replace(/^Bearer /, '');
  }
  if (!Array.isArray(studentIds) || !testId) {
    return res.status(400).json({ error: 'studentIds (array) and testId are required.' });
  }
  
  // Get origin from request headers
  const origin = req.headers.origin || config.tenants.defaultOrigin;
  
  try {
    logger.info('Bulk PDF zip generation request received', { studentCount: studentIds.length, testId, classId, origin });
    const zipFilePath = await pdfService.generateBulkPdfZip(studentIds, testId, jwtToken, origin, classId);
    const zipFilename = zipFilePath.split(path.sep).pop();
    const stat = fs.statSync(zipFilePath);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
    res.setHeader('Content-Length', stat.size);
    const readStream = fs.createReadStream(zipFilePath);
    readStream.pipe(res);
    readStream.on('close', () => {
      if (config.nodeEnv === 'production') {
        pdfService.cleanup(zipFilePath);
      }
      logger.info('Bulk PDF zip sent successfully', { zipFilename });
    });
  } catch (error) {
    logger.error('Bulk PDF zip generation failed', { error: error.message });
    const isDevelopment = config.nodeEnv === 'development';
    res.status(500).json({
      error: 'Bulk PDF Generation Failed',
      message: 'Unable to generate bulk PDF reports',
      ...(isDevelopment && { details: error.message })
    });
  }
};

export const generateStudentSelfPdf = async (req, res) => {
  const { testId } = req.query;
  const classId = req.query.classId || req.query.class_id || req.query.class || req.query.classid || req.query.classID;
  let jwtToken = undefined;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    jwtToken = authHeader.replace(/^Bearer /, '');
  }
  
  // Get origin from request headers
  const origin = req.headers.origin || config.tenants.defaultOrigin;
  
  try {
    logger.info('Student self-report PDF generation request received', { testId, classId, origin });
    const result = await pdfService.generateStudentSelfPdf(testId, jwtToken, origin, classId);
    
    // Handle S3 streaming if PDF exists in S3
    if (result.fromS3 && result.s3Key) {
      await pdfService.streamFromS3(result.s3Key, res);
      logger.info('Student PDF streamed from S3', { testId, classId, s3Key: result.s3Key });
      return;
    }
    
    // Handle normal generation flow
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Length', result.buffer.length);
    res.send(result.buffer);
    if (config.nodeEnv === 'production') {
      pdfService.cleanup(result.filePath);
    }
    logger.info('Student self-report PDF sent successfully', { testId, classId, filename: result.filename });
  } catch (error) {
    logger.error('Student self-report PDF generation request failed', { testId, error: error.message });
    const isDevelopment = config.nodeEnv === 'development';
    res.status(500).json({
      error: 'PDF Generation Failed',
      message: 'Unable to generate student self-report PDF',
      ...(isDevelopment && { details: error.message })
    });
  }
};

export const generateTeacherSelfPdf = async (req, res) => {
  const { testId } = req.query;
  const classId = req.query.classId || req.query.class_id || req.query.class || req.query.classid || req.query.classID;
  let jwtToken = undefined;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    jwtToken = authHeader.replace(/^Bearer /, '');
  }
  
  // Get origin from request headers
  const origin = req.headers.origin || config.tenants.defaultOrigin;
  
  try {
    logger.info('Teacher self-report PDF generation request received', { testId, classId, origin });
    const result = await pdfService.generateTeacherSelfPdf(testId, jwtToken, origin, classId);
    
    // Handle S3 streaming if PDF exists in S3
    if (result.fromS3 && result.s3Key) {
      await pdfService.streamFromS3(result.s3Key, res);
      logger.info('Teacher PDF streamed from S3', { testId, classId, s3Key: result.s3Key });
      return;
    }
    
    // Handle normal generation flow
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Length', result.buffer.length);
    res.send(result.buffer);
    if (config.nodeEnv === 'production') {
      pdfService.cleanup(result.filePath);
    }
    logger.info('Teacher self-report PDF sent successfully', { testId, classId, filename: result.filename });
  } catch (error) {
    logger.error('Teacher self-report PDF generation request failed', { testId, error: error.message });
    const isDevelopment = config.nodeEnv === 'development';
    res.status(500).json({
      error: 'PDF Generation Failed',
      message: 'Unable to generate teacher self-report PDF',
      ...(isDevelopment && { details: error.message })
    });
  }
};

// Internal service authentication middleware
const validateInternalAuth = (req, res, next) => {
  const authHeader = req.headers['x-service-auth'];
  const expectedToken = `Bearer ${config.internal.authToken}`;
  
  if (!authHeader || authHeader !== expectedToken) {
    logger.warn('Unauthorized internal service request', { 
      ip: req.ip, 
      userAgent: req.headers['user-agent'] 
    });
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};

export { validateInternalAuth };

export const triggerPdfGeneration = async (req, res) => {
  const { studentId, testId, classId, reportType, origin, reportToken } = req.body;
  
  if (!testId || !classId || !reportType) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['testId', 'classId', 'reportType']
    });
  }
  
  if (!['student', 'teacher', 'overall'].includes(reportType)) {
    return res.status(400).json({
      error: 'Invalid reportType',
      valid: ['student', 'teacher', 'overall']
    });
  }
  
  try {
    logger.info('Internal PDF generation trigger received', { 
      studentId, 
      testId, 
      classId, 
      reportType, 
      origin 
    });
    
    let result;
    const requestOrigin = origin || config.tenants.defaultOrigin;
    
    switch (reportType) {
      case 'student':
        if (!studentId) {
          return res.status(400).json({ error: 'studentId required for student report' });
        }
        result = await pdfService.generatePdf(studentId, testId, reportToken, requestOrigin, classId);
        break;
        
      case 'teacher':
        result = await pdfService.generateTeacherSelfPdf(testId, reportToken, requestOrigin, classId);
        break;
        
      case 'overall':
        // For overall reports, we can use student generation with a special studentId
        result = await pdfService.generatePdf('overall', testId, reportToken, requestOrigin, classId);
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid reportType' });
    }
    
    // Return success with S3 key information
    const response = {
      success: true,
      message: 'PDF generation completed',
      reportType,
      testId,
      classId
    };
    
    if (result.s3Key) {
      response.s3Key = result.s3Key;
      response.fromS3 = result.fromS3;
    }
    
    res.status(202).json(response);
    logger.info('Internal PDF generation completed', response);
    
  } catch (error) {
    logger.error('Internal PDF generation failed', {
      studentId,
      testId,
      classId,
      reportType,
      error: error.message
    });
    
    res.status(500).json({
      error: 'PDF Generation Failed',
      message: error.message
    });
  }
};

export const healthCheck = (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    service: 'InzightEd PDF Service',
    version: process.env.npm_package_version || '1.0.0'
  });
};
