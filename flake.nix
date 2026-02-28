{
  description = "Element Web development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  };

  outputs =
    { self, nixpkgs }:
    let
      forAllSystems = nixpkgs.lib.genAttrs [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
    in
    {
      packages = forAllSystems (
        system:
        let
          pkgs = import nixpkgs { inherit system; };
        in
        {
          default = pkgs.stdenv.mkDerivation (finalAttrs: {
            pname = "element-web-zendeus";
            version = "1.12.11-rc.0";

            src = ./.;

            pnpmDeps = pkgs.fetchPnpmDeps {
              inherit (finalAttrs) pname src;
              pnpm = pkgs.pnpm_10;
              fetcherVersion = 3;
              hash = "sha256-iJs4I76F4+XMxSn4EjJ+bNQQCG1v83MOnzkI0WYhRaY=";
            };

            nativeBuildInputs = with pkgs; [
              nodejs_22
              pnpm_10
              pnpmConfigHook
              jq
            ];

            buildPhase = ''
              runHook preBuild
              export VERSION=${finalAttrs.version}
              export NX_DAEMON=false
              export NX_NATIVE_COMMAND_RUNNER=false
              export NX_NON_NATIVE_HASHER=true
              export NODE_OPTIONS="--experimental-strip-types --disable-warning=ExperimentalWarning"
              pnpm --filter element-web build
              runHook postBuild
            '';

            installPhase = ''
              runHook preInstall
              cp -R apps/web/webapp $out
              jq -s '.[0] * $conf' "apps/web/config.sample.json" \
                --argjson "conf" '{"disable_guests":true}' > "$out/config.json"
              echo "${finalAttrs.version}" > "$out/version"
              runHook postInstall
            '';

            meta = {
              description = "Element Web with Discord-style categorized sidebar (zendeus fork)";
              homepage = "https://github.com/zendeus/element-web";
              license = pkgs.lib.licenses.agpl3Plus;
            };
          });
        }
      );

      devShells = forAllSystems (
        system:
        let
          pkgs = import nixpkgs { inherit system; };
        in
        {
          default = pkgs.mkShell {
            packages = with pkgs; [
              # Node.js & package manager
              nodejs_22
              pnpm
              git

              # Playwright system dependencies (Linux only)
            ] ++ lib.optionals stdenv.hostPlatform.isLinux (with pkgs; [
              # Playwright needs these shared libraries to run browsers
              playwright-driver.browsers
            ]);

            env = {
              # Respect the monorepo's pnpm version via corepack if preferred
              COREPACK_ENABLE_STRICT = "0";
            } // pkgs.lib.optionalAttrs pkgs.stdenv.hostPlatform.isLinux {
              # Point Playwright at nix-provided browsers on Linux
              PLAYWRIGHT_BROWSERS_PATH = "${pkgs.playwright-driver.browsers}";
              PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
            };

            shellHook = ''
              echo "Element Web dev shell — Node $(node --version), pnpm $(pnpm --version)"
            '';
          };
        }
      );
    };
}
