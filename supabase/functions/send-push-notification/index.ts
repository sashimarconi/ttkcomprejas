import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Web Push helpers using Web Crypto API
function base64urlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (base64.length % 4)) % 4;
  const padded = base64 + "=".repeat(pad);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function uint8ArrayToBase64url(arr: Uint8Array): string {
  let binary = "";
  for (const b of arr) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function generateVapidJwt(
  audience: string,
  subject: string,
  privateKeyBase64url: string,
  publicKeyBase64url: string
): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 12 * 3600, sub: subject };

  const enc = new TextEncoder();
  const headerB64 = uint8ArrayToBase64url(enc.encode(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64url(enc.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const privateKeyBytes = base64urlToUint8Array(privateKeyBase64url);
  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      x: uint8ArrayToBase64url(base64urlToUint8Array(publicKeyBase64url).slice(1, 33)),
      y: uint8ArrayToBase64url(base64urlToUint8Array(publicKeyBase64url).slice(33, 65)),
      d: uint8ArrayToBase64url(privateKeyBytes),
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: { name: "SHA-256" } },
      cryptoKey,
      enc.encode(unsignedToken)
    )
  );

  return `${unsignedToken}.${uint8ArrayToBase64url(signature)}`;
}

async function encryptPayload(
  p256dhKey: string,
  authSecret: string,
  payload: Uint8Array
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const subscriberPublicKey = base64urlToUint8Array(p256dhKey);
  const subscriberAuth = base64urlToUint8Array(authSecret);

  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKeyPair.publicKey)
  );

  const subscriberCryptoKey = await crypto.subtle.importKey(
    "raw",
    subscriberPublicKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: subscriberCryptoKey },
      localKeyPair.privateKey,
      256
    )
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();

  // IKM
  const authInfo = new Uint8Array([
    ...enc.encode("WebPush: info\0"),
    ...subscriberPublicKey,
    ...localPublicKeyRaw,
  ]);
  const authHkdfKey = await crypto.subtle.importKey("raw", subscriberAuth, "HKDF", false, ["deriveBits"]);
  const ikm = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt: sharedSecret, info: authInfo },
      authHkdfKey,
      256
    )
  );

  // PRK
  const prkKey = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);

  // CEK
  const cekInfo = new Uint8Array([...enc.encode("Content-Encoding: aes128gcm\0")]);
  const cek = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt, info: cekInfo },
      prkKey,
      128
    )
  );

  // Nonce
  const nonceInfo = new Uint8Array([...enc.encode("Content-Encoding: nonce\0")]);
  const nonce = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt, info: nonceInfo },
      prkKey,
      96
    )
  );

  // Pad and encrypt
  const paddedPayload = new Uint8Array([...payload, 2]); // delimiter
  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, paddedPayload)
  );

  // Build aes128gcm body
  const recordSize = encrypted.length + 86;
  const header = new Uint8Array(86);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, recordSize);
  header[20] = localPublicKeyRaw.length;
  header.set(localPublicKeyRaw, 21);

  const ciphertext = new Uint8Array(header.length + encrypted.length);
  ciphertext.set(header);
  ciphertext.set(encrypted, header.length);

  return { ciphertext, salt, localPublicKey: localPublicKeyRaw };
}

async function sendPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: object,
  vapidPublicKey: string,
  vapidPrivateKey: string
) {
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const subject = "mailto:admin@ttkcompras.com";

  const jwt = await generateVapidJwt(audience, subject, vapidPrivateKey, vapidPublicKey);

  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const { ciphertext } = await encryptPayload(subscription.p256dh, subscription.auth, payloadBytes);

  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "86400",
    },
    body: ciphertext,
  });

  return { status: response.status, ok: response.ok };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { title, body: notifBody, url: notifUrl, tag } = await req.json();

    // Get all push subscriptions
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth");

    if (error) {
      console.error("Error fetching subscriptions:", error);
      return new Response(JSON.stringify({ error: "Failed to fetch subscriptions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!subscriptions?.length) {
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = {
      title: title || "Nova venda!",
      body: notifBody || "Você recebeu um novo pagamento.",
      url: notifUrl || "/admin/orders",
      tag: tag || "sale-" + Date.now(),
    };

    const results = await Promise.allSettled(
      subscriptions.map((sub) => sendPush(sub, payload, vapidPublicKey, vapidPrivateKey))
    );

    // Clean up expired subscriptions (410 Gone)
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === "fulfilled" && result.value.status === 410) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", subscriptions[i].endpoint);
      }
    }

    const sent = results.filter(
      (r) => r.status === "fulfilled" && r.value.ok
    ).length;

    console.log(`Push notifications sent: ${sent}/${subscriptions.length}`);

    return new Response(JSON.stringify({ sent, total: subscriptions.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Push notification error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
