# Chatalyst - Agentic AI Communication Platform

Chatalyst is an advanced AI-powered communication platform designed to help businesses communicate smarter and respond faster. Built with modern web technologies, it provides intelligent conversation management, lead generation, and automated customer engagement capabilities.

## Features

- **AI Agents**: Intelligent conversation handling with automated responses
- **Lead Generation**: Advanced lead capture and management system
- **Contact Management**: Comprehensive customer relationship management
- **WhatsApp Integration**: Direct integration with WhatsApp Business API
- **Knowledge Base**: AI-powered knowledge management and retrieval
- **Appointment Scheduling**: Automated booking and calendar management
- **Broadcast Messaging**: Bulk messaging with segmentation
- **Team Collaboration**: Multi-user workspace with role-based access
- **Analytics Dashboard**: Real-time insights and performance metrics

## Prerequisites

Before you begin, ensure you have the following installed:

1.  **Node.js**: Required for running the frontend and CLI tools. We recommend using [nvm](https://github.com/nvm-sh/nvm#installing-and-updating) to manage Node.js versions.
2.  **Package Manager**: Choose one (npm, yarn, or bun). This project contains lock files for all three (`package-lock.json`, `yarn.lock`, `bun.lockb`). We recommend deleting the lock files you *don't* use and sticking to one manager. Examples below use `npm`.
3.  **Supabase CLI**: Required for local Supabase development. Install globally:
    ```sh
    npm install -g supabase
    ```
4.  **Docker**: Required by the Supabase CLI to run the local Supabase stack (database, auth, storage, functions). [Install Docker](https://docs.docker.com/get-docker/). Ensure Docker Desktop is running before starting the local Supabase environment.

## Setup

1.  **Clone the repository:**
    ```sh
    git clone <YOUR_GIT_URL>
    cd Chatalyst
    ```
2.  **Install dependencies:** (Using npm as an example)
    ```sh
    # Optional: Remove unused lock files
    # rm yarn.lock bun.lockb

    npm install
    ```

## Running Locally

You can run the project in two ways:

### 1. Frontend Only (Against Remote Supabase)

This is the quickest way to run the frontend UI, but it connects to the **live, remote Supabase project**. Use this mode for UI changes only. You cannot test Supabase function or database changes locally with this method.

```sh
npm run dev
```

The application will be available at `http://localhost:8080` (or another port if 8080 is busy).

### 2. Full Stack (Frontend + Local Supabase) - Recommended for Development

This method runs the entire stack (frontend, database, auth, functions) locally using the Supabase CLI and Docker. This is recommended for most development tasks, especially when working with Supabase functions or database schema.

1.  **Set up Environment Variables for Supabase Functions:**
    *   Navigate to the Supabase directory: `cd supabase`
    *   Create a local environment file: `touch .env.local`
    *   Add the necessary secrets to `.env.local`. See the "Environment Variables" section below for details.
    *   Navigate back to the project root: `cd ..`

2.  **Start the local Supabase stack:**
    *   Ensure Docker Desktop is running.
    *   Run:
        ```sh
        supabase start
        ```
    *   This command will download Docker images (on the first run) and start the local Supabase services. It will output local Supabase URLs and keys (including the `service_role` key needed for `.env.local`).

3.  **Deploy Supabase Functions Locally:** (Optional, but needed to test functions)
    *   Deploy all functions:
        ```sh
        supabase functions deploy --no-verify-jwt
        ```
    *   Or deploy a specific function:
        ```sh
        supabase functions deploy <function-name> --no-verify-jwt
        ```
    *   The `--no-verify-jwt` flag is often necessary for local testing, especially since JWT verification is disabled for many functions in `supabase/config.toml`.

4.  **Start the frontend development server:**
    ```sh
    npm run dev
    ```

Now, your frontend at `http://localhost:8080` will interact with your local Supabase instance running in Docker.

## Environment Variables (for Local Supabase Functions)

When running the **Full Stack** local development environment (`supabase start`), Supabase functions require certain environment variables. Create a file named `.env.local` inside the `supabase` directory (`supabase/.env.local`) and add the following:

```plaintext
# Get this from Supabase project settings (Project Settings > API > Project API keys > service_role secret)
# OR from the output of `supabase start` (use the `service_role key`)
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Get this from your OpenAI account (https://platform.openai.com/api-keys)
OPENAI_API_KEY=your_openai_api_key

# The following are usually provided automatically by `supabase start` but can be set explicitly if needed
# SUPABASE_URL=http://localhost:54321
# SUPABASE_ANON_KEY=your_local_anon_key
# SUPABASE_DB_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

**Important:** Do **not** commit the `.env.local` file to Git. Ensure `.env.local` is included in your `.gitignore` file (it usually is by default in the `supabase` directory's gitignore).

## Supabase CLI Commands

Here are some useful Supabase CLI commands (run from the project root or `supabase` directory):

*   `supabase start`: Starts the local Supabase stack (Docker required).
*   `supabase stop`: Stops the local Supabase stack.
*   `supabase status`: Shows the status of local Supabase services and local URLs/keys.
*   `supabase functions deploy <function-name>`: Deploys a specific function locally.
*   `supabase functions serve <function-name>`: Serves a specific function locally with hot-reloading.
*   `supabase functions list`: Lists deployed functions.
*   `supabase db reset`: Resets the local database (useful if migrations exist or get corrupted).
*   `supabase login`: Log in to the Supabase platform (needed for linking projects, etc.).
*   `supabase link --project-ref <project-id>`: Link the local project to your remote Supabase project.
*   `supabase secrets set --env-file ./supabase/.env.local`: Set secrets for the *remote* Supabase project based on your local env file.
*   `supabase secrets list`: List secrets set on the *remote* Supabase project.

## Technologies Used

*   **Frontend**: React, TypeScript, Vite
*   **UI Framework**: shadcn-ui, Tailwind CSS
*   **Backend**: Supabase (Database, Auth, Functions, Storage)
*   **AI Integration**: OpenAI API for intelligent responses
*   **Communication**: WhatsApp Business API, Evolution API
*   **Database**: PostgreSQL (via Supabase)
*   **Authentication**: Supabase Auth with license-based signup

## Architecture

Chatalyst follows a modern serverless architecture:

- **Frontend**: React SPA with TypeScript and Tailwind CSS
- **Backend**: Supabase Edge Functions for serverless API endpoints
- **Database**: PostgreSQL with real-time subscriptions
- **AI Processing**: OpenAI integration for intelligent conversation handling
- **File Storage**: Supabase Storage for media and documents
- **Authentication**: Row-level security with team-based access control

## Deployment

You can deploy this project using:

*   **Vercel/Netlify**: Build the static assets (`npm run build`) and deploy the resulting `dist` folder. Configure environment variables for your production Supabase instance.
*   **Docker**: Use the included Dockerfile for containerized deployment.
*   **Supabase**: Deploy functions directly to your Supabase project using the CLI.

## Development Workflow

1. **Local Development**: Use `supabase start` + `npm run dev` for full-stack development
2. **Function Testing**: Deploy functions locally with `supabase functions deploy`
3. **Database Changes**: Use migrations in the `supabase/migrations` directory
4. **Production Deployment**: Deploy functions and migrations to production Supabase instance

## Contributing

When contributing to Chatalyst:

1. Follow the existing code style and TypeScript conventions
2. Test all changes locally using the full-stack development setup
3. Ensure all Supabase functions work correctly
4. Update documentation as needed
5. Test authentication and authorization flows

## License

This project uses a license-based authentication system. Contact the development team for licensing information.
