import { useState } from "react";
import { X, Sparkles, ArrowRight } from "lucide-react";
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
        {/* Overlay with layered blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="absolute inset-0 bg-black/75 backdrop-blur-md"
          onClick={announcement.allow_close ? handleClose : undefined}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 40 }}
          transition={{ type: "spring", damping: 22, stiffness: 260, mass: 0.8 }}
          className="relative z-10 w-full max-w-[420px]"
        >
          {/* Outer glow ring */}
          <div className="absolute -inset-[1px] rounded-[22px] bg-gradient-to-b from-primary/40 via-primary/10 to-transparent blur-[1px] pointer-events-none" />

          <div className="relative overflow-hidden rounded-[20px] border border-border/40 bg-card shadow-[0_25px_80px_-15px_hsl(var(--primary)/0.25),0_0_0_1px_hsl(var(--border)/0.1)]">
            {/* Animated gradient top bar */}
            <div className="h-[3px] relative overflow-hidden">
              <div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-primary to-transparent"
                style={{ animation: "announcement-shimmer 3s ease-in-out infinite" }}
              />
            </div>

            {/* Ambient glow spots */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

            {/* Floating particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full bg-primary/20"
                  style={{
                    width: `${2 + (i % 3)}px`,
                    height: `${2 + (i % 3)}px`,
                    left: `${8 + i * 12}%`,
                    top: `${15 + (i % 4) * 18}%`,
                  }}
                  animate={{
                    y: [0, -12, 0],
                    opacity: [0.2, 0.6, 0.2],
                  }}
                  transition={{
                    duration: 3 + i * 0.4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.3,
                  }}
                />
              ))}
            </div>

            {/* Close button */}
            {announcement.allow_close && (
              <motion.button
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                onClick={handleClose}
                className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-muted/60 hover:bg-muted border border-border/30 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-110"
              >
                <X size={14} />
              </motion.button>
            )}

            <div className="px-7 pt-7 pb-3 space-y-5 relative z-10">
              {/* Logo with premium treatment */}
              {announcement.show_logo && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.4 }}
                  className="flex justify-center"
                >
                  <div className="relative">
                    {/* Multi-layer glow */}
                    <div className="absolute -inset-4 rounded-3xl bg-primary/15 blur-2xl" />
                    <div className="absolute -inset-2 rounded-2xl bg-primary/25 blur-md" />
                    {/* Golden border ring */}
                    <div className="relative p-[2.5px] rounded-[18px] bg-gradient-to-br from-primary via-primary/50 to-primary shadow-xl shadow-primary/20">
                      <img src={logo} alt="Logo" className="w-16 h-16 rounded-[15px] block" />
                    </div>
                    {/* Subtle sparkle */}
                    <Sparkles size={12} className="absolute -top-1 -right-1 text-primary/70 animate-pulse" />
                  </div>
                </motion.div>
              )}

              {/* Image */}
              {announcement.image_url && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="rounded-xl overflow-hidden border border-border/20 shadow-lg shadow-black/10"
                >
                  <img
                    src={announcement.image_url}
                    alt={announcement.title}
                    className="w-full h-auto max-h-52 object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </motion.div>
              )}

              {/* Title with decorative elements */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.4 }}
                className="text-center space-y-1"
              >
                {/* Decorative line */}
                <div className="flex items-center justify-center gap-3 mb-3">
                  <div className="h-px w-8 bg-gradient-to-r from-transparent to-primary/40" />
                  <Sparkles size={14} className="text-primary/60" />
                  <div className="h-px w-8 bg-gradient-to-l from-transparent to-primary/40" />
                </div>
                <h2 className="text-[22px] font-bold text-foreground leading-tight tracking-tight">
                  {announcement.title}
                </h2>
              </motion.div>

              {/* Description */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.4 }}
              >
                <p className="text-[13px] text-muted-foreground text-center leading-[1.7] whitespace-pre-wrap">
                  {announcement.description}
                </p>
              </motion.div>
            </div>

            {/* Footer with separator */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="px-7 pb-7 pt-2 space-y-4 relative z-10"
            >
              {/* Subtle separator */}
              <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />

              {/* Main button — premium style */}
              <Button
                onClick={handleButtonClick}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/25 text-sm relative overflow-hidden group transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]"
              >
                {/* Button shimmer */}
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                <span className="relative flex items-center justify-center gap-2">
                  {announcement.button_text}
                  {announcement.button_action !== "close" && (
                    <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                  )}
                </span>
              </Button>

              {/* Dismiss option */}
              {announcement.allow_dismiss && (
                <label className="flex items-center justify-center gap-2.5 cursor-pointer group py-0.5">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={dontShowAgain}
                      onChange={(e) => setDontShowAgain(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="w-4 h-4 rounded border border-border/60 bg-muted/40 peer-checked:bg-primary peer-checked:border-primary flex items-center justify-center transition-all duration-200">
                      {dontShowAgain && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none" className="text-primary-foreground">
                          <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground/70 group-hover:text-muted-foreground transition-colors select-none">
                    Não mostrar novamente
                  </span>
                </label>
              )}

              {/* Preview badge */}
              {isPreview && (
                <div className="flex items-center justify-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <p className="text-[10px] text-primary/50 font-semibold uppercase tracking-[0.15em]">
                    Preview
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>

        {/* CSS for shimmer animation */}
        <style>{`
          @keyframes announcement-shimmer {
            0%, 100% { transform: translateX(-100%); opacity: 0.5; }
            50% { transform: translateX(100%); opacity: 1; }
          }
        `}</style>
      </div>
    </AnimatePresence>
  );
}
