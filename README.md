# CSRARS 

## Features

- **Automated Risk Analysis**: AI-powered analysis of risk assessment questionnaires using advanced language models
- **Real-time Updates**: Server-sent events (SSE) for live dashboard updates during analysis
- **Multi-format Reporting**: Generate reports in Excel, PDF, Word, and PowerPoint formats
- **Risk Visualization**: Interactive risk matrices and charts for data-driven insights
- **User Authentication**: Secure authentication system with role-based access
- **Questionnaire Management**: Import, process, and analyze structured risk assessment questionnaires
- **Dashboard Analytics**: Comprehensive dashboards with filtering and visualization capabilities

## used frame work and tools

- Node.js 18.x or higher
- MongoDB 6.0 or higher
- npm or yarn package manager


3. **Environment Setup**

   MONGODB_URI=mongodb://localhost:27017/csrars
   NEXTAUTH_SECRET=your-secret-key-here
   NEXTAUTH_URL=http://localhost:3000
   OPENROUTER_API_KEY=your-openrouter-api-key  # Optional: for AI analysis
   ```


### API Endpoints

The application provides RESTful API endpoints for:

- `/api/auth/*` - Authentication routes
- `/api/analysis/*` - Risk analysis operations
- `/api/questionnaires/*` - Questionnaire management
- `/api/reports/*` - Report generation and export
- `/api/notifications/stream` - Real-time updates via SSE
- `/api/questionnaires/fetch` -the quetionarie is accepted with this api endpoint 

### Questionnaire Format

Questionnaires should be in JSON format:

```json
{
  "id": "unique-questionnaire-id",
  "title": "Security Assessment Q4 2025",
  "company_name": "Example Company Name",
  "filled_by": "Person Name",
  "role": "Person Role in Company",
  "filled_date": "2025-11-26",
  "questions": [
    {
      "id": 1,
      "question": "Are all data center entry points protected?",
      "answer": "Partially Implemented",
      "section": "Physical Security Controls",
      "level": "operational"
    }
  ]
}
```

### Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, MongoDB with Mongoose
- **Authentication**: NextAuth.js with credentials provider
- **AI Integration**: OpenRouter SDK for LLM-powered analysis
- **Real-time**: Server-Sent Events (SSE) for live updates
- **Reporting**: ExcelJS, jsPDF, docx, pptxgenjs for multi-format exports

### Key Components

- **Risk Analysis Engine**: Automated processing using AI models
- **Analysis Lock System**: Prevents duplicate analysis runs
- **SSE Hub**: Real-time event broadcasting system
- **Report Generators**: Multi-format report export functionality
- **Dashboard Components**: Interactive charts and risk matrices
