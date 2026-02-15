# CheckITS

**CheckITS** is an attendance management system built for the Information Technology Society (ITS) at Holy Cross of Davao College. It streamlines officer attendance tracking across meetings and events through role-based dashboards, QR code scanning, and automated report generation.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Available Scripts](#available-scripts)
- [Firebase Configuration](#firebase-configuration)
- [License](#license)

---

## Features

### Authentication
- Google OAuth sign-in restricted to `@hcdc.edu.ph` accounts
- Email and password registration with profile completion
- Role-based access control (Admin / Officer)
- First registered user is automatically assigned the Admin role

### Admin Dashboard
- Create, edit, and delete meetings/events
- View all officer attendance records per event
- Mark attendance manually or via QR code scanning
- Manage officer accounts and roles

### Officer Dashboard
- View upcoming and past meetings
- Check personal attendance history
- Complete and update profile information

### Attendance Tracking
- QR code generation per event for quick check-ins
- Real-time attendance marking with status tracking
- Duplicate attendance prevention

### Reports
- Generate attendance summaries and reports
- Export reports to PDF via jsPDF
- Filter by school year, date range, or event

### User Experience
- Dual theme support (light and dark modes)
- Responsive design for desktop and mobile
- Animated transitions with Framer Motion
- Toast notifications for user feedback

---

## Tech Stack

| Layer           | Technology                          |
|-----------------|-------------------------------------|
| Framework       | React 18 with TypeScript            |
| Build Tool      | Vite 5                              |
| Styling         | Tailwind CSS 3 + shadcn/ui (Radix)  |
| Animations      | Framer Motion                       |
| Routing         | React Router v6                     |
| State & Data    | TanStack React Query                |
| Authentication  | Firebase Authentication             |
| Database        | Cloud Firestore                     |
| QR Scanning     | html5-qrcode                        |
| PDF Export      | jsPDF + jspdf-autotable             |
| Charts          | Recharts                            |
| Forms           | React Hook Form + Zod               |
| Testing         | Vitest + Testing Library            |

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- npm (included with Node.js) or [Bun](https://bun.sh/)
- A [Firebase](https://console.firebase.google.com/) project with Authentication and Firestore enabled

---

## Getting Started

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd meeting-minder
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure Firebase**

   Update `src/lib/firebase.ts` with your Firebase project credentials. See [Firebase Configuration](#firebase-configuration) for details.

4. **Start the development server**

   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5173`.

---

## Project Structure

```
meeting-minder/
├── public/                     # Static assets
├── src/
│   ├── components/
│   │   ├── ui/                 # shadcn/ui component library
│   │   ├── DashboardLayout.tsx # Shared layout for admin/officer views
│   │   ├── FirstTimeModal.tsx  # Profile completion modal
│   │   ├── ProtectedRoute.tsx  # Route guard with role checking
│   │   ├── QrScanner.tsx       # QR code scanner component
│   │   └── ThemeProvider.tsx   # Light/dark theme management
│   ├── contexts/
│   │   └── AuthContext.tsx     # Authentication state and methods
│   ├── hooks/                  # Custom React hooks
│   ├── lib/
│   │   ├── firebase.ts         # Firebase app initialization
│   │   ├── firestore.ts        # Firestore CRUD operations
│   │   └── utils.ts            # Utility functions
│   ├── pages/
│   │   ├── AdminDashboard.tsx  # Admin main view
│   │   ├── EventDetails.tsx    # Single event with attendance list
│   │   ├── Login.tsx           # Sign-in page
│   │   ├── NewEvent.tsx        # Event creation form
│   │   ├── OfficerDashboard.tsx# Officer main view
│   │   ├── Profile.tsx         # User profile management
│   │   ├── Register.tsx        # Account registration
│   │   └── Reports.tsx         # Attendance reports and exports
│   ├── test/                   # Test files
│   ├── App.tsx                 # Root component with routing
│   ├── main.tsx                # Application entry point
│   └── index.css               # Global styles and theme tokens
├── index.html                  # HTML entry point
├── tailwind.config.ts          # Tailwind CSS configuration
├── vite.config.ts              # Vite build configuration
├── tsconfig.json               # TypeScript configuration
└── package.json
```

---

## Available Scripts

| Command           | Description                                  |
|-------------------|----------------------------------------------|
| `npm run dev`     | Start the development server with HMR        |
| `npm run build`   | Create a production build                    |
| `npm run preview` | Preview the production build locally         |
| `npm run lint`    | Run ESLint across the project                |
| `npm run test`    | Run the test suite with Vitest               |
| `npm run test:watch` | Run tests in watch mode                   |

---

## Firebase Configuration

This project requires a Firebase project with the following services enabled:

1. **Authentication** — Enable the Google sign-in provider and Email/Password provider.
2. **Cloud Firestore** — Create a Firestore database.

### Firebase Credentials

Replace the values in `src/lib/firebase.ts` with your own Firebase config:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID",
};
```

### Firestore Security Rules

Configure your Firestore rules in the Firebase Console to allow authenticated access:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /meetings/{meetingId} {
      allow read, write: if request.auth != null;
    }
    match /attendance/{recordId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Firestore Collections

The application uses three collections:

| Collection     | Description                            |
|----------------|----------------------------------------|
| `users`        | Officer and admin profiles             |
| `meetings`     | Meetings and events created by admins  |
| `attendance`   | Attendance records per user per event  |

---

## License

This project was developed for the Information Technology Society (ITS) of Holy Cross of Davao College.
