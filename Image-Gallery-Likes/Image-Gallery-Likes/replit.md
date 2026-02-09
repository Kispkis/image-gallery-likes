# Galeria de Imagens

## Overview
A responsive image gallery web application with admin authentication, profile management, and public gallery with email-validated likes.

## Features
- **Admin Login**: 2 admin users (admin1/admin123, admin2/admin456)
- **Admin Profile**: Admins can change username, password, and profile picture
- **Image Upload**: Admins can upload JPEG images (max 200KB)
- **Public Gallery**: Social media feed style gallery (like-only, no comment/share/bookmark)
- **Like System**: Public users can like images with email validation (one like per email total)
- **Like Tracking**: Date and time recorded for each like

## Architecture
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express.js with session-based auth
- **Database**: PostgreSQL with Drizzle ORM
- **File Storage**: Local filesystem (uploads/ directory)

## Routes
- `/` - Public gallery
- `/admin` - Admin login page
- `/admin/dashboard` - Admin dashboard (protected)

## API Endpoints
- `POST /api/auth/login` - Admin login (returns id, username, profilePicture)
- `GET /api/auth/session` - Check session (returns id, username, profilePicture)
- `POST /api/auth/logout` - Logout
- `GET /api/images` - Public image list with like counts and uploader info
- `POST /api/images/:id/like` - Like an image (requires email)
- `GET /api/admin/images` - Admin image list (protected)
- `GET /api/admin/images/:id/likes` - View likes for an image (protected)
- `POST /api/admin/upload` - Upload images (protected)
- `DELETE /api/admin/images/:id` - Delete image (protected)
- `PUT /api/admin/profile` - Update admin username/password (protected)
- `POST /api/admin/profile/picture` - Upload profile picture (protected)
- `DELETE /api/admin/profile/picture` - Remove profile picture (protected)

## Database Tables
- `admins` - Admin users (username, password hashed with bcrypt, profile_picture)
- `images` - Uploaded images (filename, original_name, mime_type, size, uploaded_by, created_at)
- `likes` - Image likes (image_id, email, created_at) with unique constraint on email (one like per email total)
