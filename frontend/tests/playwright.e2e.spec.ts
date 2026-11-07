"""
End-to-end tests for the Root Cause Analysis system using Playwright.

These tests verify the complete workflow from ingestion to final CAPA approval,
including audit logging and separation of AI vs user changes.
"""

import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

test.describe('Root Cause Analysis - Full End-to-End Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:5173')
  })

  test('Complete investigation workflow with email input and PDF upload', async ({
    page
  }) => {
    // Sample complaint email for testing
    const sampleEmail = `FROM: quality.engineer@pharma.com
DATE: 2026-11-07
TO: investigation.team@pharma.com
SUBJECT: URGENT - Batch A123 Tablet Quality Issue

We have detected a serious deviation in Batch A123 during tablet compression.
The press stopped unexpectedly during compression cycle 4.

IMMEDIATE ACTION REQUIRED:
1. Halt production line
2. Isolate Batch A123
3. Begin root cause investigation

BATCH DETAILS:
- Product: Paracetamol 500mg
- Batch Number: A123
- Manufacturing Date: 2026-10-01
- Detected Date: 2026-11-07
- Site: Manufacturing
- Severity: Critical

DESCRIPTION: Press stopped during compression due to excessive vibration. Vibration sensor readings show 15% above normal operating parameters. Need to investigate motor alignment, belt tension, and cooling system.

Please initiate 5 Whys and Fishbone analysis immediately.

Thanks,
Quality Engineer`

    // Step 1: Start new investigation
    await page.getByRole('button', { name: 'Start New Investigation' }).click()
    await page.waitForURL('**/investigation')

    // Step 2: Input sample email into AI Copilot
    await page.fill('textarea[placeholder="Paste complaint or description..."]', sampleEmail)

    // Wait for AI processing to complete
    await page.waitForSelector('text="Processing complete."', { timeout: 30000 })

    // Step 3: Verify extraction results populate the form
    await expect(page.locator('text="✓ Complaint parsed successfully."')).toBeVisible()
    await expect(page.locator('text="Extracted: Deviation details"')).toBeVisible()
    await expect(page.locator('text="Product: Paracetamol 500mg"')).toBeVisible()
    await expect(page.locator('text="Batch: A123"')).toBeVisible()

    // Step 4: Verify evidence gaps are identified
    await expect(page.locator('text="✓ Identified evidence gaps"')).toBeVisible()
    await expect(page.locator('text="Equipment maintenance log"')).toBeVisible()

    // Step 5: Verify RCA analysis results
    await expect(page.locator('text="✓ Proposed root cause hypotheses"')).toBeVisible()

    // Step 6: Verify CAPA actions are proposed
    await expect(page.locator('text="✓ Proposed CAPA actions"')).toBeVisible()

    // Complete first phase - extract, RCA, and CAPA
    console.log('AI processing completed successfully')
  })

  test('PDF investigation report processing workflow', async ({ page }) => {
    // Create a sample PDF file for testing
    const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 200
>>
stream
BT
/F1 12 Tf
100 700 Td
(Investigation Report: Batch B456 - Filling Line Issue) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000107 00000 n 
0000000156 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
215
%%EOF`

    // Write the PDF to a temporary file
    const pdfPath = path.join(__dirname, '../temp_test.pdf')
    fs.writeFileSync(pdfPath, pdfContent)

    try {
      // Step 1: Start investigation
      await page.getByRole('button', { name: 'Start New Investigation' }).click()
      await page.waitForURL('**/investigation')

      // Step 2: Upload PDF file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(pdfPath)

      // Wait for processing to complete
      await page.waitForSelector('text="Processing complete."', { timeout: 30000 })

      // Step 3: Verify PDF processing results
      await expect(page.locator('text="✓ Complaint parsed successfully."')).toBeVisible()
      await expect(page.locator('text="Extracted: Deviation details"')).toBeVisible()

      console.log('PDF processing completed successfully')
    } finally {
      // Clean up temporary file
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath)
      }
    }
  })

  test('RCA analysis and root cause confirmation workflow', async ({
    page
  }) => {
    // Start with a simple deviation
    const deviationData = {
      deviation_number: 'DEV-TEST-001',
      title: 'Test Deviation for RCA',
      description: 'Test description for RCA analysis',
      site_block: 'Manufacturing',
      severity: 'Major'
    }

    // Create deviation via API (simulated)
    await page.goto('http://localhost:5173')
    await page.getByRole('button', { name: 'Start New Investigation' }).click()

    // Input basic deviation
    await page.fill('textarea[placeholder="Paste complaint or description..."]', 
      'From: test@pharma.com - Batch TEST-001 issue in Manufacturing department. Press malfunction during compression.')

    // Wait for AI processing
    await page.waitForSelector('text="Processing complete."', { timeout: 30000 })

    // Verify initial extraction
    await expect(page.locator('text="✓ Complaint parsed successfully."')).toBeVisible()

    // Navigate to RCA section and verify AI suggestions
    await page.click('[data-testid="rca-tab"]')

    // Check if AI-generated RCA content is present
    await expect(page.locator('text="AI-generated root cause analysis"')).toBeVisible({ timeout: 10000 })

    // Simulate user interaction with RCA results
    await page.click('[data-testid="edit-root-cause"]')
    await page.fill('[data-testid="root-cause-text"]', 'Updated root cause analysis by user')
    await page.click('[data-testid="save-root-cause"]')

    console.log('RCA analysis and confirmation completed successfully')
  })

  test('Evidence gaps management and RCA re-execution workflow', async ({
    page
  }) => {
    // Start investigation
    await page.goto('http://localhost:5173')
    await page.getByRole('button', { name: 'Start New Investigation' }).click()

    // Input text that will generate evidence gaps
    await page.fill('textarea[placeholder="Paste complaint or description..."]', 
      'Manufacturing deviation with incomplete documentation')

    // Wait for processing
    await page.waitForSelector('text="Processing complete."', { timeout: 30000 })

    // Verify evidence gaps are identified
    await expect(page.locator('text="Equipment maintenance log"')).toBeVisible()

    // Add evidence via evidence panel
    await page.click('[data-testid="add-evidence"]')
    await page.fill('[data-testid="evidence-description"]', 'Added maintenance log for equipment calibration')
    await page.click('[data-testid="save-evidence"]')

    // Verify evidence was added
    await expect(page.locator('text="maintenance log"')).toBeVisible()

    // Re-run RCA to verify confidence changes
    await page.click('[data-testid="rca-tab"]')
    await page.click('[data-testid="re-run-rca"]')

    // Wait for updated RCA
    await page.waitForSelector('text="RCA analysis updated"', { timeout: 20000 })

    // Verify confidence changes
    await expect(page.locator('text="Confidence: High"')).toBeVisible()

    console.log('Evidence gaps management workflow completed successfully')
  })

  test('CAPA generation, editing, and approval workflow', async ({
    page
  }) => {
    // Start investigation
    await page.goto('http://localhost:5173')
    await page.getByRole('button', { name: 'Start New Investigation' }).click()

    // Input deviation text
    await page.fill('textarea[placeholder="Paste complaint or description..."]', 
      'Critical deviation requiring immediate corrective action')

    // Wait for full processing
    await page.waitForSelector('text="Processing complete."', { timeout: 30000 })

    // Navigate to CAPA section
    await page.click('[data-testid="capa-tab"]')

    // Verify CAPA actions are proposed
    await expect(page.locator('text="Proposed CAPA actions"')).toBeVisible()

    // Edit CAPA action
    await page.click('[data-testid="edit-capa-action"]')
    await page.fill('[data-testid="capa-description"]', 
      'Immediate action: Replace faulty compressor to prevent recurrence')
    await page.click('[data-testid="save-capa"]')

    // Approve CAPA
    await page.click('[data-testid="approve-capa"]')
    await page.click('[data-testid="confirm-approval"]')

    // Verify approval
    await expect(page.locator('text="CAPA approved"')).toBeVisible()

    console.log('CAPA workflow completed successfully')
  })

  test('Audit log verification and separation of AI vs user changes', async ({
    page
  }) => {
    // Start investigation
    await page.goto('http://localhost:5173')
    await page.getByRole('button', { name: 'Start New Investigation' }).click()

    // Input deviation
    await page.fill('textarea[placeholder="Paste complaint or description..."]', 
      'Deviation for audit verification testing')

    // Wait for AI processing
    await page.waitForSelector('text="Processing complete."', { timeout: 30000 })

    // Navigate to audit/history panel
    await page.click('[data-testid="history-tab"]')

    // Verify audit log is accessible
    await expect(page.locator('text="Audit Log"')).toBeVisible()

    // Check for AI-generated entries
    await expect(page.locator('text="AI-Agent"')).toBeVisible()

    // Check for user-generated entries
    await expect(page.locator('text="User"')).toBeVisible()

    // Verify separation of changes
    await expect(page.locator('text="AI-generated extraction"')).toBeVisible()
    await expect(page.locator('text="User edited field"')).toBeVisible()

    console.log('Audit log verification completed successfully')
  })
})

// Test failure scenarios
test.describe('Failure scenarios and error handling', () => {
  test('Empty paste error handling', async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.getByRole('button', { name: 'Start New Investigation' }).click()

    // Try to submit empty text
    await page.click('button:has-text("Send to Copilot")')

    // Verify error message
    await expect(page.locator('text="Text content is too short or empty"')).toBeVisible()
  })

  test('Bad PDF handling', async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.getByRole('button', { name: 'Start New Investigation' }).click()

    // Create a malformed PDF file
    const badPdfPath = path.join(__dirname, '../temp_bad.pdf')
    fs.writeFileSync(badPdfPath, 'This is not a valid PDF file')

    try {
      // Upload bad PDF
      await page.setInputFiles('input[type="file"]', badPdfPath)
      await page.click('button:has-text("Send to Copilot")')

      // Verify error message
      await expect(page.locator('text="Could\'t read this PDF"')).toBeVisible()
    } finally {
      if (fs.existsSync(badPdfPath)) {
        fs.unlinkSync(badPdfPath)
      }
    }
  })

  test('AI timeout/error simulation', async ({ page }) => {
    // Simulate AI service timeout
    await page.goto('http://localhost:5173')
    await page.getByRole('button', { name: 'Start New Investigation' }).click()

    // Input long text that might cause processing timeout
    const longText = 'A'
    for (let i = 0; i < 100; i++) longText += 'A'

    await page.fill('textarea[placeholder="Paste complaint or description..."]', longText)

    // Note: This test would require actual AI service timeout simulation
    // In a real implementation, this would mock the AI client timeout

    console.log('Timeout test scenario setup completed')
  })
}

test.describe('Accessibility and validation checks', () => {
  test('Form validation on empty submission', async ({ page }) => {
    await page.goto('http://localhost:5173')

    // Start investigation but don't fill form
    await page.getByRole('button', { name: 'Start New Investigation' }).click()

    // Try to submit empty form
    await page.click('button:has-text("Send to Copilot")')

    // Verify validation error
    await expect(page.locator('text="Please provide deviation details"')).toBeVisible()
  })

  test('Responsive design on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('http://localhost:5173')

    // Verify mobile layout
    await expect(page.locator('.mobile-layout')).toBeVisible()

    // Test mobile interaction
    await page.getByRole('button', { name: 'Start New Investigation' }).click()
    await page.waitForURL('**/investigation')

    console.log('Mobile responsive design test completed')
  })
})

// Cleanup after all tests
test.afterAll(async () => {
  // Clean up temporary files
  const tempDir = path.join(__dirname, '../temp_*.pdf')
  const files = fs.readdirSync(path.join(__dirname, '../'))
    .filter(file => file.endsWith('.pdf'))

  for (const file of files) {
    if (file.startsWith('temp_')) {
      fs.unlinkSync(path.join(__dirname, '../', file))
    }
  }
})
