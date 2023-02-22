import * as core from "@actions/core";
import { rimraf } from "rimraf";
import decompress from "decompress";
import { nanoid } from "nanoid";
import { Octokit } from "octokit";
import _sodium from "libsodium-wrappers";
import simpleGit, { SimpleGit } from "simple-git";

const securityToken = core.getInput("securityToken");
const repoOrg = core.getInput("repoOrg");
const repoName = core.getInput("repoName");
const repoDescription = core.getInput("repoDescription");
const isPublic = core.getInput("repoVisibility") === "public";
const zipPath = core.getInput("zipPath");
const envsToRepoSecretsRaw = core.getInput("envsToRepoSecrets");

const envsToRepoSecrets = envsToRepoSecretsRaw.split(",").map((_) => _.trim());

const workplace = process.env.GITHUB_WORKSPACE;

const octokit = new Octokit({
  auth: securityToken,
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

  const {
    clone_url: cloneUrl,
    html_url: url,
    owner: { login: ownerName },
  } = repoData.data;
  console.log("cloneUrl", cloneUrl);
  console.log(`${repoName} created successfully!`);
  core.setOutput("repoUrl", url);

  if (!!zipPath) {
    console.log("Using zip file to initialize repo...");
    // Unzip the zip file
    const unzipped = await decompress(zipPath, `${workplace}/${tmpPath}`);
    console.log("one of the unzipped file", unzipped[0]);

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
      cloneUrl.replace("https://", `https://${securityToken}@`)
    );
    console.log("git branch to main");
    await git.branch(["-M", "main"]);
    console.log("git push -u origin main");
    await git.push(["-u", "origin", "main"]);
    console.log(`remove temp file: ${workplace}/${tmpPath}`);
    await rimraf(`${workplace}/${tmpPath}`);
    console.log("Repo initialized successfully!");
    console.log("-----------------------------\n");
  }

  if (envsToRepoSecrets.length === 0) {
    console.log("No envs to repo secrets. Exiting Task.");
    return;
  }

  // wait for sodium to be ready
  await _sodium.ready;
  const sodium = _sodium;

  const {
    data: { key: publicKey, key_id: publicKeyId },
  } = await octokit.rest.actions.getRepoPublicKey({
    owner: ownerName,
    repo: repoName,
  });

  const secretRequests = envsToRepoSecrets.map((envName) => {
    const secretValue = process.env[envName];
    if (!secretValue) {
      throw new Error(`No such env: ${envName}`);
    }

    console.log(`Setting ${envName} to repo secret`);

    let binaryKey = sodium.from_base64(
      publicKey,
      sodium.base64_variants.ORIGINAL
    );
    let binarySec = sodium.from_string(secretValue);

    //Encrypt the secret using LibSodium
    let encBytes = sodium.crypto_box_seal(binarySec, binaryKey);

    // Convert encrypted Uint8Array to Base64
    let encryptedValue = sodium.to_base64(
      encBytes,
      sodium.base64_variants.ORIGINAL
    );

    return octokit.rest.actions.createOrUpdateRepoSecret({
      owner: ownerName,
      repo: repoName,
      secret_name: envName,
      encrypted_value: encryptedValue,
      key_id: publicKeyId,
    });
  });

  await Promise.all(secretRequests);
  console.log("All secrets set successfully!");
}

main();
