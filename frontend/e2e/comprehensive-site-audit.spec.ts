import { test, expect } from '@playwright/test';

test.describe('NeuroLearn AI – Deep Site & UX Health Audit', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error(`[Browser Console Error] ${msg.text()}`);
      }
    });
    page.on('pageerror', (err) => {
      console.error(`[Browser Uncaught Error] ${err.message}`);
    });
  });

  test('Public routes: Landing Page navigation, responsive layout, and 404 page', async ({ page }) => {
    // 1. Visit Landing Page
    await page.goto('/');
    await expect(page).toHaveTitle(/NeuroLearn AI/);
    
    // Check key landing sections
    await expect(page.locator('h1')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('link', { name: /enter platform|sign in|launch|get started/i }).first()).toBeVisible();

    // Responsive check at 390px
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('h1')).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 800 });

    // 2. Test 404 Not Found Page
    await page.goto('/unknown-random-route-12345');
    await expect(page.getByText(/404/i)).toBeVisible();
    const returnHomeBtn = page.getByRole('link', { name: /home|return|back/i }).first();
    await expect(returnHomeBtn).toBeVisible();
    await returnHomeBtn.click();
    await expect(page).toHaveURL('/');
  });

  test('Authentication: validation errors, demo chips, and unauthorized redirection', async ({ page }) => {
    // 1. Unauthorized access to protected route redirects to login
    await page.goto('/student');
    await expect(page).toHaveURL(/\/login/);

    // 2. Invalid credentials show error message
    await page.locator('#login-email').fill('wrong@user.com');
    await page.locator('#login-password').fill('wrongpassword');
    await page.locator('#login-submit-btn').click();
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();

    // 3. Quick-fill chips exist for demo students and faculty
    await expect(page.locator('#demo1-chip')).toBeVisible();
    await expect(page.locator('#demo2-chip')).toBeVisible();
    await expect(page.locator('#demo3-chip')).toBeVisible();
    await expect(page.locator('#demo4-chip')).toBeVisible();
    await expect(page.locator('#demo5-chip')).toBeVisible();
    await expect(page.locator('#faculty-chip')).toBeVisible();
  });

  test('Student Experience: full navigation across all student views and interactions', async ({ page }) => {
    // Login as Demo 1
    await page.goto('/login');
    await page.locator('#demo1-chip').click();
    await page.locator('#login-submit-btn').click();
    await expect(page).toHaveURL(/\/student/);

    // 1. Overview Page (/student)
    await expect(page.getByText(/Overall Curriculum Mastery/i)).toBeVisible();
    await expect(page.getByText(/Root Cause Diagnosis/i)).toBeVisible();

    // 2. Mastery Page (/student/mastery)
    await page.goto('/student/mastery');
    await expect(page.getByText(/38 Curricular Concepts/i)).toBeVisible();
    
    // Toggle Table View vs Heatmap if button exists
    const toggleBtn = page.getByRole('button', { name: /table view|matrix|grid|heatmap/i }).first();
    if (await toggleBtn.isVisible()) {
      await toggleBtn.click();
    }

    // 3. Risks Page (/student/risks)
    await page.goto('/student/risks');
    await expect(page.getByRole('heading', { name: /Upcoming Struggle Predictions/i })).toBeVisible();

    // 4. Root Gaps Page (/student/root-gaps)
    await page.goto('/student/root-gaps');
    await expect(page.getByRole('heading', { name: 'Prerequisite Root Causes', exact: true })).toBeVisible();

    // 5. Remediation Path (/student/path)
    await page.goto('/student/path');
    await expect(page.getByRole('heading', { name: /Remediation Path/i })).toBeVisible();

    // 6. Knowledge Graph Constellation (/student/graph)
    await page.goto('/student/graph');
    await expect(page.getByText(/38-Node Prerequisite Constellation/i)).toBeVisible();

    // 7. Cognitive Progress Timeline (/student/progress)
    await page.goto('/student/progress');
    await expect(page.getByRole('heading', { name: 'Digital Twin Evolution', exact: true })).toBeVisible();

    // 8. Concept Detail Route (/student/concepts/7 - Arrays)
    await page.goto('/student/concepts/7');
    await expect(page.getByRole('heading', { name: 'Arrays and Memory Contiguity', exact: true })).toBeVisible();

    // 9. Concept Detail Route (/student/concept/12 - Linked Lists)
    await page.goto('/student/concept/12');
    await expect(page.getByRole('heading', { name: 'Singly Linked Lists', exact: true })).toBeVisible();

    // 10. Attempt Drawer: Open, Fill, and Submit
    const logBtn = page.getByRole('button', { name: /^Log Attempt$/i });
    if (await logBtn.isVisible()) {
      await logBtn.click();
      await expect(page.getByText('Log Exercise Attempt')).toBeVisible();
      await page.getByRole('button', { name: 'Submit Attempt' }).click();
      await expect(page.getByText('Attempt Recorded')).toBeVisible();
    }
  });

  test('Faculty Experience: cohort analytics, student table, common gaps, alerts, and model info', async ({ page }) => {
    // Login as Faculty
    await page.goto('/login');
    await page.locator('#faculty-chip').click();
    await page.locator('#login-submit-btn').click();
    await expect(page).toHaveURL(/\/faculty/);

    // 1. Faculty Overview (/faculty)
    await expect(page.getByRole('heading', { name: /Cohort Intelligence Overview/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Rapid Surge Alerts', exact: true })).toBeVisible();

    // 2. Student Directory (/faculty/students)
    await page.goto('/faculty/students');
    await expect(page.getByPlaceholder(/search/i)).toBeVisible();
    await expect(page.getByText('Asha Demo')).toBeVisible();

    // 3. Drill-down into student detail (/faculty/students/:id)
    await page.goto('/faculty/students/00000000-0000-0000-0000-000000000001');
    await expect(page.getByRole('heading', { name: 'Digital Twin Snapshot', exact: true })).toBeVisible();
    await expect(page.getByText('Read-Only Faculty View')).toBeVisible();

    // 4. Alerts Page (/faculty/alerts)
    await page.goto('/faculty/alerts');
    await expect(page.getByRole('heading', { name: 'Sudden Struggle Trajectories', exact: true })).toBeVisible();

    // 5. Common Gaps Page (/faculty/gaps)
    await page.goto('/faculty/gaps');
    await expect(page.getByRole('heading', { name: 'Ranked Prerequisite Root Gaps', exact: true })).toBeVisible();

    // 6. Cohort Mastery Page (/faculty/mastery)
    await page.goto('/faculty/mastery');
    await expect(page.getByRole('heading', { name: 'Cohort-Wide Mastery Heatmap', exact: true })).toBeVisible();

    // 7. Model Card & Governance Page (/faculty/model)
    await page.goto('/faculty/model');
    await expect(page.getByRole('heading', { name: 'Architecture & Validation Metrics', exact: true })).toBeVisible();
  });

  test('Access Control Enforcement: Role boundary guards', async ({ page }) => {
    // Login as student
    await page.goto('/login');
    await page.locator('#demo1-chip').click();
    await page.locator('#login-submit-btn').click();
    await expect(page).toHaveURL(/\/student/);

    // Try to navigate to faculty route
    await page.goto('/faculty');
    // Student should be prevented and redirected back to /student
    await expect(page).toHaveURL(/\/student/);
  });

  test('Mobile 360px viewport responsiveness across student and faculty dashboards', async ({ page }) => {
    // Test exact PRD Phase 7 requirement: 360px mobile width
    await page.setViewportSize({ width: 360, height: 740 });

    // 1. Login as Student
    await page.goto('/login');
    await page.locator('#demo1-chip').click();
    await page.locator('#login-submit-btn').click();
    await expect(page).toHaveURL(/\/student/);

    // Verify key student pages load at 360px without horizontal overflow
    const studentRoutes = ['/student', '/student/mastery', '/student/path', '/student/risks', '/student/root-gaps'];
    for (const route of studentRoutes) {
      await page.goto(route);
      const isWithinViewport = await page.evaluate(() => {
        return document.documentElement.scrollWidth <= window.innerWidth + 5; // slight tolerance
      });
      expect(isWithinViewport).toBe(true);
    }

    // 2. Clear student session and Login as Faculty at 360px
    await page.evaluate(() => sessionStorage.clear());
    await page.goto('/login');
    await page.locator('#faculty-chip').click();
    await page.locator('#login-submit-btn').click();
    await expect(page).toHaveURL(/\/faculty/);

    const facultyRoutes = ['/faculty', '/faculty/students', '/faculty/alerts', '/faculty/gaps', '/faculty/mastery'];
    for (const route of facultyRoutes) {
      await page.goto(route);
      const isWithinViewport = await page.evaluate(() => {
        return document.documentElement.scrollWidth <= window.innerWidth + 5;
      });
      expect(isWithinViewport).toBe(true);
    }
  });

  test('Exercise Attempt: Log attempt updates student scores, root causes, and learning path reactively', async ({ page }) => {
    // 1. Login as Student Asha
    await page.goto('/login');
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await page.locator('#demo1-chip').click();
    await page.locator('#login-submit-btn').click();
    await expect(page).toHaveURL(/\/student/);

    // 2. Open Log Attempt drawer
    const logBtn = page.getByRole('button', { name: /Log Attempt/i });
    await expect(logBtn).toBeVisible();
    await logBtn.click();

    // 3. Verify drawer is open
    await expect(page.getByText('Log Exercise Attempt')).toBeVisible();

    // 4. Submit practice attempt for Concept 7 (Arrays) with 85%
    await page.locator('#attempt-concept').selectOption('7');
    await page.locator('#attempt-submit-btn').click();

    // 5. Success state displayed with adaptive recommendation
    await expect(page.getByText(/Attempt Recorded/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Adaptive Video Recommendation/i)).toBeVisible();

    // 6. Click Done to close drawer
    await page.getByRole('button', { name: 'Done' }).click();

    // 7. Verify learning path reflects the updated practice
    await page.goto('/student/path');
    await expect(page.getByText(/Arrays Data Structure and Memory Contiguity/i).first()).toBeVisible();

    // 8. Verify Progress page renders the attempts history with adaptive videos
    await page.goto('/student/progress');
    await expect(page.getByText(/Exercise Attempts History/i)).toBeVisible();
    await expect(page.locator('#attempts-history-list')).toBeVisible();

    // 9. Full page refresh: verify database and state persistence
    await page.reload();
    await expect(page.getByText(/Exercise Attempts History/i)).toBeVisible();
    await expect(page.locator('#attempts-history-list')).toBeVisible();
    await expect(page.locator('#attempts-history-list').getByText(/Arrays and Memory Contiguity/i).first()).toBeVisible();
  });

  test('User Registration: New user sign up creates digital twin and grants immediate access', async ({ page }) => {
    // 1. Visit Login page and click "Create one now"
    await page.goto('/login');
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await page.reload();

    const signUpLink = page.locator('#go-to-register-link');
    await expect(signUpLink).toBeVisible();
    await signUpLink.click();
    await expect(page).toHaveURL(/\/register/);

    // 2. Form validation: password < 6 chars shows error
    const uniqueEmail = `testuser_${Date.now()}@university.edu`;
    await page.locator('#register-name').fill('Alex Rivera');
    await page.locator('#register-email').fill(uniqueEmail);
    await page.locator('#register-password').fill('123');
    await page.locator('#register-submit-btn').click();
    await expect(page.getByText(/password must be at least 6 characters/i)).toBeVisible();

    // 3. Fill valid details and submit
    await page.locator('#register-password').fill('pass1234');
    await page.locator('#register-submit-btn').click();

    // 4. New user redirected to student dashboard
    await expect(page).toHaveURL(/\/student/, { timeout: 10000 });
    await expect(page.getByText(/Overall Curriculum Mastery/i)).toBeVisible();

    // 5. Digital twin metrics load successfully without 404 or missing records
    await expect(page.getByText(/Digital Learning Twin/i).first()).toBeVisible();
    await expect(page.getByText(/Learning Velocity/i)).toBeVisible();

    // 6. Navigate across student pages as the new student
    await page.goto('/student/mastery');
    await expect(page.getByText(/Concept Mastery Breakdown/i)).toBeVisible();

    await page.goto('/student/path');
    await expect(page.getByText(/Targeted Intervention Path/i)).toBeVisible();
  });
});
