# Cyber Security Risk Analysis & Reporting System (CSRARS)

AI-powered cybersecurity risk analysis and reporting system built with Next.js 14, MongoDB, and OpenAI.

## Features

- **Authentication**: NextAuth.js with role-based access control (Director, Division Head, Risk Analyst, Staff)
- **External Questionnaire Integration**: Fetch questionnaires from external APIs
- **AI-Powered Risk Analysis**: Automatic risk analysis using OpenAI GPT
- **Multi-Level Reports**: Generate Strategic, Tactical, and Operational reports
- **Risk Register**: Track and manage cybersecurity risks
- **Dark Mode UI**: Modern, clean interface with Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), React, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose
- **AI**: OpenAI API (GPT-4o-mini)
- **Authentication**: NextAuth.js
- **Charts**: Recharts
- **Export**: jsPDF, docx

## Getting Started

### Prerequisites

- Node.js 18+ 
- MongoDB (local or cloud)
- OpenAI API key

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Create a `.env.local` file in the root directory:

```env
MONGODB_URI=mongodb://localhost:27017/csrars
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
OPENAI_API_KEY=your-openai-api-key-here
EXTERNAL_QUESTIONNAIRE_API_URL=https://api.example.com/questionnaires
EXTERNAL_API_KEY=your-external-api-key-here
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
/app
  /api
    /auth          # NextAuth.js routes
    /questionnaires # Questionnaire fetching
    /analysis      # Risk analysis processing
    /reports       # Report generation and export
    /dashboard     # Dashboard stats
  /login          # Login page
  /signup         # Signup page
  /dashboard      # Dashboard page
  /reports        # Reports page
  /components     # React components
/lib
  /mongodb        # MongoDB connection
  /ai             # OpenAI integration
  /auth           # NextAuth configuration
/models           # Mongoose models
```

## Usage

1. **Sign Up**: Create an account with a role (Director, Division Head, Risk Analyst, or Staff)
2. **Fetch Questionnaires**: Click "Fetch Questionnaires" on the dashboard to import data from external API
3. **Automatic Analysis**: The system automatically analyzes questionnaires and generates risk assessments
4. **View Reports**: Navigate to Reports page to view Strategic, Tactical, and Operational reports
5. **Export Reports**: Export reports as PDF or DOCX

## API Endpoints

- `POST /api/auth/signup` - User registration
- `POST /api/questionnaires/fetch` - Fetch questionnaires from external API
- `POST /api/analysis/process` - Process questionnaire for risk analysis
- `POST /api/reports/generate` - Generate AI-powered reports
- `GET /api/reports/export` - Export reports (PDF/DOCX)
- `GET /api/dashboard/stats` - Get dashboard statistics

## MongoDB Collections

- `users` - User accounts and roles
- `questionnaires` - Fetched questionnaire data
- `riskanalyses` - AI-generated risk analysis
- `reports` - AI-generated reports
- `riskregisters` - Risk tracking

## Workflow

1. User fetches questionnaires from external API
2. System automatically triggers risk analysis
3. OpenAI analyzes responses and identifies vulnerabilities
4. System automatically generates all three report levels
5. Reports are available for viewing and export

## Environment Variables

See `.env.local.example` for required environment variables.

## License

Private project - All rights reserved

