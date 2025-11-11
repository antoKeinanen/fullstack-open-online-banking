group "all" {
  targets = ["user-service", "tigerbeetle-service", "admin-bff", "admin-client"]
}

target "base" {
  dockerfile = "Dockerfile"
  context = "."
  target = "base"
}

target "user-service" {
  dockerfile = "src/services/user-service/Dockerfile"
  tags = [ "user-service" ]
  contexts = {
    base = "target:base"
  }
}

target "tigerbeetle-service" {
  dockerfile = "src/services/tigerbeetle-service/Dockerfile"
  tags = [ "tigerbeetle-service" ]
  contexts = {
    base = "target:base"
  }
}

target "admin-bff" {
  dockerfile = "src/services/admin-bff/Dockerfile"
  tags = [ "admin-bff" ]
  contexts = {
    base = "target:base"
  }
}

target "admin-client" {
  dockerfile = "src/clients/admin-client/Dockerfile"
  tags = [ "admin-client" ]
  contexts = {
    base = "target:base"
  }
}