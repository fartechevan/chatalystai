# Welcome to your Lovable project: Chat Lead Gen

This project is a lead generation application built with React, Vite, TypeScript, shadcn-ui, Tailwind CSS, and Supabase.

## Project Info

**Lovable URL**: https://lovable.dev/projects/4635a83f-0521-4e36-aad2-54c5f62f3359
**Supabase Project ID**: `vezdxxqzzcjkunoaxcxc`

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
    cd <YOUR_PROJECT_DIRECTORY>
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

This is the quickest way to run the frontend UI, but it connects to the **live, remote Supabase project** (`vezdxxqzzcjkunoaxcxc.supabase.co`). Use this mode for UI changes only. You cannot test Supabase function or database changes locally with this method.

```sh
npm run dev
```

The application will be available at `http://localhost:5173` (or another port if 5173 is busy).

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
    *   This command will download Docker images (on the first run) and start the local Supabase services. It will output local Supabase URLs and keys (including the `service_role` key needed for `.env.local`). **Note:** The frontend uses hardcoded keys for the *remote* instance, but the Supabase CLI intelligently proxies requests when `supabase start` is running, so the frontend will correctly interact with your *local* Supabase instance without code changes.

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

Now, your frontend at `http://localhost:5173` will interact with your local Supabase instance running in Docker.

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

*   Vite
*   TypeScript
*   React
*   shadcn-ui
*   Tailwind CSS
*   Supabase (Database, Auth, Functions, Storage)

## Deployment

You can deploy this project using:

*   **Lovable:** Open the [Lovable Project](https://lovable.dev/projects/4635a83f-0521-4e36-aad2-54c5f62f3359) and click on Share -> Publish.
*   **Other Platforms (e.g., Netlify, Vercel):** Build the static assets (`npm run build`) and deploy the resulting `dist` folder. You will need to configure environment variables (e.g., `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) on your hosting platform if you modify the frontend to use them instead of the hardcoded values. See [Lovable Docs: Custom Domains](https://docs.lovable.dev/tips-tricks/custom-domain/) for more guidance.

## Editing Code

You can edit the code using:

*   **Lovable:** Visit the [Lovable Project](https://lovable.dev/projects/4635a83f-0521-4e36-aad2-54c5f62f3359). Changes are committed automatically.
*   **Local IDE:** Clone the repo, make changes, commit, and push.
*   **GitHub:** Edit files directly on GitHub.
*   **GitHub Codespaces:** Use a cloud-based development environment.
