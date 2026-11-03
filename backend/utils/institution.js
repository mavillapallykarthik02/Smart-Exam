import { INSTITUTION } from "../config/institution.js";

export function normalizeInstitution(institution) {
    return institution
        .normalize("NFKC")
        .trim()
        .replace(/\s+/gu, " ")
        .toLocaleLowerCase("en");
}

export function isSupportedInstitution(institution) {
    return typeof institution === "string" &&
        normalizeInstitution(institution) === normalizeInstitution(INSTITUTION.name);
}
