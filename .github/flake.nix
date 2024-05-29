{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  };

  outputs = { nixpkgs, ... }:
    let
      inherit (nixpkgs) lib;

      makePackages = (system: dev:
        let
          pkgs = import nixpkgs {
            inherit system;
          };
        in
        {
          update-nix-hashes = pkgs.writeShellApplication {
            name = "update-nix-hashes";
            runtimeInputs = with pkgs; [
              coreutils
              gnugrep
              nix
              prefetch-npm-deps
              sd
            ];
            text = ''
              NPM_FLAKE_PATH="$1"
              PACKAGE_LOCK_PATH="$2"

              OLD_HASH="$(nix eval --raw ".#$NPM_FLAKE_PATH.npmDepsHash")"
              NEW_HASH="$(prefetch-npm-deps "$PACKAGE_LOCK_PATH" 2>/dev/null)"

              echo "$OLD_HASH" "$NEW_HASH"
              test "$OLD_HASH" = "$NEW_HASH" && exit 0

              grep -q "$OLD_HASH" flake.nix || { echo "couldn't find old hash in flake.nix"; exit 1; }
              sd --fixed-strings "$OLD_HASH" "$NEW_HASH" flake.nix
              grep -q "$NEW_HASH" flake.nix || { echo "couldn't find new hash in flake.nix"; exit 1; }
            '';
          };
        }
      );
    in
    builtins.foldl' lib.recursiveUpdate { } (builtins.map
      (system: {
        devShells.${system} = makePackages system true;
        packages.${system} = makePackages system false;
      })
      lib.systems.flakeExposed);
}
