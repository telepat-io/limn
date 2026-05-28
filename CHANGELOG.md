# Changelog

## [0.1.7](https://github.com/telepat-io/limn/compare/limn-v0.1.6...limn-v0.1.7) (2026-05-28)


### Features

* standardize env vars to TELEPAT_OPENROUTER_KEY, TELEPAT_REPLICATE_TOKEN, TELEPAT_DISABLE_KEYTAR ([bb7c538](https://github.com/telepat-io/limn/commit/bb7c5389ec46fa0c9bac419f0d6cf41851d3f747))
* update model names and remove deprecated entries in documentation and code ([96af080](https://github.com/telepat-io/limn/commit/96af0801e649f27f559e2cb9ac8a7e1f174a1e2a))

## [0.1.6](https://github.com/telepat-io/limn/compare/limn-v0.1.5...limn-v0.1.6) (2026-05-20)


### Features

* add outputUrl to image generation results and update related functions ([f85a916](https://github.com/telepat-io/limn/commit/f85a91666e66a0d3902c14a36bc393e9f9ed8ed7))
* better system prompts ([545acbb](https://github.com/telepat-io/limn/commit/545acbb1094eb505e7a2a802b9302e6f7cdc1fb5))
* enhance image generation by supporting versioned model slugs and clean filename generation; update transform function to handle dual-format output ([df94d49](https://github.com/telepat-io/limn/commit/df94d49d1745e602d46a34111408dbae2e878fc5))

## [0.1.5](https://github.com/telepat-io/limn/compare/limn-v0.1.4...limn-v0.1.5) (2026-05-06)


### Features

* add aspect ratio support with validation and listing options in CLI, update README and tests ([acc3865](https://github.com/telepat-io/limn/commit/acc3865e2388c17be41e9c00ae93405fb1b7d5e9))
* add user-configurable options support in CLI and image generation, including validation and listing options ([5a7468f](https://github.com/telepat-io/limn/commit/5a7468f045dba2450a6eb4b1992aa07b2ab8885d))
* enhance build script to create model definitions directory and copy files ([18b8797](https://github.com/telepat-io/limn/commit/18b87970b64b2cefd3d309a8a7b42fe290cdd517))
* increase unit test coverage thresholds to 90% and add new tests for image generation and validation ([fade5d6](https://github.com/telepat-io/limn/commit/fade5d6c4f5b853d1494643d0e5d8ac80ceaa7d7))

## [0.1.4](https://github.com/telepat-io/limn/compare/limn-v0.1.3...limn-v0.1.4) (2026-05-05)


### Features

* add getSupportedModelCatalog API and update README with usage instructions ([3a90443](https://github.com/telepat-io/limn/commit/3a9044374238981cdd87954f35e8959ff2a1fcbe))

## [0.1.3](https://github.com/telepat-io/limn/compare/limn-v0.1.2...limn-v0.1.3) (2026-05-05)


### Bug Fixes

* update Node.js version to 24 in release workflow ([0cd56ff](https://github.com/telepat-io/limn/commit/0cd56ffb05ebecde0df9e555f2495ea1ea3ed8bd))

## [0.1.2](https://github.com/telepat-io/limn/compare/limn-v0.1.1...limn-v0.1.2) (2026-05-05)


### Bug Fixes

* remove unused MIME_TO_EXT mapping from image generation module ([1e17a29](https://github.com/telepat-io/limn/commit/1e17a297580d125247efa645b16b342b0e8d4c1e))
* update @telepat/ansie dependency to version ^0.1.1 in package.json and package-lock.json ([8954576](https://github.com/telepat-io/limn/commit/8954576924d8edc340a6dc8632998440dbdf90f6))

## [0.1.1](https://github.com/telepat-io/limn/compare/limn-v0.1.0...limn-v0.1.1) (2026-05-05)


### Features

* add new image generation models and update registry ([1547d2e](https://github.com/telepat-io/limn/commit/1547d2e08bc56b1dc4438212a52c8aa0d8f68e34))
* enhance CLI with color support, spinner, and improved analytics display ([afce040](https://github.com/telepat-io/limn/commit/afce04078abb1185ba34ce3393e74c5e7b45bde5))
* initial implementation of limn ([fb7e9fe](https://github.com/telepat-io/limn/commit/fb7e9fe1e775193d448213d2bf9f7cad136d9546))


### Bug Fixes

* change model option to optional and handle missing model error ([ff4df94](https://github.com/telepat-io/limn/commit/ff4df94ea0eddb000ca33dc3e27c715d5a4f3be0))
* clarify 5-part structure in prompting guidelines for consistency ([29d2807](https://github.com/telepat-io/limn/commit/29d28071cc2cc66a622c9ad3f314cfb541a5bb0f))
* convert jest config to js to avoid ts-node dependency in CI ([4fb8cc1](https://github.com/telepat-io/limn/commit/4fb8cc1b9b51455f7750377918c6b127239d5c13))
* ensure process.exitCode is reset in beforeEach and afterEach hooks ([fb37d63](https://github.com/telepat-io/limn/commit/fb37d63193f01352ce45aeda26b32de906090cce))
* extract buildGuideMarkdown into src/guide.ts for safe tsc compilation ([dcf950d](https://github.com/telepat-io/limn/commit/dcf950d4183f27f624fb9b971e8428c090ad5a15))
* update dev script to point to src/bin.ts instead of src/cli/index.ts ([0c74b5f](https://github.com/telepat-io/limn/commit/0c74b5fdbf766619ea9b7ffcaaa9bca4deb33551))
