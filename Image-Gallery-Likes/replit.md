# Galeria de Imagens

## Overview
A responsive image gallery web application with admin master/admin role system, profile management, and public gallery with email-validated likes (with swap functionality).

## Features
- **Admin Master (admin1)**: Full dashboard with analytics, admin management, image management, like tracking, and daily reports
- **Regular Admins (admin2+)**: Simplified dashboard for uploading and deleting images only
- **Admin Profile**: All admins can change username, password, and profile picture
- **Image Upload**: Admins can upload JPEG images (max 200KB)
- **Public Gallery**: Social media feed style gallery (like-only, no comment/share/bookmark)
- **Like System**: Public users can like images with email validation (one like per email total, with swap option)
- **Like Tracking**: Date and time recorded for each like
- **Daily Reports**: Automatic data export to data/ folder at 23:59:58 daily

## Architecture
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express.js with session-based auth
- **Database**: PostgreSQL with Drizzle ORM
- **File Storage**: Local filesystem (uploads/ directory)
- **Data Export**: Text files in data/ directory

## Admin Roles
- **master**: Full access - analytics, charts, admin management, like tracking, reports
- **admin**: Limited access - upload and delete images only

## Routes
- `/` - Public gallery
- `/admin` - Admin login page
- `/admin/dashboard` - Admin dashboard (role-based content)

## API Endpoints
### Public
- `GET /api/images` - Public image list with like counts and uploader info
- `POST /api/images/:id/like` - Like an image (requires email, supports swap)

### Auth
- `POST /api/auth/login` - Admin login (returns id, username, profilePicture, role)
- `GET /api/auth/session` - Check session (returns id, username, profilePicture, role)
- `POST /api/auth/logout` - Logout

### Admin (all roles)
- `GET /api/admin/images` - Admin image list (protected)
- `POST /api/admin/upload` - Upload images (protected)
- `DELETE /api/admin/images/:id` - Delete image (protected)
- `PUT /api/admin/profile` - Update admin username/password (protected)
- `POST /api/admin/profile/picture` - Upload profile picture (protected)
- `DELETE /api/admin/profile/picture` - Remove profile picture (protected)

### Master only
- `GET /api/admin/images/:id/likes` - View likes for an image
- `GET /api/master/admins` - List all admins
- `POST /api/master/admins` - Create new admin
- `PUT /api/master/admins/:id` - Edit admin
- `DELETE /api/master/admins/:id` - Delete admin
- `POST /api/master/report` - Generate report manually
- `GET /api/master/reports` - List available reports
- `GET /api/master/reports/:filename` - View report content

## Database Tables
- `admins` - Admin users (username, password hashed with bcrypt, profile_picture, role)
- `images` - Uploaded images (filename, original_name, mime_type, size, uploaded_by, created_at)
- `likes` - Image likes (image_id, email, created_at) with unique constraint on email (one like per email total)

## Default Credentials
- admin1 / admin123 (master)
- admin2 / admin456 (admin)
