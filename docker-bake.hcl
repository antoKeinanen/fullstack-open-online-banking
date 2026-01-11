group "all" {
  targets = ["user-service", "tigerbeetle-service", "payment-service", "stripe-service", "user-bff", "user-client", "ingress-router"]
}

target "base" {
  dockerfile = "Dockerfile"
  context = "."
  target = "base"
}

target "ingress-router" {
  dockerfile = "src/packages/ingress-router/Dockerfile"
  tags = [ "ingress-router" ]
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

target "payment-service" {
  dockerfile = "src/services/payment-service/Dockerfile"
  tags = [ "payment-service" ]
  contexts = {
    base = "target:base"
  }
}


target "stripe-service" {
  dockerfile = "src/services/stripe-service/Dockerfile"
  tags = [ "stripe-service" ]
  contexts = {
    base = "target:base"
  }
}


target "user-bff" {
  dockerfile = "src/services/user-bff/Dockerfile"
  tags = [ "user-bff" ]
  contexts = {
    base = "target:base"
  }
}


target "user-client" {
  dockerfile = "src/clients/user-client/Dockerfile"
  tags = [ "user-client" ]
  contexts = {
    base = "target:base"
  }
}
