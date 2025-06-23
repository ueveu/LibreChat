const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class SimpleBrowserTester {
    constructor() {
        this.baseUrl = 'http://localhost:3080';
        this.screenshotDir = path.join(__dirname, 'screenshots');
        this.results = {
            timestamp: new Date().toISOString(),
            tests: [],
            errors: [],
            summary: {}
        };
    }

    async runTest(testName, testFunction) {
        console.log(`🧪 Running ${testName}...`);
        const startTime = Date.now();
        let browser, page;

        try {
            // Launch browser for each test to avoid session issues
            browser = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor'
                ]
            });

            page = await browser.newPage();
            
            // Set viewport
            await page.setViewport({ width: 1920, height: 1080 });

            const result = await testFunction(page);
            const duration = Date.now() - startTime;

            this.results.tests.push({
                name: testName,
                status: 'PASSED',
                duration: duration,
                result: result
            });

            console.log(`✅ ${testName} completed in ${duration}ms`);
            return result;

        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`❌ ${testName} failed:`, error.message);
            
            this.results.tests.push({
                name: testName,
                status: 'FAILED',
                duration: duration,
                error: error.message
            });
            
            this.results.errors.push(`${testName}: ${error.message}`);
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    async testBasicLoad(page) {
        const startTime = Date.now();
        
        // Navigate to the application
        const response = await page.goto(this.baseUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        const loadTime = Date.now() - startTime;
        const status = response.status();
        const title = await page.title();

        // Take screenshot
        await page.screenshot({
            path: path.join(this.screenshotDir, 'basic-load.png'),
            fullPage: true
        });

        return {
            url: this.baseUrl,
            status: status,
            statusOk: status === 200,
            title: title,
            loadTime: loadTime,
            screenshot: 'basic-load.png'
        };
    }

    async testUIElements(page) {
        await page.goto(this.baseUrl, { waitUntil: 'domcontentloaded' });
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check for various UI elements
        const elements = await page.evaluate(() => {
            // Check for branding
            const hasLogo = !!document.querySelector('img[src*="logo"], [alt*="logo"], [title*="logo"]');
            const hasBranding = document.body.innerText.toLowerCase().includes('librechat') ||
                              document.body.innerText.toLowerCase().includes('nxsgpt') ||
                              document.body.innerText.toLowerCase().includes('chat');

            // Check for login elements
            const hasEmailInput = !!document.querySelector('input[type="email"], input[name="email"]');
            const hasPasswordInput = !!document.querySelector('input[type="password"], input[name="password"]');
            const hasLoginButton = !!document.querySelector('button[type="submit"], button[name="login"], .login-button');

            // Check for navigation
            const hasNavigation = !!document.querySelector('nav, [role="navigation"], header');

            // Count interactive elements
            const buttonCount = document.querySelectorAll('button').length;
            const linkCount = document.querySelectorAll('a').length;
            const inputCount = document.querySelectorAll('input').length;

            return {
                hasLogo,
                hasBranding,
                hasEmailInput,
                hasPasswordInput,
                hasLoginButton,
                hasNavigation,
                buttonCount,
                linkCount,
                inputCount
            };
        });

        // Take screenshot
        await page.screenshot({
            path: path.join(this.screenshotDir, 'ui-elements.png'),
            fullPage: true
        });

        return {
            ...elements,
            screenshot: 'ui-elements.png'
        };
    }

    async testResponsiveDesign(page) {
        const viewports = [
            { name: 'desktop', width: 1920, height: 1080 },
            { name: 'tablet', width: 768, height: 1024 },
            { name: 'mobile', width: 375, height: 667 }
        ];

        const results = {};

        for (const viewport of viewports) {
            await page.setViewport(viewport);
            await page.goto(this.baseUrl, { waitUntil: 'domcontentloaded' });
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Check visibility of key elements
            const visibility = await page.evaluate(() => {
                const checkElementVisibility = (selector) => {
                    const element = document.querySelector(selector);
                    if (!element) return false;
                    const rect = element.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0;
                };

                return {
                    loginForm: checkElementVisibility('form, input[type="email"], input[type="password"]'),
                    navigation: checkElementVisibility('nav, header'),
                    mainContent: checkElementVisibility('main, .main, #main, .content')
                };
            });

            // Take screenshot
            const screenshotName = `responsive-${viewport.name}.png`;
            await page.screenshot({
                path: path.join(this.screenshotDir, screenshotName),
                fullPage: true
            });

            results[viewport.name] = {
                viewport: viewport,
                visibility: visibility,
                screenshot: screenshotName
            };
        }

        return results;
    }

    async testPerformance(page) {
        // Enable performance monitoring
        await page.setJavaScriptEnabled(true);
        
        const startTime = Date.now();
        
        // Navigate and measure performance
        await page.goto(this.baseUrl, { waitUntil: 'domcontentloaded' });
        
        const basicLoadTime = Date.now() - startTime;

        // Get performance metrics
        const metrics = await page.evaluate(() => {
            const perfData = performance.getEntriesByType('navigation')[0];
            const paintEntries = performance.getEntriesByType('paint');
            
            return {
                domContentLoaded: perfData ? perfData.domContentLoadedEventEnd - perfData.navigationStart : 0,
                loadComplete: perfData ? perfData.loadEventEnd - perfData.navigationStart : 0,
                firstPaint: paintEntries.length > 0 ? paintEntries[0].startTime : 0,
                resourceCount: performance.getEntriesByType('resource').length,
                documentReadyState: document.readyState
            };
        });

        // Check for console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        return {
            basicLoadTime: basicLoadTime,
            domContentLoaded: metrics.domContentLoaded,
            loadComplete: metrics.loadComplete,
            firstPaint: metrics.firstPaint,
            resourceCount: metrics.resourceCount,
            documentReadyState: metrics.documentReadyState,
            consoleErrors: consoleErrors
        };
    }

    async testAccessibility(page) {
        await page.goto(this.baseUrl, { waitUntil: 'domcontentloaded' });
        await new Promise(resolve => setTimeout(resolve, 2000));

        const accessibilityInfo = await page.evaluate(() => {
            // Check heading structure
            const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
                .map(h => ({ level: h.tagName, text: h.textContent.trim().substring(0, 50) }));

            // Check form accessibility
            const inputs = document.querySelectorAll('input, textarea, select');
            let labeledInputs = 0;
            
            inputs.forEach(input => {
                const hasLabel = input.id && document.querySelector(`label[for="${input.id}"]`);
                const hasAriaLabel = input.getAttribute('aria-label');
                const hasAriaLabelledBy = input.getAttribute('aria-labelledby');
                const hasPlaceholder = input.placeholder;
                
                if (hasLabel || hasAriaLabel || hasAriaLabelledBy || hasPlaceholder) {
                    labeledInputs++;
                }
            });

            // Check images
            const images = document.querySelectorAll('img');
            let imagesWithAlt = 0;
            images.forEach(img => {
                if (img.alt && img.alt.trim() !== '') {
                    imagesWithAlt++;
                }
            });

            // Check focusable elements
            const focusableElements = document.querySelectorAll(
                'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
            );

            return {
                headingCount: headings.length,
                headings: headings.slice(0, 5), // First 5 headings
                totalInputs: inputs.length,
                labeledInputs: labeledInputs,
                labelingPercentage: inputs.length > 0 ? Math.round((labeledInputs / inputs.length) * 100) : 0,
                totalImages: images.length,
                imagesWithAlt: imagesWithAlt,
                altTextPercentage: images.length > 0 ? Math.round((imagesWithAlt / images.length) * 100) : 0,
                focusableElements: focusableElements.length
            };
        });

        return accessibilityInfo;
    }

    async generateReport() {
        const passed = this.results.tests.filter(t => t.status === 'PASSED').length;
        const failed = this.results.tests.filter(t => t.status === 'FAILED').length;
        const total = this.results.tests.length;

        this.results.summary = {
            total: total,
            passed: passed,
            failed: failed,
            successRate: total > 0 ? Math.round((passed / total) * 100) : 0,
            totalErrors: this.results.errors.length
        };

        // Save detailed report
        await fs.writeFile(
            path.join(__dirname, 'test-report.json'),
            JSON.stringify(this.results, null, 2)
        );

        // Generate summary report
        const summary = `
# nxsGPT Browser Automation Test Report

**Generated:** ${this.results.timestamp}
**Application URL:** ${this.baseUrl}

## Summary
- **Total Tests:** ${total}
- **Passed:** ${passed}
- **Failed:** ${failed}
- **Success Rate:** ${this.results.summary.successRate}%
- **Errors:** ${this.results.errors.length}

## Test Results
${this.results.tests.map(test => `
### ${test.name}
- **Status:** ${test.status}
- **Duration:** ${test.duration}ms
${test.error ? `- **Error:** ${test.error}` : ''}
`).join('')}

## Screenshots Generated
- basic-load.png
- ui-elements.png
- responsive-desktop.png
- responsive-tablet.png
- responsive-mobile.png

${this.results.errors.length > 0 ? `
## Errors Encountered
${this.results.errors.map(error => `- ${error}`).join('\n')}
` : ''}
`;

        await fs.writeFile(
            path.join(__dirname, 'test-summary.md'),
            summary
        );

        return this.results;
    }

    async runAllTests() {
        console.log('🔬 Starting nxsGPT Simple Browser Test Suite\n');

        // Create screenshots directory
        await fs.mkdir(this.screenshotDir, { recursive: true });

        // Run all tests
        await this.runTest('Basic Load Test', this.testBasicLoad.bind(this));
        await this.runTest('UI Elements Test', this.testUIElements.bind(this));
        await this.runTest('Responsive Design Test', this.testResponsiveDesign.bind(this));
        await this.runTest('Performance Test', this.testPerformance.bind(this));
        await this.runTest('Accessibility Test', this.testAccessibility.bind(this));

        // Generate report
        const report = await this.generateReport();

        console.log('\n🎉 Test Suite Complete!');
        console.log(`📊 Results: ${report.summary.passed}/${report.summary.total} tests passed (${report.summary.successRate}%)`);
        console.log(`⚠️  Errors: ${report.summary.totalErrors}`);
        console.log('\n📁 Generated Files:');
        console.log('- Screenshots: browser-tests/screenshots/');
        console.log('- Detailed Report: browser-tests/test-report.json');
        console.log('- Summary Report: browser-tests/test-summary.md');

        return report;
    }
}

// Run the tests
if (require.main === module) {
    const tester = new SimpleBrowserTester();
    tester.runAllTests()
        .then(report => {
            process.exit(report.summary.failed > 0 ? 1 : 0);
        })
        .catch(error => {
            console.error('❌ Test suite failed:', error);
            process.exit(1);
        });
}

module.exports = SimpleBrowserTester;