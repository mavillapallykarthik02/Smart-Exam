# SmartExam - GitHub Copilot Project Instructions

You are working on an existing production-oriented online examination system named SmartExam.

IMPORTANT:
- Do NOT rebuild the project from scratch.
- Do NOT replace the existing UI unnecessarily.
- First inspect the existing project structure and understand the current implementation.
- Preserve working functionality.
- Make changes incrementally.
- Never create duplicate components, routes, models, controllers, or services.
- Before modifying a file, inspect its existing contents.
- Maintain consistency with the existing naming conventions.
- Do not use placeholder functions, TODO implementations, fake API calls, or incomplete code.
- All generated code must be runnable.
- If an existing implementation is incomplete, improve it instead of creating a competing implementation.

## CURRENT FRONTEND

The frontend is a React + Vite application.

Technology:
- React
- Vite
- React Router
- JavaScript
- HTML5
- CSS3
- React Hooks
- Context API where appropriate

Existing frontend areas include:

Student:
- Student login
- Student registration
- Student dashboard
- Student branches
- Student subjects
- Student tests
- Student results
- Student progress
- Student account

Teacher:
- Teacher login
- Teacher registration
- Teacher dashboard
- Teacher students
- Teacher branches
- Teacher subjects
- Teacher tests
- Teacher results
- Teacher answers
- Teacher account

The existing UI should remain the primary frontend.

## TARGET ARCHITECTURE

Convert the project into a full-stack application:

SmartExam/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── utils/
│   │   └── ...
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── config/
│   │   ├── database.js
│   │   └── env.js
│   │
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── studentController.js
│   │   ├── teacherController.js
│   │   ├── branchController.js
│   │   ├── subjectController.js
│   │   ├── testController.js
│   │   ├── questionController.js
│   │   ├── attemptController.js
│   │   ├── resultController.js
│   │   ├── answerController.js
│   │   ├── progressController.js
│   │   └── aiController.js
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── roleMiddleware.js
│   │   ├── errorMiddleware.js
│   │   ├── validationMiddleware.js
│   │   └── rateLimitMiddleware.js
│   │
│   ├── models/
│   │   ├── User.js
│   │   ├── Student.js
│   │   ├── Teacher.js
│   │   ├── Branch.js
│   │   ├── Subject.js
│   │   ├── Test.js
│   │   ├── Question.js
│   │   ├── Attempt.js
│   │   ├── Answer.js
│   │   ├── Result.js
│   │   └── Progress.js
│   │
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── studentRoutes.js
│   │   ├── teacherRoutes.js
│   │   ├── branchRoutes.js
│   │   ├── subjectRoutes.js
│   │   ├── testRoutes.js
│   │   ├── questionRoutes.js
│   │   ├── attemptRoutes.js
│   │   ├── resultRoutes.js
│   │   ├── answerRoutes.js
│   │   ├── progressRoutes.js
│   │   └── aiRoutes.js
│   │
│   ├── services/
│   │   ├── authService.js
│   │   ├── testService.js
│   │   ├── evaluationService.js
│   │   ├── resultService.js
│   │   ├── progressService.js
│   │   └── aiService.js
│   │
│   ├── validators/
│   │   ├── authValidator.js
│   │   ├── testValidator.js
│   │   ├── questionValidator.js
│   │   └── userValidator.js
│   │
│   ├── utils/
│   │   ├── generateToken.js
│   │   ├── asyncHandler.js
│   │   └── apiResponse.js
│   │
│   ├── app.js
│   └── server.js
│
├── .env
├── .env.example
├── .gitignore
└── README.md

IMPORTANT:
Before creating this structure, inspect the current project.
If frontend is currently at the root rather than /frontend, do NOT automatically move it.
Use the existing structure unless restructuring is necessary.
Avoid breaking imports and routes.

# BACKEND TECHNOLOGY

Use:

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- bcrypt/bcryptjs
- express-validator or equivalent validation
- Helmet
- CORS
- express-rate-limit
- dotenv

Use REST APIs.

Backend API base path:

/api

Example:

/api/auth
/api/students
/api/teachers
/api/branches
/api/subjects
/api/tests
/api/questions
/api/attempts
/api/results
/api/answers
/api/progress
/api/ai

# AUTHENTICATION

Implement proper authentication.

There are two roles:

student
teacher

Authentication must support:

POST /api/auth/student/register
POST /api/auth/student/login
POST /api/auth/teacher/register
POST /api/auth/teacher/login

Use:

- hashed passwords
- JWT authentication
- authenticated user middleware
- role-based authorization

Never store plaintext passwords.

Do not trust role information supplied by the frontend.

# USER MODEL

Design the database carefully.

Avoid unnecessarily duplicating authentication information.

Users should have appropriate identity/role information.

Student-specific data should support:

- name
- username
- email
- mobile
- branch
- institution
- year
- role
- account status

Teacher-specific data should support:

- name
- username
- email
- mobile
- institution
- teacherId
- role
- account status

Use MongoDB references where appropriate.

# BRANCHES

Teachers can:

- create branch
- edit branch
- deactivate branch
- activate branch
- view branches

Students can:

- view available branches
- select branch
- access subjects associated with branch

Do not hard-delete branches when historical examination records depend on them.

Prefer an active/deactivated status.

# SUBJECTS

Subjects belong to branches.

Teachers can:

- create subject
- edit subject
- activate/deactivate subject
- view subjects
- filter by branch

Students can view subjects belonging to their branch.

# TESTS

Teachers must be able to:

- create test
- edit test
- publish test
- unpublish test
- delete/deactivate test where appropriate
- assign subject
- assign branch
- set duration
- set number of questions
- select test type
- manage questions

Test types should support at least:

- MCQ
- Typing

Test status:

- draft
- published
- archived

Only published tests should normally be available to students.

# QUESTIONS

Questions must support:

MCQ:
- question text
- options
- correct answer
- marks
- explanation if required

Typing:
- question/instruction
- expected answer/content
- evaluation configuration where required
- marks

Questions must belong to a test.

Teachers should be able to:

- add question
- edit question
- delete question
- reorder questions

# EXAM ATTEMPTS

Students must be able to:

- start an exam
- receive an attempt
- answer questions
- navigate questions
- submit manually
- automatically submit when time expires

Important:

The backend must be authoritative for exam timing.

Do NOT rely only on a frontend JavaScript timer.

Store:

- start time
- end time
- submission time
- status
- student
- test
- answers

Prevent unauthorized access to another student's attempt.

# ANSWERS

Store student answers separately or in a carefully designed attempt structure.

Support:

- selected MCQ option
- typing response
- unanswered questions
- marks awarded
- correctness
- evaluation status

Never expose the correct answer to the student before submission unless the product requirements explicitly require it.

# EVALUATION

Implement automatic evaluation for objective questions.

MCQ:
- compare submitted answer with correct answer
- calculate marks

Typing:
- create a modular evaluation service
- keep evaluation logic isolated
- allow future AI-assisted evaluation

Do not mix evaluation logic directly into React components.

# RESULTS

Results should support:

- total marks
- obtained marks
- percentage
- correct answers
- incorrect answers
- unanswered questions
- pass/fail status
- test information
- student information
- attempt information

Students can see their own results.

Teachers can see results for tests they manage.

# PROGRESS

Student progress should be calculated from real attempt/result data.

Support:

- tests attempted
- average percentage
- subject-wise performance
- recent results
- improvement trends
- completed tests
- practice attempts

Do not create fake progress values once real data is available.

# PRACTICE / RETRY

Students can reattempt completed tests only as practice when the application rules allow it.

Practice attempts must be clearly separated from official attempts.

Do not modify the original official result when a practice attempt is created.

# AI SERVICE

Create AI functionality as a separate service.

Architecture:

Frontend
    ↓
Backend API
    ↓
AI Controller
    ↓
AI Service
    ↓
AI Provider

Do not put AI provider-specific code throughout the application.

AI features may later include:

- performance analysis
- weak-topic identification
- personalized feedback
- improvement suggestions
- answer analysis

AI-generated information must not replace authoritative examination results.

# API DESIGN

Use REST conventions.

Example:

GET    /api/branches
POST   /api/branches
GET    /api/branches/:id
PUT    /api/branches/:id
PATCH  /api/branches/:id/status

GET    /api/subjects
POST   /api/subjects
GET    /api/subjects/:id
PUT    /api/subjects/:id
PATCH  /api/subjects/:id/status

GET    /api/tests
POST   /api/tests
GET    /api/tests/:id
PUT    /api/tests/:id
PATCH  /api/tests/:id/publish
DELETE /api/tests/:id

GET    /api/tests/:testId/questions
POST   /api/tests/:testId/questions

POST   /api/attempts
GET    /api/attempts/:id
POST   /api/attempts/:id/submit

GET    /api/results
GET    /api/results/:id

GET    /api/progress

# SECURITY

Implement:

- JWT authentication
- password hashing
- role-based authorization
- request validation
- Helmet
- CORS configuration
- rate limiting
- centralized error handling
- safe MongoDB queries
- environment variables
- no secrets committed to Git
- authorization checks on every protected resource

Never expose:

- password hashes
- JWT secrets
- database credentials
- API keys

# FRONTEND API INTEGRATION

Create a centralized API service.

For example:

src/services/api.js

The frontend should communicate with the backend through this layer rather than scattering fetch/axios calls throughout components.

Create authentication handling through Context API or the existing project architecture.

Remove localStorage mock data progressively.

Do NOT remove existing UI until the equivalent API functionality works.

# ERROR HANDLING

Backend errors should have a consistent format.

Example:

{
  "success": false,
  "message": "Meaningful error message",
  "errors": []
}

Success responses should also be consistent.

Handle:

- validation errors
- authentication errors
- authorization errors
- not found
- duplicate records
- database failures
- expired tokens
- invalid requests

# DEVELOPMENT RULES

Before changing code:

1. Inspect the relevant existing files.
2. Identify the root cause.
3. Explain the problem briefly.
4. Make the smallest safe change.
5. Check imports.
6. Check route consistency.
7. Check component references.
8. Check API contracts.
9. Check error handling.
10. Run/build/test the affected area.

Never fix an error by hiding it.

Do not:

- disable ESLint just to remove errors
- suppress exceptions
- use empty catch blocks
- add random packages without justification
- duplicate existing functionality
- overwrite working files unnecessarily
- replace the existing UI with a generic template

# ERROR-FIXING MODE

When I ask you to fix an error:

1. Inspect the error.
2. Find the exact source file.
3. Trace the dependency/import/route/API chain.
4. Identify the root cause.
5. Fix the root cause.
6. Check related files for the same problem.
7. Run the appropriate validation/build command.
8. Tell me exactly which files were changed and why.

If the error is caused by architecture rather than one line, fix the architecture cleanly.

# CURRENT DEVELOPMENT PRIORITY

Work in this order:

PHASE 1
Existing frontend stability
- route consistency
- imports
- component errors
- state errors
- responsive UI errors

PHASE 2
Backend foundation
- Express
- MongoDB
- environment configuration
- centralized error handling
- API structure

PHASE 3
Authentication
- registration
- login
- JWT
- password hashing
- role authorization

PHASE 4
Branch and Subject APIs

PHASE 5
Teacher Test Management

PHASE 6
Question Management

PHASE 7
Student Test Access

PHASE 8
Timed Examination Engine

PHASE 9
Automatic Evaluation

PHASE 10
Results and Answers

PHASE 11
Progress and Practice/Reattempt

PHASE 12
AI Analysis

PHASE 13
Security, validation, testing and deployment

# IMPORTANT COPILOT BEHAVIOR

Do not generate all phases at once.

When I request a phase:
- inspect the existing implementation
- implement only that phase
- preserve compatibility with future phases
- provide complete files when a file needs substantial modification
- identify npm packages required
- identify environment variables required
- identify commands to run
- identify files created/modified
- identify how to test the feature

The final implementation should be maintainable, modular, scalable and suitable for a real full-stack examination application.