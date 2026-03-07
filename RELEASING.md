# Release Flow

## What this repository now does

Publishing a GitHub Release triggers one GitHub Actions workflow that:

1. Generates or refreshes the release notes.
2. Builds the Python SDK distribution under sdk/python/captcha-font-sdk.
3. Publishes the SDK to PyPI.
4. Builds Electron desktop packages for macOS, Windows, and Linux.
5. Uploads both the Python artifacts and Electron installers to the GitHub Release assets.

## One-time GitHub setup

### 1. Create a GitHub environment for PyPI

Create an environment named pypi in your repository settings:

- Settings -> Environments -> New environment
- Environment name: pypi

### 2. Add the PyPI token

Inside the pypi environment, add this secret:

- Secret name: PYPI_API_TOKEN
- Secret value: your PyPI API token

The workflow uses the token with username __token__.

## Release checklist

Before publishing a release:

1. Update sdk/python/captcha-font-sdk/captcha_font_sdk/__init__.py so __version__ matches the release tag.
2. Commit and push the version change.
3. Create and publish a GitHub Release with tag format vX.Y.Z.

Example:

- Python SDK version: 0.2.0
- Git tag / GitHub Release tag: v0.2.0

The workflow validates that these two versions match before publishing to PyPI.

## Recommended release process

1. Bump captcha_font_sdk.__version__.
2. Merge the release commit to your default branch.
3. In GitHub, create a new release with tag vX.Y.Z.
4. Publish the release.
5. Wait for the Release workflow to finish.

If the release is marked as a prerelease, the workflow still builds the artifacts and uploads them to GitHub, but it skips the PyPI publish step.

## Release notes behavior

- The workflow regenerates release notes using GitHub's generated release notes API.
- .github/release.yml controls the release note categories.
- If you typed a custom release description before publishing, the workflow keeps it and appends the generated notes below it.

## Future upgrade

If you want to stop storing a long-lived PyPI token later, you can switch this workflow to PyPI Trusted Publishing. The rest of the release flow can stay the same.
