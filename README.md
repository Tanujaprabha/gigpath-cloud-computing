<<<<<<< HEAD
<<<<<<< HEAD
# GigPath – Smart Financial Guidance Platform for Gig Workers With AI Chats

## Technologies Used

* React.js
* Vite
* Firebase Authentication
* Cloud Firestore
* Google Gemini AI API
* Capacitor Android

## Prerequisites

Install:

* Node.js (v18 or later)
* npm
  
## Environment Setup

1. Copy `.env.example` and create a new file named `.env`.

2. Replace the placeholder values with your own Firebase and Gemini API credentials.

3. Save the file.

4. Start the application:

```bash
npm install
npm run dev
```

Note: The `.env` file is intentionally excluded from GitHub for security reasons and must be created locally.


4. Run:

npm run dev
## Clone Repository

```bash
git clone https://github.com/Tanujaprabha/GigPath.git
cd GigPath
```

## Install Dependencies

```bash
npm install
```

## Run Application

```bash
npm run dev
```

Open the URL displayed in the terminal (usually http://localhost:5173).

## Features

* User Authentication
* Google Sign-In
* Income and Expense Tracking
* Financial Goal Management
* Reports and Analytics
* AI Chat Assistant

## Database

Cloud Firestore is used as the database.

## Authentication

Firebase Authentication is used for:

* Email/Password Login
* Google Sign-In

## Build Android APK

### Prerequisites

* Node.js
* Android Studio
* Android SDK
* Java JDK

### Install Dependencies

```bash
npm install
```

### Build React Application

```bash
npm run build
```

### Sync Capacitor

```bash
npx cap sync android
```

### Open Android Studio

```bash
npx cap open android
```

### Generate APK

1. Android Studio → **Build**
2. **Build Bundle(s) / APK(s)**
3. **Build APK(s)**

After the build completes, click:

```text
locate
```

or find the APK at:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

### Install APK

Copy `app-debug.apk` to an Android phone and install it.

### Google Sign-In

The project already includes Firebase configuration (`google-services.json`). Ensure Firebase Authentication and Firestore are enabled in the Firebase project.
=======
# gigpath-web-app
>>>>>>> 8d36b603d04de6605cef82cac0258f5dcf345686
=======
# r-capstone-project
>>>>>>> origin/main
