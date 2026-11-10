import { useEffect, useState } from "react";
import { Copy, ListChecks, MessageCircle, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { whatsappChatLink, whatsappDigits } from "@/lib/appLinks";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { SavedWhatsAppMessage } from "@/components/admin/SavedWhatsAppMessages";

const STORAGE_KEY = "pennyekart.savedWhatsAppMessages";
const EVENT = "saved-whatsapp-messages-changed";

const read = (): SavedWhatsAppMessage[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
};
const write = (list: SavedWhatsAppMessage[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVENT));
};

/** Toolbar button that shows all saved (pending) WhatsApp messages in one place. */
const PendingWhatsAppMessagesButton = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<SavedWhatsAppMessage[]>(read);

  useEffect(() => {
    const sync = () => setSaved(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast({ title: "Message copied" }); }
    catch { toast({ title: "Could not copy", variant: "destructive" }); }
  };

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        <ListChecks className="mr-2 h-4 w-4" /> Pending messages ({saved.length})
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>Pending WhatsApp messages</DialogTitle></DialogHeader>
          {saved.length === 0 ? (
            <p className="text-sm text-muted-foreground">No saved messages yet. Use "Save message for later" in any WhatsApp message box.</p>
          ) : (
            <div className="space-y-2">
              {saved.map((s) => (
                <div key={s.id} className="flex items-start gap-2 rounded-md border p-2 text-sm">
                  <div className="flex-1 min-w-0">
                    {s.recipient?.mobile ? (
                      <div className="mb-1 flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="font-semibold">{s.recipient.name || "Unnamed"}</span>
                        <span className="text-muted-foreground">{s.recipient.mobile}</span>
                        {s.recipient.type && <Badge variant="secondary">{s.recipient.type}</Badge>}
                      </div>
                    ) : (
                      <Badge variant="outline" className="mb-1">General template</Badge>
                    )}
                    <p className="whitespace-pre-wrap break-words">{s.text}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Saved {new Date(s.savedAt).toLocaleString()}</p>
                  </div>
                  {whatsappDigits(s.recipient?.mobile ?? null) && (
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-primary" aria-label="Send on WhatsApp" title="Send on WhatsApp"
                      onClick={() => window.open(whatsappChatLink(whatsappDigits(s.recipient!.mobile)!, s.text.split("{{name}}").join(s.recipient!.name?.trim() || "there")), "_blank", "noopener")}>
                      <MessageCircle className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label="Copy message" onClick={() => copy(s.text)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label="Delete message"
                    onClick={() => write(saved.filter((x) => x.id !== s.id))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PendingWhatsAppMessagesButton;
