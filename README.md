# Wedding/Event Seating Chart App

A modern, responsive web application for managing wedding and event seating arrangements with an admin CMS and guest portal.

## Features

### Admin/CMS Features
- 🔐 **Secure Authentication** - Simple username/password login for admins
- 🎨 **Drag & Drop Seating Chart** - Visual table layout management
- 📊 **Table Management** - Add round/rectangular tables with custom capacities
- 👥 **Guest Management** - Add, edit, delete guests with full contact info
- 📤 **CSV Import** - Bulk import guest lists from CSV files
- ⚙️ **Event Settings** - Customize event name and homepage text
- 📱 **Responsive Design** - Works on desktop and mobile devices

### Guest Portal Features
- 🔍 **Guest Search** - Guests can find their table by searching their name
- 📍 **Table Assignment Display** - Shows table number and details
- ✏️ **Address Collection** - Allows guests to add/update their mailing address
- 💒 **Wedding-themed UI** - Beautiful pink/rose themed design

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Neon PostgreSQL with Drizzle ORM
- **Authentication**: JWT with bcrypt password hashing
- **Drag & Drop**: React DnD
- **Icons**: Lucide React
- **File Processing**: PapaParse for CSV imports

## Quick Start

### 1. Clone and Install
```bash
git clone <your-repo>
cd seating-chart-app
npm install
```

### 2. Database Setup
1. Create a [Neon](https://neon.tech/) database
2. Copy your database URL from Neon dashboard
3. Create `.env.local` file:
```
DATABASE_URL=your_neon_database_url_here
JWT_SECRET=your_secure_jwt_secret_here
```

### 3. Initialize Database
```bash
npm run db:push
npm run create-admin
```

### 4. Start Development Server
```bash
npm run dev
```

Visit:
- **Guest Portal**: http://localhost:3000
- **Admin Portal**: http://localhost:3000/admin/login

## Default Admin Credentials

After running `npm run create-admin`:
- **Username**: `admin`
- **Password**: `admin123`

⚠️ **Important**: Change the default password after first login!

## CSV Import Format

When importing guests via CSV, use this format:

```csv
name,phoneNumber,address
John Smith,555-0123,"123 Main St, City, State 12345"
Jane Doe,555-0124,"456 Oak Ave, City, State 12345"
```

**Required Column**: `name`
**Optional Columns**: `phoneNumber`, `address`

## Deployment to Vercel

### 1. Connect to Vercel
```bash
npm install -g vercel
vercel
```

### 2. Set Environment Variables
In your Vercel dashboard, add:
- `DATABASE_URL`: Your Neon database URL
- `JWT_SECRET`: A secure random string

### 3. Deploy
```bash
vercel --prod
```

## Database Management

```bash
# Generate new migrations
npm run db:generate

# Push schema changes
npm run db:push

# Open database studio
npm run db:studio

# Create admin user
npm run create-admin
```

## Admin Portal Usage

### 1. Managing Tables
- Click "Add Table" to create new seating tables
- Choose between round or rectangular shapes
- Set custom capacity for each table
- Drag tables around the seating chart canvas
- Click the trash icon to delete tables

### 2. Managing Guests
- Use "Add Guest" to manually add individual guests
- Use "Import CSV" to bulk upload guest lists
- Edit guest information including table assignments
- Search and filter guests by name, phone, or address

### 3. Seating Assignments
- Drag guests from the "Unassigned" list to tables
- Tables show current capacity (e.g., "3/8" means 3 guests out of 8 seats)
- Click the "×" next to a guest's name to unassign them
- Visual indicators show when tables are full

### 4. Event Settings
- Customize the event name displayed to guests
- Update the welcome message on the guest portal
- Preview changes in real-time

## Guest Portal Usage

1. **Search**: Guests type their name to find their table
2. **View Assignment**: See table number and details
3. **Update Info**: Add mailing address if not provided
4. **Responsive**: Works on phones, tablets, and desktops

## File Structure

```
seating-chart-app/
├── src/
│   ├── app/
│   │   ├── api/              # API routes
│   │   ├── admin/            # Admin pages
│   │   └── page.tsx          # Guest portal homepage
│   ├── components/
│   │   └── admin/            # Admin dashboard components
│   └── lib/
│       ├── auth.ts           # Authentication utilities
│       ├── db.ts             # Database connection
│       ├── schema.ts         # Database schema
│       └── utils.ts          # Utility functions
├── scripts/
│   └── create-admin.js       # Admin user creation script
├── drizzle.config.ts         # Database configuration
└── package.json
```

## Troubleshooting

### Database Connection Issues
- Verify your `DATABASE_URL` in `.env.local`
- Ensure Neon database is active and accessible
- Check network connectivity

### Permission Errors
- Verify admin credentials
- Check JWT secret is set correctly
- Clear browser cache and cookies

### CSV Import Problems
- Ensure CSV has proper headers (`name` is required)
- Check for special characters or encoding issues
- Verify file is properly formatted CSV
