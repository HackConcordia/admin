import { listIncludes } from "./list-field";
import { isOtherLevel, requiresDegreeDetails } from "./field-options";

type Plain = Record<string, unknown>;

/** One hidden-question rule: while `hidden(values)` holds, `clears` are reset to their empty value. */
interface HideRule {
  /** Fields the rule reads. The rule acts only when all of them are known (in the update or the stored application). */
  controllers: readonly string[];
  hidden: (values: Plain) => boolean;
  clears: Plain;
}

const RULES: readonly HideRule[] = [
  { controllers: ["country"], hidden: (v) => v.country !== "CA", clears: { city: "" } },
  { controllers: ["school"], hidden: (v) => v.school !== "other", clears: { schoolOther: "" } },
  { controllers: ["currentLevelOfSchooling"], hidden: (v) => !isOtherLevel(v.currentLevelOfSchooling), clears: { otherLevelOfSchooling: "" } },
  {
    controllers: ["currentLevelOfSchooling"],
    hidden: (v) => !requiresDegreeDetails(v.currentLevelOfSchooling),
    clears: { degreeLength: "", degreeType: "" },
  },
  { controllers: ["discipline"], hidden: (v) => v.discipline !== "other", clears: { disciplineOther: "" } },
  { controllers: ["languagesSpoken"], hidden: (v) => !listIncludes(v.languagesSpoken, "other"), clears: { languagesSpokenOther: "" } },
  {
    controllers: ["dietaryRestrictions"],
    hidden: (v) => !listIncludes(v.dietaryRestrictions, "other"),
    clears: { dietaryRestrictionsDescription: "" },
  },
  {
    controllers: ["isRegisteredForCoop"],
    hidden: (v) => v.isRegisteredForCoop !== true,
    clears: { jobRolesLookingFor: "", jobTypesInterested: [], jobTypesInterestedOther: "" },
  },
  { controllers: ["jobTypesInterested"], hidden: (v) => !listIncludes(v.jobTypesInterested, "other"), clears: { jobTypesInterestedOther: "" } },
];

/**
 * Clears answers to questions the form hides, so a stale value never outlives a change of the
 * answer that controls it (e.g. unticking co-op clears the job questions). The controlling value is
 * the update's, else the stored application's (`stored`), so a partial PATCH is judged like the whole
 * form. A rule acts when the update sends its controller or one of the fields it clears, and only
 * when the controller is known. Returns a new object.
 */
export function clearHiddenFields(update: Plain, stored: Plain = {}): Plain {
  const next: Plain = { ...update };
  let effective: Plain = { ...stored, ...update };

  for (const rule of RULES) {
    const touched = [...rule.controllers, ...Object.keys(rule.clears)].some((key) => key in update);
    const known = rule.controllers.every((key) => effective[key] !== undefined);
    if (!touched || !known || !rule.hidden(effective)) continue;
    Object.assign(next, rule.clears);
    effective = { ...effective, ...rule.clears };
  }
  return next;
}
