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
   - `GMAIL_USER` and `GMAIL_APP_PASSWORD` for password-reset email. Use a Google App Password (not your regular Gmail password); enable 2-Step Verification on the Gmail account first. `GMAIL_FROM` can optionally override the sender label/address.
4. Start MongoDB, then run `npm run dev:api` and `npm run dev` in separate terminals.
5. Vite proxies `/api` to `http://localhost:5000`.

## Student IDs

- This deployment is restricted to Government Polytechnic, Masab Tank (MASB / College Code 001). Registration and authentication reject identities associated with other institutes.
- Student registration is based on a valid branch selection and academic details, and the account remains pending until the assigned class incharge approves login access.
- Names, student/teacher IDs, email addresses, and mobile numbers are encrypted with AES-256-GCM in MongoDB. Keyed lookup hashes support logins and uniqueness without storing those identifiers in plaintext. Passwords are one-way bcrypt hashes and cannot be decrypted.
- Before applying encryption to an existing database, stop the API and back up MongoDB. First run the existing teacher, branch-institute, and student-ID migrations, resolving any reported ownership or duplicate data issues; then run `npm --prefix backend run migrate:user-encryption`. Keep the same field-encryption key for reads, backups, and restores. Losing it makes encrypted profile fields unrecoverable.
- Missing student IDs are generated from the student's branch code and current year; existing duplicate or malformed IDs stop migration for manual resolution. The migration preserves attempts/results and is safe to rerun.
- That migration preserves legacy accounts; new registrations continue to be approved by the class incharge rather than by a separate administrator-issued PIN.
- Students can view their assigned academic details in the authenticated student portal. These values are not editable through the profile API without the teacher approval flow.

## Administrator setup and enrollment

Student registrations and teacher exam access are authorized by an administrator. Create the first administrator from a trusted terminal after configuring the backend environment:

```powershell
$env:ADMIN_NAME = "SmartExam Administrator"
$env:ADMIN_USERNAME = "examadmin"
$env:ADMIN_EMAIL = "examadmin@example.edu"
$env:ADMIN_PASSWORD = "use-a-unique-password-of-at-least-12-characters"
npm --prefix backend run create-admin
```

The script creates an administrator only; it does not offer a public administrator-registration endpoint. Sign in through `POST /api/auth/admin/login`. The authenticated administrator can:

- Create a branch for an active, verified teacher with `POST /api/admin/branches`, sending the teacher ID, branch `name`, and `code`. The existing-branch duplicate checks still apply. The branch is created under that teacher so it is available to their subjects and classes.
- Assign a teacher to an owned subject and specific class with `POST /api/admin/teacher-assignments`, sending `teacher`, `subject`, `branch`, `academicBatch`, `studyYear`, and `semester`. The teacher can view active assignments through `GET /api/teacher/assignments`. Administrators can list assignments and activate/deactivate them through the `/api/admin/teacher-assignments` endpoints.

Student registration does not require an administrator-issued PIN. Students submit their active branch, academic batch, semester, and student ID, then their registration stays in `accountStatus: "pending"` until the class incharge approves the account. The server validates the selected branch and academic data, but the actual login gate remains teacher approval.

New student registrations are saved with `accountStatus: "pending"` and are not signed in automatically. The registration confirmation shows the branch, course year, semester, and batch supplied during registration. Students can log in and access protected APIs only after the class incharge approves them. Legacy student accounts with `active` status remain compatible.

The student registration branch selector lists every active branch record configured for the college. Add missing college branches through administrator branch management; inactive branches are not offered for new registrations. Registration submissions are checked against an active branch in the configured institution.

Teacher registration collects the employee ID, department, an active branch configured by the administrator, a designation (`Lecturer`, `Class Teacher`, `HOD`, or `Guest Teacher`), and contact details, then creates a `verificationStatus: "PENDING"` application. The selected branch is validated by the server and shown on the administrator's teacher review list. A registration designation is profile information only; administrators approve accounts and assign staff permissions separately. Registration does not automatically sign the teacher in. Administrators review applicants with `GET /api/admin/teachers` and approve or reject with `PATCH /api/admin/teachers/:id/verification`, sending `verificationStatus: "APPROVED"` or `"REJECTED"`; rejection requires a reason. Pending or rejected teachers cannot sign in or use teacher APIs. Existing teacher accounts without a verification status remain compatible and are treated as verified.

Administrators assign one class incharge for each branch/batch/year/semester with `PUT /api/admin/class-incharges`, using `teacher`, `branch`, `academicBatch`, `studyYear`, and `semester`. Repeating the request for the same class reassigns its incharge. Assignments can be listed with `GET /api/admin/class-incharges` and deactivated/reactivated with `PATCH /api/admin/class-incharges/:id/status`. The assigned teacher receives the `class_teacher` staff role. Pending student registrations appear in that class teacher's Student Approvals list only when the student's branch, batch, year, and semester match the assignment; only that assigned class teacher can approve or reject them. The API also supports administrator-managed `class_teacher`, `hod`, `principal`, and `guest_lecturer` staff roles through `GET /api/admin/teachers` and `PATCH /api/admin/teachers/:id/staff-role`; role changes are never accepted from public registration or profile updates. The separate top-level `admin` role remains restricted to administrator accounts created from a trusted terminal.

Only an active class teacher can list and manage students from their assigned classes through `GET /api/teacher/students/approvals?status=pending|approved|rejected|suspended`. The teacher actions are `PATCH /api/teacher/students/:id/approve`, `/reject` (requires a reason), `/suspend` (reason optional), and `/reactivate`. Every action checks the student's class against the teacher's current class-incharge assignments and records an audit-history entry. Pending/rejected/suspended accounts cannot sign in; suspending a student also invalidates access to protected APIs on the next request. `GET /api/student/profile` and `/api/student/account-status` return the authenticated student's profile/status.

An authenticated administrator can sign in at `/admin/login` and use the `/admin/management` page to review teacher applications and assign class incharges. Student approval is handled by the assigned class incharge rather than an administrator-issued PIN. No public admin registration is exposed.

Administrators can create branches from the always-visible Branch management section on `/admin/management`. Select an approved teacher to manage the branch, then enter its name and unique code. Password recovery is available from student, teacher, and administrator login pages; each reset link is sent to the email address registered to that role, expires after one hour, and can be used once.

Example request bodies:

```json
{
  "teacher": "<teacher-user-object-id>",
  "subject": "<teacher-owned-subject-object-id>",
  "branch": "<active-branch-object-id>",
  "academicBatch": "2024-2027",
  "studyYear": 1,
  "semester": 1
}
```

Administrator APIs remain protected by the administrator role; no public administrator registration endpoint exists.

## Examination workflow

- Teachers can use the institute's branches and manage their own subjects. They can create and publish descriptive examinations only for an active administrator-assigned subject and class, after the configured question count and total marks are satisfied.
- Teacher IDs are globally unique and immutable after registration. Students can optionally connect to teachers from their account, but connections do not control subject or test access.
- Branches and all authenticated records are scoped to Government Polytechnic, Masab Tank. Institute identity is assigned by the server, not trusted from a registration form.
- Students see active subjects and published tests assigned to their branch, batch, year, and semester, without needing a teacher connection. The backend enforces the full class assignment when listing tests, viewing test details, and starting an exam; students from other branches or classes cannot access the test. Upcoming and closed tests are identified from the configured exam window. Subject details include that subject's published tests. The test/question APIs do not send answer keys during an exam.
- Teachers configure an opening and closing date/time for each test. The backend enforces the window using server time and caps the attempt deadline at the earlier of the test duration or window close.
- Starting a test creates one official attempt per student/test. Its deadline is persisted by the backend; answers are saved against the attempt, late writes are rejected, and a backend worker expires due attempts even if the student has left the page.
- During an active attempt, browser-reported tab changes, focus loss, full-screen exits, restricted clipboard/context-menu actions, and keyboard shortcuts are stored against that attempt and shown to the teacher who owns the test. These browser signals are review evidence, not tamper-proof proof or a guarantee against cheating.
- Exams accept descriptive text answers only. Submission and timer expiry save answers and queue a pending result; teachers manually award marks and feedback, then explicitly publish a fully evaluated result. Students can only view published results.

For an existing database, stop the API and back up MongoDB before running migrations. Run `npm --prefix backend run migrate:teacher-ids`, `npm --prefix backend run migrate:branch-institutions`, and `npm --prefix backend run migrate:student-ids` before `npm --prefix backend run migrate:user-encryption`. Review migration output and resolve any reported legacy ownership/data issues before starting the API.
- Teachers can review and grade submissions only for tests they created. Student progress and dashboard analytics are derived from persisted results.
- Tests with an official attempt cannot be edited or unpublished; tests are archived rather than hard-deleted to preserve historical records.

## Validation

- Backend integration tests: `npm --prefix backend test`
- Frontend production build: `npm run build`
- Frontend lint: `npm run lint`

The integration tests use an in-memory MongoDB server and Supertest. A running MongoDB instance and valid `backend/.env` are required to run the application.

## Mahabubnagar target configuration (pending verification)

The codebase uses React/Vite, Express, and MongoDB/Mongoose. It is not a PHP/MySQL application, so the existing stack and data are preserved rather than rewritten.

The runtime tenant is still the pre-existing Government Polytechnic, Masab Tank configuration. Do not treat it as Mahabubnagar or migrate existing users, branches, PIN authorizations, or results into a different institution until authorized identity data and a reviewed migration plan are available.

An administrator can inspect and edit the separate, staged target profile:

- `GET /api/admin/target-institution`
- `PUT /api/admin/target-institution`

The new profile defaults to `Government Polytechnic, Mahabubnagar` with `verificationStatus: "PENDING"` and no institute/college code. It does not change runtime authentication, student identity, or existing MongoDB records. Marking it verified requires a source URL, source title, and verification date. Configuration fields can be edited directly by an authenticated administrator; no administrator UI or academic CSV import workflow is available yet.

### Source verification status

- [SBTET Telangana homepage](https://sbtet.telangana.gov.in/index.html): opened, but the response exposed only a loading image; no institution listing or academic data could be verified.
- [SBTET C-24 curriculum preamble PDF](https://www.sbtet.telangana.gov.in/Downloads/Syllabus/C24/C-24%20Preamble.pdf): the PDF resource was retrieved, but its text could not be extracted in this environment. No scheme rules, subject codes, or assessment details have been imported or marked verified.
- [Shared source link](https://share.google/S52se0UH0ndjPnb3M): redirected to the SBTET homepage above and provided no additional verifiable information.

Accordingly, no Mahabubnagar institution code, branches, official subject records, student PINs, or teacher identities have been added. Obtain an authorized college record or readable official documents before entering such data. Existing branch and subject records in the application are not verified SBTET catalog data.

### Remaining work for the requested update

- Add scheme-aware academic batches, branches, subjects, and examination eligibility after applicable official records are confirmed.
- Add source-linked syllabus/examination catalog records, import preview with duplicate detection, and an admin import/management UI.
- Replace the current Masab Tank tenant only through a separately reviewed, backed-up migration; no production data is rewritten by the target-profile API.
- Add and verify teacher account approval and CSRF protections before production deployment.
