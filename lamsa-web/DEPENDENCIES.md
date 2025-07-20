# Lamsa Web Dependencies

## Core Dependencies

### Framework & Build
- **next** - React framework with server-side rendering
- **react** & **react-dom** - UI library
- **typescript** - Type safety

### Styling
- **tailwindcss** - Utility-first CSS framework
- **tailwind-merge** - Merge Tailwind classes safely
- **clsx** - Conditional classes utility

### UI Components
- **@radix-ui/*** - Unstyled, accessible UI components
  - react-dialog - Modal dialogs
  - react-dropdown-menu - Dropdown menus
  - react-label - Form labels
  - react-select - Select inputs
  - react-tabs - Tab components
- **lucide-react** - Modern icon library
- **framer-motion** - Animation library

### State Management
- **zustand** - Lightweight state management
- **@tanstack/react-query** - Server state management

### Forms & Validation
- **react-hook-form** - Performant form library
- **@hookform/resolvers** - Validation resolvers
- **zod** - TypeScript-first schema validation

### Authentication & API
- **@supabase/supabase-js** - Supabase client
- **@supabase/ssr** - Server-side Supabase auth
- **axios** - HTTP client
- **cookies-next** - Cookie management

### Utilities
- **date-fns** - Date manipulation
- **react-hot-toast** - Toast notifications
- **next-themes** - Theme management

### Phone Input
- **react-phone-number-input** - Phone number input component
- **libphonenumber-js** - Phone number parsing/formatting

### Data Tables
- **@tanstack/react-table** - Headless table library

### Carousel
- **embla-carousel-react** - Carousel component

## Development Dependencies

### Code Quality
- **eslint** & **eslint-config-next** - Linting
- **prettier** & **prettier-plugin-tailwindcss** - Code formatting
- **@typescript-eslint/*** - TypeScript ESLint support

### Types
- **@types/react** - React types
- **@types/react-dom** - React DOM types
- **@types/node** - Node.js types
- **@types/react-phone-number-input** - Phone input types

## Package Commands

```json
{
  "dev": "Start development server",
  "build": "Build for production",
  "start": "Start production server",
  "lint": "Run ESLint",
  "format": "Format code with Prettier",
  "format:check": "Check code formatting",
  "type-check": "Check TypeScript types"
}
```