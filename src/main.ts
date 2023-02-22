import * as core from "@actions/core";
import * as github from "@actions/github";
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

console.log("!!! repoOrg", repoOrg);
console.log("!!! repoName", repoName);
console.log("!!! repoDescription", repoDescription);
console.log("!!! isPublic", repoOrg);
console.log("!!! zipPath", zipPath);

async function main(): Promise<void> {
  const tmpPath = `ex${nanoid(10)}tmp`;
  const repoData = await octokit.request("POST /orgs/{org}/repos", {
    org: repoOrg,
    name: repoName,
    description: repoDescription,
    homepage: "",
    private: !isPublic,
    has_issues: true,
    has_projects: true,
    has_wiki: true,
    headers: {
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  const { git_url: gitUrl } = repoData.data;
  console.log("gitUrl", gitUrl);
  console.log(`${repoName} created successfully!`);
  core.setOutput("repoUrl", `https://github.com/${repoOrg}/${repoName}`);

  // Unzip the zip file
  const unzipped = await decompress(zipPath, "tmpPath");
  console.log("one of the unzipped file", unzipped[0]);

  const options: Partial<SimpleGitOptions> = {
    baseDir: `workplace/${tmpPath}`,
    binary: "git",
    maxConcurrentProcesses: 6,
    trimmed: false,
  };

  const git: SimpleGit = simpleGit(options)
    .addConfig("user.name", "github-actions")
    .addConfig("user.email", "octocat@github.com");

  await git.init();
  await git.add("./*");
  await git.commit("Initial Commit");
  await git.addRemote("origin", gitUrl);
  await git.push(["-u", "origin", "main"]);
}

main();
