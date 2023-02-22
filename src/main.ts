import * as core from "@actions/core";
import { rimraf } from "rimraf";
import decompress from "decompress";
import { nanoid } from "nanoid";
import { Octokit, App } from "octokit";
import simpleGit, { SimpleGit, SimpleGitOptions } from "simple-git";

const orgToken = core.getInput("orgToken");
const repoOrg = core.getInput("repoOrg");
const repoName = core.getInput("repoName");
const repoDescription = core.getInput("repoDescription");
const isPublic = core.getInput("repoVisibility") === "public";
const zipPath = core.getInput("zipPath");
const workplace = process.env.GITHUB_WORKSPACE;

const octokit = new Octokit({
  auth: orgToken,
});

async function main(): Promise<void> {
  const tmpPath = `ex${nanoid(10)}tmp`;
  let repoData;
  if (repoOrg) {
    repoData = await octokit.rest.repos.createInOrg({
      org: repoOrg,
      name: repoName,
      description: repoDescription,
      private: !isPublic,
      has_issues: true,
      has_projects: true,
      has_wiki: true,
    });
  } else {
    repoData = await octokit.rest.repos.createForAuthenticatedUser({
      name: repoName,
      description: repoDescription,
      private: !isPublic,
      has_issues: true,
      has_projects: true,
      has_wiki: true,
    });
  }

  const { clone_url: cloneUrl, html_url: url } = repoData.data;
  console.log("cloneUrl", cloneUrl);
  console.log(`${repoName} created successfully!`);
  core.setOutput("repoUrl", url);

  // Unzip the zip file
  const unzipped = await decompress(zipPath, `${workplace}/${tmpPath}`);
  console.log("one of the unzipped file", unzipped[0]);

  const options: Partial<SimpleGitOptions> = {
    baseDir: `${workplace}/${tmpPath}`,
    binary: "git",
    maxConcurrentProcesses: 6,
    trimmed: false,
  };

  const git: SimpleGit = simpleGit(`${workplace}/${tmpPath}`, {
    config: ["user.name=github-actions", "user.email=octocat@github.com"],
  });

  console.log("git init");
  await git.init();
  console.log("git add");
  await git.add("./*");
  console.log("git commit");
  await git.commit("Initial Commit");
  console.log("git remote add origin");
  await git.addRemote(
    "origin",
    cloneUrl.replace("https://", `https://${orgToken}@`)
  );
  console.log("git branch to main");
  await git.branch(["-M", "main"]);
  console.log("git push -u origin main");
  await git.push(["-u", "origin", "main"]);
  console.log(`remove temp file: ${workplace}/${tmpPath}`);
  await rimraf(`${workplace}/${tmpPath}`);
}

main();
