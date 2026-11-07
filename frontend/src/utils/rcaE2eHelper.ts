"""
Test utility for RCA end-to-end workflows
"""
import { Page, expect } from '@playwright/test'

export class RCAEndToEndHelper {
  constructor(private page: Page) {}

  async startInvestigation() {
    await this.page.goto('http://localhost:5173')
    await this.page.getByRole('button', { name: 'Start New Investigation' }).click()
    await this.page.waitForURL('**/investigation')
  }

  async submitEmail(emailText: string) {
    await this.page.fill('textarea[placeholder="Paste complaint or description..."]', emailText)
    await this.page.click('button:has-text("Send to Copilot")')
    await this.page.waitForSelector('text="Processing complete."', { timeout: 30000 })
  }

  async submitPDF(pdfPath: string) {
    await this.page.setInputFiles('input[type="file"]', pdfPath)
    await this.page.click('button:has-text("Send to Copilot")')
    await this.page.waitForSelector('text="Processing complete."', { timeout: 30000 })
  }

  async verifyExtraction() {
    await expect(this.page.locator('text="✓ Complaint parsed successfully."')).toBeVisible()
    await expect(this.page.locator('text="Extracted: Deviation details"')).toBeVisible()
  }

  async verifyEvidenceGaps() {
    await expect(this.page.locator('text="✓ Identified evidence gaps"')).toBeVisible()
  }

  async verifyRCAResults() {
    await expect(this.page.locator('text="✓ Proposed root cause hypotheses"')).toBeVisible()
  }

  async verifyCAPA() {
    await expect(this.page.locator('text="✓ Proposed CAPA actions"')).toBeVisible()
  }

  async verifyAuditLog() {
    await this.page.click('[data-testid="history-tab"]')
    await expect(this.page.locator('text="Audit Log"')).toBeVisible()
    await expect(this.page.locator('text="AI-Agent"')).toBeVisible()
    await expect(this.page.locator('text="User"')).toBeVisible()
  }

  async navigateToSection(sectionName: string) {
    await this.page.click(`[data-testid="${sectionName}-tab"]`)
  }
}
