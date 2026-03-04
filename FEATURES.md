# Brazil Investment Comparison - Features Documentation

## Overview

This is a **financial comparison web application** specifically designed for Brazilian investment markets. It allows users to compare the performance of different investment instruments over various time periods.

## Core Functionality

The application compares four main investment types:
1. **Tesouro Selic** - Brazilian government treasury bonds indexed to SELIC rate
2. **Ibovespa (IBOV)** - Main Brazilian stock market index
3. **CDI** - Brazilian interbank deposit rate (with customizable multipliers like 100% CDI)
4. **IPCA** - Brazilian inflation index (for real returns)

## Architecture & Technology Stack

### Frontend (Client)
- **React 19** with TypeScript
- **Vite** as build tool and development server
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- Modern hooks-based architecture

### Backend (Server)
- **Express.js** with TypeScript
- **tsx** for TypeScript execution
- **axios** for external API calls
- **cors** for cross-origin requests

### Data Sources
- **Banco Central do Brasil (BCB) SGS API** for SELIC, CDI, and IPCA data
- **Yahoo Finance API** for Ibovespa data (^BVSP)

## Key Features

### 1. Period Selection
Users can compare investments over:
- 1 month
- 3 months
- 6 months
- 1 year
- 2 years
- 5 years

### 2. Dual View Modes
- **Index Comparison:** Shows percentage returns with base 100
- **Invested Value:** Shows actual monetary returns based on user input

### 3. Investment Simulator
- Allows users to simulate initial investment plus monthly contributions
- Projects future values based on historical performance
- Shows total contributions, final value, and gains

### 4. CDB Customization
- Users can compare different CDB rates (e.g., 100% CDI, 110% CDI)
- Customizable rate multipliers for CDB investments

### 5. Responsive Design
- Mobile-friendly interface
- Accessibility features (ARIA labels, keyboard navigation)
- Screen reader support

### 6. Data Caching
- 24-hour file-based cache to reduce API calls
- Persistent cache storage
- Automatic cache refresh

## File Organization

```
investment/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/       # UI components (charts, selectors, summaries)
│   │   ├── api/             # API integration layer
│   │   ├── hooks/           # Custom React hooks
│   │   ├── utils/          # Utility functions
│   │   └── types.ts        # TypeScript type definitions
│   ├── dist/               # Built production files
│   └── package.json        # Frontend dependencies
├── server/                   # Express backend
│   ├── index.ts            # Main server file with API endpoints
│   ├── api-cache.ts        # File-based caching system
│   └── package.json        # Backend dependencies
├── Dockerfile              # Multi-stage Docker build
└── package.json           # Root package with dev scripts
```

## Key Components

### Main UI Components
- `PeriodSelector`: Time period selection buttons
- `ComparisonChart`: Main line chart using Recharts
- `InvestedSummary`: Summary table showing final values and gains
- `MonthlyContributionChart`: Simulator chart for investment scenarios
- `SimulatorSummary`: Results summary for the investment simulator

### Backend API
- Single endpoint: `/api/compare`
- Handles data fetching from multiple external APIs
- Performs data normalization and percentage calculations
- Implements caching and error handling

## Data Processing

The backend performs sophisticated data processing:
- **Date Alignment:** Aligns data from different sources with varying frequencies
- **Forward Fill:** Handles missing data points (weekends, holidays)
- **Cumulative Returns:** Converts raw rates to cumulative percentage returns
- **Monthly to Daily Conversion:** Converts monthly SELIC rates to daily compounding

## Development & Deployment

### Development
- Concurrent development with `npm run dev`
- Vite proxy forwards `/api` requests to backend
- Hot reload for both frontend and backend

### Production
- Multi-stage Docker build
- Single container deployment
- Static file serving for built client
- Environment-based configuration

## Notable Technical Decisions

1. **File-based Caching:** Persistent cache reduces external API dependencies
2. **TypeScript Throughout:** Strong typing for both frontend and backend
3. **Component Architecture:** Modular, reusable React components
4. **Accessibility:** ARIA labels, keyboard navigation, screen reader support
5. **Error Handling:** Graceful degradation when data sources are unavailable
6. **Brazilian Localization:** Portuguese UI, Brazilian date formats, BRL currency

## API Endpoints

### GET /api/compare
Query parameters:
- `period`: Time period (1m, 3m, 6m, 1y, 2y, 5y)
- `initialValue`: Initial investment amount (optional)
- `monthlyValue`: Monthly contribution amount (optional)
- `cdbRate`: CDB rate multiplier (default: 100)

Returns comparison data for all investment types over the specified period.

## Usage Examples

### Basic Comparison
1. Select a time period from the period selector
2. View the comparison chart showing relative performance
3. Switch between index view and invested value view

### Investment Simulation
1. Enter initial investment amount
2. Add monthly contribution amount (optional)
3. Adjust CDB rate if desired
4. View projected returns and summary table

## Data Sources Details

### Banco Central do Brasil (BCB) SGS API
- **SELIC Rate:** Daily data (code 11)
- **CDI Rate:** Daily data (code 12)
- **IPCA:** Monthly data (code 433)

### Yahoo Finance API
- **Ibovespa (^BVSP):** Daily stock market data

This is a well-architected, production-ready financial application that demonstrates modern web development practices with a focus on the Brazilian investment market.