const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class NxsGPTAutomationTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = {
            loadTest: {},
            uiValidation: {},
            responsiveTest: {},
            performanceTest: {},
            accessibilityTest: {},
            errors: []
        };
        this.screenshotDir = path.join(__dirname, 'screenshots');
        this.baseUrl = 'http://localhost:3080';
    }

    async initialize() {
        try {
            console.log('🚀 Initializing Puppeteer browser...');
            this.browser = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process',
                    '--disable-gpu'
                ]
            });
            this.page = await this.browser.newPage();
            
            // Enable console logging
            this.page.on('console', msg => {
                if (msg.type() === 'error') {
                    this.results.errors.push(`Console Error: ${msg.text()}`);
                }
            });

            // Enable error logging
            this.page.on('pageerror', error => {
                this.results.errors.push(`Page Error: ${error.message}`);
            });

            console.log('✅ Browser initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize browser:', error);
            this.results.errors.push(`Initialization Error: ${error.message}`);
            return false;
        }
    }

    async basicLoadTest() {
        console.log('\n📊 Running Basic Application Load Test...');
        const startTime = Date.now();
        
        try {
            // Navigate to the application
            const response = await this.page.goto(this.baseUrl, {
                waitUntil: 'networkidle0',
                timeout: 30000
            });

            const loadTime = Date.now() - startTime;
            
            // Check response status
            const status = response.status();
            const statusOk = status === 200;
            
            // Check page title
            const title = await this.page.title();
            const titleValid = title.toLowerCase().includes('nxsgpt') || 
                             title.toLowerCase().includes('librechat') ||
                             title.toLowerCase().includes('chat');
            
            // Take homepage screenshot
            await this.page.screenshot({
                path: path.join(this.screenshotDir, 'homepage.png'),
                fullPage: true
            });

            this.results.loadTest = {
                url: this.baseUrl,
                status: status,
                statusOk: statusOk,
                title: title,
                titleValid: titleValid,
                loadTime: loadTime,
                screenshot: 'homepage.png'
            };

            console.log(`✅ Load Test Complete:
                Status: ${status} (${statusOk ? 'OK' : 'FAIL'})
                Title: "${title}" (${titleValid ? 'Valid' : 'Invalid'})
                Load Time: ${loadTime}ms`);

        } catch (error) {
            console.error('❌ Load test failed:', error);
            this.results.errors.push(`Load Test Error: ${error.message}`);
            this.results.loadTest.failed = true;
        }
    }

    async uiElementValidation() {
        console.log('\n🎯 Running UI Element Validation...');
        
        try {
            // Wait for page to be fully loaded
            await this.page.waitForLoadState ? await this.page.waitForLoadState('networkidle') : await new Promise(resolve => setTimeout(resolve, 2000));

            // Check for nxsGPT branding
            const brandingElements = await this.page.$$eval('*', elements => {
                return elements.some(el => {
                    const text = el.textContent || '';
                    const src = el.src || '';
                    const alt = el.alt || '';
                    return text.toLowerCase().includes('nxsgpt') ||
                           text.toLowerCase().includes('librechat') ||
                           src.toLowerCase().includes('logo') ||
                           alt.toLowerCase().includes('logo');
                });
            });

            // Check for login/registration forms
            const loginForm = await this.page.$('form[action*="login"], input[type="email"], input[type="password"], button[type="submit"]') !== null;
            const emailInput = await this.page.$('input[type="email"], input[name="email"]') !== null;
            const passwordInput = await this.page.$('input[type="password"], input[name="password"]') !== null;

            // Check for navigation elements
            const navElements = await this.page.$$eval('nav, [role="navigation"], header', elements => elements.length > 0);
            const buttons = await this.page.$$eval('button', elements => elements.length);
            const links = await this.page.$$eval('a', elements => elements.length);

            // Take UI components screenshot
            await this.page.screenshot({
                path: path.join(this.screenshotDir, 'ui-components.png'),
                fullPage: true
            });

            this.results.uiValidation = {
                brandingPresent: brandingElements,
                loginFormPresent: loginForm,
                emailInputPresent: emailInput,
                passwordInputPresent: passwordInput,
                navigationPresent: navElements,
                buttonCount: buttons,
                linkCount: links,
                screenshot: 'ui-components.png'
            };

            console.log(`✅ UI Validation Complete:
                Branding: ${brandingElements ? 'Found' : 'Not Found'}
                Login Form: ${loginForm ? 'Present' : 'Missing'}
                Navigation: ${navElements ? 'Present' : 'Missing'}
                Buttons: ${buttons}, Links: ${links}`);

        } catch (error) {
            console.error('❌ UI validation failed:', error);
            this.results.errors.push(`UI Validation Error: ${error.message}`);
        }
    }

    async responsiveDesignTest() {
        console.log('\n📱 Running Responsive Design Test...');
        
        const viewports = [
            { name: 'desktop', width: 1920, height: 1080 },
            { name: 'tablet', width: 768, height: 1024 },
            { name: 'mobile', width: 375, height: 667 }
        ];

        const responsiveResults = {};

        for (const viewport of viewports) {
            try {
                console.log(`📏 Testing ${viewport.name} (${viewport.width}x${viewport.height})`);
                
                await this.page.setViewport({
                    width: viewport.width,
                    height: viewport.height
                });

                // Wait for layout to adjust
                await this.page.waitForTimeout(1000);

                // Check if elements are still accessible
                const elementsVisible = await this.page.evaluate(() => {
                    const buttons = document.querySelectorAll('button');
                    const inputs = document.querySelectorAll('input');
                    let visibleCount = 0;
                    
                    [...buttons, ...inputs].forEach(el => {
                        const rect = el.getBoundingClientRect();
                        if (rect.width > 0 && rect.height > 0) {
                            visibleCount++;
                        }
                    });
                    
                    return visibleCount;
                });

                // Take screenshot
                const screenshotPath = `responsive-${viewport.name}.png`;
                await this.page.screenshot({
                    path: path.join(this.screenshotDir, screenshotPath),
                    fullPage: true
                });

                responsiveResults[viewport.name] = {
                    viewport: viewport,
                    elementsVisible: elementsVisible,
                    screenshot: screenshotPath
                };

            } catch (error) {
                console.error(`❌ Responsive test failed for ${viewport.name}:`, error);
                this.results.errors.push(`Responsive Test Error (${viewport.name}): ${error.message}`);
            }
        }

        this.results.responsiveTest = responsiveResults;
        console.log('✅ Responsive Design Test Complete');
    }

    async performanceTest() {
        console.log('\n⚡ Running Performance Test...');
        
        try {
            // Reset to desktop viewport
            await this.page.setViewport({ width: 1920, height: 1080 });
            
            // Enable performance metrics
            await this.page.setJavaScriptEnabled(true);
            
            const startTime = Date.now();
            
            // Reload page and measure performance
            await this.page.reload({ waitUntil: 'networkidle0' });
            
            const loadTime = Date.now() - startTime;

            // Get performance metrics
            const performanceMetrics = await this.page.evaluate(() => {
                const perfData = performance.getEntriesByType('navigation')[0];
                return {
                    domContentLoaded: perfData.domContentLoadedEventEnd - perfData.navigationStart,
                    loadComplete: perfData.loadEventEnd - perfData.navigationStart,
                    firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
                    resourceCount: performance.getEntriesByType('resource').length
                };
            });

            // Check for JavaScript errors (already captured by event listeners)
            const jsErrors = this.results.errors.filter(err => err.includes('Console Error') || err.includes('Page Error'));

            this.results.performanceTest = {
                pageLoadTime: loadTime,
                domContentLoaded: performanceMetrics.domContentLoaded,
                loadComplete: performanceMetrics.loadComplete,
                firstPaint: performanceMetrics.firstPaint,
                resourceCount: performanceMetrics.resourceCount,
                javascriptErrors: jsErrors.length,
                errors: jsErrors
            };

            console.log(`✅ Performance Test Complete:
                Page Load: ${loadTime}ms
                DOM Ready: ${performanceMetrics.domContentLoaded.toFixed(2)}ms
                Resources: ${performanceMetrics.resourceCount}
                JS Errors: ${jsErrors.length}`);

        } catch (error) {
            console.error('❌ Performance test failed:', error);
            this.results.errors.push(`Performance Test Error: ${error.message}`);
        }
    }

    async accessibilityTest() {
        console.log('\n♿ Running Accessibility Test...');
        
        try {
            // Check heading structure
            const headings = await this.page.$$eval('h1, h2, h3, h4, h5, h6', elements => 
                elements.map(el => ({ tag: el.tagName, text: el.textContent.trim() }))
            );

            // Check form labels
            const formElements = await this.page.evaluate(() => {
                const inputs = document.querySelectorAll('input, textarea, select');
                let labeledInputs = 0;
                let totalInputs = inputs.length;

                inputs.forEach(input => {
                    const id = input.id;
                    const name = input.name;
                    const ariaLabel = input.getAttribute('aria-label');
                    const ariaLabelledBy = input.getAttribute('aria-labelledby');
                    const hasLabel = document.querySelector(`label[for="${id}"]`) !== null;
                    
                    if (hasLabel || ariaLabel || ariaLabelledBy || input.placeholder) {
                        labeledInputs++;
                    }
                });

                return { totalInputs, labeledInputs };
            });

            // Check for alt text on images
            const images = await this.page.evaluate(() => {
                const imgs = document.querySelectorAll('img');
                let totalImages = imgs.length;
                let imagesWithAlt = 0;

                imgs.forEach(img => {
                    if (img.alt && img.alt.trim() !== '') {
                        imagesWithAlt++;
                    }
                });

                return { totalImages, imagesWithAlt };
            });

            // Check keyboard navigation (basic test)
            const keyboardNavigation = await this.page.evaluate(() => {
                const focusableElements = document.querySelectorAll(
                    'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
                );
                return focusableElements.length;
            });

            this.results.accessibilityTest = {
                headings: {
                    count: headings.length,
                    structure: headings
                },
                formLabels: {
                    total: formElements.totalInputs,
                    labeled: formElements.labeledInputs,
                    percentage: formElements.totalInputs > 0 ? 
                        (formElements.labeledInputs / formElements.totalInputs * 100).toFixed(1) : 0
                },
                images: {
                    total: images.totalImages,
                    withAlt: images.imagesWithAlt,
                    percentage: images.totalImages > 0 ? 
                        (images.imagesWithAlt / images.totalImages * 100).toFixed(1) : 0
                },
                keyboardNavigation: {
                    focusableElements: keyboardNavigation
                }
            };

            console.log(`✅ Accessibility Test Complete:
                Headings: ${headings.length}
                Form Labels: ${formElements.labeledInputs}/${formElements.totalInputs}
                Image Alt Text: ${images.imagesWithAlt}/${images.totalImages}
                Focusable Elements: ${keyboardNavigation}`);

        } catch (error) {
            console.error('❌ Accessibility test failed:', error);
            this.results.errors.push(`Accessibility Test Error: ${error.message}`);
        }
    }

    async generateReport() {
        console.log('\n📋 Generating Test Report...');
        
        const report = {
            timestamp: new Date().toISOString(),
            testSuite: 'nxsGPT Browser Automation Test',
            baseUrl: this.baseUrl,
            results: this.results,
            summary: {
                totalTests: 5,
                passed: 0,
                failed: 0,
                warnings: this.results.errors.length
            }
        };

        // Calculate pass/fail status
        if (this.results.loadTest.statusOk) report.summary.passed++;
        else report.summary.failed++;

        if (this.results.uiValidation.brandingPresent && this.results.uiValidation.loginFormPresent) {
            report.summary.passed++;
        } else {
            report.summary.failed++;
        }

        if (Object.keys(this.results.responsiveTest).length === 3) report.summary.passed++;
        else report.summary.failed++;

        if (this.results.performanceTest.pageLoadTime < 10000) report.summary.passed++;
        else report.summary.failed++;

        if (this.results.accessibilityTest.headings.count > 0) report.summary.passed++;
        else report.summary.failed++;

        // Save report
        await fs.writeFile(
            path.join(__dirname, 'test-report.json'),
            JSON.stringify(report, null, 2)
        );

        return report;
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
            console.log('🧹 Browser closed');
        }
    }

    async runAllTests() {
        console.log('🔬 Starting nxsGPT Browser Automation Test Suite\n');
        
        const initialized = await this.initialize();
        if (!initialized) {
            return null;
        }

        try {
            await this.basicLoadTest();
            await this.uiElementValidation();
            await this.responsiveDesignTest();
            await this.performanceTest();
            await this.accessibilityTest();
            
            const report = await this.generateReport();
            
            console.log('\n🎉 Test Suite Complete!');
            console.log(`📊 Results: ${report.summary.passed}/${report.summary.totalTests} tests passed`);
            console.log(`⚠️  Warnings: ${report.summary.warnings} issues found`);
            
            return report;
        } finally {
            await this.cleanup();
        }
    }
}

// Run the tests
if (require.main === module) {
    const tester = new NxsGPTAutomationTester();
    tester.runAllTests()
        .then(report => {
            if (report) {
                console.log('\n📁 Files generated:');
                console.log('- Screenshots: browser-tests/screenshots/');
                console.log('- Report: browser-tests/test-report.json');
                process.exit(report.summary.failed > 0 ? 1 : 0);
            } else {
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('❌ Test suite failed:', error);
            process.exit(1);
        });
}

module.exports = NxsGPTAutomationTester;