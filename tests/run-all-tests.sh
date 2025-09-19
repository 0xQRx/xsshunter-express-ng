#!/bin/bash

# Test runner script for XSS Hunter Express
# This script runs all available tests and provides a summary

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test statistics
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Function to print a separator
print_separator() {
    echo "================================================================"
}

# Function to print test header
print_test_header() {
    local test_name=$1
    echo ""
    print_separator
    echo -e "${CYAN}Running: ${test_name}${NC}"
    print_separator
}

# Function to run a single test
run_test() {
    local test_file=$1
    local test_name=$(basename "$test_file")

    print_test_header "$test_name"

    # Check if test file exists
    if [ ! -f "$test_file" ]; then
        echo -e "${YELLOW}[SKIP]${NC} Test file not found: $test_file"
        ((SKIPPED_TESTS++))
        return
    fi

    # Check if test file is executable
    if [ ! -x "$test_file" ]; then
        # Make it executable
        chmod +x "$test_file"
    fi

    # Run the test and capture output and exit code
    output=$(node "$test_file" 2>&1)
    exit_code=$?

    # Display test output
    echo "$output"

    # Check test result
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}[PASS]${NC} $test_name completed successfully"
        ((PASSED_TESTS++))
    else
        echo -e "${RED}[FAIL]${NC} $test_name failed with exit code: $exit_code"
        ((FAILED_TESTS++))
    fi

    ((TOTAL_TESTS++))
}

# Function to print summary
print_summary() {
    echo ""
    print_separator
    echo -e "${BLUE}TEST SUMMARY${NC}"
    print_separator
    echo -e "Total Tests:   ${TOTAL_TESTS}"
    echo -e "Passed:        ${GREEN}${PASSED_TESTS}${NC}"
    echo -e "Failed:        ${RED}${FAILED_TESTS}${NC}"
    echo -e "Skipped:       ${YELLOW}${SKIPPED_TESTS}${NC}"

    # Calculate pass rate
    if [ $TOTAL_TESTS -gt 0 ]; then
        PASS_RATE=$(echo "scale=2; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc -l 2>/dev/null || echo "N/A")
        echo -e "Pass Rate:     ${PASS_RATE}%"
    fi

    print_separator

    # Return appropriate exit code
    if [ $FAILED_TESTS -gt 0 ]; then
        echo -e "${RED}TESTS FAILED${NC}"
        return 1
    else
        echo -e "${GREEN}ALL TESTS PASSED${NC}"
        return 0
    fi
}

# Main execution
main() {
    echo -e "${BLUE}XSS Hunter Express Test Suite${NC}"
    echo -e "${BLUE}Starting test run at: $(date)${NC}"
    print_separator

    # Check if we're in the tests directory
    if [ ! -d "$SCRIPT_DIR" ]; then
        echo -e "${RED}[ERROR]${NC} Tests directory not found"
        exit 1
    fi

    # Change to tests directory
    cd "$SCRIPT_DIR"

    # Check if Node.js is available
    if ! command -v node &> /dev/null; then
        echo -e "${RED}[ERROR]${NC} Node.js is not installed or not in PATH"
        exit 1
    fi

    echo -e "${GREEN}[INFO]${NC} Using Node.js version: $(node -v)"
    echo ""

    # Define test order (can be customized)
    TEST_FILES=(
        "test-validation.js"
        "test-callback-validation.js"
        "test-reject-malformed.js"
        "test-auth.js"
        "test-session-config.js"
        "test-error-production.js"
        "test-payload-server-errors.js"
    )

    # Check if specific test was requested
    if [ "$1" != "" ]; then
        if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
            echo "Usage: $0 [test-name]"
            echo ""
            echo "Run all tests or a specific test"
            echo ""
            echo "Examples:"
            echo "  $0                    # Run all tests"
            echo "  $0 test-validation.js # Run specific test"
            echo "  $0 --list            # List all available tests"
            echo ""
            exit 0
        elif [ "$1" == "--list" ] || [ "$1" == "-l" ]; then
            echo "Available tests:"
            for test in "${TEST_FILES[@]}"; do
                if [ -f "$test" ]; then
                    echo "  - $test"
                fi
            done
            exit 0
        else
            # Run specific test
            if [ -f "$1" ]; then
                run_test "$1"
            else
                echo -e "${RED}[ERROR]${NC} Test file not found: $1"
                exit 1
            fi
        fi
    else
        # Run all tests
        for test_file in "${TEST_FILES[@]}"; do
            if [ -f "$test_file" ]; then
                run_test "$test_file"
            else
                echo -e "${YELLOW}[WARN]${NC} Test file not found: $test_file"
                ((SKIPPED_TESTS++))
            fi
        done
    fi

    # Print summary
    print_summary
    exit_code=$?

    echo -e "${BLUE}Test run completed at: $(date)${NC}"

    exit $exit_code
}

# Run main function with all arguments
main "$@"