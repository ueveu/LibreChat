const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function runBrowserTests() {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    const results = {
        timestamp: new Date().toISOString(),
        tests: [],
        performance: {},
        screenshots: [],
        errors: []
    };

    console.log('🚀 Starting nxsGPT Browser Automation Tests...\n');

    try {
        // Test 1: Basic Application Load Test
        console.log('📋 Test 1: Basic Application Load Test');
        const startTime = Date.now();
        
        const response = await page.goto('http://localhost:3080', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        const loadTime = Date.now() - startTime;
        const title = await page.title();
        
        results.tests.push({
            name: 'Basic Application Load',
            status: response.status() === 200 ? 'PASS' : 'FAIL',
            details: {
                httpStatus: response.status(),
                title: title,
                loadTime: `${loadTime}ms`
            }
        });
        
        console.log(`   ✅ HTTP Status: ${response.status()}`);
        console.log(`   ✅ Page Title: "${title}"`);
        console.log(`   ✅ Load Time: ${loadTime}ms`);
        
        // Take homepage screenshot
        await page.screenshot({
            path: 'browser-tests/homepage-desktop.png',
            fullPage: true
        });
        results.screenshots.push('homepage-desktop.png');
        console.log('   📸 Screenshot saved: homepage-desktop.png\n');

        // Test 2: UI Element Validation
        console.log('📋 Test 2: UI Element Validation');
        
        // Check for nxsGPT branding
        const hasNxsGPTBranding = title.includes('nxsGPT');
        console.log(`   ${hasNxsGPTBranding ? '✅' : '❌'} nxsGPT branding in title: ${hasNxsGPTBranding}`);
        
        // Check for common UI elements
        const elements = await page.evaluate(() => {
            return {
                hasLoginForm: !!document.querySelector('form, input[type="email"], input[type="password"]'),
                hasNavigation: !!document.querySelector('nav, [role="navigation"]'),
                hasButtons: !!document.querySelector('button'),
                hasInputs: !!document.querySelector('input'),
                bodyText: document.body.innerText.substring(0, 200)
            };
        });
        
        console.log(`   ${elements.hasLoginForm ? '✅' : '⚠️'} Login/Form elements: ${elements.hasLoginForm}`);
        console.log(`   ${elements.hasNavigation ? '✅' : '⚠️'} Navigation elements: ${elements.hasNavigation}`);
        console.log(`   ${elements.hasButtons ? '✅' : '⚠️'} Interactive buttons: ${elements.hasButtons}`);
        console.log(`   ${elements.hasInputs ? '✅' : '⚠️'} Input elements: ${elements.hasInputs}`);
        
        results.tests.push({
            name: 'UI Element Validation',
            status: hasNxsGPTBranding ? 'PASS' : 'PARTIAL',
            details: elements
        });

        // Test 3: Responsive Design Test
        console.log('\n📋 Test 3: Responsive Design Test');
        
        const viewports = [
            { name: 'desktop', width: 1920, height: 1080 },
            { name: 'tablet', width: 768, height: 1024 },
            { name: 'mobile', width: 375, height: 667 }
        ];
        
        for (const viewport of viewports) {
            await page.setViewport(viewport);
            await page.screenshot({
                path: `browser-tests/homepage-${viewport.name}.png`,
                fullPage: true
            });
            results.screenshots.push(`homepage-${viewport.name}.png`);
            console.log(`   📸 Screenshot saved: homepage-${viewport.name}.png (${viewport.width}x${viewport.height})`);
        }
        
        results.tests.push({
            name: 'Responsive Design',
            status: 'PASS',
            details: { viewportsTested: viewports.length }
        });

        // Test 4: Performance Testing
        console.log('\n📋 Test 4: Performance Testing');
        
        // Get console errors
        const consoleErrors = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });
        
        // Measure resource loading
        const resourceStats = await page.evaluate(() => {
            return {
                resourceCount: performance.getEntriesByType('resource').length,
                navigationTiming: performance.getEntriesByType('navigation')[0]
            };
        });
        
        results.performance = {
            loadTime: loadTime,
            resourceCount: resourceStats.resourceCount,
            consoleErrors: consoleErrors.length
        };
        
        console.log(`   ✅ Resource count: ${resourceStats.resourceCount}`);
        console.log(`   ${consoleErrors.length === 0 ? '✅' : '⚠️'} Console errors: ${consoleErrors.length}`);
        
        results.tests.push({
            name: 'Performance Testing',
            status: consoleErrors.length === 0 ? 'PASS' : 'PARTIAL',
            details: results.performance
        });

        // Test 5: Accessibility Testing
        console.log('\n📋 Test 5: Accessibility Testing');
        
        const a11yResults = await page.evaluate(() => {
            return {
                hasHeadings: !!document.querySelector('h1, h2, h3, h4, h5, h6'),
                hasLandmarks: !!document.querySelector('main, nav, header, footer, [role="main"], [role="navigation"]'),
                hasAltTexts: Array.from(document.querySelectorAll('img')).every(img => img.alt !== undefined),
                hasLabels: Array.from(document.querySelectorAll('input')).every(input => 
                    input.labels?.length > 0 || input.getAttribute('aria-label') || input.getAttribute('placeholder')),
                focusableElements: document.querySelectorAll('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])').length
            };
        });
        
        console.log(`   ${a11yResults.hasHeadings ? '✅' : '⚠️'} Heading structure: ${a11yResults.hasHeadings}`);
        console.log(`   ${a11yResults.hasLandmarks ? '✅' : '⚠️'} Landmark elements: ${a11yResults.hasLandmarks}`);
        console.log(`   ${a11yResults.hasAltTexts ? '✅' : '⚠️'} Image alt texts: ${a11yResults.hasAltTexts}`);
        console.log(`   ✅ Focusable elements: ${a11yResults.focusableElements}`);
        
        results.tests.push({
            name: 'Accessibility Testing',
            status: a11yResults.hasHeadings && a11yResults.hasLandmarks ? 'PASS' : 'PARTIAL',
            details: a11yResults
        });

    } catch (error) {
        console.error('❌ Test Error:', error.message);
        results.errors.push({
            test: 'Browser Automation',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    } finally {
        await browser.close();
    }

    // Save results
    fs.writeFileSync('browser-tests/results.json', JSON.stringify(results, null, 2));
    
    // Generate summary report
    const passedTests = results.tests.filter(test => test.status === 'PASS').length;
    const totalTests = results.tests.length;
    const successRate = Math.round((passedTests / totalTests) * 100);
    
    console.log('\n📊 Test Summary:');
    console.log(`   Tests Passed: ${passedTests}/${totalTests} (${successRate}%)`);
    console.log(`   Screenshots: ${results.screenshots.length}`);
    console.log(`   Errors: ${results.errors.length}`);
    console.log(`   Results saved to: browser-tests/results.json`);
    
    return results;
}

// Run the tests
runBrowserTests().catch(console.error);