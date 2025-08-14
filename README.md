# Invoice Tracker

A full-stack invoice tracking application built with React, Express, and PostgreSQL.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, TailwindCSS, shadcn/ui
- **Backend**: Express.js, TypeScript, Drizzle ORM
- **Database**: PostgreSQL
- **Authentication**: Passport.js with session management
- **File Uploads**: Multer

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn

## Local Development Setup

1. **Clone the repository** (already done)

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env.example` to `.env`
   - Update the `DATABASE_URL` with your PostgreSQL connection string
   - Generate a secure `SESSION_SECRET` for production

4. **Set up the database**
   ```bash
   # Create the database (if not exists)
   createdb invoice_tracker

   # Run migrations
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5000`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Run production server
- `npm run check` - TypeScript type checking
- `npm run db:push` - Apply database schema changes

## Project Structure

```
├── client/               # React frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom React hooks
│   │   └── lib/          # Utilities and types
├── server/               # Express backend
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # API routes
│   └── storage.ts        # Database operations
├── shared/               # Shared types and schema
│   └── schema.ts         # Drizzle schema definitions
└── migrations/           # Database migrations
```

## Features

- Invoice upload and management
- Multi-vehicle invoice entry
- Vendor management
- Review and approval workflow
- Export functionality
- Search and filtering

## Deployment to Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` and follow the prompts
3. Set environment variables in Vercel dashboard:
   - `DATABASE_URL` - Your production PostgreSQL URL
   - `SESSION_SECRET` - A secure random string
   - `NODE_ENV` - Set to "production"

## Database Setup (PostgreSQL)

If you need to set up a local PostgreSQL database:

### macOS
```bash
brew install postgresql
brew services start postgresql
createdb invoice_tracker
```

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres createdb invoice_tracker
```

### Windows
Download and install PostgreSQL from https://www.postgresql.org/download/windows/

## License

MIT