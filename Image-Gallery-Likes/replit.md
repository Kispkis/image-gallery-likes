# Galeria de Imagens

## Overview
A responsive image gallery web application with admin authentication and public gallery with email-validated likes.

## Features
- **Admin Login**: 2 admin users (admin1/admin123, admin2/admin456)
- **Image Upload**: Admins can upload JPEG images (max 200KB)
- **Public Gallery**: Anyone can browse images
- **Like System**: Public users can like images with email validation (one like per email per image)
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
- `POST /api/auth/login` - Admin login
- `GET /api/auth/session` - Check session
- `POST /api/auth/logout` - Logout
- `GET /api/images` - Public image list with like counts
- `POST /api/images/:id/like` - Like an image (requires email)
- `GET /api/admin/images` - Admin image list (protected)
- `GET /api/admin/images/:id/likes` - View likes for an image (protected)
- `POST /api/admin/upload` - Upload images (protected)
- `DELETE /api/admin/images/:id` - Delete image (protected)

## Database Tables
- `admins` - Admin users (username, password hashed with bcrypt)
- `images` - Uploaded images (filename, original_name, mime_type, size, uploaded_by, created_at)
- `likes` - Image likes (image_id, email, created_at) with unique constraint on (image_id, email)
