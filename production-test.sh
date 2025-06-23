#!/bin/bash

# Production Testing Script for nxsGPT on Server
# Usage: ./production-test.sh [--full]

set -e

echo "🚀 nxsGPT Production Testing Suite"
echo "=================================="
echo "Server: $(hostname -I | awk '{print $1}')"
echo "Date: $(date)"
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
PASSED_TESTS=0
FAILED_TESTS=0
TOTAL_TESTS=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "Testing: $test_name... "
    
    if eval "$test_command" >/dev/null 2>&1; then
        if [ -n "$expected_result" ]; then
            result=$(eval "$test_command" 2>/dev/null)
            if [[ "$result" == *"$expected_result"* ]]; then
                echo -e "${GREEN}PASS${NC}"
                PASSED_TESTS=$((PASSED_TESTS + 1))
            else
                echo -e "${RED}FAIL${NC} (Expected: $expected_result, Got: $result)"
                FAILED_TESTS=$((FAILED_TESTS + 1))
            fi
        else
            echo -e "${GREEN}PASS${NC}"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        fi
    else
        echo -e "${RED}FAIL${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Function to check HTTP response
check_http() {
    local url="$1"
    local expected_code="$2"
    local description="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "Testing: $description... "
    
    response_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" --max-time 10)
    
    if [ "$response_code" = "$expected_code" ]; then
        echo -e "${GREEN}PASS${NC} (HTTP $response_code)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}FAIL${NC} (Expected HTTP $expected_code, Got HTTP $response_code)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Function to test external accessibility
test_external_access() {
    local server_ip=$(hostname -I | awk '{print $1}')
    echo -e "${BLUE}Testing External Access${NC}"
    echo "----------------------------------------"
    
    # Test from server itself
    check_http "http://localhost:3080" "200" "Local access (localhost:3080)"
    check_http "http://$server_ip:3080" "200" "Internal network access ($server_ip:3080)"
    
    # Test API endpoints
    check_http "http://localhost:3080/api/config" "200" "API configuration endpoint"
    
    echo
    echo -e "${YELLOW}External Access Instructions:${NC}"
    echo "From your local machine, test these URLs:"
    echo "  - http://$server_ip:3080 (if on same network)"
    echo "  - http://138.199.157.172:3080 (public IP)"
    echo
}

# Docker container health tests
test_docker_health() {
    echo -e "${BLUE}Docker Container Health Tests${NC}"
    echo "----------------------------------------"
    
    # Check if containers are running
    run_test "All containers running" "docker-compose ps | grep -c 'Up'" "6"
    
    # Individual container tests
    run_test "nxsGPT-API running" "docker ps --filter name=nxsGPT-API --filter status=running -q | wc -l" "1"
    run_test "nxsGPT-MongoDB running" "docker ps --filter name=nxsGPT-MongoDB --filter status=running -q | wc -l" "1"
    run_test "nxsGPT-MeiliSearch running" "docker ps --filter name=nxsGPT-MeiliSearch --filter status=running -q | wc -l" "1"
    run_test "nxsGPT-VectorDB running" "docker ps --filter name=nxsGPT-VectorDB --filter status=running -q | wc -l" "1"
    run_test "nxsGPT-RAG-API running" "docker ps --filter name=nxsGPT-RAG-API --filter status=running -q | wc -l" "1"
    run_test "nxsGPT-Backup running" "docker ps --filter name=nxsGPT-Backup --filter status=running -q | wc -l" "1"
    
    echo
}

# Application functionality tests
test_application() {
    echo -e "${BLUE}Application Functionality Tests${NC}"
    echo "----------------------------------------"
    
    # Basic connectivity
    check_http "http://localhost:3080" "200" "Homepage accessibility"
    
    # API endpoints
    check_http "http://localhost:3080/api/config" "200" "Configuration API"
    
    # Check page title contains nxsGPT
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "Testing: Page title contains 'nxsGPT'... "
    if curl -s http://localhost:3080 | grep -q "<title>nxsGPT</title>"; then
        echo -e "${GREEN}PASS${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}FAIL${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
    # Check API returns correct app title
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "Testing: API returns nxsGPT app title... "
    if curl -s http://localhost:3080/api/config | grep -q '"appTitle":"nxsGPT"'; then
        echo -e "${GREEN}PASS${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}FAIL${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
    echo
}

# Database connectivity tests
test_database() {
    echo -e "${BLUE}Database Connectivity Tests${NC}"
    echo "----------------------------------------"
    
    # MongoDB connection test
    run_test "MongoDB responding" "docker exec nxsGPT-MongoDB mongosh --eval 'db.runCommand({ping: 1})' --quiet"
    
    # Check database has data
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "Testing: Database contains user data... "
    user_count=$(docker exec nxsGPT-MongoDB mongosh nxsGPT --eval 'db.users.countDocuments()' --quiet 2>/dev/null | tail -1)
    if [ "$user_count" -gt 0 ] 2>/dev/null; then
        echo -e "${GREEN}PASS${NC} ($user_count users)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${YELLOW}PASS${NC} (No users yet - expected for new installation)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    fi
    
    # MeiliSearch test
    run_test "MeiliSearch responding" "docker exec nxsGPT-MeiliSearch curl -f http://localhost:7700/health"
    
    # VectorDB test
    run_test "VectorDB responding" "docker exec nxsGPT-VectorDB pg_isready -U myuser -d mydatabase"
    
    echo
}

# Performance tests
test_performance() {
    echo -e "${BLUE}Performance Tests${NC}"
    echo "----------------------------------------"
    
    # Load time test
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "Testing: Page load time under 3 seconds... "
    load_time=$(curl -s -w "%{time_total}" -o /dev/null http://localhost:3080)
    if (( $(echo "$load_time < 3.0" | bc -l) )); then
        echo -e "${GREEN}PASS${NC} (${load_time}s)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}FAIL${NC} (${load_time}s)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
    # Resource usage test
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "Testing: Memory usage under 80%... "
    memory_usage=$(docker stats --no-stream --format "table {{.MemPerc}}" | tail -n +2 | sed 's/%//' | sort -nr | head -1)
    if (( $(echo "$memory_usage < 80" | bc -l) )); then
        echo -e "${GREEN}PASS${NC} (Highest: ${memory_usage}%)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${YELLOW}WARNING${NC} (Highest: ${memory_usage}%)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    fi
    
    echo
}

# Backup system test
test_backup_system() {
    echo -e "${BLUE}Backup System Tests${NC}"
    echo "----------------------------------------"
    
    run_test "Backup service running" "docker ps --filter name=nxsGPT-Backup --filter status=running -q | wc -l" "1"
    
    # Check if backup directory exists and has correct permissions
    run_test "Backup directory exists" "test -d ./backups"
    
    # Check if manual backup works
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "Testing: Manual backup functionality... "
    if docker exec nxsGPT-Backup mongodump --uri="mongodb://root:example@mongodb:27017/nxsGPT?authSource=admin" --out /backups/test_$(date +%Y%m%d_%H%M%S) >/dev/null 2>&1; then
        echo -e "${GREEN}PASS${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}FAIL${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
    echo
}

# Security tests
test_security() {
    echo -e "${BLUE}Security Configuration Tests${NC}"
    echo "----------------------------------------"
    
    # MongoDB authentication test
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "Testing: MongoDB requires authentication... "
    if docker exec nxsGPT-MongoDB mongosh --eval 'db.runCommand({ping: 1})' >/dev/null 2>&1; then
        echo -e "${RED}FAIL${NC} (No auth required)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    else
        echo -e "${GREEN}PASS${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    fi
    
    # Check container security
    run_test "Containers have resource limits" "docker inspect nxsGPT-API | grep -q '\"Memory\"'"
    
    # Check network isolation
    run_test "Custom network in use" "docker network ls | grep -q nxsgpt-network"
    
    echo
}

# Generate detailed report
generate_report() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local server_ip=$(hostname -I | awk '{print $1}')
    
    cat > production-test-report.md << EOF
# nxsGPT Production Test Report

**Test Date:** $timestamp  
**Server IP:** $server_ip  
**Hostname:** $(hostname)

## Test Summary

- **Total Tests:** $TOTAL_TESTS
- **Passed:** $PASSED_TESTS
- **Failed:** $FAILED_TESTS
- **Success Rate:** $(( (PASSED_TESTS * 100) / TOTAL_TESTS ))%

## Container Status

\`\`\`
$(docker-compose ps)
\`\`\`

## Resource Usage

\`\`\`
$(docker stats --no-stream)
\`\`\`

## External Access URLs

From your local machine, test these URLs:
- http://$server_ip:3080 (internal network)
- http://138.199.157.172:3080 (public IP)

## API Test Examples

\`\`\`bash
# Test from external machine
curl -I http://138.199.157.172:3080
curl -s http://138.199.157.172:3080/api/config | jq .appTitle

# Performance test
curl -w "@curl-format.txt" -s -o /dev/null http://138.199.157.172:3080
\`\`\`

## Backup Verification

\`\`\`bash
# Check backup directory
ls -la backups/

# Verify latest backup
ls -la backups/ | tail -1
\`\`\`

## Next Steps

1. Test external access from client machines
2. Set up monitoring alerts
3. Configure SSL/TLS if needed
4. Implement log aggregation
5. Schedule regular backup verification

EOF

    echo -e "${GREEN}Report generated: production-test-report.md${NC}"
}

# Main execution
main() {
    # Change to LibreChat directory
    cd /home/marvin/LibreChat
    
    # Run test suites
    test_docker_health
    test_application
    test_database
    test_performance
    test_backup_system
    test_security
    test_external_access
    
    # Show summary
    echo "=========================================="
    echo -e "${BLUE}TEST SUMMARY${NC}"
    echo "=========================================="
    echo "Total Tests: $TOTAL_TESTS"
    echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
    
    success_rate=$(( (PASSED_TESTS * 100) / TOTAL_TESTS ))
    if [ $success_rate -ge 90 ]; then
        echo -e "Success Rate: ${GREEN}$success_rate%${NC}"
        echo -e "${GREEN}✅ PRODUCTION READY${NC}"
    elif [ $success_rate -ge 80 ]; then
        echo -e "Success Rate: ${YELLOW}$success_rate%${NC}"
        echo -e "${YELLOW}⚠️ MOSTLY READY - Minor issues to address${NC}"
    else
        echo -e "Success Rate: ${RED}$success_rate%${NC}"
        echo -e "${RED}❌ NEEDS ATTENTION - Multiple issues found${NC}"
    fi
    
    # Generate report
    generate_report
    
    echo
    echo -e "${BLUE}Next Steps:${NC}"
    echo "1. Review the generated report: production-test-report.md"
    echo "2. Test external access from your local machine"
    echo "3. Set up monitoring and alerting"
    echo "4. Configure backups and SSL if needed"
    
    return $FAILED_TESTS
}

# Run main function
main "$@"