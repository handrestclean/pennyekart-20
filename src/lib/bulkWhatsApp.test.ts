import { describe, expect, it } from "vitest";
import { buildBulkWhatsAppQueue, personalizeBulkWhatsAppMessage } from "./bulkWhatsApp";

describe("bulk WhatsApp messaging", () => {
  it("personalizes every name placeholder and falls back for an unnamed customer", () => {
    expect(personalizeBulkWhatsAppMessage("Hi {{name}} — {{name}}", "  Mira  ")).toBe("Hi Mira — Mira");
    expect(personalizeBulkWhatsAppMessage("Hello {{name}}", null)).toBe("Hello there");
  });

  it("builds a selected-recipient queue and skips customers without usable numbers", () => {
    const result = buildBulkWhatsAppQueue(["customer-1", "customer-2", "customer-3"], [
      { user_id: "customer-1", full_name: "Mira", mobile_number: "98765 43210" },
      { user_id: "customer-2", full_name: "Sam", mobile_number: "12345" },
    ]);

    expect(result.recipients.map(({ user_id, whatsappDigits }) => ({ user_id, whatsappDigits }))).toEqual([
      { user_id: "customer-1", whatsappDigits: "919876543210" },
    ]);
    expect(result.skippedCount).toBe(2);
  });

  it("queues multiple selected selling partners and personalizes each message", () => {
    const result = buildBulkWhatsAppQueue(["seller-1", "seller-2"], [
      { user_id: "seller-1", full_name: "Asha Stores", mobile_number: "+91 98765 43210" },
      { user_id: "seller-2", full_name: "Nila Mart", mobile_number: "9876543211" },
    ]);

    expect(result.recipients.map((seller) => personalizeBulkWhatsAppMessage("Hello {{name}}", seller.full_name))).toEqual([
      "Hello Asha Stores",
      "Hello Nila Mart",
    ]);
    expect(result.recipients).toHaveLength(2);
    expect(result.skippedCount).toBe(0);
  });
});