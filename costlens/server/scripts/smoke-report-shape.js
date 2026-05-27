import { CostModeler } from "../analysis/cost-modeler.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const modeler = new CostModeler({ apiKey: "test-key", model: "gpt-4o-mini" });

  const infra = modeler.normalizeInfraCost({ breakdown: "bad", signals: null, monthlyEstimate: {} });
  const build = modeler.normalizeBuildCost({ breakdown: null, techStack: "bad", teamSize: {} });
  const buyer = modeler.normalizeBuyerCost({ plans: null, tcoComparison: {}, competitorComparison: null });

  assert(Array.isArray(infra.breakdown), "Infra breakdown should always be an array");
  assert(Array.isArray(build.breakdown), "Build breakdown should always be an array");
  assert(Array.isArray(buyer.plans), "Buyer plans should always be an array");
  assert(typeof infra.monthlyEstimate.low === "number", "Infra monthly low should be numeric");
  assert(typeof build.teamSize.min === "number", "Build team min should be numeric");
  assert(typeof buyer.plans[0].name === "string", "Buyer plan name should be string");
  assert(Array.isArray(infra.evidenceSources), "Infra should include evidenceSources");
  assert(Array.isArray(build.validationWarnings), "Build should include validationWarnings");
  assert(typeof buyer.confidence?.overall === "number", "Buyer should include confidence score");

  console.log("Smoke report-shape checks passed.");
}

main().catch((error) => {
  console.error("Smoke report-shape checks failed:", error.message);
  process.exit(1);
});
