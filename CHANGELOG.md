# Changelog

All notable changes to this project will be documented in this file.

## [1.0.1.0] - 2026-04-02

### Fixed
- Fixed Supabase authentication modal buttons (Connexion and Créer un compte) that were not responding to clicks
- Fixed "Cannot read properties of undefined (reading 'signUp')" error by properly initializing Supabase client before use
- Removed conflicting duplicate event handlers in auth.js that were interfering with authentication flow
- Removed debug alert statements from login and signup modal handlers
- Improved Supabase client initialization with retry logic (5 attempts, 200ms intervals) to handle CDN loading delays

### Changed
- Consolidated Supabase initialization into index.html with proper error handling instead of splitting across multiple files
- Simplified auth.js to focus only on logout handlers and auth state listening, reducing code duplication

### Removed
- Removed red "Déconnexion" button from mobile view when user is not logged in (now properly hidden until login)
