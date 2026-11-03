# SmartExam

SmartExam keeps the React/Vite application at the repository root and adds an Express/Mongoose API under `backend/`.

## Development setup

1. Install frontend dependencies from the repository root: `npm install`.
2. Install backend dependencies: `npm --prefix backend install`.
3. Copy `backend/.env.example` to `backend/.env` and configure:
   - `MONGODB_URI`
   - `JWT_SECRET` (random, at least 32 characters)
   - `FIELD_ENCRYPTION_KEY` (64 random hexadecimal characters; keep a secure backup and never commit it)
   - Optionally `PORT`, `NODE_ENV`, and `CLIENT_ORIGIN`
4. Start MongoDB, then run `npm run dev:api` and `npm run dev` in separate terminals.
5. Vite proxies `/api` to `http://localhost:5000`.

## Student IDs

- This deployment is restricted to Government Polytechnic, Masab Tank (MASB / College Code 001). Registration and authentication reject identities associated with other institutes.
- Student registration requires a unique 3–30 character ID containing letters, numbers, or hyphens.
- Names, student/teacher IDs, email addresses, and mobile numbers are encrypted with AES-256-GCM in MongoDB. Keyed lookup hashes support logins and uniqueness without storing those identifiers in plaintext. Passwords are one-way bcrypt hashes and cannot be decrypted.
- Before applying encryption to an existing database, stop the API and back up MongoDB. First run the existing teacher, branch-institute, and student-ID migrations, resolving any reported ownership or duplicate data issues; then run `npm --prefix backend run migrate:user-encryption`. Keep the same field-encryption key for reads, backups, and restores. Losing it makes encrypted profile fields unrecoverable.
- Missing student IDs are generated from the student's branch code and current year; existing duplicate or malformed IDs stop migration for manual resolution. The migration preserves attempts/results and is safe to rerun.
- Students can view their permanent ID in the authenticated student portal. It is not editable through the profile API.

## Examination workflow

- Teachers can use the institute's branches, manage their own subjects, create draft descriptive examinations, and publish after the configured question count and total marks are satisfied.
- Teacher IDs are globally unique and immutable after registration. Students can connect to multiple teachers from their account using each teacher's ID; their subject and published-test views are limited to their own branch and active teacher connections. Disconnecting a teacher hides their subjects/tests without deleting attempts or results.
- Branches and all authenticated records are scoped to Government Polytechnic, Masab Tank. Institute identity is assigned by the server, not trusted from a registration form.
- Students see only published tests assigned to their active branch and subject and created by a connected teacher. Subject details include that teacher's published tests. The test/question APIs do not send answer keys during an exam.
- Starting a test creates one official attempt per student/test. Its deadline is persisted by the backend; answers are saved against the attempt, late writes are rejected, and a backend worker expires due attempts even if the student has left the page.
- Exams accept descriptive text answers only. Submission and timer expiry save answers and queue a pending result; teachers manually award marks and feedback, then explicitly publish a fully evaluated result. Students can only view published results.

For an existing database, stop the API and back up MongoDB before running migrations. Run `npm --prefix backend run migrate:teacher-ids`, `npm --prefix backend run migrate:branch-institutions`, and `npm --prefix backend run migrate:student-ids` before `npm --prefix backend run migrate:user-encryption`. Review migration output and resolve any reported legacy ownership/data issues before starting the API.
- Teachers can review and grade submissions only for tests they created. Student progress and dashboard analytics are derived from persisted results.
- Tests with an official attempt cannot be edited or unpublished; tests are archived rather than hard-deleted to preserve historical records.

## Validation

- Backend integration tests: `npm --prefix backend test`
- Frontend production build: `npm run build`
- Frontend lint: `npm run lint`

The integration tests use an in-memory MongoDB server and Supertest. A running MongoDB instance and valid `backend/.env` are required to run the application.
