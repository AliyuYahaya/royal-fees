# Royal Fees - Student Fee Management System

A comprehensive student fee management system built with React, TypeScript, Tailwind CSS, and Supabase.

## Features

- **User Authentication** - Secure login with role-based access control
- **Student Management** - Add, edit, and manage student records
- **Fee Structure** - Configure fees by class and academic session
- **Invoice Generation** - Create and manage student invoices
- **Payment Processing** - Record and track fee payments
- **Reports** - Generate comprehensive financial reports
- **Historical Data** - Access records from previous academic years
- **Role-based Access** - Admin, Registrar, and Payment Desk Officer roles

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **State Management**: Zustand
- **Routing**: React Router DOM
- **Forms**: React Hook Form with Zod validation
- **Containerization**: Docker

## User Roles

### Admin
- Full system access
- User management
- Fee structure configuration
- Complete reports and analytics

### Registrar
- Student management (add/edit/remove)
- Fee structure configuration
- Invoice generation
- Financial reports

### Payment Desk Officer
- Student search
- Invoice selection and printing
- Payment recording
- Mark invoices as paid

## Project Structure

```
royal-fees/
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── auth/          # Authentication components
│   │   ├── layout/        # Layout components
│   │   └── ui/            # shadcn/ui components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility libraries
│   ├── pages/             # Page components
│   ├── store/             # Zustand store
│   └── types/             # TypeScript type definitions
├── supabase/              # Database setup scripts
├── docker/                # Docker configuration
└── public/                # Static assets
```

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Supabase account

### 1. Clone and Install

```bash
git clone <repository-url>
cd royal-fees
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 3. Database Setup

1. Create a new Supabase project
2. Run the SQL script in `supabase/setup.sql` in your Supabase SQL editor
3. Configure Row Level Security policies as needed

### 4. Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint
```

### 5. Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Stop services
docker-compose down
```

## Class Levels Supported

- **Early Years**: Pre-Creche, Nursery 1-2
- **Primary**: Primary 1-6
- **Junior Secondary**: JSS 1-3
- **Senior Secondary**: SSS 1-3

## Key Features

### Student Management
- Complete student profiles with parent/guardian information
- Class level assignment and tracking
- Payment term configuration (annual or per-term)
- Student search and filtering

### Fee Management
- Flexible fee structure by class and term
- Special exam fees (NECO, WAEC, JSS3, Primary 6 exams)
- Invoice generation with itemized breakdown
- Payment tracking and receipt generation

### Reporting
- Outstanding fees reports
- Payment collection summaries
- Historical data access (e.g., all 2023 records)
- Export capabilities (PDF, CSV, Excel)

### Security
- Role-based access control
- Secure authentication with Supabase Auth
- Activity logging and audit trails
- Data validation and sanitization

## Color Scheme

- **Primary**: #0CC0DF (Cyan Blue)
- **Secondary**: #0097B2 (Dark Cyan)
- **Accent colors derived from primary palette**

## API Integration

The application uses Supabase for:
- **Authentication**: User login/logout with role management
- **Database**: PostgreSQL with real-time subscriptions
- **Storage**: File uploads for documents and receipts
- **Row Level Security**: Fine-grained access control

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support or questions, please contact the development team or create an issue in the repository.
