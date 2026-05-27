const { getAllInstallations, githubRequest } = require("./github-auth");
const { handleInstallation } = require("./handlers/installation");

async function runWeeklyChecks() {
  console.log("Starting weekly checks for all installations...");

  let installations;
  try {
    installations = await getAllInstallations();
  } catch (err) {
    console.error("Failed to fetch installations:", err.message);
    return;
  }

  console.log(`Found ${installations.length} installations`);

  for (const installation of installations) {
    try {
      const { repositories } = await githubRequest(
        `/installation/repositories?per_page=100`,
        installation.id
      );

      for (const repo of repositories || []) {
        // force=false — handleInstallation will skip if checked within 7 days
        await handleInstallation(installation.id, repo.full_name, false);
        await new Promise((r) => setTimeout(r, 2000));
      }
    } catch (err) {
      console.error(`Error with installation ${installation.id}:`, err.message);
    }
  }

  console.log("Weekly checks complete.");
}

module.exports = { runWeeklyChecks };