# Create GitHub Repo

This GitHub Action will create a GitHub repo and create the source code with the provided zip file.

## Inputs

### `repoName`

**Required** The name of the repo

### `repoOrg`

**Optional** The owner organization of the repo (if not set, action will assume the owner is the authenticated user)

### `repoDescription`

**Optional** Description of the repo (if not set, description will be empty)

### `zipPath`

**Optional** The path to the zip file. (if not set, action will not make an initial commit)

### `repoVisibility`

**Optional** Visibility should be either "public" or "private"

### `securityToken`

**Required** The PAT or auth token for either you or your organization. The scope should include "workflow" and "repo".

## Output

### `repoUrl`

The URL of the newly created GitHub Repo

## Example Usage

```yaml
env:
  ORG_TOKEN: ${{ secrets.ORG_TOKEN }}
  SOME_SECRET: some-secret-value
runs-on: ubuntu-latest
steps:
  - uses: actions/checkout@v3
  - uses: howlowck/create-repo@v1.0
    with:
      zipPath: './src.zip'
      repoOrg: 'howlowck'
      repoName: 'my-new-app'
      repoDescription: 'My Shiny New Repo'
      repoVisibility: 'public'
      securityToken: ${{ secrets.ORG_TOKEN }}
      envsToRepoSecrets: ORG_TOKEN,SOME_SECRET

```