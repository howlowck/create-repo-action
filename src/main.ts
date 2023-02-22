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

  const { git_url: gitUrl, url } = repoData.data;
  console.log("gitUrl", gitUrl);
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

  await git.init();
  await git.add("./*");
  await git.commit("Initial Commit");
  await git.addRemote("origin", gitUrl);
  await git.branch(["-M", "main"]);
  await git.push(["-u", "origin", "main"]);
  await rimraf(`${workplace}/${tmpPath}`);
}

main();
