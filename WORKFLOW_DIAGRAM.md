# Invoice Management System - Workflow Diagram

## Overview
This document provides a complete workflow structure for creating a Miro board visualization of the invoice processing system.

## Main Workflow Stages

### 1. INVOICE UPLOAD
**Actor:** User/Vendor
**Actions:**
- Upload invoice files (PDF, JPEG, PNG)
- System validates file format and size (max 10MB)
- System creates invoice record with "pending_entry" status
- Files stored in uploads directory

**Transitions:**
- Success → Data Entry Queue
- Validation Error → Upload Error (retry)

### 2. DATA ENTRY
**Actor:** Data Entry Operator
**Actions:**
- Select invoice from pending entry queue
- Fill invoice details form:
  - Vendor Name & Number
  - Invoice Number & Date
  - Invoice Amount
  - VIN (last 8 digits)
  - Invoice Type
  - Due Date
  - Description (optional)
- System performs automatic VIN lookup
- Submit for review

**VIN Lookup Process:**
- Search wholesale_inventory → Found: GL Code 1400, Status: "pending_review"
- Search retail_inventory → Found: GL Code 1400, Status: "pending_review"  
- Search sold_inventory → Found: Status: "admin_review"
- Search current_account → Found: Status: "admin_review"
- Not Found → Status: "admin_review"

**Transitions:**
- VIN found in wholesale/retail → Review Queue
- VIN found in sold/current OR not found → Admin Review Queue

### 3. REVIEW QUEUE
**Actor:** Reviewer
**Actions:**
- View invoices with automatic GL code assignment (1400)
- Review invoice details and attachments
- Approve or reject invoice
- Add comments if needed

**Transitions:**
- Approve → Ready for Export
- Reject → Back to Data Entry (with comments)

### 4. ADMIN REVIEW QUEUE
**Actor:** Administrator
**Actions:**
- Review invoices with VIN lookup failures
- Manually assign GL codes
- Review sold/current account matches
- Approve or reject with manual GL code

**Transitions:**
- Approve with GL code → Ready for Export
- Reject → Back to Data Entry (with comments)

### 5. EXPORT QUEUE
**Actor:** Accounting Team
**Actions:**
- View all approved invoices ready for export
- Generate CSV export file
- Download CSV for accounting system import
- Mark invoices as "finalized"

**CSV Export Contains:**
- Invoice Number
- Vendor Details
- Invoice Amount
- GL Code
- VIN
- Approval Information
- Export Date

### 6. SEARCH & REPORTING
**Actor:** All Users
**Actions:**
- Search invoices by various criteria
- View audit trail
- Generate reports
- Track invoice status

## Status Flow Diagram

```
UPLOAD → pending_entry
   ↓
DATA ENTRY → VIN Lookup
   ↓
┌─ VIN Found (wholesale/retail) → pending_review → REVIEW → approved → EXPORT
└─ VIN Not Found/Other → admin_review → ADMIN REVIEW → approved → EXPORT
   
Rejections flow back to previous stage with comments
```

## User Roles & Permissions

### Data Entry Operator
- Access: Upload, Data Entry Queue
- Cannot: Review, Admin functions, Export

### Reviewer  
- Access: Review Queue, Search
- Cannot: Data Entry, Admin functions, Export

### Administrator
- Access: All queues, Admin Review, User management
- Cannot: Generate final exports (accounting only)

### Accounting Team
- Access: Export Queue, Search, Reports
- Cannot: Data entry, Review functions

## Key Business Rules

1. **VIN Lookup Logic:**
   - Wholesale/Retail inventory = GL Code 1400 (auto-approve to review)
   - Sold/Current account = Manual review required
   - Not found = Manual review required

2. **File Validation:**
   - Supported formats: PDF, JPEG, PNG
   - Maximum size: 10MB per file
   - Required: At least one file per invoice

3. **Required Fields:**
   - Vendor Name & Number
   - Invoice Number & Date  
   - Invoice Amount (must be > 0)
   - VIN (exactly 8 digits)
   - Invoice Type

4. **Approval Workflow:**
   - All invoices require review before export
   - Rejected invoices return to data entry with comments
   - Approved invoices cannot be modified

5. **Export Rules:**
   - Only approved invoices can be exported
   - Exported invoices are marked as finalized
   - CSV format includes all required accounting fields

## Dashboard Metrics

- **Total Pending:** Invoices in data entry queue
- **Ready to Export:** Approved invoices awaiting export
- **Today's Total:** New invoices uploaded today
- **Need Review:** Invoices in review/admin review queues

## Error Handling

- **Upload Errors:** File format/size validation failures
- **VIN Lookup Errors:** Database connection issues (retry logic)
- **Validation Errors:** Form field validation with user feedback
- **Export Errors:** CSV generation failures with error logging

## Audit Trail

Every action is logged with:
- User ID and timestamp
- Action performed
- Invoice ID affected
- Previous/new status
- Comments or notes

## Miro Board Structure Suggestions

### Swimlanes (Horizontal):
1. Upload & Data Entry
2. Review Process  
3. Admin Review
4. Export & Finalization

### Columns (Vertical):
1. Pending Entry
2. In Review
3. Admin Review
4. Ready for Export
5. Finalized

### Decision Points (Diamonds):
- VIN Lookup Results
- Review Approve/Reject
- Admin Review Approve/Reject

### Process Boxes (Rectangles):
- Upload Files
- Enter Data
- VIN Lookup
- Review Invoice
- Admin Review
- Generate Export
- Download CSV

### Data Stores (Cylinders):
- Invoice Database
- File Storage
- VIN Databases (Wholesale, Retail, Sold, Current)
- Audit Logs

This workflow represents a complete invoice processing system with automated VIN lookup, role-based approval workflows, and accounting system integration.