import {
    getTargetInstitutionConfiguration,
    updateTargetInstitutionConfiguration
} from "../services/institutionConfigurationService.js";
import { sendSuccess } from "../utils/apiResponse.js";

export async function getTargetInstitution(_request, response) {
    return sendSuccess(response, {
        institution: await getTargetInstitutionConfiguration()
    });
}

export async function putTargetInstitution(request, response) {
    return sendSuccess(response, {
        institution: await updateTargetInstitutionConfiguration(
            request.body,
            request.user.id
        )
    }, "Target institution configuration saved.");
}
