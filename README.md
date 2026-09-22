<p align="center">
  <img src="dashboard/assets/logo-mark.png" alt="Mokhayam Alsaqr logo" width="150">
</p>

<h1 align="center">Mokhayam Alsaqr Project</h1>

<p align="center">
  A PHP and MySQL management system for Mokhayam Alsaqr, with an Arabic dashboard, family records, aid distribution, complaints, join requests, geographic zones, and a public landing page.
</p>

## Overview

This project includes:

- Public landing page with complaint submission.
- Dashboard pages for families, individuals, join requests, aid types, aid logs, complaints, users, settings, and zones.
- PHP API backend.
- MySQL schema for the required database tables.
- Logo and visual identity assets for the dashboard and GitHub repository page.

## Project Structure

```text
backend/
  api/               PHP API endpoints
  config/            Database configuration example
  includes/          Shared auth and response helpers
  schema.sql         MySQL database schema
dashboard/
  assets/            Logo and image assets
  css/               Dashboard styles
  js/                Dashboard JavaScript
landing-page.html    Public landing page
```

## Local Setup

1. Import the database schema:

```bash
mysql -u root -p < backend/schema.sql
```

2. Create your local database config:

```bash
cp backend/config/db.example.php backend/config/db.php
```

3. Update `backend/config/db.php` with your local database credentials.

4. Create a temporary admin seed file:

```bash
cp backend/seed_admin.example.php backend/seed_admin.php
```

5. Edit the admin email and password, run `backend/seed_admin.php` once, then delete it from the server.

## Security Notes

The following files are intentionally ignored by Git:

- `backend/config/db.php`
- `backend/seed_admin.php`
- `.env` and `.env.*`

Do not commit real database passwords, admin seed credentials, API tokens, private keys, exported user data, or uploaded documents.

The current backend documentation mentions plain-text password storage for development. Before using this system in production, switch to secure password hashing with `password_hash()` and `password_verify()`.

## Repository Logo

The repository README displays the project logo from:

```text
dashboard/assets/logo-mark.png
```

