#!/bin/bash
# Test runner script for CMS backend

echo "Running CMS backend tests..."
echo "============================"

# Run all tests
python -m pytest test_*.py -v

# Check if tests passed
if [ $? -eq 0 ]; then
    echo "✅ All tests passed!"
else
    echo "❌ Some tests failed!"
    exit 1
fi