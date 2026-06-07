# Unit Manager for Conqueror's Blade

A premium web application designed to manage player units, house groups, and Territory War (TW) attendance and statistics.

## 🚀 Features

- **Barrack & Unit Management:** Track prepared units, masteries, favorites, and calculate team leadership.
- **Officer Command Center:** Create and manage tactical groups, assign members via drag-and-drop, and monitor team composition.
- **Territory War Logs:** Import rosters from Discord (Raid Helper), export setups, and manage seasons/events.
- **Real-time Synchronization:** Fully synchronized database state with hierarchical Row Level Security (RLS) policies.
- **Premium Obsidian & Gold Theme:** A dark-themed dashboard designed for optimal performance during active gameplay.

## 🛠️ Technology Stack

- **Frontend:** React (Vite), Redux Toolkit, Vanilla CSS (Glassmorphism).
- **Backend:** Supabase (PostgreSQL, Auth via Discord, Realtime subscription channels).
- **Security:** Strict PostgreSQL Row Level Security (RLS) enforcing Role-Based Access Control (RBAC).

## 💻 Local Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+ recommended)
- A Supabase project (for authentication and database)

### Setup & Installation

1. **Clone the repository and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Create a `.env.local` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   The application will be running locally at `http://localhost:5173`.

4. **Build for production:**
   ```bash
   npm run build
   ```

## 📄 License

This project is private and intended for Conqueror's Blade house management.
