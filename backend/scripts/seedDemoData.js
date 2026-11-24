import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { INSTITUTION, INSTITUTION_KEY } from "../config/institution.js";
import { Branch } from "../models/Branch.js";
import { ClassTeacherAssignment } from "../models/ClassTeacherAssignment.js";
import { Subject } from "../models/Subject.js";
import { TeacherAssignment } from "../models/TeacherAssignment.js";
import { TeacherBranchRequest } from "../models/TeacherBranchRequest.js";
import { User } from "../models/User.js";
import { createLookupHash } from "../utils/fieldEncryption.js";

export const DEMO_PASSWORD = "Demo@123";
export const DEMO_BATCH = "2025-2028";

const branches = [
    { code: "DCS", name: "Demo Computer Engineering" },
    { code: "DEC", name: "Demo Electronics and Communication Engineering" },
    { code: "DEE", name: "Demo Electrical Engineering" },
    { code: "DME", name: "Demo Mechanical Engineering" },
    { code: "DCE", name: "Demo Civil Engineering" },
    { code: "DAIML", name: "Demo Artificial Intelligence and Machine Learning" }
];

const teacherNames = [
    "Aarav Mehta",
    "Ananya Rao",
    "Kabir Shah",
    "Mira Reddy",
    "Ishaan Kumar"
];

const studentNames = [
    "Aditi Sharma",
    "Arjun Rao",
    "Diya Patel",
    "Rohan Mehta",
    "Sana Khan",
    "Vihaan Reddy",
    "Ira Nair",
    "Dev Malhotra",
    "Myra Das",
    "Kian Joshi"
];

const cohorts = [
    { studyYear: 1, semester: 1 },
    { studyYear: 1, semester: 2 },
    { studyYear: 2, semester: 3 },
    { studyYear: 2, semester: 4 },
    { studyYear: 3, semester: 5 }
];

function assertSafeSeedTarget() {
    if (process.env.SEED_DEMO_DATA !== "true") {
        throw new Error("Set SEED_DEMO_DATA=true to explicitly enable demo seeding.");
    }
    if (process.env.NODE_ENV === "production") {
        throw new Error("Demo data cannot be seeded when NODE_ENV=production.");
    }

    const databaseUrl = new URL(process.env.MONGODB_URI);
    const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
    if (!["mongodb:", "mongodb+srv:"].includes(databaseUrl.protocol) ||
        (!localHosts.has(databaseUrl.hostname) &&
            process.env.SEED_DEMO_DATA_ALLOW_REMOTE !== "true")) {
        throw new Error(
            "Demo seeding is restricted to a local MongoDB URI unless " +
            "SEED_DEMO_DATA_ALLOW_REMOTE=true is explicitly set."
        );
    }
}

async function ensureUser(data) {
    const usernameLookup = createLookupHash(data.username);
    let user = await User.findOne({ usernameLookup });
    if (user && (
        user.role !== data.role ||
        user.institution !== INSTITUTION.name ||
        user.email.toLocaleLowerCase("en") !== data.email.toLocaleLowerCase("en")
    )) {
        throw new Error(`Demo username conflict: ${data.username}`);
    }
    if (!user) user = new User();

    Object.assign(user, {
        ...data,
        institution: INSTITUTION.name,
        institutionKey: INSTITUTION_KEY,
        passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
        accountStatus: data.accountStatus || "active"
    });
    await user.save();
    return user;
}

async function ensureBranch(admin, branchInfo) {
    let branch = await Branch.findOne({
        institutionKey: INSTITUTION_KEY,
        code: branchInfo.code
    });

    if (branch && branch.name !== branchInfo.name) {
        throw new Error(`Demo branch code ${branchInfo.code} belongs to another branch.`);
    }
    if (!branch) {
        branch = await Branch.create({
            ...branchInfo,
            institutionKey: INSTITUTION_KEY,
            description: "Local SmartExam demo branch; sample data only.",
            collegeName: INSTITUTION.name,
            location: INSTITUTION.location,
            createdBy: admin._id,
            isActive: true
        });
    }
    return branch;
}

async function ensureSubject(branchAdmin, branch) {
    const code = `${branch.code}101`;
    let subject = await Subject.findOne({ branch: branch._id, code });
    if (subject && subject.createdBy.toString() !== branchAdmin._id.toString()) {
        throw new Error(`Demo subject code ${code} belongs to another administrator.`);
    }
    if (!subject) {
        subject = await Subject.create({
            name: `${branch.name.replace(/^Demo /u, "")} Fundamentals`,
            code,
            description: "Sample subject for local SmartExam testing.",
            branch: branch._id,
            createdBy: branchAdmin._id,
            isActive: true
        });
    }
    return subject;
}

async function ensureTeacherBranchAccess(teacher, branch, branchAdmin) {
    let request = await TeacherBranchRequest.findOne({
        teacher: teacher._id,
        branch: branch._id
    });
    if (!request) {
        request = new TeacherBranchRequest({
            teacher: teacher._id,
            branch: branch._id
        });
    }
    request.status = "APPROVED";
    request.reason = "";
    request.reviewedBy = branchAdmin._id;
    request.reviewedAt = new Date();
    await request.save();
}

async function ensureClassAssignments(teacher, branch, subject, branchAdmin, cohort) {
    let classAssignment = await ClassTeacherAssignment.findOne({
        branch: branch._id,
        academicBatch: DEMO_BATCH,
        studyYear: cohort.studyYear,
        semester: cohort.semester
    });
    if (classAssignment && classAssignment.teacher.toString() !== teacher._id.toString()) {
        throw new Error(
            `Demo cohort ${branch.code}/${cohort.studyYear}/${cohort.semester} ` +
            "already has another class incharge."
        );
    }
    if (!classAssignment) {
        classAssignment = new ClassTeacherAssignment({
            teacher: teacher._id,
            branch: branch._id,
            academicBatch: DEMO_BATCH,
            studyYear: cohort.studyYear,
            semester: cohort.semester,
            assignedBy: branchAdmin._id
        });
    }
    classAssignment.isActive = true;
    await classAssignment.save();

    let subjectAssignment = await TeacherAssignment.findOne({
        teacher: teacher._id,
        subject: subject._id,
        academicBatch: DEMO_BATCH,
        studyYear: cohort.studyYear,
        semester: cohort.semester
    });
    if (!subjectAssignment) {
        subjectAssignment = new TeacherAssignment({
            teacher: teacher._id,
            branch: branch._id,
            subject: subject._id,
            academicBatch: DEMO_BATCH,
            studyYear: cohort.studyYear,
            semester: cohort.semester,
            assignedBy: branchAdmin._id
        });
    }
    subjectAssignment.isActive = true;
    await subjectAssignment.save();

    for (let studentIndex = 0; studentIndex < 2; studentIndex += 1) {
        const index = cohort.index * 2 + studentIndex;
        const name = studentNames[index];
        const studentId = `26001-${branch.code}-${String(index + 1).padStart(3, "0")}`;
        await ensureUser({
            name,
            studentId,
            username: `${branch.code.toLocaleLowerCase("en")}.student${String(index + 1).padStart(2, "0")}`,
            email: `${branch.code.toLocaleLowerCase("en")}.student${String(index + 1).padStart(2, "0")}@demo.smartexam.test`,
            mobile: "",
            role: "student",
            branch: branch._id,
            year: `Year ${cohort.studyYear}`,
            academicBatch: DEMO_BATCH,
            accountStatus: "approved",
            studyYear: cohort.studyYear,
            currentAcademicYear: cohort.studyYear,
            academicAdmissionYear: 2025,
            academicCompletionYear: 2028,
            academicSession: DEMO_BATCH,
            academicStatus: "ACTIVE",
            semester: cohort.semester,
            verificationStatus: "APPROVED",
            approvedBy: teacher._id,
            approvedAt: new Date(),
            statusHistory: [{
                action: "APPROVED",
                fromStatus: "pending",
                toStatus: "approved",
                actor: teacher._id,
                reason: "Approved demo student account.",
                at: new Date()
            }]
        });
    }
}

export async function seedDemoData() {
    const admin = await User.findOne({
        role: "admin",
        institutionKey: INSTITUTION_KEY,
        accountStatus: "active"
    });
    if (!admin) {
        throw new Error(
            "Create an active college administrator first (npm --prefix backend run create-admin)."
        );
    }

    const seededBranches = [];
    for (const branchInfo of branches) {
        const branch = await ensureBranch(admin, branchInfo);
        const branchPrefix = branch.code.toLocaleLowerCase("en");
        const branchAdmin = await ensureUser({
            name: `${branch.name.replace(/^Demo /u, "")} Branch Admin`,
            username: `branchadmin.${branchPrefix}`,
            email: `branchadmin.${branchPrefix}@demo.smartexam.test`,
            mobile: "",
            role: "branch_admin",
            administratorId: `BA-${branch.code}-01`,
            branch: branch._id,
            branchName: branch.name,
            verificationStatus: "APPROVED",
            verificationReviewedBy: admin._id,
            verificationReviewedAt: new Date()
        });

        if (branch.branchAdministrator &&
            branch.branchAdministrator.toString() !== branchAdmin._id.toString()) {
            throw new Error(`Branch ${branch.code} is assigned to another branch administrator.`);
        }
        if (!branch.branchAdministrator) {
            branch.branchAdministrator = branchAdmin._id;
            await branch.save();
        }

        const subject = await ensureSubject(branchAdmin, branch);
        for (let teacherIndex = 0; teacherIndex < teacherNames.length; teacherIndex += 1) {
            const cohort = { ...cohorts[teacherIndex], index: teacherIndex };
            const teacherNumber = String(teacherIndex + 1).padStart(2, "0");
            const teacher = await ensureUser({
                name: teacherNames[teacherIndex],
                username: `${branchPrefix}.teacher${teacherNumber}`,
                email: `${branchPrefix}.teacher${teacherNumber}@demo.smartexam.test`,
                mobile: "",
                role: "teacher",
                teacherId: `T-${branch.code}-${teacherNumber}`,
                staffRole: "class_teacher",
                departmentName: branch.name,
                branchName: branch.name,
                designation: "Class Teacher",
                verificationStatus: "APPROVED",
                verificationReviewedBy: admin._id,
                verificationReviewedAt: new Date(),
                approvedBy: admin._id,
                approvedAt: new Date()
            });
            await ensureTeacherBranchAccess(teacher, branch, branchAdmin);
            await ensureClassAssignments(teacher, branch, subject, branchAdmin, cohort);
        }
        seededBranches.push({
            code: branch.code,
            username: branchAdmin.username,
            teachers: teacherNames.length,
            students: studentNames.length
        });
        console.info(`Seeded demo branch ${branch.name}.`);
    }

    return seededBranches;
}

async function main() {
    assertSafeSeedTarget();
    await connectDatabase();
    try {
        const result = await seedDemoData();
        console.info(`Seeded ${result.length} branches, 6 branch admins, 30 teachers, and 60 approved students.`);
        console.info(`Shared demo password: ${DEMO_PASSWORD}`);
        console.info("Login names: branchadmin.<branch>, <branch>.teacher01-05, <branch>.student01-10.");
        console.info("Branch prefixes: dcs, dec, dee, dme, dce, daiml.");
    } finally {
        await disconnectDatabase();
    }
}

if (process.argv[1] &&
    import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    main().catch(async (error) => {
        console.error(`Demo data seeding failed: ${error.message}`);
        if (mongoose.connection.readyState !== 0) {
            await disconnectDatabase();
        }
        process.exitCode = 1;
    });
}
