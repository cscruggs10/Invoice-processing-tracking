# Invoice Processing System

## Overview
This is a full-stack web application for processing vendor invoices with automated VIN lookup capabilities. The system handles the complete workflow from invoice upload through data entry, review, approval, and export. Built with React frontend, Express backend, PostgreSQL database, and deployed on Replit.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state
- **UI Framework**: Radix UI components with Tailwind CSS (shadcn/ui)
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite with custom configuration

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL
- **File Uploads**: Multer middleware for handling file uploads
- **Session Management**: Basic authentication (placeholder for proper sessions)

### Database Design
- **Provider**: PostgreSQL (Neon Database via @neondatabase/serverless)
- **Schema Management**: Drizzle Kit for migrations
- **Tables**: Users, invoices, uploaded files, audit logs, and inventory databases

## Key Components

### User Management
- Role-based access control (user, admin)
- Basic authentication system
- User tracking throughout invoice workflow

### Invoice Processing Workflow
1. **Upload**: File upload with validation (PDF, JPEG, PNG, max 10MB)
2. **Data Entry**: Manual invoice data entry with VIN lookup
3. **Review**: Validation and approval by reviewers
4. **Admin Review**: Special handling for VIN lookup failures
5. **Export**: CSV generation for approved invoices

### VIN Lookup System
- Automated lookup against multiple inventory databases
- Fallback to manual GL code assignment for failed lookups
- Tracking of lookup results and database sources

### File Management
- Secure file upload to local filesystem
- File metadata tracking in database
- Support for multiple file formats

## Data Flow

### Invoice Lifecycle
1. User uploads invoice documents
2. System creates invoice record with "pending_entry" status
3. Data entry operator fills invoice details and submits
4. VIN lookup automatically determines GL code assignment
5. Invoice moves to appropriate review queue based on lookup results
6. Reviewers approve or reject invoices
7. Approved invoices are available for CSV export
8. Export process finalizes invoices and generates downloadable CSV

### VIN Lookup Flow
- Extract last 8 digits of VIN from invoice
- Search across wholesale, retail, sold, and current account databases
- Return database match and days since last update
- Failed lookups require manual admin review

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Database ORM and query builder
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: UI component primitives
- **multer**: File upload handling
- **wouter**: Client-side routing

### Development Tools
- **vite**: Build tool and dev server
- **tsx**: TypeScript execution for development
- **tailwindcss**: Utility-first CSS framework
- **drizzle-kit**: Database schema management

## Deployment Strategy

### Replit Configuration
- **Modules**: Node.js 20, Web, PostgreSQL 16
- **Run Command**: `npm run dev` for development
- **Build Process**: Vite build for frontend, esbuild for backend
- **Production Command**: `npm run start`

### Environment Setup
- Database URL required via `DATABASE_URL` environment variable
- Static file serving from built frontend
- Automatic port detection for deployment

### File Structure
```
/client          # React frontend application
/server          # Express backend application
/shared          # Shared TypeScript definitions and schemas
/uploads         # File upload storage directory
/migrations      # Database migration files
```

## Recent Changes
- July 7, 2025: Completed Supabase database migration with full vendor database
  - Successfully imported 703 vendors from user's CSV file to persistent database
  - Integrated professional vendor autocomplete selection in data entry forms
  - Created admin user (username: admin, password: admin123) and data entry user in database
  - Fixed file upload foreign key constraint error by ensuring proper user references
  - Vendor selection now uses typeahead search with automatic population of vendor name and number
  - System now fully operational with persistent PostgreSQL database via Supabase

- July 1, 2025: Fixed critical data entry form submission and duplicate invoice issues
  - Fixed form submission button functionality - buttons now work correctly with proper event handling
  - Fixed server-side status routing - server now respects frontend status instead of overriding with VIN lookup logic
  - Fixed duplicate invoice creation - data entry now updates existing uploaded invoices instead of creating new ones
  - Added proper error handling and debugging logs for invoice creation/update process
  - Moved VIN lookup logic to export stage as designed, preventing premature admin review routing
  - System now correctly routes invoices to pending_review status when submitted from data entry

- July 1, 2025: Implemented simplified multiple vehicle data entry workflow
  - Created VehicleSelectionForm for choosing single or multiple vehicles
  - Added MultiVehicleEntryForm with progress tracking for multiple vehicles
  - Each vehicle gets identical invoice data entry form with invoice document preview
  - SimpleInvoiceForm component for streamlined data entry without complex billing lines
  - Data entry person can see invoice document for each vehicle form
  - Each completed form creates separate invoice line for approval/export
  - Progress indicators show completed vs remaining vehicles
  - Workflow matches actual business process: select vehicle count → duplicate forms

- June 28, 2025: Added comprehensive admin review functionality
  - Created AdminEditModal component with full invoice editing capabilities
  - Added GL code assignment dropdown with common codes (1400, 2100, 2200, 2300, 2400)
  - Implemented "Send to Admin Review" button in data entry form
  - Admin can edit all invoice fields and assign GL codes before approval
  - Fixed date validation errors in invoice creation API
  - Enhanced workflow with direct admin review routing option

## Changelog
- June 27, 2025. Initial setup

## User Preferences
Preferred communication style: Simple, everyday language.