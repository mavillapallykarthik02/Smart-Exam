export function getStudentClassKey(student) {
    return [
        student.branchId || student.branchCode || student.branch || "Unassigned branch",
        student.academicBatch || "Batch not set",
        student.studyYear || "Year not set",
        student.semester || "Semester not set"
    ].join("|");
}

export function getStudentClassLabel(student) {
    const branch = student.branch
        ? `${student.branch}${student.branchCode ? ` (${student.branchCode})` : ""}`
        : "Unassigned branch";
    const batch = student.academicBatch || "Batch not set";
    const year = student.studyYear ? `Year ${student.studyYear}` : "Year not set";
    const semester = student.semester ? `Semester ${student.semester}` : "Semester not set";
    return `${branch} · ${batch} · ${year} · ${semester}`;
}

export function groupStudentsByClass(students) {
    const groups = new Map();
    for (const student of students) {
        const key = getStudentClassKey(student);
        if (!groups.has(key)) {
            groups.set(key, {
                key,
                label: getStudentClassLabel(student),
                students: []
            });
        }
        groups.get(key).students.push(student);
    }
    return [...groups.values()];
}
