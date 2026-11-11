import { useState, useEffect, useCallback } from "react";
import { BadgeCheck, ShieldCheck, MessageCircle, AlertTriangle, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SITE_URL } from "@/lib/appLinks";
import {
  buildVerificationLink,
  canSendVerificationLinkForRoles,
  mergeLegacyRoleName,
  normalizeVerificationMobile,
  verificationWhatsAppMessage,
  playStoreInviteMessage,
} from "@/lib/accountVerification";

interface Props {
  userId: string;
  profileMobile: string | null;
  isSuperAdmin?: boolean;
}

const CODE_TTL_MINUTES = 10;

const VerifyAccountCard = ({ userId, profileMobile, isSuperAdmin = false }: Props) => {
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"mobile" | "code">("mobile");
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [mismatch, setMismatch] = useState(false);

  // WhatsApp verification link option (super admin, team leader, coordinator, group leader)
  const [roleNames, setRoleNames] = useState<string[]>([]);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkMobile, setLinkMobile] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [notRegistered, setNotRegistered] = useState<string | null>(null);
  const [sentLink, setSentLink] = useState<{ mobile: string; waUrl: string } | null>(null);

  const loadStatus = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("is_verified")
      .eq("user_id", userId)
      .maybeSingle();
    setIsVerified(Boolean((data as { is_verified?: boolean } | null)?.is_verified));
  }, [userId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    let cancelled = false;
    // Protected roles first; legacy profile role (profiles.role_id) as a
    // fallback so coordinators added before user_roles still qualify.
    (async () => {
      const [{ data: assigned }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("roles(name)").eq("user_id", userId),
        supabase.from("profiles").select("role_id").eq("user_id", userId).maybeSingle(),
      ]);
      const names = ((assigned ?? []) as { roles?: { name?: string } | null }[])
        .map((r) => r?.roles?.name ?? null)
        .filter(Boolean) as string[];
      let legacyName: string | null = null;
      const legacyRoleId = (profile as { role_id?: string | null } | null)?.role_id ?? null;
      if (legacyRoleId) {
        const { data: legacyRole } = await supabase.from("roles").select("name").eq("id", legacyRoleId).maybeSingle();
        legacyName = (legacyRole as { name?: string } | null)?.name ?? null;
      }
      if (cancelled) return;
      setRoleNames(mergeLegacyRoleName(names, legacyName));
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const digitsOnly = (v: string) => v.replace(/\D/g, "");
  const normalize = (v: string | null) => (v ? digitsOnly(v).slice(-10) : "");

  const canSend = canSendVerificationLinkForRoles(isSuperAdmin, roleNames);

  const openSelfVerify = () => {
    setMobile("");
    setMismatch(false);
    setStep("mobile");
    setOpen(true);
  };

  const openLinkDialog = () => {
    setLinkMobile("");
    setSentLink(null);
    setLinkOpen(true);
  };

  const handleSendCode = async () => {
    setMismatch(false);
    const entered = normalize(mobile);
    if (entered.length !== 10) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }
    if (!profileMobile || entered !== normalize(profileMobile)) {
      setMismatch(true);
      return;
    }

    setBusy(true);
    const { data, error } = await supabase.functions.invoke("send-verification", { body: { mobile: entered } });
    setBusy(false);
    const serverErr = (data as { error?: string } | null)?.error;
    if (serverErr === "mismatch") { setMismatch(true); return; }
    if (error || serverErr || !(data as { code?: string })?.code) {
      toast.error(serverErr || "Could not start verification. Please try again.");
      return;
    }
    const generated = (data as { code: string }).code;

    const text = encodeURIComponent(
      `Pennyekart account verification\n\nYour verification code is: ${generated}\n\nValid for ${CODE_TTL_MINUTES} minutes. Do not share this code with anyone.`,
    );
    window.open(`https://wa.me/91${entered}?text=${text}`, "_blank");
    setStep("code");
    toast.success("Verification code sent to your WhatsApp");
  };

  const handleVerify = async () => {
    const entered = digitsOnly(code);
    if (entered.length !== 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("check-verification", { body: { code: entered } });
    setBusy(false);
    const serverErr = (data as { error?: string } | null)?.error;
    if (serverErr === "expired") {
      toast.error("Code expired. Please request a new code.");
      setStep("mobile");
      return;
    }
    if (error || serverErr || !(data as { ok?: boolean })?.ok) {
      toast.error(serverErr || "Verification failed. Please try again.");
      return;
    }

    setIsVerified(true);
    setOpen(false);
    setCode("");
    setStep("mobile");
    toast.success("Account verified!");
  };

  const handleCreateLink = async () => {
    const entered = normalizeVerificationMobile(linkMobile);
    if (entered.length !== 10) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }
    setLinkBusy(true);
    const { data, error } = await supabase.functions.invoke("create-verification-link", { body: { mobile: entered } });
    setLinkBusy(false);
    const serverErr = (data as { error?: string } | null)?.error;
    const token = (data as { token?: string } | null)?.token;
    if ((data as { status?: string } | null)?.status === "already_verified") {
      toast.info("This customer is already verified — no link needed.");
      openLinkDialog();
      return;
    }
    if ((data as { status?: string } | null)?.status === "not_registered") {
      setNotRegistered(entered);
      return;
    }
    if (error || serverErr || !token) {
      toast.error(serverErr || "Could not create the verification link. Please try again.");
      return;
    }
    const link = buildVerificationLink(SITE_URL, token);
    const waUrl = `https://wa.me/91${entered}?text=${encodeURIComponent(verificationWhatsAppMessage(link))}`;
    window.open(waUrl, "_blank");
    setSentLink({ mobile: entered, waUrl });
    toast.success("Verification link created — WhatsApp opened");
  };

  if (isVerified === null) return null;

  return (
    <>
      <Card className="border-primary/20">
        <CardContent className="p-4 flex items-center gap-3">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isVerified ? "bg-sky-500/10" : "bg-muted"}`}>
            {isVerified ? <BadgeCheck className="h-5 w-5 text-sky-500" /> : <ShieldCheck className="h-5 w-5 text-muted-foreground" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm flex items-center gap-1.5">
              {isVerified ? "Verified Account" : "Account not verified"}
              {isVerified && <BadgeCheck className="h-4 w-4 text-sky-500" />}
            </p>
            <p className="text-xs text-muted-foreground">
              {isVerified
                ? "Your mobile number is verified on WhatsApp."
                : "Ask your coordinator, team leader or PRO to send you a verification link on WhatsApp."}
            </p>
          </div>
          {canSend && (
            <div className="flex shrink-0 gap-2">
              {canSend && (
                <Button size="sm" variant="outline" onClick={openLinkDialog} className="gap-1.5">
                  <Link2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Verify a customer</span>
                  <span className="sm:hidden">Link</span>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* One-tap verification link for a customer (authorized roles only) */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{sentLink ? "Link sent" : "Verify a customer"}</DialogTitle>
            <DialogDescription>
              {sentLink
                ? `WhatsApp opened for ${sentLink.mobile}. The account is verified automatically as soon as the customer taps the link (valid for 24 hours).`
                : "Create a one-tap verification link for a customer's account and send it to their WhatsApp. The account verifies as soon as the customer taps the link."}
            </DialogDescription>
          </DialogHeader>

          {!sentLink ? (
            <div className="space-y-3">
              <div>
                <Label htmlFor="verify-link-mobile">Customer's mobile number</Label>
                <Input
                  id="verify-link-mobile"
                  inputMode="numeric"
                  placeholder="10-digit number"
                  value={linkMobile}
                  onChange={(e) => setLinkMobile(digitsOnly(e.target.value).slice(0, 10))}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                The link works only for the account registered with this number and expires after 24 hours.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => window.open(sentLink.waUrl, "_blank")}
              >
                <MessageCircle className="h-4 w-4" />
                Open WhatsApp again
              </Button>
              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={openLinkDialog}>
                Create another link
              </Button>
            </div>
          )}

          <DialogFooter>
            {!sentLink && (
              <Button onClick={handleCreateLink} disabled={linkBusy} className="gap-2 w-full">
                <Link2 className="h-4 w-4" />
                {linkBusy ? "Creating link..." : "Create link & open WhatsApp"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={notRegistered !== null} onOpenChange={(o) => !o && setNotRegistered(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Customer not registered
            </DialogTitle>
            <DialogDescription>
              No Pennyekart account was found with +91 {notRegistered}. They need to install the app and sign up first.
              Send them the Play Store link on WhatsApp so they can download the app?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setNotRegistered(null)}>Cancel</Button>
            <Button
              className="gap-2"
              onClick={() => {
                window.open(`https://wa.me/91${notRegistered}?text=${encodeURIComponent(playStoreInviteMessage())}`, "_blank");
                toast.success("Play Store link opened in WhatsApp");
                setNotRegistered(null);
              }}
            >
              <MessageCircle className="h-4 w-4" />
              Send Play Store link on WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VerifyAccountCard;
