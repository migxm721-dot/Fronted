{ pkgs }: {
  deps = [
    pkgs.redis
    pkgs.docker_28
    pkgs.unzipNLS
    pkgs.eas-cli
  ];
}