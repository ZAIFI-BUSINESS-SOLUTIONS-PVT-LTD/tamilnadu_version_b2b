import pdfService from '../services/pdfService.js';
import logger from '../utils/logger.js';
import config from '../config/index.js';
import fs from 'fs';
import path from 'path';

export const generatePdf = async (req, res) => {
  const { studentId, testId } = req.query;
  // Extract JWT token from Authorization header if present
  let jwtToken = undefined;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    jwtToken = authHeader.replace(/^Bearer /, '');
  }
  
  // Get origin from request headers
  const origin = req.headers.origin || config.tenants.defaultOrigin;
  
  try {
    logger.info('PDF generation request received', { studentId, testId, origin });
    const result = await pdfService.generatePdf(studentId, testId, jwtToken, origin);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Length', result.buffer.length);
    res.send(result.buffer);
    if (config.nodeEnv === 'production') {
      pdfService.cleanup(result.filePath);
    }
    logger.info('PDF sent successfully', { studentId, testId, filename: result.filename });
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
  const { studentIds, testId } = req.body;
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
    logger.info('Bulk PDF zip generation request received', { studentCount: studentIds.length, testId, origin });
    const zipFilePath = await pdfService.generateBulkPdfZip(studentIds, testId, jwtToken, origin);
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
  let jwtToken = undefined;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    jwtToken = authHeader.replace(/^Bearer /, '');
  }
  
  // Get origin from request headers
  const origin = req.headers.origin || config.tenants.defaultOrigin;
  
  try {
    logger.info('Student self-report PDF generation request received', { testId, origin });
    const result = await pdfService.generateStudentSelfPdf(testId, jwtToken, origin);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Length', result.buffer.length);
    res.send(result.buffer);
    if (config.nodeEnv === 'production') {
      pdfService.cleanup(result.filePath);
    }
    logger.info('Student self-report PDF sent successfully', { testId, filename: result.filename });
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
  let jwtToken = undefined;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    jwtToken = authHeader.replace(/^Bearer /, '');
  }
  
  // Get origin from request headers
  const origin = req.headers.origin || config.tenants.defaultOrigin;
  
  try {
    logger.info('Teacher self-report PDF generation request received', { testId, origin });
    const result = await pdfService.generateTeacherSelfPdf(testId, jwtToken, origin);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Length', result.buffer.length);
    res.send(result.buffer);
    if (config.nodeEnv === 'production') {
      pdfService.cleanup(result.filePath);
    }
    logger.info('Teacher self-report PDF sent successfully', { testId, filename: result.filename });
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

export const healthCheck = (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    service: 'InzightEd PDF Service',
    version: process.env.npm_package_version || '1.0.0'
  });
};
