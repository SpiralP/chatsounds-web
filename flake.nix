{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.11";
    chatsounds-cli-repo = {
      url = "github:SpiralP/chatsounds-cli";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, chatsounds-cli-repo }:
    let
      inherit (nixpkgs) lib;

      nodeManifest = lib.importJSON ./package.json;
      rustManifest = lib.importTOML ./Cargo.toml;

      makePackage = (system: dev:
        let
          pkgs = import nixpkgs {
            inherit system;
          };
          chatsounds-cli = chatsounds-cli-repo.outputs.packages.${system}.default;

          # use FC_DEBUG=1024 when running to debug what config files are loaded
          fontconfig = pkgs.runCommand "fontconfig"
            {
              nativeBuildInputs = with pkgs; [ sd ];
            }
            ''
              mkdir -vp "$out/conf.d"
              ln -vs ${pkgs.fontconfig.out}/etc/fonts/conf.d/* "$out/conf.d/"

              cat '${pkgs.fontconfig.out}/etc/fonts/fonts.conf' > "$out/fonts.conf"
              sd --fixed-strings '${pkgs.dejavu_fonts.minimal}' '${pkgs.noto-fonts}' "$out/fonts.conf"
              sd --fixed-strings '/etc/fonts/conf.d' "$out/conf.d" "$out/fonts.conf"
              sd --fixed-strings '/var/cache/fontconfig' "/tmp/fontconfig" "$out/fonts.conf"
            '';
        in
        rec {
          default = pkgs.buildNpmPackage {
            pname = nodeManifest.name;
            version = "${nodeManifest.version}-${self.shortRev or self.dirtyShortRev}";

            src = lib.sourceByRegex ./. [
              "^\.gitignore$"
              # need npmignore or else dist isn't copied
              "^\.npmignore$"
              "^package-lock\.json$"
              "^package\.json$"
              "^web(/.*)?$"
            ];

            npmDepsHash = "sha256-LzmHT2wE2NlXmIxTNjN/Pp9Tw7jqByHmDs3cSRm7J9I=";

            nativeBuildInputs = (with pkgs; [
              # for tests
              procps
            ])
            ++ (if dev then
              (wasm.nativeBuildInputs ++ (with pkgs; [
                chatsounds-cli
                clippy
                ffmpeg
                rust-analyzer
                (rustfmt.override { asNightly = true; })
              ])) else [ ]);

            buildInputs =
              if dev
              then wasm.buildInputs
              else [ ];

            PUPPETEER_SKIP_DOWNLOAD = true;
            PUPPETEER_EXECUTABLE_PATH = "${lib.getExe pkgs.chromium}";

            preBuild = ''
              ln -vsf ${wasm}/pkg ./node_modules/chatsounds-web
            '';

            postFixup = with pkgs; ''
              wrapProgram $out/bin/chatsounds-web \
                --prefix PATH : ${lib.makeBinPath [ chatsounds-cli ffmpeg ]}
            '';

            FONTCONFIG_FILE = "${fontconfig.out}/fonts.conf";
            FONTCONFIG_PATH = "${fontconfig.out}/";
            doCheck = true;
            # preCheck = ''
            #   # fix for:
            #   # Failed to launch the browser process!
            #   # chrome_crashpad_handler: --database is required
            #   export HOME="$TMPDIR"

            #   # fix for missing fonts
            #   mkdir -vp "$HOME/.config/fontconfig"
            #   ln -vs '${pkgs.fontconfig.out}/etc/fonts/conf.d' "$HOME/.config/fontconfig/conf.d"
            #   cat '${pkgs.fontconfig.out}/etc/fonts/fonts.conf' \
            #     | ${lib.getExe pkgs.sd} --fixed-strings '${pkgs.dejavu_fonts.minimal}' '${pkgs.noto-fonts}' \
            #     > "$HOME/.config/fontconfig/fonts.conf"
            # '';
            checkPhase = ''
              runHook preCheck
              npm run test
              runHook postCheck
            '';

            meta.mainProgram = "chatsounds-web";
          };

          wasm = pkgs.rustPlatform.buildRustPackage {
            pname = "${rustManifest.package.name}-wasm";
            version = "${rustManifest.package.version}-${self.shortRev or self.dirtyShortRev}";

            src = lib.sourceByRegex ./. [
              "^\.cargo(/.*)?$"
              "^build\.rs$"
              "^Cargo\.(lock|toml)$"
              "^src(/.*)?$"
            ];

            buildInputs = with pkgs; [
              openssl
              alsa-lib
            ];

            nativeBuildInputs = with pkgs; [
              wasm-pack
              (
                # wasm-pack requires wasm-bindgen-cli's version to match the one in your Cargo.lock
                lib.trivial.throwIf (wasm-bindgen-cli.version != "0.2.95")
                  "wasm-bindgen-cli updated, bump version here and in Cargo.toml to ${wasm-bindgen-cli.version}"
                  wasm-bindgen-cli
              )
              pkg-config
              rustc-wasm32
              rustc-wasm32.llvmPackages.lld
              cargo
              rustPlatform.bindgenHook
            ];

            # fix "linker `rust-lld` not found"
            CARGO_TARGET_WASM32_UNKNOWN_UNKNOWN_LINKER = "lld";

            buildPhase = ''
              wasm-bindgen --version
              HOME=$TMPDIR RUST_LOG=info wasm-pack -vvvv build --target web --mode no-install
            '';

            installPhase = ''
              mkdir -p $out
              cp -av pkg $out/
            '';

            cargoLock = {
              lockFile = ./Cargo.lock;
              outputHashes = {
                "chatsounds-0.2.0" = "sha256-yD2u8JhjVQW9vGS0crvv3tyscQ7s9zSrkBjVI6AxV2Y=";
              };
            };
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
