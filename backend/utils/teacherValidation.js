export const TEACHER_ID_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,39}$/u;
export const TEACHER_BRANCH_CODE_PATTERN = /^[A-Z]{2,6}$/u;
export const TEACHER_BRANCH_PIN_PATTERN = /^\d{5}-[A-Z]{2,6}-\d{3}$/u;

export function normalizeTeacherId(value = "") {
    if (value === null || value === undefined) {
        return "";
    }
    return String(value).trim().toUpperCase();
}

export function normalizeTeacherBranchCode(value = "") {
    if (value === null || value === undefined) {
        return "";
    }
    return String(value).trim().toUpperCase();
}

export function normalizeTeacherBranchPin(value = "") {
    if (value === null || value === undefined) {
        return "";
    }
    return String(value).trim().toUpperCase();
}

export function isValidTeacherId(value) {
    return TEACHER_ID_PATTERN.test(normalizeTeacherId(value));
}

export function isValidTeacherBranchCode(value) {
    return TEACHER_BRANCH_CODE_PATTERN.test(normalizeTeacherBranchCode(value));
}

export function isValidTeacherBranchPin(value) {
    return TEACHER_BRANCH_PIN_PATTERN.test(normalizeTeacherBranchPin(value));
}
