#!/bin/bash

# Test bulk delete functionality

echo "🧪 Testing Bulk Delete Functionality"
echo "===================================="

# Get current allowances
echo "📋 Current allowances:"
curl -s http://localhost:3000/api/allowances | jq -r '.[] | "   - \(.name) (\(.id))"'

# Get the first two IDs for testing
IDS=($(curl -s http://localhost:3000/api/allowances | jq -r '.[0:2] | .[] | .id'))

if [ ${#IDS[@]} -ge 2 ]; then
    echo ""
    echo "🎯 Testing bulk delete for 2 allowances:"
    echo "   - ID 1: ${IDS[0]}"
    echo "   - ID 2: ${IDS[1]}"
    
    # Delete first allowance
    echo ""
    echo "🗑️  Deleting allowance 1..."
    curl -s -X DELETE http://localhost:3000/api/allowances/${IDS[0]} | jq -r '.message // .error'
    
    # Delete second allowance  
    echo "🗑️  Deleting allowance 2..."
    curl -s -X DELETE http://localhost:3000/api/allowances/${IDS[1]} | jq -r '.message // .error'
    
    echo ""
    echo "📋 Remaining allowances:"
    curl -s http://localhost:3000/api/allowances | jq -r '.[] | "   - \(.name) (\(.id))"'
    
else
    echo "❌ Not enough allowances to test bulk delete"
fi
