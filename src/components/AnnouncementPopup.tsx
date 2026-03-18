import { useState } from "react";
import { X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/logo-new.png";

export interface AnnouncementData {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  show_logo: boolean;
  button_text: string;
  button_link: string | null;
  button_action: string;
  allow_close: boolean;
  allow_dismiss: boolean;
}

interface AnnouncementPopupProps {
  announcement: AnnouncementData;
  onClose: () => void;
  onDismiss: () => void;
  isPreview?: boolean;
}

export function AnnouncementPopup({ announcement, onClose, onDismiss, isPreview }: AnnouncementPopupProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleButtonClick = () => {
    if (announcement.button_action === "link" && announcement.button_link) {
      window.open(announcement.button_link, "_blank", "noopener");
    } else if (announcement.button_action === "route" && announcement.button_link) {
      window.location.href = announcement.button_link;
    }
    if (dontShowAgain) {
      onDismiss();
    } else {
      onClose();
    }
  };

  const handleClose = () => {
    if (dontShowAgain) {
      onDismiss();
    } else {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={announcement.allow_close ? handleClose : undefined}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card shadow-2xl shadow-black/30">
            {/* Decorative gradient top bar */}
            <div className="h-1 bg-gradient-to-r from-primary via-primary/60 to-primary" />

            {/* Floating particles */}
            <div className="absolute top-0 left-0 w-full h-32 overflow-hidden pointer-events-none">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 rounded-full bg-primary/30"
                  style={{
                    left: `${10 + i * 20}%`,
                    top: `${20 + (i % 3) * 25}%`,
                    animation: `bo-particle-float ${3 + i * 0.5}s ease-in-out infinite`,
                    animationDelay: `${i * 0.3}s`,
                  }}
                />
              ))}
            </div>

            {/* Close button */}
            {announcement.allow_close && (
              <button
                onClick={handleClose}
                className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-muted/80 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={16} />
              </button>
            )}

            <div className="px-6 pt-6 pb-2 space-y-5 relative z-10">
              {/* Logo */}
              {announcement.show_logo && (
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="absolute -inset-2 rounded-2xl bg-primary/20 blur-lg" />
                    <div className="relative p-[2px] rounded-2xl bg-gradient-to-br from-primary via-primary/60 to-primary shadow-lg shadow-primary/15">
                      <img src={logo} alt="Logo" className="w-14 h-14 rounded-[14px] block" />
                    </div>
                  </div>
                </div>
              )}

              {/* Image */}
              {announcement.image_url && (
                <div className="rounded-xl overflow-hidden border border-border/30">
                  <img
                    src={announcement.image_url}
                    alt={announcement.title}
                    className="w-full h-auto max-h-48 object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              )}

              {/* Title */}
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Sparkles size={16} className="text-primary" />
                  <h2 className="text-xl font-bold text-foreground leading-tight">{announcement.title}</h2>
                  <Sparkles size={16} className="text-primary" />
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground text-center leading-relaxed whitespace-pre-wrap">
                {announcement.description}
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 pt-3 space-y-4 relative z-10">
              {/* Main button */}
              <Button
                onClick={handleButtonClick}
                className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20 text-sm"
              >
                {announcement.button_text}
              </Button>

              {/* Dismiss option */}
              {announcement.allow_dismiss && (
                <label className="flex items-center justify-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(e) => setDontShowAgain(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-border accent-primary"
                  />
                  <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                    Não mostrar novamente
                  </span>
                </label>
              )}

              {/* Preview badge */}
              {isPreview && (
                <p className="text-center text-[10px] text-primary/60 font-medium uppercase tracking-wider">
                  Modo Preview
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
