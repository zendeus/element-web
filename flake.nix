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
