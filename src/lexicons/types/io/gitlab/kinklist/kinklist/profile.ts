import type {} from "@atcute/lexicons";
import * as v from "@atcute/lexicons/validations";
import type {} from "@atcute/lexicons/ambient";

const _kinkCategorySchema = /*#__PURE__*/ v.object({
  $type: /*#__PURE__*/ v.optional(
    /*#__PURE__*/ v.literal("io.gitlab.kinklist.kinklist.profile#kinkCategory"),
  ),
  /**
   * Description of the category/section (e.g., "General kinks", "Taboo kinks", "Bodies kinks")
   */
  description: /*#__PURE__*/ v.optional(/*#__PURE__*/ v.string()),
  /**
   * Array of kink definitions
   */
  get kinks() {
    return /*#__PURE__*/ v.array(kinkDefinitionSchema);
  },
  /**
   * The category/section name (e.g., "General", "Taboo", "Bodies")
   */
  name: /*#__PURE__*/ v.string(),
  /**
   * Array of participant types (e.g., "Self", "Partner", "Giving", "Receiving")
   */
  participants: /*#__PURE__*/ v.array(/*#__PURE__*/ v.string()),
});
const _kinkDefinitionSchema = /*#__PURE__*/ v.object({
  $type: /*#__PURE__*/ v.optional(
    /*#__PURE__*/ v.literal(
      "io.gitlab.kinklist.kinklist.profile#kinkDefinition",
    ),
  ),
  /**
   * Description of the kink (e.g., "Restraining or being restrained", "Watching others engage in sexual activities")
   */
  description: /*#__PURE__*/ v.optional(/*#__PURE__*/ v.string()),
  /**
   * The name of the kink (e.g., "Bondage", "Voyeurism")
   */
  name: /*#__PURE__*/ v.string(),
});
const _kinkEntrySchema = /*#__PURE__*/ v.object({
  $type: /*#__PURE__*/ v.optional(
    /*#__PURE__*/ v.literal("io.gitlab.kinklist.kinklist.profile#kinkEntry"),
  ),
  /**
   * The preference choice for this kink
   */
  choice: /*#__PURE__*/ v.literalEnum([
    "favorite",
    "like",
    "maybe",
    "no",
    "not-entered",
    "okay",
    "want-to-try",
  ]),
  /**
   * The name of the kink (e.g., "Bondage", "Voyeurism")
   */
  name: /*#__PURE__*/ v.string(),
  /**
   * The participant type (e.g., "Self", "Partner", "Giving", "Receiving")
   */
  participant: /*#__PURE__*/ v.string(),
  /**
   * The category/section this kink belongs to (e.g., "General", "Taboo", "Bodies")
   */
  section: /*#__PURE__*/ v.string(),
});
const _mainSchema = /*#__PURE__*/ v.record(
  /*#__PURE__*/ v.literal("self"),
  /*#__PURE__*/ v.object({
    $type: /*#__PURE__*/ v.literal("io.gitlab.kinklist.kinklist.profile"),
    /**
     * When this profile was created
     */
    createdAt: /*#__PURE__*/ v.datetimeString(),
    /**
     * Array of kink category/section definitions
     */
    get kinkDefinitions() {
      return /*#__PURE__*/ v.optional(
        /*#__PURE__*/ v.array(kinkCategorySchema),
      );
    },
    /**
     * Array of kink preferences
     */
    get kinks() {
      return /*#__PURE__*/ v.array(kinkEntrySchema);
    },
    /**
     * When this profile was last updated
     */
    updatedAt: /*#__PURE__*/ v.datetimeString(),
  }),
);

type kinkCategory$schematype = typeof _kinkCategorySchema;
type kinkDefinition$schematype = typeof _kinkDefinitionSchema;
type kinkEntry$schematype = typeof _kinkEntrySchema;
type main$schematype = typeof _mainSchema;

export interface kinkCategorySchema extends kinkCategory$schematype {}
export interface kinkDefinitionSchema extends kinkDefinition$schematype {}
export interface kinkEntrySchema extends kinkEntry$schematype {}
export interface mainSchema extends main$schematype {}

export const kinkCategorySchema = _kinkCategorySchema as kinkCategorySchema;
export const kinkDefinitionSchema =
  _kinkDefinitionSchema as kinkDefinitionSchema;
export const kinkEntrySchema = _kinkEntrySchema as kinkEntrySchema;
export const mainSchema = _mainSchema as mainSchema;

export interface KinkCategory extends v.InferInput<typeof kinkCategorySchema> {}
export interface KinkDefinition extends v.InferInput<
  typeof kinkDefinitionSchema
> {}
export interface KinkEntry extends v.InferInput<typeof kinkEntrySchema> {}
export interface Main extends v.InferInput<typeof mainSchema> {}

declare module "@atcute/lexicons/ambient" {
  interface Records {
    "io.gitlab.kinklist.kinklist.profile": mainSchema;
  }
}
