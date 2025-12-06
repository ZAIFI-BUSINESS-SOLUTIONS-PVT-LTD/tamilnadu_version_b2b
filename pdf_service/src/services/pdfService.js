import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import archiver from 'archiver';

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

      this.isInitialized = true;
      logger.info('PDF service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize PDF service', { error: error.message });
      throw error;
    }
  }

  async generatePdf(studentId, testId, jwtToken, origin) {
    if (!this.isInitialized) {
      await this.initialize();
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

      // Build report URL using tenant-specific frontend URL.
      // If `FRONTEND_INTERNAL_URL` is set (e.g. 'http://nginx'), use it as
      // the network address but preserve the original Host header so nginx
      // routes correctly (this allows Puppeteer to reach the frontend via
      // the internal nginx container while preserving the public hostname).
      const publicFrontend = tenantUrls.frontend;
      const internalFrontendBase = process.env.FRONTEND_INTERNAL_URL || publicFrontend;
      const targetHost = new URL(publicFrontend).host;
      const reportURL = `${internalFrontendBase.replace(/\/$/, '')}/report?studentId=${encodeURIComponent(studentId)}&testId=${encodeURIComponent(testId)}`;
      logger.debug('Navigating to report URL', { url: reportURL, origin, targetHost });

      // When using an internal frontend base different from the public host,
      // set the Host header so the proxy (nginx) can route the request.
      try {
        await page.setExtraHTTPHeaders({ Host: targetHost });
      } catch (e) {
        logger.debug('Could not set extra HTTP headers', { error: e.message });
      }

      // Navigate to the page
      await page.goto(reportURL, {
        waitUntil: 'networkidle0',
        timeout: config.pdf.timeout
      });

      // Wait for React app to be ready
      logger.debug('Waiting for React app to be ready...');
      await page.waitForFunction(
        "window.__PDF_READY__ === true",
        {
          timeout: 120000, // Increased from 15000 to 30000ms
          polling: 500
        }
      );

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
      const filename = `inzighted_report_${studentId}_${testId}_${Date.now()}.pdf`;
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
   * @returns {Promise<string>} - Path to the generated zip file
   */
  async generateBulkPdfZip(studentIds, testId, jwtToken, origin) {
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
          const { filePath, filename } = await this.generatePdf(studentId, testId, jwtToken, origin);
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
   */
  async generateStudentSelfPdf(testId, jwtToken, origin) {
    if (!this.isInitialized) {
      await this.initialize();
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
      const publicFrontend = tenantUrls.frontend;
      const internalFrontendBase = process.env.FRONTEND_INTERNAL_URL || publicFrontend;
      const targetHost = new URL(publicFrontend).host;
      const reportURL = `${internalFrontendBase.replace(/\/$/, '')}/student-report?testId=${encodeURIComponent(sanitizedTestId)}`;
      logger.debug('Navigating to student self-report URL', { url: reportURL, targetHost });
      try { await page.setExtraHTTPHeaders({ Host: targetHost }); } catch (e) {}
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
      const filename = `inzighted_student_report_${sanitizedTestId}_${Date.now()}.pdf`;
      const filePath = path.join(config.pdf.tempDir, filename);
      fs.writeFileSync(filePath, pdfBuffer);
      logger.info('Student self-report PDF generated', { testId: sanitizedTestId, filename });
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
   */
  async generateTeacherSelfPdf(testId, jwtToken, origin) {
    if (!this.isInitialized) {
      await this.initialize();
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
      const publicFrontend = tenantUrls.frontend;
      const internalFrontendBase = process.env.FRONTEND_INTERNAL_URL || publicFrontend;
      const targetHost = new URL(publicFrontend).host;
      const reportURL = `${internalFrontendBase.replace(/\/$/, '')}/teacher-report?testId=${encodeURIComponent(sanitizedTestId)}`;
      logger.debug('Navigating to teacher self-report URL', { url: reportURL, targetHost });
      try { await page.setExtraHTTPHeaders({ Host: targetHost }); } catch (e) {}
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
      const filename = `inzighted_teacher_report_${sanitizedTestId}_${Date.now()}.pdf`;
      const filePath = path.join(config.pdf.tempDir, filename);
      fs.writeFileSync(filePath, pdfBuffer);
      logger.info('Teacher self-report PDF generated', { testId: sanitizedTestId, filename });
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
