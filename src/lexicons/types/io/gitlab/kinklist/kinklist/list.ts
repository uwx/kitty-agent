import type {} from "@atcute/lexicons";
import * as v from "@atcute/lexicons/validations";
import type {} from "@atcute/lexicons/ambient";
import * as IoGitlabKinklistKinklistProfile from "./profile.js";

const _mainSchema = /*#__PURE__*/ v.record(
  /*#__PURE__*/ v.tidString(),
  /*#__PURE__*/ v.object({
    $type: /*#__PURE__*/ v.literal("io.gitlab.kinklist.kinklist.list"),
    /**
     * When this list was created
     */
    createdAt: /*#__PURE__*/ v.datetimeString(),
    /**
     * Array of kink category/section definitions
     */
    get kinkDefinitions() {
      return /*#__PURE__*/ v.array(
        IoGitlabKinklistKinklistProfile.kinkCategorySchema,
      );
    },
  }),
);

type main$schematype = typeof _mainSchema;

export interface mainSchema extends main$schematype {}

export const mainSchema = _mainSchema as mainSchema;

export interface Main extends v.InferInput<typeof mainSchema> {}

declare module "@atcute/lexicons/ambient" {
  interface Records {
    "io.gitlab.kinklist.kinklist.list": mainSchema;
  }
}
