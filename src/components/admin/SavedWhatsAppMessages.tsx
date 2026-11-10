import { useEffect, useState } from "react";
import { Bookmark, ListChecks, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = "pennyekart.savedWhatsAppMessages";
const EVENT = "saved-whatsapp-messages-changed";

export interface SavedWhatsAppRecipient { name: string | null; mobile: string | null; type?: string; }
export interface SavedWhatsAppMessage { id: string; text: string; savedAt: string; recipient?: SavedWhatsAppRecipient; }

const read = (): SavedWhatsAppMessage[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
};
const write = (list: SavedWhatsAppMessage[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVENT));
};

interface Props { message: string; onUse: (text: string) => void; recipient?: SavedWhatsAppRecipient; }

/** Save the current WhatsApp message to send later, and reuse saved ones. */
const SavedWhatsAppMessages = ({ message, onUse, recipient }: Props) => {
  const { toast } = useToast();
  const [saved, setSaved] = useState<SavedWhatsAppMessage[]>(read);
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    const sync = () => setSaved(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);

  const save = () => {
    const text = message.trim();
    if (!text) return;
    if (saved.some((s) => s.text === text && (s.recipient?.mobile ?? null) === (recipient?.mobile ?? null))) { toast({ title: "Message already saved" }); return; }
    write([{ id: crypto.randomUUID(), text, savedAt: new Date().toISOString(), ...(recipient ? { recipient } : {}) }, ...saved].slice(0, 30));
    toast({ title: "Message saved", description: "Find it under Saved messages to send later." });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => setShowList((v) => !v)} aria-expanded={showList}>
          <ListChecks className="mr-1.5 h-3.5 w-3.5" /> {showList ? "Hide" : "Show"} saved messages ({saved.length})
        </Button>
        <Button type="button" size="sm" variant="secondary" disabled={!message.trim()} onClick={save}>
          <Bookmark className="mr-1.5 h-3.5 w-3.5" /> Save message for later
        </Button>
      </div>
      {showList && saved.length === 0 && (
        <p className="text-xs text-muted-foreground">No saved messages yet.</p>
      )}
      {showList && saved.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Saved messages</p>
          <div className="max-h-40 space-y-1 overflow-y-auto">
            {saved.map((s) => (
              <div key={s.id} className="flex items-start gap-1 rounded-md border p-2 text-xs">
                <button type="button" className="flex-1 text-left line-clamp-2" onClick={() => onUse(s.text)} title="Use this message">
                  {s.text}
                </button>
                <Button type="button" size="icon" variant="ghost" className="h-6 w-6" aria-label="Delete saved message"
                  onClick={() => write(saved.filter((x) => x.id !== s.id))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedWhatsAppMessages;
