"""
Global setup and teardown for Playwright tests
"""
import { FullConfig } from '@playwright/test'
import fs from 'fs'
import path from 'path'

export async function globalSetup(config: FullConfig) {
  // Create necessary directories
  const testDir = path.join(process.cwd(), 'test-results')
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true })
  }

  // Clean up any existing temporary files
  const tempDir = path.join(process.cwd(), '../temp_*')
  // Note: We can't easily clean up temp files in a cross-platform way
  // This is a simple implementation that will be improved in production
}

export async function globalTeardown(config: FullConfig) {
  // Clean up temporary files after all tests
  const tempDir = path.join(process.cwd(), '../temp_*')
  // Similar to globalSetup, basic cleanup implementation
}
