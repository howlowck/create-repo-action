# Create GitHub Repo

This GitHub Action will create a GitHub repo and create the source code with the provided zip file.

## Inputs

### `zipPath`

**Required** The path to the zip file.

## Output

### `repoUrl`

The URL of the newly created GitHub Repo

## Example Usage

```yaml

uses: howlowck/create-repo@v1.0
with:
  zipPath: './src.zip'
  repoOrg: 'howlowck'
  repoName: 'my-new-app'
  repoDescription: 'My Shiny New Repo'
  repoVisibility: 'public'
  orgToken: ${{ secrets.ORG_ADMIN_PAT }}

```