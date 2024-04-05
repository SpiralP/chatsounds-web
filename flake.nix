{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-23.11";
    chatsounds-cli-repo = {
      url = "github:SpiralP/chatsounds-cli/master";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { nixpkgs, chatsounds-cli-repo, ... }:
    let
      inherit (nixpkgs) lib;

      makePackage = (system: dev:
        let
          pkgs = import nixpkgs {
            inherit system;
          };
          chatsounds-cli = chatsounds-cli-repo.outputs.packages.${system}.default;
        in
        rec {
          wasm = pkgs.stdenv.mkDerivation {
            pname = "chatsounds-web-wasm";
            version = "0.0.1";

            src = lib.cleanSourceWith {
              src = ./.;
              filter = path: type:
                lib.cleanSourceFilter path type
                && (
                  lib.any (re: builtins.match re (lib.removePrefix (builtins.toString ./.) (builtins.toString path)) != null) [
                    "/Cargo.lock"
                    "/Cargo.toml"
                    "/src"
                    "/src/.*"
                  ]
                );
            };

            buildPhase = ''
              wasm-bindgen --version
              HOME=$TMPDIR RUST_LOG=info wasm-pack -vvvv build --target web --mode no-install
            '';

            installPhase = ''
              mkdir -p $out
              cp -av pkg $out/
            '';

            cargoDeps = pkgs.rustPlatform.importCargoLock {
              lockFile = ./Cargo.lock;
              outputHashes = {
                "chatsounds-0.2.0" = "sha256-PnggDT0oWtRRowrGoD8Bi8+Fpss6SKzQ1PDk3n1tCBM=";
              };
            };

            nativeBuildInputs = with pkgs; [
              wasm-pack
              # wasm-pack requires wasm-bindgen-cli's version to match the one in your Cargo.lock
              wasm-bindgen-cli
              pkg-config
              rustc-wasm32
              rustc-wasm32.llvmPackages.lld
              cargo
              rustPlatform.bindgenHook
              rustPlatform.cargoSetupHook
            ];
            # fix "linker `rust-lld` not found"
            CARGO_TARGET_WASM32_UNKNOWN_UNKNOWN_LINKER = "lld";

            buildInputs = with pkgs; [
              openssl
              alsa-lib
            ];
          };

          default = pkgs.buildNpmPackage {
            name = "chatsounds-web";

            src = lib.cleanSourceWith {
              src = ./.;
              filter = path: type:
                lib.cleanSourceFilter path type
                && (lib.any
                  (re: builtins.match re (lib.removePrefix (builtins.toString ./.) (builtins.toString path)) != null)
                  [
                    "/\.gitignore"
                    # need npmignore or else dist isn't copied
                    "/\.npmignore"
                    "/package-lock\.json"
                    "/package\.json"
                    "/web"
                    "/web/.*"
                  ]
                );
            };

            npmDepsHash = "sha256-RqLscZzeMZElpF9930xMCYsH38P76QecS6YTeocmor4=";

            preBuild = ''
              ln -vsf ${wasm}/pkg ./node_modules/chatsounds-web

              npm run typecheck
              npm run lint
            '';

            postInstall = with pkgs; ''
              wrapProgram $out/bin/chatsounds-web \
                --prefix PATH : ${lib.makeBinPath [ chatsounds-cli ffmpeg ]}
            '';

            nativeBuildInputs = with pkgs;
              if dev
              then
                (wasm.nativeBuildInputs ++ [
                  chatsounds-cli
                  ffmpeg
                  clippy
                  rustfmt
                  rust-analyzer
                ])
              else [ ];

            buildInputs =
              if dev
              then wasm.buildInputs
              else [ ];

            meta.mainProgram = "chatsounds-web";
          };

          docker = pkgs.dockerTools.streamLayeredImage {
            name = "chatsounds-web";
            tag = "latest";

            fakeRootCommands = ''
              mkdir tmp \
                && chmod -v 1777 tmp
            '';
            contents = with pkgs; with pkgs.dockerTools; [
              default

              binSh
              caCertificates
              coreutils
              usrBinEnv
              (fakeNss.override {
                extraPasswdLines = [ "user:x:1000:1000:user:/tmp:/bin/sh" ];
                extraGroupLines = [ "user:x:1000:1000" ];
              })
            ];

            config = {
              Entrypoint = [
                "${pkgs.tini}/bin/tini"
                "--"
              ];
              Cmd = [ (lib.getExe default) ];
              Env = [
                "NODE_ENV=production"
              ];

              ExposedPorts = { "8080/tcp" = { }; };
              User = "1000:1000";
              WorkingDir = "/tmp";
            };
          };
        }
      );
    in
    builtins.foldl' lib.recursiveUpdate { } (builtins.map
      (system: {
        devShells.${system} = makePackage system true;
        packages.${system} = makePackage system false;
      })
      lib.systems.flakeExposed);
}
