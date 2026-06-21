import "server-only";

/**
 * Razorpay Route — marketplace payouts to artists' linked accounts.
 * Server-only. Reuses the platform's Razorpay key (KEY_ID/KEY_SECRET).
 */
const BASE = "https://api.razorpay.com";

export function routeConfigured() {
  return !!process.env.RAZORPAY_KEY_ID && !!process.env.RAZORPAY_KEY_SECRET;
}

async function rzp<T>(
  path: string,
  method: "GET" | "POST" | "PATCH",
  body?: unknown
): Promise<T> {
  const auth = Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
  ).toString("base64");

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (json as { error?: { description?: string } })?.error?.description ??
      `Razorpay error ${res.status}`;
    throw new Error(msg);
  }
  return json as T;
}

export type LinkedAccountInput = {
  email: string;
  phone: string;
  legalName: string;
  businessType: string; // individual | proprietorship | ...
  contactName: string;
  city: string;
  state: string;
  postalCode: string;
  pan?: string;
};

/** Create a Route linked account for an artist (v2 Accounts API). */
export async function createLinkedAccount(input: LinkedAccountInput) {
  return rzp<{ id: string; status?: string }>("/v2/accounts", "POST", {
    email: input.email,
    phone: input.phone,
    type: "route",
    legal_business_name: input.legalName,
    business_type: input.businessType,
    contact_name: input.contactName,
    profile: {
      category: "social_media_agencies",
      subcategory: "influencer",
      addresses: {
        registered: {
          street1: input.city,
          street2: input.state,
          city: input.city,
          state: input.state,
          postal_code: input.postalCode,
          country: "IN",
        },
      },
    },
    ...(input.pan ? { legal_info: { pan: input.pan } } : {}),
  });
}

/** Request the Route product for a linked account. */
export async function requestRouteProduct(accountId: string) {
  return rzp<{ id: string }>(`/v2/accounts/${accountId}/products`, "POST", {
    product_name: "route",
    tnc_accepted: true,
  });
}

/** Configure the artist's settlement (bank) details for the Route product. */
export async function configureSettlements(
  accountId: string,
  productId: string,
  bank: { accountNumber: string; ifsc: string; beneficiaryName: string }
) {
  return rzp(`/v2/accounts/${accountId}/products/${productId}`, "PATCH", {
    settlements: {
      account_number: bank.accountNumber,
      ifsc_code: bank.ifsc,
      beneficiary_name: bank.beneficiaryName,
    },
    tnc_accepted: true,
  });
}

/** Transfer captured funds to an artist's linked account. */
export async function createTransfer(input: {
  paymentId: string;
  accountId: string;
  amount: number; // paise
  notes?: Record<string, string>;
  referenceId?: string; // unique per payout — Razorpay rejects duplicates
}) {
  return rzp<{ items?: { id: string }[] }>(
    `/v1/payments/${input.paymentId}/transfers`,
    "POST",
    {
      transfers: [
        {
          account: input.accountId,
          amount: input.amount,
          currency: "INR",
          notes: input.notes,
          ...(input.referenceId ? { reference_id: input.referenceId } : {}),
        },
      ],
    }
  );
}
