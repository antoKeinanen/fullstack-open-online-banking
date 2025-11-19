import type { JSONWebKeySet } from "jose";
import axios from "axios";

import { env } from "./env";

interface CertificateResponse {
  privateJwks: JSONWebKeySet;
  publicJwksUrl: string;
}

async function getCertificates(
  url: string,
  apiKey: string,
  country: string,
  commonName: string,
): Promise<CertificateResponse> {
  const response = await axios.post(url, "", {
    params: {
      c: country,
      cn: commonName,
    },
    headers: {
      "x-api-key": apiKey,
      "Content-Length": 0,
      Accept: "application/json",
    },
  });

  if (response.status !== 201) {
    throw new Error(
      "Failed to generate certificates: Status was not 201 " +
        response.statusText,
    );
  }

  return response.data as CertificateResponse;
}

async function main(): Promise<void> {
  const privateJwksFile = Bun.file(env.OP_KEYGEN_PRIVATE_JWKS_PATH);
  if (await privateJwksFile.exists()) {
    console.log(
      `JWKS exist in ${env.OP_KEYGEN_PRIVATE_JWKS_PATH}. Aborting...`,
    );
    return;
  }

  console.log("Attempting to create JWKS.");

  const privateJwks = await getCertificates(
    env.OP_KEYGEN_CERTIFICATE_API_URL,
    env.OP_KEYGEN_API_KEY,
    env.OP_KEYGEN_COUNTRY,
    env.OP_KEYGEN_COMMON_NAME,
  );

  const certFileLen = await Bun.write(
    env.OP_KEYGEN_PRIVATE_JWKS_PATH,
    JSON.stringify(privateJwks),
    { createPath: true },
  );
  console.assert(certFileLen > 0, `Failed to write file: ${env.OP_KEYGEN_PRIVATE_JWKS_PATH}`);
  console.log(`Wrote JWKS to '${env.OP_KEYGEN_PRIVATE_JWKS_PATH}'`);
}

await main();
