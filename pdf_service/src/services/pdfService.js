import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import archiver from 'archiver';
import jwt from 'jsonwebtoken';
import { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Dummy chart data constants for educator reports ---
const DUMMY_SUBJECT_TOTALS = [
  { subject: "Botany", total: 180 },
  { subject: "Chemistry", total: 170 },
  { subject: "Physics", total: 160 },
  { subject: "Zoology", total: 150 },
];
const DUMMY_ERROR_DATA = [
  { name: "Calculation", value: 40 },
  { name: "Concept", value: 30 },
  { name: "Silly", value: 20 },
];
const DUMMY_TREND_DATA = [
  { name: "Test 1", Physics: 40, Chemistry: 45, Botany: 50, Zoology: 55 },
  { name: "Test 2", Physics: 42, Chemistry: 44, Botany: 48, Zoology: 53 },
  { name: "Test 3", Physics: 45, Chemistry: 46, Botany: 49, Zoology: 54 },
];

class PdfService {
  constructor() {
    this.browser = null;
    this.isInitialized = false;
    this.s3Client = null;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      logger.info('Initializing PDF service...');

      // Ensure temp directory exists
      if (!fs.existsSync(config.pdf.tempDir)) {
        fs.mkdirSync(config.pdf.tempDir, { recursive: true });
      }

      this.browser = await puppeteer.launch({
        headless: config.puppeteer.headless,
        args: config.puppeteer.args,
        executablePath: config.puppeteer.executablePath
      });

      // Initialize S3 client if credentials are provided
      if (config.aws.s3Enabled && config.aws.accessKeyId && config.aws.secretAccessKey) {
        // Build client config and optionally include custom endpoint and path-style addressing
        const s3ClientConfig = {
          region: config.aws.region,
          credentials: {
            accessKeyId: config.aws.accessKeyId,
            secretAccessKey: config.aws.secretAccessKey
          }
        };

        if (config.aws.endpoint) {
          s3ClientConfig.endpoint = config.aws.endpoint;
        }

        if (config.aws.forcePathStyle) {
          // forcePathStyle is supported by the AWS SDK v3 S3 client and is useful for custom endpoints
          s3ClientConfig.forcePathStyle = true;
        }

        this.s3Client = new S3Client(s3ClientConfig);
        logger.info('S3 client initialized', { 
          bucket: config.aws.bucketName,
          region: config.aws.region,
          endpoint: config.aws.endpoint || null,
          forcePathStyle: !!config.aws.forcePathStyle
        });
      } else {
        logger.warn('S3 upload disabled - missing credentials or disabled in config');
      }

      this.isInitialized = true;
      logger.info('PDF service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize PDF service', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate deterministic S3 key based on report type
   * @param {string} classId - Class ID
   * @param {string} testId - Test ID 
   * @param {string} reportType - 'student', 'teacher', or 'overall'
   * @param {string} userId - Student ID or Teacher ID
   * @returns {string} S3 key path
   */
  generateDeterministicS3Key(classId, testId, reportType, userId = null) {
    const sanitizedClassId = String(classId || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
    // Format testId as "Test_N" if it's just a number, then sanitize
    let formattedTestId = String(testId || 'unknown');
    if (/^\d+$/.test(formattedTestId)) {
      formattedTestId = `Test_${formattedTestId}`;
    }
    const sanitizedTestId = formattedTestId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const sanitizedUserId = userId ? String(userId).replace(/[^a-zA-Z0-9_-]/g, '_') : null;
    
    if (reportType === 'student') {
      return `reports/${sanitizedClassId}/${sanitizedTestId}/students/${sanitizedUserId}.pdf`;
    } else if (reportType === 'teacher') {
      if (sanitizedTestId === '0' || sanitizedTestId.toLowerCase() === 'overall') {
        return `reports/${sanitizedClassId}/overall/teacher_${sanitizedUserId}.pdf`;
      }
      return `reports/${sanitizedClassId}/${sanitizedTestId}/teacher_${sanitizedUserId}.pdf`;
    } else if (reportType === 'overall') {
      return `reports/${sanitizedClassId}/${sanitizedTestId}/overall.pdf`;
    }
    
    // Fallback to old format
    return `reports/${sanitizedClassId}/${sanitizedTestId}/${filename || 'report.pdf'}`;
  }

  /**
   * Check if PDF exists in S3
   * @param {string} s3Key - S3 key to check
   * @returns {Promise<boolean>} true if exists
   */
  async checkS3Exists(s3Key) {
    if (!this.s3Client || !config.aws.s3Enabled) {
      return false;
    }

    try {
      await this.s3Client.send(new HeadObjectCommand({
        Bucket: config.aws.bucketName,
        Key: s3Key
      }));
      return true;
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      logger.warn('S3 existence check failed', { s3Key, error: error.message });
      return false;
    }
  }

  /**
   * Stream PDF from S3
   * @param {string} s3Key - S3 key to stream
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async streamFromS3(s3Key, res) {
    if (!this.s3Client || !config.aws.s3Enabled) {
      throw new Error('S3 client not available');
    }

    try {
      const getObjectResponse = await this.s3Client.send(new GetObjectCommand({
        Bucket: config.aws.bucketName,
        Key: s3Key
      }));

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(s3Key)}"`);
      if (getObjectResponse.ContentLength) {
        res.setHeader('Content-Length', getObjectResponse.ContentLength);
      }

      // Stream the S3 object body to response
      getObjectResponse.Body.pipe(res);
      logger.info('PDF streamed from S3', { s3Key });
    } catch (error) {
      logger.error('Failed to stream PDF from S3', { s3Key, error: error.message });
      throw error;
    }
  }

  /**
   * Decode JWT token to extract user information
   * @param {string} token - JWT token
   * @returns {Object|null} Decoded token payload or null if invalid
   */
  decodeJWT(token) {
    try {
      // Decode without verification (we trust the token came from our backend)
      const decoded = jwt.decode(token);
      return decoded;
    } catch (error) {
      logger.warn('Failed to decode JWT token', { error: error.message });
      return null;
    }
  }

  /**
   * Upload PDF buffer to S3 with deterministic naming
   * @param {Buffer} buffer - PDF buffer
   * @param {string} classId - Class ID for folder structure
   * @param {string} testId - Test ID for folder structure
   * @param {string} filename - PDF filename (legacy, will be ignored for deterministic naming)
   * @param {string} reportType - Report type: 'student', 'teacher', 'overall'
   * @param {string} userId - User ID (student or teacher)
   * @returns {Promise<string|null>} S3 key path or null if upload disabled/failed
   */
  async uploadToS3(buffer, classId, testId, filename, reportType = 'student', userId = null) {
    if (!this.s3Client || !config.aws.s3Enabled) {
      logger.debug('S3 upload skipped - S3 client not initialized or disabled');
      return null;
    }

    try {
      // Generate deterministic S3 key
      const s3Key = this.generateDeterministicS3Key(classId, testId, reportType, userId);

      const uploadParams = {
        Bucket: config.aws.bucketName,
        Key: s3Key,
        Body: buffer,
        ContentType: 'application/pdf',
        // Optional: add metadata
        Metadata: {
          'class-id': String(classId || 'unknown'),
          'test-id': String(testId || 'unknown'),
          'report-type': reportType,
          'user-id': String(userId || 'unknown'),
          'generated-at': new Date().toISOString()
        }
      };

      logger.debug('Uploading PDF to S3', { 
        bucket: config.aws.bucketName, 
        key: s3Key,
        size: `${(buffer.length / 1024).toFixed(2)}KB`
      });

      await this.s3Client.send(new PutObjectCommand(uploadParams));

      const s3Url = `s3://${config.aws.bucketName}/${s3Key}`;
      logger.info('PDF uploaded to S3 successfully', { 
        s3Url,
        key: s3Key,
        size: `${(buffer.length / 1024).toFixed(2)}KB`
      });

      return s3Key;
    } catch (error) {
      // Capture richer error details from AWS SDK to help troubleshooting endpoint/region issues
      const errDetails = {
        message: error?.message || String(error),
        name: error?.name || null,
        $metadata: error?.$metadata || null
      };
      logger.error('Failed to upload PDF to S3', {
        error: errDetails,
        classId,
        testId,
        reportType,
        userId,
        s3Key
      });
      // Don't throw - allow PDF streaming to continue even if S3 upload fails
      return null;
    }
  }

  async generatePdf(studentId, testId, jwtToken, origin, classId = null, educatorId = null) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Check if PDF already exists in S3 first
    if (classId) {
      const deterministicKey = this.generateDeterministicS3Key(classId, testId, 'student', studentId);
      const exists = await this.checkS3Exists(deterministicKey);
      if (exists) {
        logger.info('PDF found in S3, skipping generation', { 
          studentId, 
          testId, 
          classId, 
          s3Key: deterministicKey 
        });
        // Return the S3 path info so controller can stream it
        return { 
          filePath: null, 
          filename: path.basename(deterministicKey), 
          buffer: null,
          s3Key: deterministicKey,
          fromS3: true 
        };
      }
    }

    const startTime = Date.now();
    let page = null;
    
    // Get tenant-specific URLs
    const tenantUrls = config.pdf.getTenantUrls(origin);

    try {
      logger.info('Starting PDF generation', { studentId, testId });

      page = await this.browser.newPage();

      // Set JWT token in localStorage for React app authentication
      if (jwtToken) {
        await page.evaluateOnNewDocument((token) => {
          localStorage.setItem('token', token);
        }, jwtToken);
      }

      // Set authentication cookie if provided (legacy config)
      if (config.pdf.authCookie) {
        const cookieParts = config.pdf.authCookie.split('=');
        if (cookieParts.length === 2) {
          await page.setCookie({
            name: cookieParts[0],
            value: cookieParts[1],
            domain: new URL(tenantUrls.frontend).hostname,
            path: '/',
            httpOnly: true
          });
        }
      }
      // Set JWT token as cookie if provided
      if (jwtToken) {
        await page.setCookie({
          name: 'jwt',
          value: jwtToken,
          domain: new URL(tenantUrls.frontend).hostname,
          path: '/',
          httpOnly: false // Set to true if your frontend expects httpOnly
        });
      }

      // Set viewport for consistent rendering
      await page.setViewport({ width: 1200, height: 800 });

      // Add console and error listeners for debugging
      page.on('console', msg => logger.debug(`Page console [${msg.type()}]: ${msg.text()}`));
      page.on('pageerror', err => logger.error('Page error:', { error: err.message }));
      page.on('requestfailed', req => logger.warn('Request failed:', { url: req.url(), failure: req.failure()?.errorText }));

      // Build report URL using tenant-specific frontend URL
      // Format testId as "Test N" if it's just a number
      const formattedTestId = /^\d+$/.test(String(testId)) ? `Test ${testId}` : testId;
      let reportURL = `${tenantUrls.frontend}/report?studentId=${encodeURIComponent(studentId)}&testId=${encodeURIComponent(formattedTestId)}`;
      if (educatorId) {
        reportURL += `&educatorId=${encodeURIComponent(educatorId)}`;
      }
      logger.debug('Navigating to report URL', { url: reportURL, origin, frontendHost: new URL(tenantUrls.frontend).hostname, rawTestId: testId, formattedTestId });

      // Navigate to the page
      await page.goto(reportURL, {
        waitUntil: 'networkidle0',
        timeout: config.pdf.timeout
      // Ensure frontend code that reads token from localStorage (axios calls)
      // has access to the JWT when Puppeteer loads the page.
      if (jwtToken) {
        try {
          await page.evaluateOnNewDocument((token) => {
            try { localStorage.setItem('token', token); } catch (e) { /* noop */ }
          }, jwtToken);
        } catch (err) {
          logger.warn('Failed to inject token into localStorage', { error: err.message });
        }
      }
      });

      // Wait for React app to be ready
      logger.debug('Waiting for React app to be ready...');
      try {
        await page.waitForFunction(
          "window.__PDF_READY__ === true",
          {
            timeout: 120000,
            polling: 500
          }
        );
      } catch (waitError) {
        // On timeout, capture debug info
        logger.error('Timeout waiting for __PDF_READY__', { error: waitError.message });
        const screenshotPath = path.join(config.pdf.tempDir, `debug_${studentId}_${testId}_${Date.now()}.png`);
        const htmlPath = path.join(config.pdf.tempDir, `debug_${studentId}_${testId}_${Date.now()}.html`);
        try {
          await page.screenshot({ path: screenshotPath, fullPage: true });
          const html = await page.content();
          fs.writeFileSync(htmlPath, html);
          logger.info('Debug artifacts saved', { screenshot: screenshotPath, html: htmlPath });
        } catch (debugErr) {
          logger.warn('Could not save debug artifacts', { error: debugErr.message });
        }
        throw waitError;
      }

      // Generate PDF
      logger.debug('Generating PDF...');
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        }
      });

      // Save to temp file
      const filename = `inzighted_report_${studentId}_${testId}.pdf`;
      const filePath = path.join(config.pdf.tempDir, filename);

      fs.writeFileSync(filePath, pdfBuffer);

      const duration = Date.now() - startTime;
      logger.info('PDF generated successfully', {
        studentId,
        testId,
        duration: `${duration}ms`,
        filename,
        size: `${(pdfBuffer.length / 1024).toFixed(2)}KB`
      });

      // Upload to S3 asynchronously (non-blocking) with deterministic naming
      if (classId) {
        this.uploadToS3(pdfBuffer, classId, testId, filename, 'student', studentId).catch(err => {
          logger.error('S3 upload failed but continuing', { error: err.message });
        });
      } else {
        logger.debug('Skipping S3 upload - no classId provided');
      }

      return { filePath, filename, buffer: pdfBuffer };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('PDF generation failed', {
        studentId,
        testId,
        duration: `${duration}ms`,
        error: error.message
      });
      throw error;
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * Generate PDFs for multiple students and zip them.
   * @param {Array<string>} studentIds - Array of student IDs
   * @param {string} testId - Test ID
   * @param {string} jwtToken - JWT token for authentication
   * @param {string} origin - Origin for tenant-specific URLs
   * @param {string} classId - Optional class ID for S3 upload
   * @returns {Promise<string>} - Path to the generated zip file
   */
  async generateBulkPdfZip(studentIds, testId, jwtToken, origin, classId = null, educatorId = null) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    const zipFilename = `inzighted_reports_${testId}_${Date.now()}.zip`;
    const zipFilePath = path.join(config.pdf.tempDir, zipFilename);
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise(async (resolve, reject) => {
      output.on('close', () => {
        logger.info('Bulk PDF zip created', { zipFilename, size: archive.pointer() });
        resolve(zipFilePath);
      });
      archive.on('error', (err) => {
        logger.error('Error creating zip', { error: err.message });
        reject(err);
      });
      archive.pipe(output);

      for (const studentId of studentIds) {
        try {
          const { filePath, filename } = await this.generatePdf(studentId, testId, jwtToken, origin, classId, educatorId);
          archive.file(filePath, { name: filename });
        } catch (err) {
          logger.warn('Failed to generate PDF for student', { studentId, error: err.message });
        }
      }
      archive.finalize();
    });
  }

  async cleanup(filePath) {
    if (!filePath || !fs.existsSync(filePath)) return;

    setTimeout(() => {
      try {
        fs.unlinkSync(filePath);
        logger.debug('Temporary PDF file cleaned up', { filePath });
      } catch (error) {
        logger.warn('Could not clean up PDF file', { filePath, error: error.message });
      }
    }, config.pdf.cleanupDelay);
  }

  async shutdown() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.isInitialized = false;
      logger.info('PDF service shut down');
    }
  }

  async fetchReportData(studentId, testNum, authToken, origin) {
    try {
      logger.debug('Fetching educator student insights', { studentId, testNum });

      const tenantUrls = config.pdf.getTenantUrls(origin);
      const response = await axios.post(
        `${tenantUrls.backend}/educator/students/insights/`,
        {
          student_id: studentId,
          test_num: testNum
        },
        {
          headers: {
            Authorization: authToken,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = response.data;

      // Transform SWOT data
      const swotData = this.transformSwotData(data?.swot || {});

      return {
        student: {
          name: data?.userName || "Student",
          student_id: studentId,
          inst: data?.institution
        },
        summaryData: data?.overview?.summaryCardsData || [],
        swotData,
      };
    } catch (error) {
      logger.error('Failed to fetch educator student insights', { error: error.message });
      throw new Error(`Failed to fetch report data: ${error.message}`);
    }
  }

  async fetchStudentChartData(studentId, testNum, authToken) {
    // Always return dummy data for now, since there is no educator endpoint for charts
    return {
      subjectTotals: DUMMY_SUBJECT_TOTALS,
      errorData: DUMMY_ERROR_DATA,
      trendData: DUMMY_TREND_DATA
    };
  }

  transformSwotData(swot) {
    const result = { Strengths: [], Weaknesses: [], Opportunities: [], Threats: [] };

    Object.entries(swot).forEach(([subject, data]) => {
      if (data.strengths?.length) {
        result.Strengths.push({ subject, topics: data.strengths });
      }
      if (data.weaknesses?.length) {
        result.Weaknesses.push({ subject, topics: data.weaknesses });
      }
      if (data.opportunities?.length) {
        result.Opportunities.push({ subject, topics: data.opportunities });
      }
      if (data.threats?.length) {
        result.Threats.push({ subject, topics: data.threats });
      }
    });

    return result;
  }

  /**
   * Generate PDF for student self-report (student login)
   * @param {string} testId
   * @param {string} jwtToken
   * @param {string} origin
   * @param {string} classId - Optional class ID for S3 upload
   */
  async generateStudentSelfPdf(testId, jwtToken, origin, classId = null, educatorId = null) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Extract student ID from JWT token
    let studentId = null;
    if (jwtToken) {
      const decoded = this.decodeJWT(jwtToken);
      studentId = decoded?.student_id || decoded?.user_id || decoded?.sub;
    }

    // Check if PDF already exists in S3 first
    if (classId && studentId) {
      const deterministicKey = this.generateDeterministicS3Key(classId, testId, 'student', studentId);
      const exists = await this.checkS3Exists(deterministicKey);
      if (exists) {
        logger.info('Student PDF found in S3, skipping generation', { 
          studentId, 
          testId, 
          classId, 
          s3Key: deterministicKey 
        });
        return { 
          filePath: null, 
          filename: path.basename(deterministicKey), 
          buffer: null,
          s3Key: deterministicKey,
          fromS3: true 
        };
      }
    }
    
    // Get tenant-specific URLs
    const tenantUrls = config.pdf.getTenantUrls(origin);
    // If testId is 'overall' (any case), use '0'. Otherwise, remove any non-digit prefix (e.g., 'Test1' -> '1')
    let sanitizedTestId;
    if (String(testId).trim().toLowerCase() === 'overall') {
      sanitizedTestId = '0';
    } else {
      sanitizedTestId = String(testId).replace(/^[^\d]*(\d+)$/, '$1');
    }
    if (!sanitizedTestId) {
      throw new Error(`Invalid testId: ${testId}.`);
    }
    const startTime = Date.now();
    let page = null;
    try {
      logger.info('Starting PDF generation for student self-report', { testId: sanitizedTestId });
      page = await this.browser.newPage();
      if (jwtToken) {
        await page.evaluateOnNewDocument((token) => {
          localStorage.setItem('token', token);
        }, jwtToken);
        await page.setCookie({
          name: 'jwt',
          value: jwtToken,
          domain: new URL(tenantUrls.frontend).hostname,
          path: '/',
          httpOnly: false
        });
      }
      await page.setViewport({ width: 1200, height: 800 });
      // Format testId as "Test N" if it's just a number
      const formattedTestId = /^\d+$/.test(String(sanitizedTestId)) ? `Test ${sanitizedTestId}` : sanitizedTestId;
      let reportURL = `${tenantUrls.frontend}/student-report?testId=${encodeURIComponent(formattedTestId)}`;
      if (educatorId) {
        reportURL += `&educatorId=${encodeURIComponent(educatorId)}`;
      }
      logger.debug('Navigating to student self-report URL', { url: reportURL, rawTestId: sanitizedTestId, formattedTestId });
      await page.goto(reportURL, {
        waitUntil: 'networkidle0',
        timeout: config.pdf.timeout
      });
      await page.waitForFunction(
        "window.__PDF_READY__ === true",
        { timeout: 120000, polling: 500 }
      );
      const pdfBuffer = await page.pdf({
        format: 'A4', printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
      });
      const filename = `inzighted_student_report_${sanitizedTestId}.pdf`;
      const filePath = path.join(config.pdf.tempDir, filename);
      fs.writeFileSync(filePath, pdfBuffer);
      logger.info('Student self-report PDF generated', { testId: sanitizedTestId, filename });
      
      // Upload to S3 asynchronously (non-blocking) with deterministic naming
      if (classId && studentId) {
        this.uploadToS3(pdfBuffer, classId, sanitizedTestId, filename, 'student', studentId).catch(err => {
          logger.error('S3 upload failed but continuing', { error: err.message });
        });
      } else {
        logger.debug('Skipping S3 upload - no classId or studentId provided for student self-report');
      }
      
      return { filePath, filename, buffer: pdfBuffer };
    } catch (error) {
      logger.error('Student self-report PDF generation failed', { testId: sanitizedTestId, error: error.message });
      throw error;
    } finally {
      if (page) await page.close();
    }
  }

  /**
   * Generate PDF for teacher self-report (teacher login)
   * @param {string} testId
   * @param {string} jwtToken
   * @param {string} origin
   * @param {string} classId - Optional class ID for S3 upload
   */
  async generateTeacherSelfPdf(testId, jwtToken, origin, classId = null, educatorId = null) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Extract teacher ID from JWT token
    let teacherId = null;
    if (jwtToken) {
      const decoded = this.decodeJWT(jwtToken);
      teacherId = decoded?.teacher_id || decoded?.educator_id || decoded?.user_id || decoded?.sub;
    }

    // Check if PDF already exists in S3 first
    if (classId && teacherId) {
      const deterministicKey = this.generateDeterministicS3Key(classId, testId, 'teacher', teacherId);
      const exists = await this.checkS3Exists(deterministicKey);
      if (exists) {
        logger.info('Teacher PDF found in S3, skipping generation', { 
          teacherId, 
          testId, 
          classId, 
          s3Key: deterministicKey 
        });
        return { 
          filePath: null, 
          filename: path.basename(deterministicKey), 
          buffer: null,
          s3Key: deterministicKey,
          fromS3: true 
        };
      }
    }
    
    // Get tenant-specific URLs
    const tenantUrls = config.pdf.getTenantUrls(origin);
    // If testId is 'overall' (any case), use '0'. Otherwise, remove any non-digit prefix (e.g., 'Test1' -> '1')
    let sanitizedTestId;
    if (String(testId).trim().toLowerCase() === 'overall') {
      sanitizedTestId = '0';
    } else {
      sanitizedTestId = String(testId).replace(/^[^\d]*(\d+)$/, '$1');
    }
    if (!sanitizedTestId) {
      throw new Error(`Invalid testId: ${testId}.`);
    }
    const startTime = Date.now();
    let page = null;
    try {
      logger.info('Starting PDF generation for teacher self-report', { testId: sanitizedTestId });
      page = await this.browser.newPage();
      if (jwtToken) {
        await page.evaluateOnNewDocument((token) => {
          localStorage.setItem('token', token);
        }, jwtToken);
        await page.setCookie({
          name: 'jwt',
          value: jwtToken,
          domain: new URL(tenantUrls.frontend).hostname,
          path: '/',
          httpOnly: false
        });
      }
      await page.setViewport({ width: 1200, height: 800 });
      // Format testId as "Test N" if it's just a number
      const formattedTestId = /^\d+$/.test(String(sanitizedTestId)) ? `Test ${sanitizedTestId}` : sanitizedTestId;
      let reportURL = `${tenantUrls.frontend}/teacher-report?testId=${encodeURIComponent(formattedTestId)}`;
      if (educatorId) {
        reportURL += `&educatorId=${encodeURIComponent(educatorId)}`;
      }
      logger.debug('Navigating to teacher self-report URL', { url: reportURL, rawTestId: sanitizedTestId, formattedTestId });
      await page.goto(reportURL, {
        waitUntil: 'networkidle0',
        timeout: config.pdf.timeout
      });
      await page.waitForFunction(
        "window.__PDF_READY__ === true",
        { timeout: 120000, polling: 500 }
      );
      const pdfBuffer = await page.pdf({
        format: 'A4', printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
      });
      const filename = `inzighted_teacher_report_${sanitizedTestId}.pdf`;
      const filePath = path.join(config.pdf.tempDir, filename);
      fs.writeFileSync(filePath, pdfBuffer);
      logger.info('Teacher self-report PDF generated', { testId: sanitizedTestId, filename });
      
      // Upload to S3 asynchronously (non-blocking) with deterministic naming
      if (classId && teacherId) {
        this.uploadToS3(pdfBuffer, classId, sanitizedTestId, filename, 'teacher', teacherId).catch(err => {
          logger.error('S3 upload failed but continuing', { error: err.message });
        });
      } else {
        logger.debug('Skipping S3 upload - no classId or teacherId provided for teacher self-report');
      }
      
      return { filePath, filename, buffer: pdfBuffer };
    } catch (error) {
      logger.error('Teacher self-report PDF generation failed', { testId: sanitizedTestId, error: error.message });
      throw error;
    } finally {
      if (page) await page.close();
    }
  }
}

export default new PdfService();
