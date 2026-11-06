import { InstitutionConfiguration } from "../models/InstitutionConfiguration.js";

const configurationKey = "target";
const editableFields = [
    "name",
    "instituteCode",
    "collegeCode",
    "location",
    "affiliation",
    "verificationStatus",
    "sourceUrl",
    "sourceTitle",
    "lastVerifiedAt"
];
const identityFields = ["name", "instituteCode", "collegeCode", "location"];

function configurationError(message, field) {
    const error = new Error(message);
    error.statusCode = 400;
    if (field) error.field = field;
    return error;
}

function serializeConfiguration(configuration) {
    return {
        id: configuration.id,
        name: configuration.name,
        instituteCode: configuration.instituteCode,
        collegeCode: configuration.collegeCode,
        location: configuration.location,
        affiliation: configuration.affiliation,
        verificationStatus: configuration.verificationStatus,
        sourceUrl: configuration.sourceUrl,
        sourceTitle: configuration.sourceTitle,
        lastVerifiedAt: configuration.lastVerifiedAt,
        updatedAt: configuration.updatedAt
    };
}

async function getOrCreateConfiguration() {
    return InstitutionConfiguration.findOneAndUpdate(
        { key: configurationKey },
        { $setOnInsert: { key: configurationKey } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );
}

export async function getTargetInstitutionConfiguration() {
    return serializeConfiguration(await getOrCreateConfiguration());
}

export async function updateTargetInstitutionConfiguration(input, adminId) {
    const configuration = await getOrCreateConfiguration();
    const changesIdentity = identityFields.some((field) =>
        Object.hasOwn(input, field) && input[field] !== configuration[field]
    );
    const updates = Object.fromEntries(
        Object.entries(input).filter(([field]) => editableFields.includes(field))
    );

    if (changesIdentity && input.verificationStatus !== "VERIFIED") {
        updates.verificationStatus = "PENDING";
        updates.lastVerifiedAt = null;
    }

    const willBeVerified = updates.verificationStatus === "VERIFIED" ||
        (!Object.hasOwn(updates, "verificationStatus") &&
            configuration.verificationStatus === "VERIFIED");
    const hasFreshSource = Object.hasOwn(input, "sourceUrl") &&
        Object.hasOwn(input, "sourceTitle") &&
        Object.hasOwn(input, "lastVerifiedAt");
    const sourceEvidenceChanged = ["sourceUrl", "sourceTitle", "lastVerifiedAt"].some(
        (field) => Object.hasOwn(input, field) && input[field] !== configuration[field]
    );
    const sourceUrl = Object.hasOwn(updates, "sourceUrl")
        ? updates.sourceUrl
        : configuration.sourceUrl;
    const sourceTitle = Object.hasOwn(updates, "sourceTitle")
        ? updates.sourceTitle
        : configuration.sourceTitle;
    const lastVerifiedAt = Object.hasOwn(updates, "lastVerifiedAt")
        ? updates.lastVerifiedAt
        : configuration.lastVerifiedAt;
    if (willBeVerified && (!sourceUrl || !sourceTitle || !lastVerifiedAt ||
        ((changesIdentity || sourceEvidenceChanged) && !hasFreshSource))) {
        throw configurationError(
            "Provide a source URL, source title, and verification date before marking the institution verified.",
            "sourceUrl"
        );
    }

    if (updates.verificationStatus === "PENDING") {
        updates.lastVerifiedAt = null;
    }
    Object.assign(configuration, updates, { updatedBy: adminId });
    await configuration.save();
    return serializeConfiguration(configuration);
}
