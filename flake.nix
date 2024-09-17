{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.05";
    chatsounds-cli-repo = {
      url = "github:SpiralP/chatsounds-cli";
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
          default = pkgs.buildNpmPackage {
            name = "chatsounds-web";

            src = lib.sourceByRegex ./. [
              "^\.gitignore$"
              # need npmignore or else dist isn't copied
              "^\.npmignore$"
              "^package-lock\.json$"
              "^package\.json$"
              "^web(/.*)?$"
            ];

            npmDepsHash = "sha256-KgYzSoOIiDlCgg3aFEvm84yQuqqJfW/kOHPyetp4qus=";

            preBuild = ''
              ln -vsf ${wasm}/pkg ./node_modules/chatsounds-web
            '';

            postFixup = with pkgs; ''
              wrapProgram $out/bin/chatsounds-web \
                --prefix PATH : ${lib.makeBinPath [ chatsounds-cli ffmpeg ]}
            '';

            nativeBuildInputs = with pkgs;
              if dev
              then
                (wasm.nativeBuildInputs ++ [
                  chatsounds-cli
                  clippy
                  ffmpeg
                  rust-analyzer
                  rustfmt
                ])
              else [ ];

            buildInputs =
              if dev
              then wasm.buildInputs
              else [ ];

            meta.mainProgram = "chatsounds-web";
          };

          wasm = pkgs.stdenv.mkDerivation {
            pname = "chatsounds-web-wasm";
            version = "0.0.1";

            src = lib.sourceByRegex ./. [
              "^\.cargo(/.*)?$"
              "^build\.rs$"
              "^Cargo\.(lock|toml)$"
              "^src(/.*)?$"
            ];

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
                "chatsounds-0.2.0" = "sha256-+U87A8Uo5NzteqYbE7VM6h8LcsjwhAmYlHcCjMimm2E=";
              };
            };

            # fix "linker `rust-lld` not found"
            CARGO_TARGET_WASM32_UNKNOWN_UNKNOWN_LINKER = "lld";

            buildInputs = with pkgs; [
              openssl
              alsa-lib
            ];

            nativeBuildInputs = with pkgs; [
              wasm-pack
              (
                # wasm-pack requires wasm-bindgen-cli's version to match the one in your Cargo.lock
                lib.trivial.throwIf (wasm-bindgen-cli.version != "0.2.92")
                  "wasm-bindgen-cli updated, bump version here and in Cargo.toml to ${wasm-bindgen-cli.version}"
                  wasm-bindgen-cli
              )
              pkg-config
              rustc-wasm32
              rustc-wasm32.llvmPackages.lld
              cargo
              rustPlatform.bindgenHook
              rustPlatform.cargoSetupHook
            ];
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
