# SmartExam

SmartExam keeps the React/Vite application at the repository root and adds an Express/Mongoose API under `backend/`.

## Development setup

1. Install frontend dependencies from the repository root: `npm install`.
2. Install backend dependencies: `npm --prefix backend install`.
3. Copy `backend/.env.example` to `backend/.env` and configure:
   - `MONGODB_URI`
   - `JWT_SECRET` (random, at least 32 characters)
   - Optionally `PORT`, `NODE_ENV`, and `CLIENT_ORIGIN`
4. Start MongoDB, then run `npm run dev:api` and `npm run dev` in separate terminals.
5. Vite proxies `/api` to `http://localhost:5000`.

## Student IDs

- Student registration requires a unique 3–30 character ID containing letters, numbers, or hyphens.
- Existing databases must be migrated once before deploying this schema: stop the API, back up MongoDB, then run `npm --prefix backend run migrate:student-ids`. Missing IDs are generated from the student's branch code and current year; existing duplicate or malformed IDs stop the migration for manual resolution. The migration preserves attempts/results and is safe to rerun.
- Students can view their permanent ID in the authenticated student portal. It is not editable through the profile API.

## Examination workflow

- Teachers can use shared institute branches, manage their own subjects, create draft tests, add MCQ or typing/descriptive questions, and publish tests after the configured question count and total marks are satisfied.
- Students see only published tests assigned to their active branch and subject. The test/question APIs do not send answer keys during an exam.
- Starting a test creates one official attempt per student/test. Its deadline is persisted by the backend; answers are saved against the attempt, late writes are rejected, and a backend worker expires due attempts even if the student has left the page.
- Submission evaluates MCQ answers including negative marks. Typing and descriptive answers use normalized exact matching (Unicode normalization, case-insensitive, and whitespace-normalized). A result is created once per attempt.
- Students can view their own results and answer review. Teachers can view results and review answers only for tests they created. Student progress and dashboard analytics are derived from submitted results.
- Tests with an official attempt cannot be edited or unpublished; tests are archived rather than hard-deleted to preserve historical records.

## Validation

- Backend integration tests: `npm --prefix backend test`
- Frontend production build: `npm run build`
- Frontend lint: `npm run lint`

The integration tests use an in-memory MongoDB server and Supertest. A running MongoDB instance and valid `backend/.env` are required to run the application.
