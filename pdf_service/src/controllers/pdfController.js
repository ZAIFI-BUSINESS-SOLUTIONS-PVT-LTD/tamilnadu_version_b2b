import pdfService from '../services/pdfService.js';
import logger from '../utils/logger.js';
import config from '../config/index.js';
import fs from 'fs';
import path from 'path';

export const generatePdf = async (req, res) => {
  // Accept multiple possible param names for classId (camelCase, snake_case, lowercase)
  const { studentId, testId } = req.query;
  const classId = req.query.classId || req.query.class_id || req.query.class || req.query.classid || req.query.classID;
  const educatorId = req.query.educatorId || req.query.educator_id || req.query.educator || null;
  // Extract JWT token from Authorization header if present
  let jwtToken = undefined;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    jwtToken = authHeader.replace(/^Bearer /, '');
  }
  
  // Get origin from request headers
  // Priority: 1. origin header, 2. referer header, 3. default
  let origin = req.headers.origin || req.headers.referer || config.tenants.defaultOrigin;
  // If we have referer, extract the origin part (protocol + hostname)
  if (!req.headers.origin && req.headers.referer) {
    try {
      const refererUrl = new URL(req.headers.referer);
      origin = `${refererUrl.protocol}//${refererUrl.hostname}`;
    } catch (err) {
      // Invalid referer, use as-is
    }
  }
  
  try {
    logger.info('PDF generation request received', { studentId, testId, classId, origin, headers: { origin: req.headers.origin, referer: req.headers.referer } });
    const result = await pdfService.generatePdf(studentId, testId, jwtToken, origin, classId, educatorId);
    
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
  const educatorId = req.body.educatorId || req.body.educator_id || req.body.educator || null;
  let jwtToken = undefined;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    jwtToken = authHeader.replace(/^Bearer /, '');
  }
  if (!Array.isArray(studentIds) || !testId) {
    return res.status(400).json({ error: 'studentIds (array) and testId are required.' });
  }
  
  // Get origin from request headers
  let origin = req.headers.origin || req.headers.referer || config.tenants.defaultOrigin;
  if (!req.headers.origin && req.headers.referer) {
    try {
      const refererUrl = new URL(req.headers.referer);
      origin = `${refererUrl.protocol}//${refererUrl.hostname}`;
    } catch (err) {
      // Invalid referer, use as-is
    }
  }
  
  try {
    logger.info('Bulk PDF zip generation request received', { studentCount: studentIds.length, testId, classId, origin });
    const result = await pdfService.generateBulkPdfZip(studentIds, testId, jwtToken, origin, classId, educatorId);
    
    // If S3 is enabled and ZIP was uploaded, return presigned URL instead of streaming
    if (result.s3Key) {
      try {
        const presignedUrl = await pdfService.getPresignedDownloadUrl(result.s3Key, 3600); // 1 hour expiry
        logger.info('Bulk PDF zip available via S3', { s3Key: result.s3Key, filename: result.filename });
        
        // Clean up local file immediately since we're not streaming it
        if (config.nodeEnv === 'production') {
          pdfService.cleanup(result.filePath);
        }
        
        return res.json({
          success: true,
          downloadUrl: presignedUrl,
          filename: result.filename,
          expiresIn: 3600
        });
      } catch (s3Error) {
        logger.warn('Failed to generate S3 presigned URL, falling back to streaming', { error: s3Error.message });
        // Fall through to streaming below
      }
    }
    
    // Fallback: Stream the ZIP file directly
    const zipFilePath = result.filePath || result;
    const zipFilename = result.filename || zipFilePath.split(path.sep).pop();
    const stat = fs.statSync(zipFilePath);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
    res.setHeader('Content-Length', stat.size);
    
    const readStream = fs.createReadStream(zipFilePath);
    let cleanedUp = false;
    
    // Single cleanup function to avoid double-cleanup
    const doCleanup = () => {
      if (!cleanedUp && config.nodeEnv === 'production') {
        cleanedUp = true;
        pdfService.cleanup(zipFilePath);
      }
    };
    
    // Handle stream errors
    readStream.on('error', (err) => {
      logger.error('Error reading zip file stream', { error: err.message, zipFilePath });
      doCleanup();
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream zip file' });
      }
    });
    
    // Cleanup after response is fully sent
    res.on('finish', () => {
      logger.info('Bulk PDF zip sent successfully', { zipFilename, size: stat.size });
      doCleanup();
    });
    
    // Handle client disconnect
    res.on('close', () => {
      if (!res.writableFinished) {
        logger.warn('Client disconnected before zip transfer completed', { zipFilename });
        readStream.destroy();
      }
      doCleanup();
    });
    
    readStream.pipe(res);
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
  let origin = req.headers.origin || req.headers.referer || config.tenants.defaultOrigin;
  if (!req.headers.origin && req.headers.referer) {
    try {
      const refererUrl = new URL(req.headers.referer);
      origin = `${refererUrl.protocol}//${refererUrl.hostname}`;
    } catch (err) {
      // Invalid referer, use as-is
    }
  }
  
  try {
    logger.info('Student self-report PDF generation request received', { testId, classId, origin, headers: { origin: req.headers.origin, referer: req.headers.referer } });
    const educatorId = req.query.educatorId || req.query.educator_id || req.query.educator || null;
    const result = await pdfService.generateStudentSelfPdf(testId, jwtToken, origin, classId, educatorId);
    
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
  let origin = req.headers.origin || req.headers.referer || config.tenants.defaultOrigin;
  if (!req.headers.origin && req.headers.referer) {
    try {
      const refererUrl = new URL(req.headers.referer);
      origin = `${refererUrl.protocol}//${refererUrl.hostname}`;
    } catch (err) {
      // Invalid referer, use as-is
    }
  }
  
  try {
    logger.info('Teacher self-report PDF generation request received', { testId, classId, origin, headers: { origin: req.headers.origin, referer: req.headers.referer } });
    const educatorId = req.query.educatorId || req.query.educator_id || req.query.educator || null;
    const result = await pdfService.generateTeacherSelfPdf(testId, jwtToken, origin, classId, educatorId);
    
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

export const generateStudentReportCardPdf = async (req, res) => {
  const { testId } = req.query;
  let jwtToken = undefined;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    jwtToken = authHeader.replace(/^Bearer /, '');
  }
  
  // Get origin from request headers
  let origin = req.headers.origin || req.headers.referer || config.tenants.defaultOrigin;
  if (!req.headers.origin && req.headers.referer) {
    try {
      const refererUrl = new URL(req.headers.referer);
      origin = `${refererUrl.protocol}//${refererUrl.hostname}`;
    } catch (err) {
      // Invalid referer, use as-is
    }
  }
  
  try {
    logger.info('Student report card PDF generation request received', { testId, origin });
    const result = await pdfService.generateStudentReportCardPdf(testId, jwtToken, origin);
    
    // Direct streaming only (no S3)
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Length', result.buffer.length);
    res.send(result.buffer);
    if (config.nodeEnv === 'production') {
      pdfService.cleanup(result.filePath);
    }
    logger.info('Student report card PDF sent successfully', { testId, filename: result.filename });
  } catch (error) {
    logger.error('Student report card PDF generation request failed', { testId, error: error.message });
    const isDevelopment = config.nodeEnv === 'development';
    res.status(500).json({
      error: 'PDF Generation Failed',
      message: 'Unable to generate student report card PDF',
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
