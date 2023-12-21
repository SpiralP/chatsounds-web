{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-23.05";
    nixpkgs-mozilla.url = "github:mozilla/nixpkgs-mozilla/master";
    chatsounds-cli-repo = {
      url = "github:SpiralP/chatsounds-cli/master";
      inputs.nixpkgs.follows = "nixpkgs";
      inputs.nixpkgs-mozilla.follows = "nixpkgs-mozilla";
    };
  };

  outputs = { nixpkgs, nixpkgs-mozilla, chatsounds-cli-repo, ... }:
    let
      inherit (nixpkgs) lib;

      makePackage = (system: dev:
        let
          pkgs = import nixpkgs {
            inherit system;
            overlays = [ nixpkgs-mozilla.overlays.rust ];
          };
          chatsounds-cli = chatsounds-cli-repo.outputs.packages.${system}.default;

          rust = (pkgs.rustChannelOf {
            channel = "1.74.0";
            sha256 = "sha256-U2yfueFohJHjif7anmJB5vZbpP7G6bICH4ZsjtufRoU=";
          }).rust.override {
            extensions = if dev then [ "rust-src" ] else [ ];
            targets = [ "wasm32-unknown-unknown" ];
          };
          rustPlatform = pkgs.makeRustPlatform {
            cargo = rust;
            rustc = rust;
          };

          src = lib.cleanSourceWith rec {
            src = ./.;
            filter = path: type:
              lib.cleanSourceFilter path type
              && (
                let
                  baseName = builtins.baseNameOf (builtins.toString path);
                  relPath = lib.removePrefix (builtins.toString ./.) (builtins.toString path);
                in
                lib.any (re: builtins.match re relPath != null) [
                  "/Cargo.lock"
                  "/Cargo.toml"
                  "/package-lock.json"
                  "/package.json"
                  "/src"
                  "/src/.*"
                  "/web"
                  "/web/.*"
                ]
              );
          };
        in
        rec {
          wasm = pkgs.stdenv.mkDerivation {
            pname = "chatsounds-web-wasm";
            version = "0.0.1";
            inherit src;

            buildPhase = ''
              wasm-bindgen --version
              HOME=$TMPDIR RUST_LOG=info wasm-pack -vvvv build --target web --mode no-install
            '';

            installPhase = ''
              mkdir -p $out
              cp -av pkg $out/
            '';

            cargoDeps = rustPlatform.importCargoLock {
              lockFile = ./Cargo.lock;
              outputHashes = {
                "chatsounds-0.2.0" = "sha256-HJq5MXkXnEKGOHX+DRzVhQjLTPmar0MWW7aItqrlpys=";
              };
            };

            nativeBuildInputs = with pkgs; [
              wasm-pack
              # wasm-pack requires wasm-bindgen-cli's version to match the one in your Cargo.lock
              wasm-bindgen-cli
              pkg-config
              rust
              rustPlatform.bindgenHook
              rustPlatform.cargoSetupHook
            ];

            buildInputs = with pkgs; [
              openssl
              alsa-lib
            ];
          };

          default = pkgs.buildNpmPackage {
            name = "chatsounds-web";
            inherit src;

            npmDepsHash = "sha256-ftvVNvMF/CIWC5Zv0nKhxlkrssxERh2eu7eUDlqcGZA=";

            preBuild = ''
              ln -vsf ${wasm}/pkg ./node_modules/chatsounds-web
            '';

            postInstall = with pkgs; ''
              wrapProgram $out/bin/discord-embed-proxy \
                --prefix PATH : ${lib.makeBinPath [ chatsounds-cli ffmpeg ]}
            '';

            nativeBuildInputs = with pkgs; if dev then
              (wasm.nativeBuildInputs ++ [
                chatsounds-cli
                ffmpeg
              ]) else [ ];

            buildInputs = with pkgs; if dev then
              wasm.buildInputs else [ ];
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
              Cmd = [
                "discord-embed-proxy"
              ];
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
