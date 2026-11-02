import { test, expect } from '@playwright/test';

test.describe('NeuroLearn AI – Full Demo Path E2E', () => {
  test('Landing page renders hero, problem, how it works, and numbers strip', async ({ page }) => {
    await page.goto('/');

    // Check title and headline
    await expect(page).toHaveTitle(/NeuroLearn AI/);
    await expect(page.locator('h1')).toContainText("Know where you'll", { timeout: 15000 });

    // Scroll to metrics section and check numbers strip metrics
    await page.locator('#metrics').scrollIntoViewIfNeeded();
    await expect(page.getByText('93.7%')).toBeVisible(); // ROC AUC
    await expect(page.getByText('80.0%')).toBeVisible(); // Recall
    await expect(page.getByText('0.098')).toBeVisible(); // Brier score
    await expect(page.getByText('98.7%')).toBeVisible(); // Root gap accuracy

    // Check team members in footer
    await page.locator('footer').scrollIntoViewIfNeeded();
    await expect(page.getByText('NARNE ADITHYA HANUMAN')).toBeVisible();
    await expect(page.getByText('24BDS0220')).toBeVisible();
  });

  test('Student login, Arrays root gap story, and learning path ticking', async ({ page }) => {
    await page.goto('/login');

    // Click Demo 1 quick-fill chip and submit
    await page.locator('#demo1-chip').click();
    await page.locator('#login-submit-btn').click();

    // Verify redirected to /student
    await expect(page).toHaveURL(/\/student/);

    // Verify Headline stats card row exists
    await expect(page.getByText('Overall Curriculum Mastery')).toBeVisible();
    await expect(page.getByText('Predicted High Risk')).toBeVisible();

    // Verify Root Gap signature moment shows Arrays blocking Linked Lists & Binary Trees
    await expect(page.getByText('Root Cause: Arrays and Memory Contiguity')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Arrays and Memory Contiguity', exact: true })).toBeVisible();

    // Navigate to learning path
    await page.goto('/student/path');
    await expect(page.getByRole('heading', { name: 'Root-Gap-First Remediation Path' })).toBeVisible();

    // Toggle step 1 checkbox
    const firstCheckbox = page.locator('button[aria-label*="Mark step 1"]').first();
    await firstCheckbox.click();

    // Navigate to knowledge graph
    await page.goto('/student/graph');
    await expect(page.getByText('38-Node Prerequisite Constellation')).toBeVisible();

    // Navigate to Singly Linked Lists concept detail (C12)
    await page.goto('/student/concepts/12');
    await expect(page.getByRole('heading', { name: 'Singly Linked Lists', exact: true })).toBeVisible();

    // Check plain-English reasons (no technical variables or underscores)
    await expect(page.getByText('Diagnostic Reasoning Breakdown')).toBeVisible();
    await expect(page.getByText(/A key prerequisite/i)).toBeVisible();

    // Open Attempt Drawer
    const logAttemptBtn = page.getByRole('button', { name: /^Log Attempt$/i });
    await expect(logAttemptBtn).toBeVisible();
    await logAttemptBtn.click();
    await expect(page.getByText('Log Exercise Attempt')).toBeVisible();

    // Submit attempt with pre-filled inputs
    await page.getByRole('button', { name: 'Submit Attempt' }).click();

    // Drawer displays success confirmation
    await expect(page.getByText('Attempt Recorded')).toBeVisible();
  });

  test('Demo 5 cold-start student displays low confidence indicators', async ({ page }) => {
    await page.goto('/login');

    // Quick-fill Demo 5
    await page.locator('#demo5-chip').click();
    await page.locator('#login-submit-btn').click();

    await expect(page).toHaveURL(/\/student/);
    await expect(page.getByText('Priya Novice')).toBeVisible();

    // Navigate to risks and verify low confidence badge/chip is present
    await page.goto('/student/risks');
    await expect(page.getByText(/Low Confidence/i).first()).toBeVisible();
  });

  test('Faculty login, cohort switcher, risk roster, and common gaps', async ({ page }) => {
    await page.goto('/login');

    // Quick-fill faculty
    await page.locator('#faculty-chip').click();
    await page.locator('#login-submit-btn').click();

    // Verify redirected to /faculty
    await expect(page).toHaveURL(/\/faculty/);

    // Verify cohort overview metrics
    await expect(page.getByText('Cohort Risk Profile')).toBeVisible();
    await expect(page.getByText('High Risk Students')).toBeVisible();

    // Verify common gaps view
    await page.goto('/faculty/gaps');
    await expect(page.getByRole('heading', { name: 'Ranked Prerequisite Root Gaps' })).toBeVisible();
    await expect(page.getByText('Arrays and Memory Contiguity').first()).toBeVisible();

    // Verify alerts view
    await page.goto('/faculty/alerts');
    await expect(page.getByRole('heading', { name: 'Sudden Struggle Trajectories' })).toBeVisible();

    // Navigate to faculty students roster
    await page.goto('/faculty/students');
    await expect(page.getByText('Student risk score rule:')).toBeVisible();
    await expect(page.getByText('Asha Demo')).toBeVisible();

    // Verify RoleGuard redirects faculty trying to access /student
    await page.goto('/student');
    await expect(page).toHaveURL(/\/faculty/);
    await expect(page.getByText(/Student individual dashboard routes are not directly available to faculty/i)).toBeVisible();
  });
});
