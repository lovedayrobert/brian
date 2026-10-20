import { describe, expect, it } from "vitest";
import { oauthSignature } from "./x";

describe("X OAuth 1.0a", () => {
  it("matches the signature in X's documentation example", () => {
    const params = {
      status: "Hello Ladies + Gentlemen, a signed OAuth request!",
      include_entities: "true",
      oauth_consumer_key: "xvz1evFS4wEEPTGEFPHBog",
      oauth_nonce: "kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg",
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: "1318622958",
      oauth_token: "370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb",
      oauth_version: "1.0",
    };
    expect(oauthSignature("POST", "https://api.twitter.com/1.1/statuses/update.json", params, "kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw", "LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE")).toBe("hCtSmYh+iHYCEqBWrE7C7hYmtUk=");
  });
});
