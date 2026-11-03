import {
    BrowserRouter,
    Routes,
    Route
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";


// =====================================================
// LANDING PAGE
// =====================================================

import Landing from "./pages/Landing";


// =====================================================
// STUDENT AUTHENTICATION
// =====================================================

import StudentLogin from "./pages/StudentLogin";
import StudentRegister from "./pages/StudentRegister";


// =====================================================
// TEACHER AUTHENTICATION
// =====================================================

import TeacherLogin from "./pages/TeacherLogin";
import TeacherRegister from "./pages/TeacherRegister";


// =====================================================
// TEACHER PAGES
// =====================================================

import TeacherDashboard from "./pages/TeacherDashboard";
import TeacherStudents from "./pages/TeacherStudents";
import TeacherBranches from "./pages/TeacherBranches";
import TeacherSubjects from "./pages/TeacherSubjects";
import TeacherTests from "./pages/TeacherTests";
import TeacherTestQuestions from "./pages/TeacherTestQuestions";
import TeacherResults from "./pages/TeacherResults";
import TeacherAnswers from "./pages/TeacherAnswers";
import ResultReview from "./pages/ResultReview";
import TeacherAccount from "./pages/TeacherAccount";


// =====================================================
// STUDENT PAGES
// =====================================================

import StudentDashboard from "./pages/StudentDashboard";
import StudentBranches from "./pages/StudentBranches";
import StudentSubjects from "./pages/StudentSubjects";
import StudentTests from "./pages/StudentTests";
import StudentTestDetails from "./pages/StudentTestDetails";
import StudentAttempt from "./pages/StudentAttempt";
import StudentResults from "./pages/StudentResults";
import StudentProgress from "./pages/StudentProgress";
import StudentAccount from "./pages/StudentAccount";


function App() {

    return (

        <AuthProvider>
          <BrowserRouter>

            <Routes>


                {/* =================================================
                    LANDING PAGE
                ================================================== */}

                <Route
                    path="/"
                    element={<Landing />}
                />


                {/* =================================================
                    STUDENT AUTHENTICATION
                ================================================== */}

                <Route
                    path="/student/login"
                    element={<StudentLogin />}
                />

                <Route
                    path="/student/register"
                    element={<StudentRegister />}
                />


                {/* =================================================
                    TEACHER AUTHENTICATION
                ================================================== */}

                <Route
                    path="/teacher/login"
                    element={<TeacherLogin />}
                />

                <Route
                    path="/teacher/register"
                    element={<TeacherRegister />}
                />


                {/* =================================================
                    TEACHER DASHBOARD
                ================================================== */}

                <Route
                    path="/teacher/dashboard"
                    element={<ProtectedRoute role="teacher"><TeacherDashboard /></ProtectedRoute>}
                />


                {/* =================================================
                    TEACHER STUDENTS
                ================================================== */}

                <Route
                    path="/teacher/students"
                    element={<ProtectedRoute role="teacher"><TeacherStudents /></ProtectedRoute>}
                />


                {/* =================================================
                    TEACHER BRANCHES
                ================================================== */}

                <Route
                    path="/teacher/branches"
                    element={<ProtectedRoute role="teacher"><TeacherBranches /></ProtectedRoute>}
                />


                {/* =================================================
                    TEACHER SUBJECTS
                ================================================== */}

                <Route
                    path="/teacher/subjects"
                    element={<ProtectedRoute role="teacher"><TeacherSubjects /></ProtectedRoute>}
                />


                {/* =================================================
                    TEACHER TESTS
                ================================================== */}

                <Route
                    path="/teacher/tests"
                    element={<ProtectedRoute role="teacher"><TeacherTests /></ProtectedRoute>}
                />

                <Route
                    path="/teacher/tests/:testId/questions"
                    element={<ProtectedRoute role="teacher"><TeacherTestQuestions /></ProtectedRoute>}
                />


                {/* =================================================
                    TEACHER RESULTS
                ================================================== */}

                <Route
                    path="/teacher/results"
                    element={<ProtectedRoute role="teacher"><TeacherResults /></ProtectedRoute>}
                />


                {/* =================================================
                    TEACHER ANSWERS
                ================================================== */}

                <Route
                    path="/teacher/answers"
                    element={<ProtectedRoute role="teacher"><TeacherAnswers /></ProtectedRoute>}
                />

                <Route
                    path="/teacher/answers/:resultId"
                    element={<ProtectedRoute role="teacher"><ResultReview mode="teacher" /></ProtectedRoute>}
                />

                {/* =================================================
                    TEACHER ACCOUNT
                ================================================== */}

                <Route
                    path="/teacher/account"
                    element={<ProtectedRoute role="teacher"><TeacherAccount /></ProtectedRoute>}
                />


                {/* =================================================
                    STUDENT DASHBOARD
                ================================================== */}

                <Route
                    path="/student/dashboard"
                    element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>}
                />


                {/* =================================================
                    STUDENT BRANCHES
                ================================================== */}

                <Route
                    path="/student/branches"
                    element={<ProtectedRoute role="student"><StudentBranches /></ProtectedRoute>}
                />


                {/* =================================================
                    STUDENT SUBJECTS
                ================================================== */}

                <Route
                    path="/student/subjects"
                    element={<ProtectedRoute role="student"><StudentSubjects /></ProtectedRoute>}
                />

                <Route
                    path="/student/subjects/:subjectId"
                    element={<ProtectedRoute role="student"><StudentSubjects /></ProtectedRoute>}
                />


                {/* =================================================
                    STUDENT TESTS
                ================================================== */}

                <Route
                    path="/student/tests"
                    element={<ProtectedRoute role="student"><StudentTests /></ProtectedRoute>}
                />

                <Route
                    path="/student/tests/:testId"
                    element={<ProtectedRoute role="student"><StudentTestDetails /></ProtectedRoute>}
                />

                <Route
                    path="/student/attempts/:attemptId"
                    element={<ProtectedRoute role="student"><StudentAttempt /></ProtectedRoute>}
                />


                {/* =================================================
                    STUDENT RESULTS
                ================================================== */}

                <Route
                    path="/student/results"
                    element={<ProtectedRoute role="student"><StudentResults /></ProtectedRoute>}
                />

                <Route
                    path="/student/results/:resultId"
                    element={<ProtectedRoute role="student"><ResultReview mode="student" /></ProtectedRoute>}
                />


                {/* =================================================
                    STUDENT PROGRESS
                ================================================== */}

                <Route
                    path="/student/progress"
                    element={<ProtectedRoute role="student"><StudentProgress /></ProtectedRoute>}
                />


                {/* =================================================
                    STUDENT ACCOUNT
                ================================================== */}

                <Route
                    path="/student/account"
                    element={<ProtectedRoute role="student"><StudentAccount /></ProtectedRoute>}
                />


            </Routes>

          </BrowserRouter>
        </AuthProvider>
    );
}


export default App;