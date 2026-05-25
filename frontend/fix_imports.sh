#!/bin/bash
# Fix useNotify imports

cd "$(dirname "$0")"

# List of files with broken imports
files=(
  "src/app/dashboard/billing/invoices/page.tsx"
  "src/app/dashboard/customers/page.tsx"
  "src/app/dashboard/tickets/page.tsx"
  "src/components/billing/BillingPlanForm.tsx"
  "src/components/outages/OutageForm.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Fixing $file"
    # Fix the broken import syntax
    sed -i 's/import { useNotify from "/import { useNotify } from "/g' "$file"
    sed -i 's/import { useCustomers, useNotify from "/import { useCustomers } from "@\/lib\/store";\nimport { useNotify } from "/g' "$file"
  fi
done

echo "Import fixes completed"