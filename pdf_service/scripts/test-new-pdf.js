#!/usr/bin/env node

/**
 * Test script for the new PDF generation pipeline
 * This script tests the new backend-based PDF generation approach
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';

const PDF_SERVICE_URL = process.env.PDF_SERVICE_URL || 'http://localhost:8080';
const TEST_JWT_TOKEN = process.env.TEST_JWT_TOKEN || 'your-test-jwt-token-here';
const TEST_STUDENT_ID = process.env.TEST_STUDENT_ID || 'test-student-001';
const TEST_TEST_ID = process.env.TEST_TEST_ID || 'Overall';

async function testNewPdfGeneration() {
  console.log('🚀 Testing new PDF generation pipeline...\n');
  
  try {
    console.log('📋 Test Configuration:');
    console.log(`   PDF Service URL: ${PDF_SERVICE_URL}`);
    console.log(`   Student ID: ${TEST_STUDENT_ID}`);
    console.log(`   Test ID: ${TEST_TEST_ID}`);
    console.log(`   JWT Token: ${TEST_JWT_TOKEN ? 'Provided' : 'Missing (set TEST_JWT_TOKEN)'}\n`);
    
    if (!TEST_JWT_TOKEN || TEST_JWT_TOKEN === 'your-test-jwt-token-here') {
      console.log('❌ Error: Please set TEST_JWT_TOKEN environment variable with a valid JWT token');
      console.log('   Example: TEST_JWT_TOKEN="Bearer eyJ..." npm run test:pdf');
      process.exit(1);
    }
    
    console.log('🔄 Sending PDF generation request...');
    
    const response = await axios({
      method: 'POST',
      url: `${PDF_SERVICE_URL}/generate-pdf-backend`,
      params: {
        studentId: TEST_STUDENT_ID,
        testId: TEST_TEST_ID
      },
      headers: {
        'Authorization': TEST_JWT_TOKEN,
        'Content-Type': 'application/json'
      },
      responseType: 'arraybuffer',
      timeout: 60000
    });
    
    if (response.status === 200) {
      console.log('✅ PDF generation successful!');
      
      // Save the PDF file
      const filename = `test_report_${TEST_STUDENT_ID}_${TEST_TEST_ID}_${Date.now()}.pdf`;
      const filepath = path.join(process.cwd(), 'test-output', filename);
      
      // Ensure test-output directory exists
      const dir = path.dirname(filepath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(filepath, response.data);
      
      console.log(`📄 PDF saved to: ${filepath}`);
      console.log(`📊 File size: ${(response.data.length / 1024).toFixed(2)} KB\n`);
      
      console.log('🎉 Test completed successfully!');
      console.log('   ✓ JWT authentication worked');
      console.log('   ✓ Backend APIs were called');
      console.log('   ✓ PDF was generated');
      console.log('   ✓ File was saved locally');
      
    } else {
      console.log(`❌ Unexpected status code: ${response.status}`);
      process.exit(1);
    }
    
  } catch (error) {
    console.log('❌ Test failed!');
    
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Message: ${error.response.data?.message || 'Unknown error'}`);
      console.log(`   Details: ${error.response.data?.details || 'No details available'}`);
    } else if (error.request) {
      console.log('   Error: No response received from server');
      console.log('   Check if PDF service is running on', PDF_SERVICE_URL);
    } else {
      console.log(`   Error: ${error.message}`);
    }
    
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Ensure PDF service is running: npm run dev');
    console.log('   2. Check if JWT token is valid and not expired');
    console.log('   3. Verify backend API URLs are accessible');
    console.log('   4. Check PDF service logs for detailed errors');
    
    process.exit(1);
  }
}

// Check if PDF service is running
async function checkPdfServiceHealth() {
  try {
    console.log('🏥 Checking PDF service health...');
    const response = await axios.get(`${PDF_SERVICE_URL}/health`, { timeout: 5000 });
    console.log('✅ PDF service is running\n');
    return true;
  } catch (error) {
    console.log('❌ PDF service is not responding');
    console.log('   Please start the PDF service: cd pdf/pdf_service && npm run dev\n');
    return false;
  }
}

// Main execution
async function main() {
  const isHealthy = await checkPdfServiceHealth();
  if (isHealthy) {
    await testNewPdfGeneration();
  }
}

main().catch(console.error);
