# Poke-Edu Project Structure

This project follows a Monorepo-style structure where the root is the React Frontend and `backend/` contains the PHP API.

## Root Directory (Frontend - React/Vite)
*   `index.html`: Entry HTML.
*   `index.tsx`: React Entry point.
*   `App.tsx`: Main Layout.
*   `types.ts`: Global TypeScript definitions.
*   `deploy.js`: **Deployment Script**. Run with `node deploy.js` to build and upload via SFTP. Requires `.env` config.
*   `public/`: **Static Assets**. Place generic game assets here (sounds, pokemon sprites). Files here are accessible via `/filename.ext`.
*   `assets/`: **Bundled Assets**. Place UI specific images (icons, logos) here. Import them directly in React components.
*   `components/`: Reusable UI.
    *   `ui/`: Generic atoms (Button, Card, Input).
    *   `battle/`: Combat logic and displays.
    *   `dashboard/`: Parent settings and stats.
*   `store/`: Zustand state management stores.
*   `services/`: Axios wrappers for PHP API & External APIs (Tyradex).

## Backend Directory (`/backend`)
*   `db_connect.php`: Database connection utility.
*   `auth.php`: Login/Register logic.
*   `get_question.php`: **Core Logic**. Handles Hybrid AI/Static question fetching.
*   `combat_engine.php`: Calculates damage and turn results securely.
*   `seed_questions.php`: Utility to load JSON data into MySQL.
*   `questions_data.json`: The source file for the seeder.
*   `shop.php`: Handles shop listing and buying logic.
*   `spin.php`: Logic for the Wheel of Fortune.
*   `collection.php`: Manages user pokemon team and upgrades.
*   `update_config.php`: API endpoint to save parent settings.

## Database
*   `database.sql`: The complete schema for the application.