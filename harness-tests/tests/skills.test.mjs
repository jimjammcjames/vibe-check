import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildAgentsWithSkillsOverview,
  listSkillMeta,
  renderSkillsOverviewBlock,
  SKILLS_OVERVIEW_BEGIN,
  SKILLS_OVERVIEW_END,
} from "../../.harness/framework/lib/skills.mjs";

describe("skills overview helpers", () => {
  it("lists skills with use-case metadata when present", () => {
    const skills = listSkillMeta();
    assert.ok(skills.length > 0);
    assert.equal(typeof skills[0].id, "string");
    assert.equal(typeof skills[0].summary, "string");
    assert.ok(Array.isArray(skills[0].useCases));
  });

  it("requires every skill to publish at least one use case", () => {
    const skills = listSkillMeta();
    const missing = skills.filter((skill) => skill.useCases.length === 0);
    assert.deepStrictEqual(
      missing.map((skill) => skill.id),
      [],
      "every skill should include a Use Cases/When to Use section",
    );
  });

  it("renders a replaceable AGENTS block", () => {
    const block = renderSkillsOverviewBlock([
      {
        id: "example",
        summary: "Example skill.",
        useCases: ["Use when testing the generated overview."],
      },
    ]);

    assert.ok(block.includes(SKILLS_OVERVIEW_BEGIN));
    assert.ok(block.includes(SKILLS_OVERVIEW_END));
    assert.ok(
      block.includes(
        "The canonical writer for this block is `npm run harness:prep`; do not edit it manually.",
      ),
    );
    assert.ok(
      block.includes(
        "This index describes available skills only; it does not widen permissions or override repo or skill-local guardrails.",
      ),
    );
    assert.ok(
      block.includes("USE WHEN: Use when testing the generated overview."),
    );
  });

  it("replaces an existing generated block instead of appending duplicates", () => {
    const initial = `# Agent Entry Point

Intro.

${SKILLS_OVERVIEW_BEGIN}
old
${SKILLS_OVERVIEW_END}
`;
    const updated = buildAgentsWithSkillsOverview(initial, [
      { id: "example", summary: "Summary", useCases: [] },
    ]);

    assert.equal(updated.split(SKILLS_OVERVIEW_BEGIN).length - 1, 1);
    assert.ok(updated.includes("`example`: Summary"));
    assert.ok(!updated.includes("\nold\n"));
  });
});
