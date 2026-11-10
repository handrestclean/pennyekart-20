// Client-side rules for the WhatsApp verification link option (mirrors
// supabase/functions/_shared/verificationLink.ts; the server re-checks
// everything, so this is presentation-only).
export const VERIFICATION_LINK_ROLES = ["super admin", "team leader", "coordinator", "group leader"] as const;

export const VERIFICATION_LINK_TTL_LABEL = "24 hours";

export const canSendVerificationLink = (
  isSuperAdmin: boolean,
  roleName: string | null | undefined,
): boolean =>
  isSuperAdmin ||
  VERIFICATION_LINK_ROLES.some((r) => r === roleName?.trim().toLowerCase());

// A member may hold several roles; any allowed role grants the option.
export const canSendVerificationLinkForRoles = (
  isSuperAdmin: boolean,
  roleNames: readonly (string | null | undefined)[],
): boolean => roleNames.some((n) => canSendVerificationLink(false, n)) || isSuperAdmin;

// Legacy fallback: a role may live only on profiles.role_id (no user_roles
// row); merge it into the assigned role names before the allow-list check.
export const mergeLegacyRoleName = (
  roleNames: readonly string[],
  legacyRoleName: string | null | undefined,
): string[] =>
  legacyRoleName?.trim()
    ? Array.from(new Set([...roleNames, legacyRoleName.trim()]))
    : [...roleNames];

export const normalizeVerificationMobile = (v: string | null | undefined): string =>
  (v ?? "").replace(/\D/g, "").slice(-10);

export const buildVerificationLink = (origin: string, token: string): string =>
  `${origin.replace(/\/+$/, "")}/customer/verify?token=${encodeURIComponent(token)}`;

export const verificationWhatsAppMessage = (link: string): string =>
  `Pennyekart account verification\n\nTap this link to verify your account automatically:\n${link}\n\nValid for 24 hours. Do not share this link.`;
