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

## Changelog
- June 27, 2025. Initial setup

## User Preferences
Preferred communication style: Simple, everyday language.